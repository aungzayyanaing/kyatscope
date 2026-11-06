function parseMarketRate(html){
  if (!html || html.length < 200) return null;
  var doc = html;
  /* one relay wraps the page as JSON: {"contents": "<raw page>"} —
     unwrap it so the same visible-block rule applies inside */
  if (doc.indexOf('"contents"') !== -1){
    try {
      var wrapped = JSON.parse(doc).contents;
      if (typeof wrapped === "string" && wrapped.length >= 200) doc = wrapped;
    } catch (e) {}
  }
  var visible = parseRenderedRate(doc);
  var embedded = parseEmbeddedJsonRate(doc);
  if (visible){
    if (embedded && !ratesMatch(embedded, visible)){
      /* embedded JSON disagrees with the visible Buy/Sell block
         (e.g. USD/MMK JSON 4,783.33 / 4,735.50 vs visible
         4,776.66 / 4,728.89): discard the JSON, keep the visible */
      return visible;
    }
    /* no embedded JSON, or it matches the visible block: verified */
    return visible;
  }
  /* No visible block in this response (the page is JS-rendered, so a
     raw-HTML fetch carries no rendered Buy/Sell block): the embedded
     JSON is the page's own data — accept it. Its dayId is still
     checked by the caller, and the sanity band in
     parseEmbeddedJsonRate applies. Refusing it here once left the
     page on a stale snapshot for a whole day. */
  return embedded;
}
function parseAnyRate(text){
  if (!text) return null;
  return parseMarketRate(text);
}
function firstParsed(urls){
  return new Promise(function(resolve){
    var pending = urls.length, settled = false;
    if (!pending){ resolve(null); return; }
    var race = ("AbortController" in window) ? new AbortController() : null;
    function settle(v){
      if (settled) return;
      settled = true;
      /* Cancel the relays still in flight: a request cancelled on
         purpose ends quietly, instead of failing later on its own. */
      if (race){ try { race.abort(); } catch (e) {} }
      resolve(v);
    }
    urls.forEach(function(u, idx){
      fetchText(u, 15000, race ? race.signal : null).then(function(t){
        var r = null;
        try { r = parseAnyRate(t); } catch (e) { r = null; }
        if (r) settle({ rate: r, relay: idx });
        else if (--pending === 0) settle(null);
      }, function(){ if (--pending === 0) settle(null); });
    });
  });
}
function fetchPairRate(c){
  /* Sequential jina-first chain (see egFetchChain): the old
     4-relay parallel fan-out burned ~20s per failed round on
     dead relays and delayed this currency's tried stamp. */
  return egFetchChain(marketPageUrl(MARKET_PAGES[c.code]), function(t){
    try { return parseAnyRate(t); } catch (e) { return null; }
  }).catch(function(){ return null; });
}
function applyMarketRate(c, r, baseDay){
  if (r.dayId < baseDay) return false;
  /* The source published on r.dayId: stamp it even when the values
     are unchanged, so the converter can tell this rate is current. */
  c.mDay = r.dayId;
  if (r.dayId > LATEST_DAY) LATEST_DAY = r.dayId;
  var m = c.market;
  /* sanity band: a real daily move never halves or doubles the rate;
     anything outside is a corrupted read (e.g. a bank value), skip it */
  if (r.buy < m.buy * 0.5 || r.buy > m.buy * 2) return false;
  var differs = Math.abs(m.buy - r.buy) >= 0.005 || Math.abs(m.sell - r.sell) >= 0.005;
  if (!differs && r.dayId === baseDay) return false;
  m.buy = round2(r.buy); m.sell = round2(r.sell);
  m.chg = round2(r.chg); m.pct = round2(r.pct);
  /* chart: the history series tracks the buy price — replace the
     same-day point or append the new day, then the chart follows */
  var key = c.code + "_market", pt = r.dayId + ":" + m.buy;
  var parts = HISTORY[key] ? HISTORY[key].split(",") : [], found = false;
  for (var i = 0; i < parts.length; i++){
    if (parts[i].indexOf(r.dayId + ":") === 0){ parts[i] = pt; found = true; break; }
  }
  if (!found) parts.push(pt);
  HISTORY[key] = parts.join(",");
  return true;
}
function isoOfDayId(d){ return d.slice(0,4) + "-" + d.slice(4,6) + "-" + d.slice(6,8); }

