function fetchPairRate(c){
  var all = relayUrls(marketPageUrl(MARKET_PAGES[c.code]));
  var urls = relayOrder.map(function(i){ return all[i]; });
  return firstParsed(urls).then(function(res){
    if (!res) return null;
    var won = relayOrder[res.relay];
    relayOrder = [won].concat(relayOrder.filter(function(x){ return x !== won; }));
    return res.rate;
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

function checkMarketUpdate(){
  if (marketBusy) return;
  var now = Date.now();
  if (lastMarketCheck && now - lastMarketCheck < 5 * 60 * 1000) return;
  marketBusy = true; lastMarketCheck = now;
  var status = document.getElementById("updateStatus");
  var baseDay = AS_OF.replace(/-/g, "");
  var applied = false, anyOk = false, newestDay = baseDay;
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
        try {
          if (!r) return;
          if (r.buy < c.market.buy * 0.5 || r.buy > c.market.buy * 2) return;
          anyOk = true;
          if (r.dayId > newestDay) newestDay = r.dayId;
          if (applyMarketRate(c, r, baseDay)) applied = true;
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
       the page on a stale snapshot for the rest of the guard. */
    if (!anyOk) lastMarketCheck = 0;
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
var aggBusy = false, lastAggCheck = 0;
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
  var chg = parseFloat(s.change) || 0;
  var pct = round2((parseFloat(s.changePercent) || 0) * 100);
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
  var all = relayUrls("https://egcurrency.com/en/currency/mmk");
  var urls = relayOrder.map(function(i){ return all[i]; });
  firstAggregate(urls).then(function(res){
    aggBusy = false;
    fxFirstSettled = true;
    if (!res){ lastAggCheck = 0; return; }
    var won = relayOrder[res.relay];
    relayOrder = [won].concat(relayOrder.filter(function(x){ return x !== won; }));
    var dayId = res.data.dayId, changed = false;
    res.data.list.forEach(function(e){
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
  }).catch(function(){ aggBusy = false; fxFirstSettled = true; });
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
