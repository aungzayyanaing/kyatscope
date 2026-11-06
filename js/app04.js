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
        if (!CORE7[c.code] && applyAggSource(c, "market", srcs.market, dayId)) changed = true;
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