/* Retry just the pairs that failed (a partial sweep success must
   not leave the headline pair stale until the 30-minute interval:
   verified live 2026-11-06 — USD failed first in the boot burst
   while THB/EUR/GBP succeeded, so no retry fired and USD sat on
   its snapshot rate). Each round re-fetches only the still-failed
   pairs; up to 3 rounds, 20s apart. */
function retryMarketPairs(list, attempt){
  var baseDay = SNAP_DAY, newestDay = baseDay, applied = false, still = [];
  var chain = Promise.resolve();
  list.forEach(function(c){
    chain = chain.then(function(){
      return fetchPairRate(c).then(function(r){
        c.mTried = true;
        try {
          if (!r){ still.push(c); return; }
          if (r.buy < c.market.buy * 0.5 || r.buy > c.market.buy * 2){ still.push(c); return; }
          if (r.dayId > newestDay) newestDay = r.dayId;
          if (applyMarketRate(c, r, baseDay)){
            applied = true;
            renderConverter(); render(); renderTable();
          }
        } catch (e) { still.push(c); }
      });
    });
  });
  chain.then(function(){
    if (newestDay > baseDay) setAsOf(isoOfDayId(newestDay));
    if (applied) refreshAll();
    if (still.length > 0 && attempt < 3){
      setTimeout(function(){ retryMarketPairs(still, attempt + 1); }, 20000);
    }
  }).catch(function(){ /* a failed retry round stays silent */ });
}

function checkMarketUpdate(){
  if (marketBusy) return;
  var now = Date.now();
  if (lastMarketCheck && now - lastMarketCheck < 5 * 60 * 1000) return;
  marketBusy = true; lastMarketCheck = now;
  var status = document.getElementById("updateStatus");
  var baseDay = AS_OF.replace(/-/g, "");
  var applied = false, anyOk = false, newestDay = baseDay, failedPairs = [];
  var chain = Promise.resolve();
  /* The selected currency (and the other core pairs) go first: their
     rates are the ones on screen, so they must refresh in seconds,
     not after the whole 100+ currency sweep. */
  var order = [], seenM = {};
  [selected].concat(Object.keys(CORE7)).forEach(function(code){
    var cc = byCode(code);
    if (cc && !seenM[cc.code]){ seenM[cc.code] = 1; order.push(cc); }
  });
  DATA.forEach(function(c){ if (!seenM[c.code]) order.push(c); });
  order.forEach(function(c){
    chain = chain.then(function(){
      if (!MARKET_PAGES[c.code]) return;
      return fetchPairRate(c).then(function(r){
        /* This currency's market rate has now been attempted
           (fresh or not) — the converter's per-currency gate
           below can stop waiting on it. */
        c.mTried = true;
        try {
          if (!r){ failedPairs.push(c); return; }
          if (r.buy < c.market.buy * 0.5 || r.buy > c.market.buy * 2){ failedPairs.push(c); return; }
          anyOk = true;
          if (r.dayId > newestDay) newestDay = r.dayId;
          if (applyMarketRate(c, r, baseDay)){
            applied = true;
            /* Re-render NOW, not at sweep end: the converter's
               per-currency gate opens the moment this currency is
               tried, but nothing re-rendered it until the whole
               sweep ended (minutes) — the loading note sat on
               screen long after USD's own fetch had resolved. */
            renderConverter(); render(); renderTable();
          }
        } catch (e) { /* one bad pair never breaks the whole check */ }
      });
    });
  });
  chain.then(function(){
    marketBusy = false;
    fxFirstSettled = true;
    /* A sweep in which every relay failed must not burn the
       5-minute throttle: clear the stamp so the next tab-visible
       or interval check retries immediately instead of leaving
       the page on a stale snapshot for the rest of the guard.
       And retry on a timer too (20s, up to 3 times): a failed
       load must not sit stale until the user switches tabs. */
    if (!anyOk){
      lastMarketCheck = 0;
      if (marketRetries < 3){ marketRetries++; setTimeout(checkMarketUpdate, 20000); }
    } else {
      marketRetries = 0;
      /* Partial success: retry ONLY the pairs that failed (usually
         the first one, USD, hit by the boot burst) — otherwise the
         headline rate sits stale until the 30-minute interval. */
      if (failedPairs.length > 0) setTimeout(function(){ retryMarketPairs(failedPairs, 1); }, 20000);
    }
    if (newestDay > baseDay) setAsOf(isoOfDayId(newestDay));
    if (applied) refreshAll();
    if (status){
      var nowT = new Date();
      var p2 = function(n){ return ("0" + n).slice(-2); };
      var stamp = " · နောက်ဆုံးအပ်ဒိတ် " + p2(nowT.getHours()) + ":" + p2(nowT.getMinutes());
      if (applied) status.textContent = "ဈေးအသစ် ရပါပြီ — " + AS_OF + stamp;
      else if (anyOk) status.textContent = "နောက်ဆုံးဈေး ဖြစ်နေပါပြီ။" + stamp;
      else status.textContent = "နောက်ဆုံးအပ်ဒိတ် — " + AS_OF + " (အသစ် တောင်းမရသေးပါ — မှတ်တမ်း ဈေးကို ပြထားသည်)";
    }
  }).catch(function(){
    /* Silent by design: a failed check keeps the rates already on
       screen, clears the busy guard so the next scheduled check can
       still run, and leaves the console untouched. */
    marketBusy = false;
    fxFirstSettled = true;
  });
}

/* ---------- Aggregate update: every currency at once ----------
   One page lists every currency quoted in MMK together with both of
   its rates (bank and market). Fetching that single page through the
   same relays refreshes all 100+ currencies in one pass: bank rates
   for every currency, plus market rates for the extended set — the
   seven core pairs keep their own visible-block market check above.
   A newer day advances the as-of date, changed rates update the
   stored history points, and one refresh moves cards, converter,
   table, ticker and chart together. Silent on failure: the rates
   already on screen stay exactly as they are. */
var aggBusy = false, lastAggCheck = 0, aggRetries = 0, aggOk = false;
/* Stale-first-paint guard: until the first live FX sweep settles
   (success or failure), the converter must not show the baked
   2026-10-30 snapshot rate as if it were today's rate. */
var fxFirstSettled = false;
var CORE7 = { USD:1, THB:1, CNY:1, JPY:1, KRW:1, VND:1, EUR:1 };
function extractCurrenciesJson(text){
  if (!text || text.length < 500) return null;
  var marker = '"currencies":[';
  var i = text.indexOf(marker);
  if (i < 0) return null;
  var dayId = null;
  var mm = text.slice(0, i).match(/"dayId":\d{8}/g);
  if (mm && mm.length) dayId = mm[mm.length - 1].slice(-8);
  var start = i + marker.length - 1, depth = 0, inStr = false, esc = false;
  for (var k = start; k < text.length; k++){
    var ch = text.charAt(k);
    if (inStr){
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
    }
    else if (ch === '"') inStr = true;
    else if (ch === "[") depth++;
    else if (ch === "]"){
      depth--;
      if (depth === 0){
        try { return { list: JSON.parse(text.slice(start, k + 1)), dayId: dayId }; }
        catch (e) { return null; }
      }
    }
  }
  return null;
}
/* Reader for the aggregate page as returned by jina: the raw HTML's
   embedded JSON ("currencies":[...) is STRIPPED by jina's markdown
   conversion (verified 2026-11-06: 0 occurrences in jina's mmk
   output), so extractCurrenciesJson can never succeed via jina —
   and allorigins/codetabs 522 for EG Currency. But jina's markdown
   DOES carry every currency's rates in a clean table form:
     2026-11-06
     ### USD/MMK
     [Bank— 0.00% Buy 2,105.25 Sell 2,094.75](...)
     [Market— 0.00% Buy 4,912.66 Sell 4,863.53](...)
   This parses that table into the same shape extractCurrenciesJson
   returns, so the aggregate check works off ONE jina request.
   The markdown carries the change PERCENT (▲/▼/— + number) but no
   absolute change: change is left undefined so applyAggSource
   preserves the stored value instead of zeroing it. */
function parseAggMarkdown(text){
  if (!text || text.length < 500) return null;
  var dm = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!dm) return null;
  var dayId = dm[1] + dm[2] + dm[3];
  function src(block, label){
    var m = block.match(new RegExp("\\[" + label + "\\s*([\\u2014\\u25B2\\u25BC])?\\s*([\\d.]+)%\\s*Buy\\s*([\\d,]+(?:\\.\\d+)?)\\s*Sell\\s*([\\d,]+(?:\\.\\d+)?)\\]"));
    if (!m) return null;
    var arrow = m[1] || "";
    var sign = arrow === "▼" ? -1 : 1;
    var pct = parseFloat(m[2]) || 0;
    return { buy: m[3], sell: m[4], change: undefined, changePercent: sign * pct / 100 };
  }
  var list = [];
  var re = /###\s*([A-Z0-9]{2,4})\/MMK/g, m;
  var heads = [];
  while ((m = re.exec(text)) !== null) heads.push({ code: m[1], index: m.index });
  for (var h = 0; h < heads.length; h++){
    var code = heads[h].code;
    /* Slice to the next heading only — a fixed 600-char window
       could swallow the NEXT currency's Bank/Market line. */
    var end = (h + 1 < heads.length) ? heads[h + 1].index : heads[h].index + 600;
    var block = text.slice(heads[h].index, end);
    var bank = src(block, "Bank"), market = src(block, "Market");
    if (!bank && !market) continue;
    list.push({ code: code, sources: { bank: bank, market: market } });
  }
  /* jina's markdown carries only the page's visible table (24
     currencies here) — not the full 102 — so the threshold is
     lower than the JSON path's, but USD must be present or the
     parse is not trusted. All 7 core pairs are in the 24. */
  if (list.length < 20) return null;
  if (!list.some(function(e){ return e.code === "USD"; })) return null;
  return { list: list, dayId: dayId };
}
function firstAggregate(urls){
  return new Promise(function(resolve){
    var pending = urls.length, settled = false;
    if (!pending){ resolve(null); return; }
    var race = ("AbortController" in window) ? new AbortController() : null;
    function settle(v){
      if (settled) return;
      settled = true;
      if (race){ try { race.abort(); } catch (e) {} }
      resolve(v);
    }
    urls.forEach(function(u, idx){
      fetchText(u, 15000, race ? race.signal : null).then(function(t){
        var r = null;
        try { r = extractCurrenciesJson(t); } catch (e) { r = null; }
        /* jina returns markdown, not the raw HTML: fall back to the
           markdown table parser (same shape, same threshold). */
        if (!r){ try { r = parseAggMarkdown(t); } catch (e) { r = null; } }
        if (r && r.list && r.list.length > 50) settle({ data: r, relay: idx });
        else if (--pending === 0) settle(null);
      }, function(){ if (--pending === 0) settle(null); });
    });
  });
}
function applyAggSource(c, srcName, s, dayId){
  if (!s) return false;
  var buy = parseFloat(s.buy), sell = parseFloat(s.sell);
  if (!(buy > 0) || !(sell > 0)) return false;
  var cur = c[srcName];
  if (cur && (buy < cur.buy * 0.5 || buy > cur.buy * 2)) return false;
  /* Stamp this source's day even when the values are unchanged. */
  if (dayId){
    c[srcName === "market" ? "mDay" : "bDay"] = dayId;
    if (dayId > LATEST_DAY) LATEST_DAY = dayId;
  }
  var chg = (s.change === undefined || s.change === null) ? (cur ? cur.chg : 0) : (parseFloat(s.change) || 0);
  var pct = (s.changePercent === undefined || s.changePercent === null) ? (cur ? cur.pct : 0) : round2((parseFloat(s.changePercent) || 0) * 100);
  var changed = false;
  if (!cur){
    c[srcName] = { buy: round2(buy), sell: round2(sell), chg: round2(chg), pct: pct };
    changed = true;
  } else if (Math.abs(cur.buy - buy) >= 0.005 || Math.abs(cur.sell - sell) >= 0.005){
    cur.buy = round2(buy); cur.sell = round2(sell);
    cur.chg = round2(chg); cur.pct = pct;
    changed = true;
  }
  if (dayId){
    var key = c.code + "_" + srcName, pt = dayId + ":" + c[srcName].buy;
    var parts = HISTORY[key] ? HISTORY[key].split(",") : [], found = false;
    for (var i = 0; i < parts.length; i++){
      if (parts[i].indexOf(dayId + ":") === 0){
        if (parts[i] !== pt){ parts[i] = pt; changed = true; }
        found = true; break;
      }
    }
    if (!found){ parts.push(pt); changed = true; }
    HISTORY[key] = parts.join(",");
  }
  return changed;
}
function checkAggregateUpdate(){
  if (aggBusy) return;
  var now = Date.now();
  if (lastAggCheck && now - lastAggCheck < 5 * 60 * 1000) return;
  aggBusy = true; lastAggCheck = now;
  /* Sequential jina-first chain (see egFetchChain): one jina
     request carries the whole table via parseAggMarkdown, so a
     single success refreshes all 24 currencies at once. The JSON
     path needs a full list (>50); the markdown path self-guards
     (>=20 entries and USD present). */
  egFetchChain("https://egcurrency.com/en/currency/mmk", function(t){
    var r = null;
    try { r = extractCurrenciesJson(t); } catch (e) { r = null; }
    if (r && r.list && r.list.length > 50) return r;
    try { r = parseAggMarkdown(t); } catch (e) { r = null; }
    if (r) return r;
    return null;
  }).then(function(data){
    aggBusy = false;
    fxFirstSettled = true;
    if (!data){
      lastAggCheck = 0;
      /* A failed aggregate must not wait 30 minutes for the next
         interval check: jina 429s are transient and its budget
         refills, so retry after 20s, up to 3 times. (Verified live
         2026-11-06: 2 of 3 fresh loads stayed on the snapshot rate
         because the aggregate failed once and never retried.) */
      if (aggRetries < 3){ aggRetries++; setTimeout(checkAggregateUpdate, 20000); }
      return;
    }
    aggRetries = 0;
    /* The aggregate is the one-shot source for every currency's
       rates: once it has succeeded, every currency it covered has
       been tried (fresh or not) — the converter no longer has to
       wait for the slow per-pair sweep to say so. */
    aggOk = true;
    var dayId = data.dayId, changed = false;
    data.list.forEach(function(e){
      try {
        if (!e || !e.code) return;
        var c = byCode(e.code);
        if (!c || c.code !== e.code) return;
        var srcs = e.sources || {};
        if (applyAggSource(c, "bank", srcs.bank, dayId)) changed = true;
        /* The aggregate page carries EVERY currency's market rate in
           its embedded JSON (verified 2026-11-06: USD 4912.66, THB
           146.69, EUR 5458.51, …) — the core pairs used to be excluded
           here so their market rates came only from the slow
           per-pair visible-block sweep, but that sweep depends on
           jina alone (allorigins/codetabs 522 for EG Currency) and
           jina 429s when the page hammers it, so USD sat on its
           snapshot rate for minutes while the page date already read
           today. One aggregate request now refreshes them all. */
        if (applyAggSource(c, "market", srcs.market, dayId)) changed = true;
      } catch (err) { /* one bad row never breaks the whole sweep */ }
    });
    if (dayId && dayId > AS_OF.replace(/-/g, "")) setAsOf(isoOfDayId(dayId));
    if (changed) refreshAll();
  }).catch(function(){
    aggBusy = false; fxFirstSettled = true;
    if (aggRetries < 3){ aggRetries++; setTimeout(checkAggregateUpdate, 20000); }
  });
}

/* Last-resort guard: the update checks handle every failure
   themselves and fall back to the embedded rates, but no stray
   rejected promise from them may ever reach the console. */
if (window.addEventListener) window.addEventListener("unhandledrejection", function(e){ if (e && e.preventDefault) e.preventDefault(); });

/* The live FX checks start BEFORE the first render, so the
   converter's first paint can show the loading note (see the
   stale-first-paint guard in renderConverter) instead of the
   baked snapshot rate. */
try { checkMarketUpdate(); } catch (e) {}
try { checkAggregateUpdate(); } catch (e) {}
render();
renderConverter();
renderTable();
var ccEl = document.getElementById("curCount");
if (ccEl) ccEl.textContent = toMyDigits(DATA.length);
updateFxCount(DATA.length);
setInterval(function(){ try { checkMarketUpdate(); } catch (e) {} try { checkAggregateUpdate(); } catch (e) {} }, 30 * 60 * 1000);
document.addEventListener("visibilitychange", function(){ if (!document.hidden){ try { checkMarketUpdate(); } catch (e) {} try { checkAggregateUpdate(); } catch (e) {} } });
