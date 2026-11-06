function fastUpbitPoll(){ if (selected === "KRW") upbitPoll(); }
setTimeout(upbitPoll, 1500);
setInterval(upbitPoll, 20000);
setTimeout(upbitSocket, 1800);
setInterval(fastUpbitPoll, 3000);
document.addEventListener("visibilitychange", function(){ if (!document.hidden) upbitPoll(); });
/* Seed KRW's LIVE candles from real 1-minute candles: Upbit's
   KRW-BTC minutes crossed with Binance's BTCUSDT minutes,
   aligned by minute — the same cross the live ticks use, so
   the seeded hour and the forming candle share one recipe. */
function ltSeedUpbit(){
  if (selected !== "KRW" || LT.seeded) return;
  var token = LT.token, base = ltBase();
  function getB(host){
    return fetch(host + "/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=60").then(function(r){ if (!r.ok) throw new Error("bad"); return r.json(); });
  }
  function attempt(i){
    if (i >= LT_HOSTS.length) return;
    Promise.all([
      getB(LT_HOSTS[i]),
      fetch("https://api.upbit.com/v1/candles/minutes/1?market=KRW-BTC&count=60").then(function(r){ if (!r.ok) throw new Error("bad"); return r.json(); })
    ]).then(function(rs){
      if (token !== LT.token || TV.tf !== "LIVE" || LT.seeded) return;
      var btc = {};
      (rs[0] || []).forEach(function(r){ btc[Math.floor(+r[0] / 60000)] = r; });
      var us = (rs[1] || []).slice().reverse().map(function(k){
        var iso = String(k.candle_date_time_utc || "");
        if (iso && !/[zZ]|[+-]\d\d:\d\d$/.test(iso)) iso += "Z";
        var min = Math.floor(Date.parse(iso) / 60000);
        var b = btc[min]; if (!b) return null;
        var o = +b[1], h = +b[2], l = +b[3], c = +b[4];
        return { ts:min * 60, o:o / k.opening_price, h:h / k.low_price, l:l / k.high_price, c:c / k.trade_price };
      }).filter(function(u){ return u && u.c > 0; });
      if (us.length < 10) return;
      var ref = us[us.length - 1].c; if (!(ref > 0)) return;
      var anchor = ltPrice(); if (!(anchor > 0)) anchor = base;
      ltSeedCandles(us.map(function(u){
        return { d:ltDayId(u.ts), lt:ltTimeLabel(u.ts), o:anchor * u.o / ref, h:anchor * u.h / ref, l:anchor * u.l / ref, c:anchor * u.c / ref };
      }));
    }).catch(function(){ attempt(i + 1); });
  }
  attempt(0);
}

/* ----- Selected-pair fast lane: the JPY/MMK model, applied to
   every pair. While any pair is on screen, its live cross is
   polled every few seconds instead of waiting for the shared
   20-second forex cycle — exactly how JPY/MMK moves: Binance
   REST ticker prices first (the BTC<fiat> / BTCUSDT / USDTUSD
   cross for JPY and for every BN_FIAT pair with a BTC book —
   THB and EUR included — with the pair's own Binance fiat
   symbol riding along as the fallback feed, the same real
   prices bnRecompute already feeds from),
   a Bybit ticker poll for pairs Bybit lists, and the pair's
   TradingView USD scanner quote as the always-available fallback
   source. feedSet's source priority keeps the strongest source
   in charge whenever it answers, and the LIVE tick engine turns
   every real move into a green/red tick of the forming candle
   within a second of it landing — so whichever currency is
   selected, its chart ticks at the same cadence as JPY's, over
   its seeded history candles. USD stays on its card / Market
   anchor (chart factor 1) and KGS has no live pair on any source,
   so neither is ever polled or labelled as live here. ----- */
var FAST = { bnBusy:false, bybitBusy:false };
function fastBinancePoll(){
  if (selected === "USD" || selected === "KGS" || FAST.bnBusy) return;
  var syms = null;
  if (selected === "JPY") syms = ["BTCUSDT", "BTCJPY", "USDTUSD"];
  else if (typeof BN_FIAT !== "undefined" && BN_FIAT[selected]){
    /* The JPY recipe for every Binance fiat pair: poll the BTC
       cross legs (BTCUSDT + BTC<fiat>) alongside the direct pair,
       so bnRecompute can cross the pair through BTC and the
       forming candle ticks at BTC pace instead of waiting for
       the direct fiat pair's next print. The cross symbol goes
       last: if it ever fails to answer, the retry below drops it
       and the direct-pair poll still lands. */
    syms = [BN_FIAT[selected].s, "BTCUSDT", "USDTUSD"];
    if (typeof BN_BTCX !== "undefined" && BN_BTCX[selected]) syms.push(BN_BTCX[selected]);
  }
  if (!syms) return;
  FAST.bnBusy = true;
  var hosts = ["https://data-api.binance.vision", "https://api.binance.com"];
  function attempt(i, list){
    if (i >= hosts.length){ FAST.bnBusy = false; return; }
    fetch(hosts[i] + "/api/v3/ticker/price?symbols=" + encodeURIComponent(JSON.stringify(list)))
      .then(function(r){ if (!r.ok) throw new Error("bad"); return r.json(); })
      .then(function(rows){
        if (!rows || !rows.length){ attempt(i + 1, syms); return; }
        FAST.bnBusy = false;
        rows.forEach(function(r){
          /* Same USDTAED rule as bnFeedRows: ticker/price is a
             LAST-TRADE field, frozen on the pegged AED book, and
             BN_PX["USDTAED"] belongs to the bookTicker midpoint
             lanes only. While AED is the pair on screen this
             fast poll runs every 2.5 s, so the frozen trade used
             to snap AED's factor back to one print between every
             pair of midpoint updates. */
          if (r.symbol === "USDTAED") return;
          var p = parseFloat(r.price); if (p > 0) BN_PX[r.symbol] = p;
        });
        bnRecompute();
        /* AED's fast lane is the midpoint itself: while AED is
           on screen, poll the real bookTicker at the fast
           cadence instead of the shared 15 s backstop, so a
           genuine book re-pricing reaches the chart within
           seconds of it happening. */
        if (selected === "AED" && typeof bnAedBookPoll === "function") bnAedBookPoll();
      })
      .catch(function(){
        if (list.length > 3) attempt(i, list.slice(0, 3));
        else attempt(i + 1, syms);
      });
  }
  attempt(0, syms);
}
function fastBybitPoll(){
  if (selected === "USD" || selected === "KGS" || FAST.bybitBusy) return;
  if (typeof BYBIT_MAP === "undefined" || !BYBIT_MAP || !BYBIT_MAP[selected]) return;
  var code = selected, m = BYBIT_MAP[selected];
  FAST.bybitBusy = true;
  fetch(m.host + "/v5/market/tickers?category=spot&symbol=" + m.s)
    .then(function(r){ if (!r.ok) throw new Error("bad"); return r.json(); })
    .then(function(j){
      FAST.bybitBusy = false;
      var t = j && j.result && j.result.list && j.result.list[0];
      if (t) bybitFeed(code, m, parseFloat(t.lastPrice));
    }).catch(function(){ FAST.bybitBusy = false; });
}
function fastTvPoll(){
  if (selected === "USD" || selected === "KGS") return;
  if (typeof TV_TICKERS === "undefined" || !TV_TICKERS[selected]) return;
  var tickers = (typeof tvTickersFor === "function") ? tvTickersFor(selected) : TV_TICKERS[selected];
  if (!tickers.length) return;
  /* Same scanner request the shared cycle makes (close + bid +
     ask, both variants), just for the pair on screen — so CNY
     gets its moving USDCNH print and VND its bid/ask midpoint
     every 6 seconds instead of waiting for the 20 s cycle. */
  if (typeof tvPost === "function"){ tvPost(tickers).catch(function(){}); return; }
  fetch("https://scanner.tradingview.com/forex/scan", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ symbols: { tickers: tickers }, columns: ["close", "bid", "ask"] })
  }).then(function(r){ if (!r.ok) throw new Error("bad"); return r.json(); })
    .then(function(j){
      ((j && j.data) || []).forEach(function(row){ if (typeof tvRowFeed === "function") tvRowFeed(row); });
    }).catch(function(){});
}
/* Kraken fast lane for the pair on screen (GBP / AUD crossed
   through BTC, the other Kraken majors off their midpoints):
   4 s while selected, against the shared 10 s cycle — the same
   selected-pair treatment the Binance, Bybit, TV and Upbit
   lanes already give their pairs. */
function fastKrakenPoll(){ if (typeof KRAKEN_MAP !== "undefined" && KRAKEN_MAP[selected]) krakenFeed(); }
/* The original JPY-only lane names, kept as thin wrappers. */
function jpyFastPoll(){ if (selected === "JPY") fastBinancePoll(); }
function jpyTvPoll(){ if (selected === "JPY") fastTvPoll(); }
setTimeout(fastBinancePoll, 1200);
setTimeout(fastTvPoll, 1500);
setTimeout(fastBybitPoll, 1800);
setInterval(fastBinancePoll, 2500);
setInterval(fastBybitPoll, 5000);
setInterval(fastTvPoll, 6000);
setInterval(fastKrakenPoll, 4000);
document.addEventListener("visibilitychange", function(){ if (!document.hidden){ fastBinancePoll(); fastTvPoll(); fastBybitPoll(); if (typeof fastUpbitPoll === "function") fastUpbitPoll(); if (typeof krakenFeed === "function") krakenFeed(); } });

/* ---------- Global Live — Binance public spot (no account, no sign-in) ----------
   Real spot prices from Binance's public market-data API, refreshed
   every 5 seconds while the page is open and whenever the tab becomes
   visible again. The values baked in below are the real snapshot
   fetched at build time (2026-10-29 19:09 Myanmar time); they are a
   labelled starting point only and are replaced by live values as
   soon as the first request succeeds. If every endpoint fails, those
   last real values stay on screen with their timestamp — prices are
   never invented or simulated. Binance spot lists no MMK pair at all
   (all 3,742 symbols checked on 2026-10-29), so nothing in this
   section feeds or alters the MMK rates above. */
var GLIVE = [
  { sym:"BTCUSDT", code:"BTC", name:"Bitcoin",  letter:"B", dec:2, price:80153.99, pct:-0.743, high:81788.56, low:79710.00 },
  { sym:"ETHUSDT", code:"ETH", name:"Ethereum", letter:"E", dec:2, price:2324.23,  pct:-0.645, high:2391.55,  low:2293.44 },
  { sym:"BNBUSDT", code:"BNB", name:"BNB",      letter:"B", dec:2, price:742.03,   pct:-1.615, high:761.00,   low:738.30 },
  { sym:"SOLUSDT", code:"SOL", name:"Solana",   letter:"S", dec:2, price:100.57,   pct:-0.936, high:103.85,   low:99.26 },
  { sym:"XRPUSDT", code:"XRP", name:"XRP",      letter:"X", dec:4, price:1.2915,   pct:-1.750, high:1.3442,   low:1.2862 }
];
var GL_LIVE = false, glBusy = false;
function gFmt(n, dec){ return n.toLocaleString("en-US", { minimumFractionDigits:dec, maximumFractionDigits:dec }); }
/* Real crypto brand marks (official glyph paths, brand colours) —
   Bitcoin ₿ coin, Ethereum diamond, BNB diamond, Solana bars, XRP mark. */
var GL_ICON_PATHS = {
  BTC: "M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.548v-.002zm-6.35-4.613c.24-1.59-.974-2.45-2.64-3.03l.54-2.153-1.315-.33-.525 2.107c-.345-.087-.705-.167-1.064-.25l.526-2.127-1.32-.33-.54 2.165c-.285-.067-.565-.132-.84-.2l-1.815-.45-.35 1.407s.975.225.955.236c.535.136.63.486.615.766l-1.477 5.92c-.075.166-.24.406-.614.314.015.02-.96-.24-.96-.24l-.66 1.51 1.71.426.93.242-.54 2.19 1.32.327.54-2.17c.36.1.705.19 1.05.273l-.51 2.154 1.32.33.545-2.19c2.24.427 3.93.257 4.64-1.774.57-1.637-.03-2.58-1.217-3.196.854-.193 1.5-.76 1.68-1.93h.01zm-3.01 4.22c-.404 1.64-3.157.75-4.05.53l.72-2.9c.896.23 3.757.67 3.33 2.37zm.41-4.24c-.37 1.49-2.662.735-3.405.55l.654-2.64c.744.18 3.137.524 2.75 2.084v.006z",
  ETH: "M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z",
  BNB: "M16.624 13.9202l2.7175 2.7154-7.353 7.353-7.353-7.352 2.7175-2.7164 4.6355 4.6595 4.6356-4.6595zm4.6366-4.6366L24 12l-2.7154 2.7164L18.5682 12l2.6924-2.7164zm-9.272.001l2.7163 2.6914-2.7164 2.7174v-.001L9.2721 12l2.7164-2.7154zm-9.2722-.001L5.4088 12l-2.6914 2.6924L0 12l2.7164-2.7164zM11.9885.0115l7.353 7.329-2.7174 2.7154-4.6356-4.6356-4.6355 4.6595-2.7174-2.7154 7.353-7.353z",
  SOL: "m23.8764 18.0313-3.962 4.1393a.9201.9201 0 0 1-.306.2106.9407.9407 0 0 1-.367.0742H.4599a.4689.4689 0 0 1-.2522-.0733.4513.4513 0 0 1-.1696-.1962.4375.4375 0 0 1-.0314-.2545.4438.4438 0 0 1 .117-.2298l3.9649-4.1393a.92.92 0 0 1 .3052-.2102.9407.9407 0 0 1 .3658-.0746H23.54a.4692.4692 0 0 1 .2523.0734.4531.4531 0 0 1 .1697.196.438.438 0 0 1 .0313.2547.4442.4442 0 0 1-.1169.2297zm-3.962-8.3355a.9202.9202 0 0 0-.306-.2106.941.941 0 0 0-.367-.0742H.4599a.4687.4687 0 0 0-.2522.0734.4513.4513 0 0 0-.1696.1961.4376.4376 0 0 0-.0314.2546.444.444 0 0 0 .117.2297l3.9649 4.1394a.9204.9204 0 0 0 .3052.2102c.1154.049.24.0744.3658.0746H23.54a.469.469 0 0 0 .2523-.0734.453.453 0 0 0 .1697-.1961.4382.4382 0 0 0 .0313-.2546.4444.4444 0 0 0-.1169-.2297zM.46 6.7225h18.7815a.9411.9411 0 0 0 .367-.0742.9202.9202 0 0 0 .306-.2106l3.962-4.1394a.4442.4442 0 0 0 .117-.2297.4378.4378 0 0 0-.0314-.2546.453.453 0 0 0-.1697-.196.469.469 0 0 0-.2523-.0734H4.7596a.941.941 0 0 0-.3658.0745.9203.9203 0 0 0-.3052.2102L.1246 5.9687a.4438.4438 0 0 0-.1169.2295.4375.4375 0 0 0 .0312.2544.4512.4512 0 0 0 .1692.196.4689.4689 0 0 0 .2518.0739z",
  XRP: "M5.52 2.955A3.521 3.521 0 001.996 6.48v2.558A2.12 2.12 0 010 11.157l.03.562-.03.561a2.12 2.12 0 011.996 2.121v2.948a3.69 3.69 0 003.68 3.696v-1.123a2.56 2.56 0 01-2.557-2.558v-2.963a3.239 3.239 0 00-1.42-2.682 3.26 3.26 0 001.42-2.682V6.48A2.412 2.412 0 015.52 4.078h.437V2.955zm12.538 0v1.123h.437a2.39 2.39 0 012.386 2.401v2.558a3.26 3.26 0 001.42 2.682 3.239 3.239 0 00-1.42 2.682v2.963a2.56 2.56 0 01-2.557 2.558v1.123a3.69 3.69 0 003.68-3.696V14.4A2.12 2.12 0 0124 12.281l-.03-.562.03-.561a2.12 2.12 0 01-1.996-2.12V6.478a3.518 3.518 0 00-3.509-3.524zM6.253 7.478l3.478 3.259a3.393 3.393 0 004.553 0l3.478-3.26h-1.669l-2.65 2.464a2.133 2.133 0 01-2.886 0L7.922 7.478zm5.606 4.884a3.36 3.36 0 00-2.128.886l-3.493 3.274h1.668l2.667-2.495a2.133 2.133 0 012.885 0l2.65 2.495h1.67l-3.494-3.274a3.36 3.36 0 00-2.425-.886z"
};
var GL_ICON_FILL = { BTC:"#f7931a", ETH:"#627eea", BNB:"#d99a06", SOL:"url(#glSolGrad)", XRP:"#25a4e8" };
function glCoinSVG(code){
  var fill = GL_ICON_FILL[code] || "#c99a1b";
  var grad = code === "SOL" ? '<defs><linearGradient id="glSolGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9945ff"/><stop offset="1" stop-color="#14b8a6"/></linearGradient></defs>' : "";
  var disc = code === "XRP" ? '<circle cx="12" cy="12" r="11.4" fill="#23292f"/>' : "";
  var pathFill = code === "XRP" ? "#ffffff" : fill;
  var gOpen = code === "XRP" ? '<g transform="translate(4.2 4.2) scale(0.65)">' : "<g>";
  var gClose = "</g>";
  return '<svg class="gl-coin" viewBox="0 0 24 24" role="img" aria-label="' + code + ' logo">' + grad + disc + gOpen + '<path d="' + (GL_ICON_PATHS[code] || "") + '" fill="' + pathFill + '"/>' + gClose + "</svg>";
}
function glTrendHTML(pct){
  var cls = pct > 0 ? "up" : (pct < 0 ? "down" : "flat");
  var arrow = pct > 0 ? "▲" : (pct < 0 ? "▼" : "—");
  return '<span class="trend ' + cls + '">' + arrow + " " + (pct > 0 ? "+" : "") + pct.toFixed(2) + "%</span>";
}
function renderGlobalSeed(changed){
  var grid = document.getElementById("globalGrid");
  if (!grid) return;
  changed = changed || {};
  grid.innerHTML = GLIVE.map(function(c){
    var fl = changed[c.sym] ? (changed[c.sym] > 0 ? " flash-up" : " flash-down") : "";
    return '<article class="gl-card"><div class="gl-top">' + glCoinSVG(c.code) +
      '<div class="gl-names"><span class="nm">' + c.name + '</span><span class="cd">' + c.code + " / USDT</span></div></div>" +
      '<div class="gl-price num"><span class="val' + fl + '">' + gFmt(c.price, c.dec) + '</span> <span class="unit">USDT</span></div>' +
      '<div class="gl-foot">' + glTrendHTML(c.pct) + '<span class="gl-range num">24h H ' + gFmt(c.high, c.dec) + " · L " + gFmt(c.low, c.dec) + "</span></div></article>";
  }).join("");
}
function glSetStatus(){
  var el = document.getElementById("globalStatus");
  if (!el) return;
  if (GL_LIVE){
    var t = new Date();
    var p2 = function(n){ return ("0" + n).slice(-2); };
    el.textContent = "● Live · update: " + toMyDigits(p2(t.getHours()) + ":" + p2(t.getMinutes()) + ":" + p2(t.getSeconds()));
  } else {
    el.textContent = "Binance spot နောက်ဆုံးဈေး · ၂၀၂၆-၁၀-၂၉ ၁၉:၀၉";
  }
}
renderGlobalSeed({});
glSetStatus();
setTimeout(fetchGlobal, 700);
document.addEventListener("visibilitychange", function(){ if (!document.hidden) fetchGlobal(); });
document.getElementById("convAmt").addEventListener("input", renderConverter);

/* ================= v21 additions =================
   Basic Calculator + Crypto 200+ (Binance vision, CoinGecko fallback)
   + Stocks 200+ (Yahoo v8 via direct fetch, relay fallback)
   + Lightweight Charts for the selected asset.
   No paid APIs, no hardcoded tokens. Stock logos are local files
   in logos/ (official company marks, 2026-11-06, see
   logos/SOURCES.md); tickers without a logo keep the monogram. */

/* ---------- FX change sanity: a real one-day FX move is never
   ±10%+; anything beyond that is a bad source read (e.g. INR
   -23.16% in the 2026-10-30 snapshot, where the level itself
   jumped 49.88 -> 38.33 overnight). Such values are shown as
   "—" with a note instead of a wrong-looking plunge, and are
   excluded from Top Gainers. The stored rate itself is left
   untouched — only the displayed change is guarded. ---------- */
function saneFxPct(pct){
  if (pct === null || pct === undefined || isNaN(pct)) return null;
  if (Math.abs(pct) > 10) return null;
  return pct;
}
function fxTrendHTML(pct){
  var s = saneFxPct(pct);
  if (s === null) return '<span class="trend flat" title="ပြောင်းလဲမှု အတည်မပြုနိုင်သေးပါ">—</span>';
  return '<span class="trend ' + stateOf(s) + '">' + arrow(s) + ' <span class="num">' + pctText(s) + '</span></span>';
}

/* ---------- Basic Calculator ----------
   Immediate-execution chaining (2 + 3 × 4 = 20, like a basic
   desk calculator), %, ±, C, backspace, decimals, keyboard.
   "Send" puts the result into the converter amount. ---------- */
var CALC = { cur:"0", prev:null, op:null, waiting:false, hist:"", justEq:false };
function calcFmtNum(n){
  if (!isFinite(n)) return "Error";
  if (n === 0) return "0";
  var s = Number(n.toPrecision(12)).toString();
  return s;
}
function calcShow(){
  var d = document.getElementById("calcDisp"), h = document.getElementById("calcHist");
  if (d){
    if (CALC.cur === "Error") d.textContent = "Error";
    else if (CALC.cur.indexOf(".") >= 0 && !CALC.justEq && !CALC.waiting) d.textContent = CALC.cur;
    else d.textContent = fmt(parseFloat(CALC.cur) || 0);
  }
  if (h) h.textContent = CALC.hist;
}
function calcCompute(a, op, b){
  if (op === "+") return a + b;
  if (op === "-") return a - b;
  if (op === "*") return a * b;
  if (op === "/") return b === 0 ? NaN : a / b;
  return b;
}
function calcReset(){ CALC.cur = "0"; CALC.prev = null; CALC.op = null; CALC.waiting = false; CALC.hist = ""; CALC.justEq = false; calcShow(); }
function calcInput(k){
  if (CALC.cur === "Error" && k !== "C") calcReset();
  if (k >= "0" && k <= "9"){
    if (CALC.waiting || CALC.justEq){ CALC.cur = k; CALC.waiting = false; CALC.justEq = false; }
    else if (CALC.cur.replace(/[-.]/g, "").length < 12){ CALC.cur = (CALC.cur === "0") ? k : (CALC.cur === "-0" ? "-" + k : CALC.cur + k); }
  } else if (k === "."){
    if (CALC.waiting || CALC.justEq){ CALC.cur = "0."; CALC.waiting = false; CALC.justEq = false; }
    else if (CALC.cur.indexOf(".") === -1) CALC.cur += ".";
  } else if (k === "neg"){
    if (CALC.cur !== "0") CALC.cur = CALC.cur.charAt(0) === "-" ? CALC.cur.slice(1) : "-" + CALC.cur;
  } else if (k === "back"){
    if (CALC.waiting) return;
    CALC.cur = CALC.cur.length > 1 ? CALC.cur.slice(0, -1) : "0";
    if (CALC.cur === "-" || CALC.cur === "") CALC.cur = "0";
  } else if (k === "%"){
    var v = parseFloat(CALC.cur) || 0;
    var base = (CALC.prev !== null && CALC.op) ? CALC.prev : null;
    v = (base !== null) ? base * v / 100 : v / 100;
    CALC.cur = calcFmtNum(v);
  } else if (k === "C"){ calcReset(); return; }
  else if (k === "+" || k === "-" || k === "*" || k === "/"){
    var cur = parseFloat(CALC.cur) || 0;
    if (CALC.prev !== null && CALC.op && !CALC.waiting){
      var r = calcCompute(CALC.prev, CALC.op, cur);
      CALC.prev = r; CALC.cur = calcFmtNum(r);
    } else CALC.prev = cur;
    CALC.op = k;
    var sym = k === "*" ? "×" : (k === "/" ? "÷" : (k === "-" ? "−" : "+"));
    CALC.hist = calcFmtNum(CALC.prev) + " " + sym;
    CALC.waiting = true; CALC.justEq = false;
  } else if (k === "="){
    if (CALC.op === null || CALC.prev === null) return;
    var b = parseFloat(CALC.cur) || 0;
    var res = calcCompute(CALC.prev, CALC.op, b);
    var sym2 = CALC.op === "*" ? "×" : (CALC.op === "/" ? "÷" : (CALC.op === "-" ? "−" : "+"));
    CALC.hist = calcFmtNum(CALC.prev) + " " + sym2 + " " + calcFmtNum(b) + " =";
    CALC.cur = calcFmtNum(res);
    CALC.prev = null; CALC.op = null; CALC.waiting = true; CALC.justEq = true;
  }
  calcShow();
}
(function calcInit(){
  var keys = document.getElementById("calcKeys");
  if (!keys) return;
  keys.addEventListener("click", function(e){
    var b = e.target && e.target.closest ? e.target.closest("button[data-k]") : null;
    if (!b) return;
    calcInput(b.getAttribute("data-k"));
  });
  document.addEventListener("keydown", function(e){
    var ae = document.activeElement;
    var inField = ae && (ae.tagName === "INPUT" || ae.tagName === "SELECT" || ae.tagName === "TEXTAREA");
    var inCalc = ae && document.getElementById("calcPanel") && document.getElementById("calcPanel").contains(ae);
    if (inField && !inCalc) return;
    var map = { "+":"+","-":"-","*":"*","/":"/","%":"%",".":".","Enter":"=","=":"=","Backspace":"back","Escape":"C","c":"C","C":"C" };
    if ((e.key >= "0" && e.key <= "9") || map[e.key] !== undefined){
      if (e.key === "/" ) e.preventDefault();
      calcInput((e.key >= "0" && e.key <= "9") ? e.key : map[e.key]);
    }
  });
  var send = document.getElementById("calcSend");
  if (send) send.addEventListener("click", function(){
    var v = parseFloat(CALC.cur);
    if (isNaN(v)) return;
    var amt = document.getElementById("convAmt");
    if (!amt) return;
    amt.value = (Math.abs(v) >= 1000000) ? Math.round(v) : v;
    if (typeof renderConverter === "function") renderConverter();
    var old = send.textContent;
    send.textContent = "ငွေလဲတွက်စက်ထဲ ထည့်ပြီးပါပြီ ✓";
    setTimeout(function(){ send.textContent = old; }, 2200);
  });
  calcShow();
})();

/* ---------- Crypto 200+ ----------
   Primary: ONE Binance call — GET /api/v3/ticker/24hr with no
   symbol (weight 80) on data-api.binance.vision first,
   api.binance.com fallback. All symbols arrive at once; USDT
   pairs are filtered client-side, leveraged tokens excluded,
   sorted by quote volume, top 200 kept. USDT itself is priced
   via the USDTUSD pair (≈$0.999), never USDT/USDT.
   Fallback: CoinGecko markets (one call, 250/page), polled at
   most every 60s. On Binance 429/418, back off 5 minutes.
   CoinGecko also supplies the correct coin images + names by
   symbol (never guessed IDs). ---------- */
var CRYPTO = { rows:[], page:0, perPage:24, query:"", live:false, liveSrc:"", busy:false, backoffUntil:0, cgAt:0, cgMap:{}, cgTimer:0 };
var CG_TOP_PIN = ["BTC","ETH","BNB","SOL","XRP","USDT"];
function cgMetaFor(base){
  return CRYPTO.cgMap[(base || "").toUpperCase()] || null;
}
function cryptoIconHTML(base){
  var m = cgMetaFor(base);
  if (m && m.image){
    return '<span class="gl-icwrap"><img class="gl-coin" src="' + m.image + '" alt="" loading="lazy" onerror="this.style.display=\'none\';var n=this.parentNode.querySelector(\'.mono\');if(n)n.style.display=\'flex\';"><span class="mono" style="display:none">' + base.slice(0, 2) + '</span></span>';
  }
  if (GL_ICON_PATHS && GL_ICON_PATHS[base]) return glCoinSVG(base);
  return '<span class="mono">' + base.slice(0, 2) + '</span>';
}
function cryptoName(base){
  var m = cgMetaFor(base);
  if (m && m.name) return m.name;
  if (base === "USDT") return "Tether";
  return base;
}
function cryptoDec(price){
  if (price >= 1000) return 2;
  if (price >= 1) return 2;
  if (price >= 0.01) return 4;
  return 6;
}
function renderCrypto(changed){
  var grid = document.getElementById("globalGrid");
  if (!grid) return;
  var q = (CRYPTO.query || "").toLowerCase().replace(/^\s+|\s+$/g, "");
  var list = CRYPTO.rows.filter(function(r){
    if (!q) return true;
    return r.base.toLowerCase().indexOf(q) !== -1 || cryptoName(r.base).toLowerCase().indexOf(q) !== -1;
  });
  var pages = Math.max(1, Math.ceil(list.length / CRYPTO.perPage));
  if (CRYPTO.page >= pages) CRYPTO.page = pages - 1;
  if (CRYPTO.page < 0) CRYPTO.page = 0;
  var slice = list.slice(CRYPTO.page * CRYPTO.perPage, (CRYPTO.page + 1) * CRYPTO.perPage);
  if (!slice.length){
    grid.innerHTML = '<p class="tv-hint" style="padding:26px 4px">' + (CRYPTO.live ? "ရှာမတွေ့ပါ — တခြား နာမည် သို့မဟုတ် symbol နဲ့ ထပ်ရှာကြည့်ပါ။" : "Crypto ဈေးတွေ တောင်းနေပါတယ်…") + "</p>";
  } else {
    grid.innerHTML = slice.map(function(r){
      var fl = (changed && changed[r.sym]) ? (changed[r.sym] > 0 ? " flash-up" : " flash-down") : "";
      var dec = cryptoDec(r.price);
      var sel = (typeof LW !== "undefined" && LW.asset && LW.asset.kind === "crypto" && LW.asset.sym === r.sym) ? " sel" : "";
      return '<article class="gl-card asset-card' + sel + '" data-sym="' + r.sym + '" tabindex="0" role="button" aria-label="' + cryptoName(r.base) + ' ဂရပ်ကြည့်ရန်"><div class="gl-top">' + cryptoIconHTML(r.base) +
        '<div class="gl-names"><span class="nm">' + cryptoName(r.base) + '</span><span class="cd">' + r.base + " / USDT</span></div></div>" +
        '<div class="gl-price num"><span class="val' + fl + '">' + gFmt(r.price, dec) + '</span> <span class="unit">USDT</span></div>' +
        '<div class="gl-foot">' + glTrendHTML(r.pct) + '<span class="gl-range num">24h H ' + gFmt(r.high, dec) + " · L " + gFmt(r.low, dec) + "</span></div></article>";
    }).join("");
    grid.querySelectorAll(".asset-card").forEach(function(card){
      var open = function(){
        var sym = card.getAttribute("data-sym");
        var row = null;
        for (var i = 0; i < CRYPTO.rows.length; i++) if (CRYPTO.rows[i].sym === sym){ row = CRYPTO.rows[i]; break; }
        if (row) lwShow({ kind:"crypto", sym:row.sym, base:row.base, label:cryptoName(row.base) + " (" + row.base + "/USDT)" });
      };
      card.addEventListener("click", open);
      card.addEventListener("keydown", function(e){ if (e.key === "Enter" || e.key === " "){ e.preventDefault(); open(); } });
    });
  }
  var pi = document.getElementById("glPageInfo");
  if (pi) pi.textContent = "စာမျက်နှာ " + (CRYPTO.page + 1) + " / " + pages;
  var pv = document.getElementById("glPrev"), nx = document.getElementById("glNext");
  if (pv) pv.disabled = CRYPTO.page <= 0;
  if (nx) nx.disabled = CRYPTO.page >= pages - 1;
  var gc = document.getElementById("glCount");
  if (gc) gc.textContent = CRYPTO.live ? ("Crypto " + CRYPTO.rows.length + " မျိုး · " + (CRYPTO.liveSrc === "coingecko" ? "CoinGecko" : "Binance spot") + " · စာရင်းဝင် " + list.length + " မျိုး") : "Crypto ဈေးတွေ တောင်းနေပါတယ်…";
}
function renderCryptoIfLoaded(changed){
  if (CRYPTO.rows.length){ renderCrypto(changed); return; }
  if (typeof renderGlobalSeed === "function") renderGlobalSeed(changed);
}
function cryptoSetStatus(){
  var el = document.getElementById("globalStatus");
  if (!el) return;
  if (CRYPTO.live){
    var t = new Date();
    var p2 = function(n){ return ("0" + n).slice(-2); };
    el.textContent = "● Live · " + (CRYPTO.liveSrc === "coingecko" ? "CoinGecko" : "Binance spot") + " · " + CRYPTO.rows.length + " မျိုး · update: " + toMyDigits(p2(t.getHours()) + ":" + p2(t.getMinutes()) + ":" + p2(t.getSeconds()));
  } else if (GL_LIVE){
    el.textContent = "Binance spot နောက်ဆုံးဈေး · ၂၀၂၆-၁၀-၂၉ ၁၉:၀၉";
  } else {
    el.textContent = "ချိတ်ဆက်နေပါသည်…";
  }
}
function fetchCGMarkets(replaceRows){
  var now = Date.now();
  if (now - CRYPTO.cgAt < 60000) return Promise.resolve(false);
  CRYPTO.cgAt = now;
  return fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&price_change_percentage=24h", { cache:"no-store" })
    .then(function(r){ if (!r.ok) throw new Error("bad"); return r.json(); })
    .then(function(list){
      if (!list || !list.length) return false;
      list.forEach(function(c){
        var sym = (c.symbol || "").toUpperCase();
        if (sym) CRYPTO.cgMap[sym] = { name:c.name, image:c.image, id:c.id };
      });
      if (replaceRows){
        var rows = list.slice(0, 200).map(function(c){
          var base = (c.symbol || "").toUpperCase();
          return { sym:(base === "USDT" ? "USDTUSD" : base + "USDT"), base:base, price:c.current_price, pct:(c.price_change_percentage_24h === null ? 0 : c.price_change_percentage_24h), high:c.high_24h, low:c.low_24h, vol:c.total_volume || 0 };
        });
        CRYPTO.rows = rows;
        CRYPTO.live = true; CRYPTO.liveSrc = "coingecko";
        renderCrypto({}); cryptoSetStatus();
      } else if (CRYPTO.rows.length){ renderCrypto({}); }
      return true;
    })
    .catch(function(){ return false; });
}
function fetchGlobal(){
  if (glBusy) return;
  glBusy = true;
  if (Date.now() < CRYPTO.backoffUntil){ glBusy = false; fetchCGMarkets(true); return; }
  var hosts = ["https://data-api.binance.vision", "https://api.binance.com", "https://api1.binance.com"];
  var path = "/api/v3/ticker/24hr";
  function attempt(i){
    if (i >= hosts.length){
      glBusy = false;
      fetchCGMarkets(true);
      cryptoSetStatus();
      return;
    }
    fetch(hosts[i] + path, { cache:"no-store" }).then(function(r){
      if (r.status === 429 || r.status === 418){ CRYPTO.backoffUntil = Date.now() + 5 * 60 * 1000; throw new Error("rate-limited"); }
      if (!r.ok) throw new Error("bad status");
      return r.json();
    }).then(function(all){
      if (!all || !all.length) throw new Error("empty");
      var prev = {};
      CRYPTO.rows.forEach(function(r){ prev[r.sym] = r.price; });
      var out = [];
      var usdt = null;
      all.forEach(function(row){
        var s = row.symbol;
        if (s === "USDTUSD"){ usdt = row; return; }
        if (s.slice(-4) !== "USDT") return;
        if (/(UP|DOWN|BULL|BEAR)USDT$/.test(s)) return;
        var p = parseFloat(row.lastPrice);
        if (isNaN(p) || p <= 0) return;
        out.push({ sym:s, base:s.slice(0, -4), price:p, pct:parseFloat(row.priceChangePercent) || 0, high:parseFloat(row.highPrice) || p, low:parseFloat(row.lowPrice) || p, vol:parseFloat(row.quoteVolume) || 0 });
      });
      out.sort(function(a, b){ return b.vol - a.vol; });
      out = out.slice(0, 200);
      if (usdt){
        var up = parseFloat(usdt.lastPrice);
        if (!isNaN(up) && up > 0){
          out = out.filter(function(r){ return r.base !== "USDT"; });
          out.unshift({ sym:"USDTUSD", base:"USDT", price:up, pct:parseFloat(usdt.priceChangePercent) || 0, high:parseFloat(usdt.highPrice) || up, low:parseFloat(usdt.lowPrice) || up, vol:parseFloat(usdt.quoteVolume) || 0 });
        }
      }
      CG_TOP_PIN.slice().reverse().forEach(function(base){
        var idx = -1;
        for (var k = 0; k < out.length; k++) if (out[k].base === base){ idx = k; break; }
        if (idx > 0){ var it = out.splice(idx, 1)[0]; out.unshift(it); }
      });
      var changed = {};
      out.forEach(function(r){
        if (prev[r.sym] !== undefined && prev[r.sym] !== r.price) changed[r.sym] = r.price > prev[r.sym] ? 1 : -1;
      });
      CRYPTO.rows = out;
      CRYPTO.live = true; CRYPTO.liveSrc = "binance";
      GL_LIVE = true;
      glBusy = false;
      try { bnFeedRows(all); } catch (e) {}
      renderCrypto(changed);
      cryptoSetStatus();
      fetchCGMarkets(false);
    }).catch(function(err){
      if (err && err.message === "rate-limited"){ glBusy = false; fetchCGMarkets(true); cryptoSetStatus(); return; }
      attempt(i + 1);
    });
  }
  attempt(0);
}
(function cryptoInit(){
  var s = document.getElementById("glSearch");
  if (s) s.addEventListener("input", function(){ CRYPTO.query = s.value; CRYPTO.page = 0; renderCrypto({}); });
  var pv = document.getElementById("glPrev"), nx = document.getElementById("glNext");
  if (pv) pv.addEventListener("click", function(){ if (CRYPTO.page > 0){ CRYPTO.page--; renderCrypto({}); } });
  if (nx) nx.addEventListener("click", function(){ CRYPTO.page++; renderCrypto({}); });
  renderCrypto({});
  setInterval(fetchGlobal, 30000);
  CRYPTO.cgTimer = setInterval(function(){ fetchCGMarkets(false); }, 5 * 60 * 1000);
})();

/* ---------- Stocks 200+ ----------
   There is NO free bulk endpoint for 200 live stock prices.
   Yahoo v8 chart is ONE symbol per call, so symbols are fetched
   in small batches (20 per round, max 10 concurrent), rotating
   until all are loaded, then the visible page refreshes every
   60s (per-symbol cache). Yahoo v7 bulk quote is dead
   (Unauthorized) and Stooq multi-quote is dead — neither is used.
   CORS: Yahoo may block direct browser fetch, so every call
   tries direct first and falls back to the site's existing
   relay/proxy pattern (allorigins / codetabs / jina). A failed
   batch shows an honest "updating…" state, never a fake price.
   S&P 500 (^GSPC) is Yahoo v8 only — it is on no bulk source. ---------- */
var STOCK_LIST = [
["^GSPC","S&P 500"],
["AAPL","Apple"],["MSFT","Microsoft"],["NVDA","NVIDIA"],["AMZN","Amazon"],["GOOGL","Alphabet (A)"],["GOOG","Alphabet (C)"],["META","Meta Platforms"],["TSLA","Tesla"],["AVGO","Broadcom"],["AMD","Advanced Micro Devices"],["NFLX","Netflix"],["JPM","JPMorgan Chase"],["V","Visa"],["MA","Mastercard"],["BRK.B","Berkshire Hathaway (B)"],["COST","Costco"],["PLTR","Palantir"],["ADBE","Adobe"],["CRM","Salesforce"],["ORCL","Oracle"],["IBM","IBM"],["INTC","Intel"],["QCOM","Qualcomm"],["TXN","Texas Instruments"],["AMAT","Applied Materials"],["LRCX","Lam Research"],["MU","Micron Technology"],["KLAC","KLA"],["SNPS","Synopsys"],["CDNS","Cadence Design Systems"],["CSCO","Cisco"],["ABNB","Airbnb"],["BKNG","Booking Holdings"],["EBAY","eBay"],["PYPL","PayPal"],["SHOP","Shopify"],["UBER","Uber"],["DASH","DoorDash"],["MELI","MercadoLibre"],["SE","Sea"],["BABA","Alibaba"],["JD","JD.com"],["PDD","PDD Holdings"],["BIDU","Baidu"],["NIO","NIO"],["XPEV","XPeng"],["LI","Li Auto"],["TSM","TSMC"],["ASML","ASML"],["ARM","Arm Holdings"],["SMCI","Super Micro Computer"],["DELL","Dell"],["HPQ","HP"],["WDC","Western Digital"],["STX","Seagate"],["ANET","Arista Networks"],["PANW","Palo Alto Networks"],["CRWD","CrowdStrike"],["FTNT","Fortinet"],["NET","Cloudflare"],["ZS","Zscaler"],["DDOG","Datadog"],["MDB","MongoDB"],["SNOW","Snowflake"],["BAC","Bank of America"],["WFC","Wells Fargo"],["GS","Goldman Sachs"],["MS","Morgan Stanley"],["C","Citigroup"],["AXP","American Express"],["BLK","BlackRock"],["SCHW","Charles Schwab"],["COF","Capital One"],["DIS","Walt Disney"],["NKE","Nike"],["SBUX","Starbucks"],["MCD","McDonald's"],["KO","Coca-Cola"],["PEP","PepsiCo"],["PG","Procter & Gamble"],["WMT","Walmart"],["HD","Home Depot"],["LOW","Lowe's"],["TGT","Target"],["CVS","CVS Health"],["UNH","UnitedHealth"],["JNJ","Johnson & Johnson"],["PFE","Pfizer"],["MRK","Merck"],["ABBV","AbbVie"],["LLY","Eli Lilly"],["AMGN","Amgen"],["GILD","Gilead Sciences"],["BMY","Bristol Myers Squibb"],["XOM","Exxon Mobil"],["CVX","Chevron"],["COP","ConocoPhillips"],["SLB","Schlumberger"],["EOG","EOG Resources"],["NEE","NextEra Energy"],["DUK","Duke Energy"],["SO","Southern Company"],["AEP","American Electric Power"],["LMT","Lockheed Martin"],["RTX","RTX"],["BA","Boeing"],["CAT","Caterpillar"],["DE","Deere & Company"],["GE","GE Aerospace"],["HON","Honeywell"],["MMM","3M"],["UPS","UPS"],["FDX","FedEx"],["AAL","American Airlines"],["DAL","Delta Air Lines"],["UAL","United Airlines"],["LUV","Southwest Airlines"],["MAR","Marriott"],["HLT","Hilton"],["ABT","Abbott Laboratories"],["DHR","Danaher"],["MDT","Medtronic"],["SYK","Stryker"],["ZTS","Zoetis"],["LIN","Linde"],["APD","Air Products"],["SHW","Sherwin-Williams"],["ECL","Ecolab"],["AME","AMETEK"],["EMR","Emerson Electric"],["ETN","Eaton"],["ITW","Illinois Tool Works"],["PH","Parker-Hannifin"],["ROK","Rockwell Automation"],["DOV","Dover"],["CMI","Cummins"],["PCAR","PACCAR"],["TMO","Thermo Fisher"],["ACN","Accenture"],["ADP","Automatic Data Processing"],["PAYX","Paychex"],["FIS","Fidelity National Information"],["GPN","Global Payments"],["SPGI","S&P Global"],["MCO","Moody's"],["ICE","Intercontinental Exchange"],["CME","CME Group"],["NDAQ","Nasdaq"],["CBOE","Cboe Global Markets"],["BEN","Franklin Resources"],["TROW","T. Rowe Price"],["AMP","Ameriprise Financial"],["BK","BNY Mellon"],["STT","State Street"],["MTB","M&T Bank"],["PNC","PNC Financial"],["USB","U.S. Bancorp"],["TFC","Truist Financial"],["KEY","KeyCorp"],["RF","Regions Financial"],["CFG","Citizens Financial"],["HBAN","Huntington Bancshares"],["FITB","Fifth Third Bancorp"],["ZION","Zions Bancorporation"],["WBA","Walgreens Boots Alliance"],["KR","Kroger"],["DG","Dollar General"],["DLTR","Dollar Tree"],["FIVE","Five Below"],["BURL","Burlington Stores"],["TJX","TJX Companies"],["ROST","Ross Stores"],["LULU","Lululemon"],["DECK","Deckers Outdoor"],["UAA","Under Armour"],["GPS","Gap"],["ANF","Abercrombie & Fitch"],["BBY","Best Buy"],["WHR","Whirlpool"],["LEN","Lennar"],["DHI","D.R. Horton"],["PHM","PulteGroup"],["NVR","NVR"],["KBH","KB Home"],["TOL","Toll Brothers"],["MAS","Masco"],["SWK","Stanley Black & Decker"],["X","United States Steel"],["NUE","Nucor"],["STLD","Steel Dynamics"],["CLF","Cleveland-Cliffs"],["FCX","Freeport-McMoRan"],["AA","Alcoa"],["GOLD","Barrick Gold"],["NEM","Newmont"],["SCCO","Southern Copper"],["KMB","Kimberly-Clark"],["CL","Colgate-Palmolive"],["GIS","General Mills"],["K","Kellanova"],["CPB","Campbell's"],["CAG","Conagra Brands"],["HRL","Hormel Foods"],["SJM","J.M. Smucker"],["HSY","Hershey"],["MDLZ","Mondelez"],["MNST","Monster Beverage"],["KDP","Keurig Dr Pepper"],["STZ","Constellation Brands"],["TAP","Molson Coors"],["DEO","Diageo"],["NVO","Novo Nordisk"],["AZN","AstraZeneca"],["SNY","Sanofi"],["GSK","GSK"],["BNTX","BioNTech"],["MRNA","Moderna"],["BIIB","Biogen"],["REGN","Regeneron"],["VRTX","Vertex Pharmaceuticals"],["ILMN","Illumina"],["IQV","IQVIA"],["DXCM","Dexcom"],["RMD","ResMed"],["BSX","Boston Scientific"],["EW","Edwards Lifesciences"],["BAX","Baxter"],["BDX","Becton Dickinson"],["CAH","Cardinal Health"],["MCK","McKesson"],["COR","Cencora"],["HUM","Humana"],["CI","Cigna Group"],["ELV","Elevance Health"],["CNC","Centene"],["MOH","Molina Healthcare"]
];
var STOCK = { rows:{}, page:0, perPage:24, query:"", attempted:0, loaded:0, failed:0, failedSyms:[], batchTimer:null, refreshTimer:null, retryTimer:null, done:false };
function stockName(t){
  for (var i = 0; i < STOCK_LIST.length; i++) if (STOCK_LIST[i][0] === t) return STOCK_LIST[i][1];
  return t;
}
function yahooFetchJSON(url){
  function direct(){
    return new Promise(function(res){
      var ctrl = ("AbortController" in window) ? new AbortController() : null;
      var to = setTimeout(function(){ try { if (ctrl) ctrl.abort(); } catch (e) {} }, 9000);
      var p;
      try { p = fetch(url, { signal: ctrl ? ctrl.signal : undefined, cache:"no-store" }); }
      catch (e){ clearTimeout(to); res(null); return; }
      p.then(function(r){ clearTimeout(to); if (!r.ok) throw new Error("bad"); return r.json(); })
       .then(function(j){ res(j); })
       .catch(function(){ res(null); });
    });
  }
  return direct().then(function(j){
    if (j) return j;
    /* Relay order for Yahoo JSON: jina first (200 in <1s, verified
       2026-11-06; the tolerant parse below recovers the JSON from
       the first "{" of jina's "Title / URL Source / Markdown
       Content" wrapper). allorigins + codetabs return 522 for
       Yahoo now and used to burn 20s each, so they are NOT in this
       chain anymore — one short allorigins-raw attempt is the only
       fallback. Worst case per symbol is now ~27s, not ~89s. */
    var all = relayUrls(url);
    var urls = [[all[3], 12000], [all[0], 5000]];
    var chain = Promise.resolve(null);
    urls.forEach(function(pair){
      chain = chain.then(function(got){
        if (got) return got;
        return fetchText(pair[0], pair[1]).then(function(t){
          if (!t) return null;
          try { return JSON.parse(t); } catch (e) {}
          try {
            var a = t.indexOf("{"), b = t.lastIndexOf("}");
            if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1));
          } catch (e2) {}
          return null;
        });
      });
    });
    return chain;
  });
}
function stockFetchOne(t){
  /* On-demand single-symbol v8/chart fetch: only used to upgrade a
     spark row to real OHLC candles when its chart is opened. Yahoo
     wants BRK-B, not BRK.B. */
  var url = "https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(yahooSym(t)) + "?range=5d&interval=1d&includePrePost=false";
  return yahooFetchJSON(url).then(function(j){
    var res = j && j.chart && j.chart.result && j.chart.result[0];
    var meta = res && res.meta;
    if (!meta || !(meta.regularMarketPrice > 0)) return { t:t, ok:false };
    var prev = meta.chartPreviousClose || meta.previousClose || 0;
    var price = meta.regularMarketPrice;
    var pct = (prev > 0) ? (price - prev) / prev * 100 : 0;
    var hist = null;
    try {
      var ts = res.timestamp || [];
      var q = res.indicators && res.indicators.quote && res.indicators.quote[0];
      if (ts.length && q){
        hist = [];
        for (var i = 0; i < ts.length; i++){
          if (q.close && q.close[i] !== null && q.close[i] !== undefined){
            hist.push({ time:ts[i], open:(q.open ? q.open[i] : q.close[i]), high:(q.high ? q.high[i] : q.close[i]), low:(q.low ? q.low[i] : q.close[i]), close:q.close[i] });
          }
        }
      }
    } catch (e) { hist = null; }
    return { t:t, ok:true, price:price, pct:pct, high:(meta.regularMarketDayHigh || price), low:(meta.regularMarketDayLow || price), prev:prev, hist:hist, ohlc:true, at:Date.now() };
  }).catch(function(){ return { t:t, ok:false }; });
}
/* ---------- Stock feed: Yahoo spark bulk endpoint ----------
   The per-symbol v8/chart feed (237 separate requests through jina)
   never got past ~10% in 3.5 minutes in real browsers (verified
   2026-11-06: 23/237) — jina's burst budget (~35 rapid requests) is
   blown by the page's own burst, then every symbol burns its relay
   timeouts. The spark endpoint returns up to 20 symbols in ONE
   request (verified 2026-11-06: 20 symbols via jina in <1s), so the
   whole 237-symbol list costs 12 requests instead of 237. Spark
   gives closes only (no OHLC): list price/pct/line-history come from
   spark, and the candle chart fetches the single symbol's v8/chart
   on demand (see lwLoadData). Yahoo wants BRK-B, not BRK.B. */
function yahooSym(t){ return t === "BRK.B" ? "BRK-B" : t; }
function sparkRow(t, v){
  if (!v || !(v.fulldayPrice > 0)) return { t:t, ok:false };
  var hist = null;
  try {
    var ts = v.timestamp || [], cl = v.close || [];
    if (ts.length && cl.length){
      hist = [];
      for (var i = 0; i < ts.length; i++){
        if (cl[i] !== null && cl[i] !== undefined) hist.push({ time:ts[i], open:cl[i], high:cl[i], low:cl[i], close:cl[i] });
      }
    }
  } catch (e) { hist = null; }
  return { t:t, ok:true, price:v.fulldayPrice, pct:(typeof v.fulldayChangePercent === "number" ? v.fulldayChangePercent : 0), prev:(v.chartPreviousClose || 0), high:null, low:null, hist:hist, ohlc:false, at:Date.now() };
}
function stockFetchBatch(syms){
  var q = syms.map(function(t){ return encodeURIComponent(yahooSym(t)); }).join(",");
  var url = "https://query1.finance.yahoo.com/v8/finance/spark?symbols=" + q + "&range=5d&interval=1d";
  return yahooFetchJSON(url).then(function(j){
    var out = [];
    syms.forEach(function(t){
      var v = j && j[yahooSym(t)];
      out.push(sparkRow(t, v));
    });
    return out;
  }).catch(function(){
    return syms.map(function(t){ return { t:t, ok:false }; });
  });
}
/* Single source of truth for the counters: loaded = rows with a good
   price, failed = the deduped failed-symbol set. (The old code kept
   separate ++/-- counters that drifted — the live footer once read
   17 loaded + 228 failed = 245 out of 237.) */
function stockApplyResults(results){
  results.forEach(function(r){
    if (r.ok){
      STOCK.rows[r.t] = r;
      var fi = STOCK.failedSyms.indexOf(r.t);
      if (fi >= 0) STOCK.failedSyms.splice(fi, 1);
    } else if (!STOCK.rows[r.t] && STOCK.failedSyms.indexOf(r.t) < 0) STOCK.failedSyms.push(r.t);
  });
  STOCK.loaded = Object.keys(STOCK.rows).filter(function(k){ var r = STOCK.rows[k]; return r && r.ok; }).length;
  STOCK.failed = STOCK.failedSyms.length;
}
function stockSweep(){
  if (STOCK.done) return;
  var batches = [];
  for (var i = 0; i < STOCK_LIST.length; i += 20) batches.push(STOCK_LIST.slice(i, i + 20).map(function(e){ return e[0]; }));
  var idx = 0;
  function worker(){
    if (idx >= batches.length) return Promise.resolve();
    var b = batches[idx++];
    /* A batch that fails ENTIRELY is usually a transient jina 429
       (the page's own burst + the FX fetches share jina's budget):
       retry it in place with a backoff instead of leaving all 20
       symbols to the slow 30s retry loop. A partially-ok batch is
       applied at once — only its missing symbols go to the loop. */
    function attempt(n){
      return stockFetchBatch(b).then(function(results){
        var okCount = results.filter(function(r){ return r.ok; }).length;
        if (okCount === 0 && n < 3){
          return new Promise(function(res){ setTimeout(res, 5000 * n); }).then(function(){ return attempt(n + 1); });
        }
        stockApplyResults(results);
        stockSaveCache();
        renderStocks();
        stockStatus();
      });
    }
    return attempt(1).then(worker);
  }
  var workers = [];
  for (var w = 0; w < 3; w++) workers.push(worker());
  Promise.all(workers).then(function(){
    STOCK.done = true;
    STOCK.attempted = STOCK_LIST.length;
    stockStatus();
    STOCK.refreshTimer = setInterval(stockRefreshVisible, 60000);
    /* Retry pass for the symbols that failed (jina 429s are
       transient — the budget refills) — 30s after the first sweep,
       then every 30s until everything is loaded. */
    if (STOCK.failedSyms.length) STOCK.retryTimer = setTimeout(stockRetryFailed, 30000);
  });
}
function stockSaveCache(){
  try {
    localStorage.setItem("kyatStocks", JSON.stringify({ at: Date.now(), rows: STOCK.rows }));
  } catch (e) {}
}
function stockLoadCache(){
  try {
    var c = JSON.parse(localStorage.getItem("kyatStocks") || "null");
    if (c && c.at && Date.now() - c.at < 12 * 3600 * 1000 && c.rows){
      Object.keys(c.rows).forEach(function(k){ STOCK.rows[k] = c.rows[k]; });
      STOCK.loaded = Object.keys(STOCK.rows).length;
    }
  } catch (e) {}
}
function stockRetryFailed(){
  var syms = STOCK.failedSyms.slice(0, 20);
  if (!syms.length) return;
  stockFetchBatch(syms).then(function(results){
    stockApplyResults(results);
    stockSaveCache();
    renderStocks();
    stockStatus();
    if (STOCK.failedSyms.length) STOCK.retryTimer = setTimeout(stockRetryFailed, 30000);
  });
}
function stockRefreshVisible(){
  var q = (STOCK.query || "").toLowerCase().replace(/^\s+|\s+$/g, "");
  var list = STOCK_LIST.filter(function(e){
    if (!q) return true;
    return e[0].toLowerCase().indexOf(q) !== -1 || e[1].toLowerCase().indexOf(q) !== -1;
  });
  var slice = list.slice(STOCK.page * STOCK.perPage, (STOCK.page + 1) * STOCK.perPage).map(function(e){ return e[0]; });
  var now = Date.now();
  var due = slice.filter(function(t){ var r = STOCK.rows[t]; return !r || (now - (r.at || 0) > 60000); });
  if (!due.length) return;
  /* Visible page = 24 symbols: two spark batches at most. */
  var batches = [];
  for (var i = 0; i < due.length; i += 20) batches.push(due.slice(i, i + 20));
  var chain = Promise.resolve();
  batches.forEach(function(b){
    chain = chain.then(function(){ return stockFetchBatch(b).then(function(results){ stockApplyResults(results); }); });
  });
  chain.then(function(){
    stockSaveCache();
    renderStocks();
    stockStatus();
  });
}
function stockStatus(){
  var el = document.getElementById("stockStatus");
  if (!el) return;
  var total = STOCK_LIST.length;
  if (STOCK.done){
    el.textContent = "● Live · Yahoo Finance · တင်ပြီးသား " + STOCK.loaded + " / " + total + " ခု" + (STOCK.failed ? (" · မရသေးတာ " + STOCK.failed + " ခု — နောက်တစ်ခေါက် ထပ်တောင်းပါမယ်") : "") + " · ၆၀ စက္ကန့်တစ်ခါ အပ်ဒိတ်";
  } else {
    el.textContent = "စတော့ " + total + " ခုထဲမှ " + STOCK.loaded + " ခု တင်ပြီးပါပြီ — ကျန်တာ အသုတ်လိုက် ဆက်တင်နေပါတယ်…";
  }
  var c = document.getElementById("stCount");
  if (c) c.textContent = "စတော့ " + total + " မျိုး · S&P 500 အညွှန်းကိန်း အပါအဝင်";
}
/* Stock logos: official company marks downloaded 2026-11-06 from the
   companies' own websites (see logos/SOURCES.md). Local files only --
   no Logo.dev, no token. Tickers not listed here keep the monogram.
   STOCK_LOGOS_DARK lists white-only marks, shown on a dark chip. */
var STOCK_LOGOS = {"AA":"AA.png","AAL":"AAL.svg","AAPL":"AAPL.png","ABBV":"ABBV.jpg","ABNB":"ABNB.svg","ABT":"ABT.png","ADBE":"ADBE.png","ADP":"ADP.svg","AEP":"AEP.svg","AMD":"AMD.svg","AME":"AME.png","AMGN":"AMGN.svg","AMP":"AMP.png","AMZN":"AMZN.svg","ANET":"ANET.png","ANF":"ANF.svg","APD":"APD.png","ARM":"ARM.svg","ASML":"ASML.svg","AVGO":"AVGO.svg","AXP":"AXP.svg","AZN":"AZN.png","BA":"BA.png","BABA":"BABA.png","BAC":"BAC.png","BAX":"BAX.svg","BBY":"BBY.jpg","BDX":"BDX.svg","BEN":"BEN.png","BIDU":"BIDU.png","BIIB":"BIIB.svg","BK":"BK.png","BKNG":"BKNG.svg","BLK":"BLK.svg","BMY":"BMY.svg","BNTX":"BNTX.svg","BSX":"BSX.svg","BURL":"BURL.png","C":"C.png","CAG":"CAG.png","CAH":"CAH.png","CAT":"CAT.jpg","CBOE":"CBOE.svg","CDNS":"CDNS.png","CFG":"CFG.svg","CI":"CI.svg","CL":"CL.png","CLF":"CLF.png","CMI":"CMI.svg","CNC":"CNC.svg","COF":"COF.svg","COR":"COR.png","COST":"COST.png","CPB":"CPB.svg","CRM":"CRM.svg","CRWD":"CRWD.svg","CVS":"CVS.png","CVX":"CVX.png","DAL":"DAL.svg","DASH":"DASH.svg","DDOG":"DDOG.png","DE":"DE.png","DECK":"DECK.svg","DELL":"DELL.png","DEO":"DEO.svg","DHI":"DHI.svg","DHR":"DHR.svg","DIS":"DIS.png","DLTR":"DLTR.svg","DOV":"DOV.png","DUK":"DUK.svg","DXCM":"DXCM.svg","ECL":"ECL.svg","ELV":"ELV.svg","EOG":"EOG.png","EW":"EW.svg","FCX":"FCX.svg","FDX":"FDX.png","FIS":"FIS.png","FIVE":"FIVE.svg","FTNT":"FTNT.svg","GE":"GE.svg","GILD":"GILD.png","GIS":"GIS.svg","GOLD":"GOLD.svg","GOOG":"GOOG.png","GOOGL":"GOOGL.svg","GPN":"GPN.svg","GPS":"GPS.svg","GS":"GS.png","GSK":"GSK.svg","HD":"HD.svg","HLT":"HLT.svg","HON":"HON.svg","HPQ":"HPQ.svg","HRL":"HRL.svg","HSY":"HSY.png","IBM":"IBM.png","ILMN":"ILMN.svg","INTC":"INTC.svg","IQV":"IQV.svg","ITW":"ITW.svg","JD":"JD.png","JNJ":"JNJ.png","JPM":"JPM.svg","K":"K.svg","KBH":"KBH.svg","KDP":"KDP.png","KLAC":"KLAC.svg","KMB":"KMB.svg","KO":"KO.svg","KR":"KR.svg","LEN":"LEN.svg","LI":"LI.png","LIN":"LIN.png","LLY":"LLY.svg","LMT":"LMT.svg","LOW":"LOW.svg","LRCX":"LRCX.svg","LULU":"LULU.svg","LUV":"LUV.svg","MA":"MA.png","MAR":"MAR.png","MAS":"MAS.png","MCD":"MCD.jpg","MCK":"MCK.svg","MCO":"MCO.svg","MDB":"MDB.svg","MDLZ":"MDLZ.png","MDT":"MDT.svg","MELI":"MELI.png","META":"META.svg","MMM":"MMM.svg","MNST":"MNST.png","MOH":"MOH.png","MRK":"MRK.svg","MRNA":"MRNA.svg","MS":"MS.svg","MSFT":"MSFT.png","MTB":"MTB.svg","MU":"MU.png","NDAQ":"NDAQ.svg","NEE":"NEE.png","NEM":"NEM.png","NET":"NET.svg","NFLX":"NFLX.svg","NIO":"NIO.svg","NKE":"NKE.png","NUE":"NUE.png","NVDA":"NVDA.svg","NVO":"NVO.svg","NVR":"NVR.png","ORCL":"ORCL.svg","PANW":"PANW.svg","PAYX":"PAYX.svg","PCAR":"PCAR.png","PDD":"PDD.png","PEP":"PEP.png","PFE":"PFE.svg","PG":"PG.svg","PHM":"PHM.png","PLTR":"PLTR.png","PYPL":"PYPL.svg","REGN":"REGN.svg","RF":"RF.svg","RMD":"RMD.png","ROK":"ROK.svg","RTX":"RTX.svg","SBUX":"SBUX.png","SCCO":"SCCO.png","SCHW":"SCHW.png","SE":"SE.png","SHOP":"SHOP.svg","SHW":"SHW.png","SJM":"SJM.png","SMCI":"SMCI.svg","SNOW":"SNOW.svg","SNPS":"SNPS.svg","SNY":"SNY.png","SO":"SO.svg","STLD":"STLD.png","STT":"STT.svg","STX":"STX.svg","STZ":"STZ.png","SWK":"SWK.svg","SYK":"SYK.png","TAP":"TAP.png","TFC":"TFC.svg","TGT":"TGT.svg","TJX":"TJX.svg","TMO":"TMO.svg","TOL":"TOL.svg","TSM":"TSM.png","UAA":"UAA.jpg","UAL":"UAL.svg","UBER":"UBER.png","UNH":"UNH.svg","UPS":"UPS.svg","USB":"USB.svg","V":"V.png","WBA":"WBA.png","WDC":"WDC.svg","WFC":"WFC.png","WHR":"WHR.jpg","WMT":"WMT.svg","X":"X.svg","XOM":"XOM.png","XPEV":"XPEV.svg","ZS":"ZS.svg","ZTS":"ZTS.svg"};
var STOCK_LOGOS_DARK = {"AA":1,"AMD":1,"ANET":1,"ARM":1,"DAL":1,"ECL":1,"FCX":1,"FDX":1,"GE":1,"GIS":1,"HD":1,"KR":1,"MCO":1,"MTB":1,"NEM":1,"NIO":1,"NUE":1,"NVR":1,"STX":1,"TFC":1,"UBER":1,"WMT":1,"X":1,"XPEV":1};
function stockLogoHTML(t){
  if (t === "^GSPC") return '<span class="mono">S&amp;P</span>';
  var f = STOCK_LOGOS[t];
  if (f){
    var dark = STOCK_LOGOS_DARK[t] ? " dark" : "";
    return '<span class="gl-icwrap st-logo' + dark + '"><img class="gl-coin st-img" src="logos/' + f + '" alt="" loading="lazy" onerror="this.style.display=\'none\';var n=this.parentNode.querySelector(\'.mono\');if(n)n.style.display=\'flex\';"><span class="mono" style="display:none">' + t.replace(".B", "").slice(0, 2) + '</span></span>';
  }
  return '<span class="mono">' + t.replace(".B", "").slice(0, 2) + '</span>';
}
function renderStocks(){
  var grid = document.getElementById("stockGrid");
  if (!grid) return;
  var q = (STOCK.query || "").toLowerCase().replace(/^\s+|\s+$/g, "");
  var list = STOCK_LIST.filter(function(e){
    if (!q) return true;
    return e[0].toLowerCase().indexOf(q) !== -1 || e[1].toLowerCase().indexOf(q) !== -1;
  });
  var pages = Math.max(1, Math.ceil(list.length / STOCK.perPage));
  if (STOCK.page >= pages) STOCK.page = pages - 1;
  if (STOCK.page < 0) STOCK.page = 0;
  var slice = list.slice(STOCK.page * STOCK.perPage, (STOCK.page + 1) * STOCK.perPage);
  grid.innerHTML = slice.map(function(e){
    var t = e[0], name = e[1], r = STOCK.rows[t];
    var isSP = t === "^GSPC";
    var sel = (typeof LW !== "undefined" && LW.asset && LW.asset.kind === "stock" && LW.asset.sym === t) ? " sel" : "";
    if (!r){
      return '<article class="gl-card asset-card' + (isSP ? " sp-card" : "") + sel + '" data-sym="' + t + '"><div class="gl-top">' + stockLogoHTML(t) +
        '<div class="gl-names"><span class="nm">' + name + '</span><span class="cd">' + (isSP ? "INDEX · S&P 500" : t + " · NASDAQ / NYSE") + '</span></div></div>' +
        '<div class="gl-price num"><span class="val">…</span></div>' +
        '<div class="gl-foot"><span class="trend flat">တောင်းနေသည်…</span></div></article>';
    }
    if (!r.ok){
      return '<article class="gl-card asset-card' + (isSP ? " sp-card" : "") + sel + '" data-sym="' + t + '"><div class="gl-top">' + stockLogoHTML(t) +
        '<div class="gl-names"><span class="nm">' + name + '</span><span class="cd">' + (isSP ? "INDEX · S&P 500" : t + " · NASDAQ / NYSE") + '</span></div></div>' +
        '<div class="gl-price num"><span class="val">—</span></div>' +
        '<div class="gl-foot"><span class="trend flat" title="ဒီအသုတ် တောင်းမရသေးပါ — နောက်တစ်ခေါက် ထပ်တောင်းပါမယ်">မရသေးပါ</span></div></article>';
    }
    var dec = r.price >= 1000 ? 2 : 2;
    return '<article class="gl-card asset-card' + (isSP ? " sp-card" : "") + sel + '" data-sym="' + t + '" tabindex="0" role="button" aria-label="' + name + ' ဂရပ်ကြည့်ရန်"><div class="gl-top">' + stockLogoHTML(t) +
      '<div class="gl-names"><span class="nm">' + name + '</span><span class="cd">' + (isSP ? "INDEX · S&P 500" : t + " · NASDAQ / NYSE") + '</span></div></div>' +
      '<div class="gl-price num"><span class="val">' + gFmt(r.price, dec) + '</span> <span class="unit">USD</span></div>' +
      '<div class="gl-foot">' + glTrendHTML(r.pct) + '<span class="gl-range num">Day H ' + (r.high != null ? gFmt(r.high, dec) : "—") + " · L " + (r.low != null ? gFmt(r.low, dec) : "—") + "</span></div></article>";
  }).join("");
  grid.querySelectorAll(".asset-card[data-sym]").forEach(function(card){
    var open = function(){
      var sym = card.getAttribute("data-sym");
      var r = STOCK.rows[sym];
      lwShow({ kind:"stock", sym:sym, base:sym, label:stockName(sym) + " (" + sym + ")" });
    };
    card.addEventListener("click", open);
    card.addEventListener("keydown", function(e){ if (e.key === "Enter" || e.key === " "){ e.preventDefault(); open(); } });
  });
  var pi = document.getElementById("stPageInfo");
  if (pi) pi.textContent = "စာမျက်နှာ " + (STOCK.page + 1) + " / " + pages;
  var pv = document.getElementById("stPrev"), nx = document.getElementById("stNext");
  if (pv) pv.disabled = STOCK.page <= 0;
  if (nx) nx.disabled = STOCK.page >= pages - 1;
}
(function stockInit(){
  stockLoadCache(); /* last-known prices show instantly on repeat visits */
  var s = document.getElementById("stSearch");
  if (s) s.addEventListener("input", function(){ STOCK.query = s.value; STOCK.page = 0; renderStocks(); });
  var pv = document.getElementById("stPrev"), nx = document.getElementById("stNext");
  if (pv) pv.addEventListener("click", function(){ if (STOCK.page > 0){ STOCK.page--; renderStocks(); stockRefreshVisible(); } });
  if (nx) nx.addEventListener("click", function(){ STOCK.page++; renderStocks(); stockRefreshVisible(); });
  renderStocks();
  stockStatus();
  /* The stock sweep waits 5s so the FX checks get the first shot
     at the shared relay budget — the first page is served from
     cache in the meantime, so nothing looks empty. */
  setTimeout(stockSweep, 5000);
})();

/* ---------- Lightweight Charts (TradingView) — selected asset ----------
   Lazy-loaded from jsDelivr only when first used; ONE chart
   instance, reused for every asset. Line for FX history and
   stocks; candlestick for crypto (Binance 1h uiKlines, fetched
   on demand only). The existing SVG candlestick chart is untouched
   and stays the default currency chart. ---------- */
var LW = { lib:false, loading:false, waiters:[], chart:null, series:null, seriesKind:"", asset:null, mode:"line", candleData:null, lineData:null };
var LW_CDN = "https://cdn.jsdelivr.net/npm/lightweight-charts@5/dist/lightweight-charts.standalone.production.js";
function lwEnsureLib(cb){
  if (window.LightweightCharts){ LW.lib = true; cb(true); return; }
  LW.waiters.push(cb);
  if (LW.loading) return;
  LW.loading = true;
  var sc = document.createElement("script");
  sc.src = LW_CDN;
  sc.async = true;
  sc.onload = function(){
    LW.lib = !!window.LightweightCharts; LW.loading = false;
    var w = LW.waiters; LW.waiters = [];
    w.forEach(function(f){ f(LW.lib); });
  };
  sc.onerror = function(){
    LW.loading = false;
    var w = LW.waiters; LW.waiters = [];
    w.forEach(function(f){ f(false); });
  };
  document.head.appendChild(sc);
}
function lwIsDark(){
  return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
}
function lwMakeChart(){
  var el = document.getElementById("lwChart");
  if (!el || !window.LightweightCharts) return null;
  var dark = lwIsDark();
  var chart = window.LightweightCharts.createChart(el, {
    width: el.clientWidth || 800,
    height: 320,
    layout: { background: { color: dark ? "#151515" : "#ffffff" }, textColor: dark ? "#b5b5b5" : "#4a4a4a" },
    grid: { vertLines: { color: dark ? "#2b2b2b" : "#e3e3e3" }, horzLines: { color: dark ? "#2b2b2b" : "#e3e3e3" } },
    timeScale: { timeVisible: true, secondsVisible: false },
    rightPriceScale: { borderColor: dark ? "#2b2b2b" : "#e3e3e3" }
  });
  return chart;
}
function lwSetSeries(){
  if (!LW.chart || !window.LightweightCharts) return;
  try { if (LW.series) LW.chart.removeSeries(LW.series); } catch (e) {}
  LW.series = null; LW.seriesKind = "";
  var LC = window.LightweightCharts;
  var wantCandle = LW.mode === "candle" && LW.candleData && LW.candleData.length;
  if (wantCandle){
    if (typeof LW.chart.addSeries === "function" && LC.CandlestickSeries){
      LW.series = LW.chart.addSeries(LC.CandlestickSeries, { upColor:"#1e9e50", downColor:"#ef5350", wickUpColor:"#1e9e50", wickDownColor:"#ef5350", borderVisible:false });
    } else if (typeof LW.chart.addCandlestickSeries === "function"){
      LW.series = LW.chart.addCandlestickSeries({ upColor:"#1e9e50", downColor:"#ef5350", wickUpColor:"#1e9e50", wickDownColor:"#ef5350", borderVisible:false });
    }
    if (LW.series){ LW.series.setData(LW.candleData); LW.seriesKind = "candle"; }
  }
  if (!LW.series && LW.lineData && LW.lineData.length){
    if (typeof LW.chart.addSeries === "function" && LC.LineSeries){
      LW.series = LW.chart.addSeries(LC.LineSeries, { color:"#c99a1b", lineWidth:2 });
    } else if (typeof LW.chart.addLineSeries === "function"){
      LW.series = LW.chart.addLineSeries({ color:"#c99a1b", lineWidth:2 });
    }
    if (LW.series){ LW.series.setData(LW.lineData); LW.seriesKind = "line"; }
  }
  if (LW.series){
    try { LW.chart.timeScale().fitContent(); } catch (e) {}
  }
  var cb = document.getElementById("lwCandle");
  if (cb) cb.disabled = !(LW.candleData && LW.candleData.length);
  var lb = document.getElementById("lwLine");
  if (lb) lb.setAttribute("aria-pressed", LW.seriesKind === "line" ? "true" : "false");
  if (cb) cb.setAttribute("aria-pressed", LW.seriesKind === "candle" ? "true" : "false");
}
/* Caption under the selected-item chart: must follow the Line/Candle
   mode switch, not just the first load (switching mode used to leave
   the "Line ဂရပ်" caption under a candle chart). */
function lwSetCaption(){
  var st = document.getElementById("lwStatus");
  if (!st || !LW.asset) return;
  st.textContent = LW.seriesKind === "candle"
    ? "Candle ဂရပ် — ၁ နာရီ တစ်တုံး · Binance (crypto) / Yahoo (စတော့) မှတ်တမ်း"
    : "Line ဂရပ် — ပိတ်ဈေး မှတ်တမ်း" + (LW.asset.kind === "fx" ? " · နေ့စဉ် ပိတ်ဈေးများ" : "");
}
function lwDayIdToISO(d){
  return d.slice(0, 4) + "-" + d.slice(4, 6) + "-" + d.slice(6, 8);
}
function lwLoadData(asset, done){
  LW.lineData = null; LW.candleData = null;
  if (asset.kind === "fx"){
    var key = asset.sym + "_market";
    var pts = tvParse(HISTORY[key] || "");
    LW.lineData = pts.map(function(p){ return { time: lwDayIdToISO(p.d), value: p.p }; });
    done(true);
    return;
  }
  if (asset.kind === "stock"){
    var r = STOCK.rows[asset.sym];
    if (r && r.hist && r.hist.length){
      LW.lineData = r.hist.map(function(h){ return { time: h.time, value: h.close }; });
      if (r.ohlc){
        LW.candleData = r.hist.map(function(h){ return { time: h.time, open: h.open, high: h.high, low: h.low, close: h.close }; });
      } else {
        /* Spark rows carry closes only: the line chart works now,
           and one on-demand v8/chart fetch upgrades this row to real
           OHLC candles (and Day H/L) in the background. The first
           attempt can fail (jina 429s while the page's own spark
           burst is in flight) — retry up to 3 times, 15s apart, so
           the Candle button does not stay disabled until a reload. */
        LW.candleData = null;
        if (!r.ohlcBusy){
          r.ohlcBusy = true;
          (function upgrade(attempt){
            stockFetchOne(asset.sym).then(function(fr){
              if (fr && fr.ok && fr.hist && fr.hist.length){
                r.ohlcBusy = false;
                r.hist = fr.hist; r.ohlc = true;
                r.high = fr.high; r.low = fr.low;
                stockSaveCache();
                if (LW.asset && LW.asset.sym === asset.sym) lwShow(LW.asset);
                renderStocks();
              } else if (attempt < 3){
                setTimeout(function(){ upgrade(attempt + 1); }, 15000);
              } else {
                r.ohlcBusy = false;
              }
            });
          })(1);
        }
      }
    }
    done(!!(LW.lineData && LW.lineData.length));
    return;
  }
  if (asset.kind === "crypto"){
    var hosts = ["https://data-api.binance.vision", "https://api.binance.com"];
    var path = "/api/v3/uiKlines?symbol=" + encodeURIComponent(asset.sym) + "&interval=1h&limit=100";
    (function attempt(i){
      if (i >= hosts.length){ done(!!(LW.lineData && LW.lineData.length)); return; }
      fetch(hosts[i] + path, { cache:"no-store" }).then(function(res){
        if (!res.ok) throw new Error("bad");
        return res.json();
      }).then(function(kl){
        if (!kl || !kl.length) throw new Error("empty");
        LW.candleData = kl.map(function(k){
          return { time: Math.floor(k[0] / 1000), open: parseFloat(k[1]), high: parseFloat(k[2]), low: parseFloat(k[3]), close: parseFloat(k[4]) };
        });
        LW.lineData = LW.candleData.map(function(c){ return { time: c.time, value: c.close }; });
        done(true);
      }).catch(function(){ attempt(i + 1); });
    })(0);
    return;
  }
  done(false);
}
function lwShow(asset){
  LW.asset = asset;
  var wrap = document.getElementById("lwWrap");
  if (wrap) wrap.hidden = false;
  var lab = document.getElementById("lwAsset");
  if (lab) lab.textContent = asset.label;
  var st = document.getElementById("lwStatus");
  if (st) st.textContent = "ဂရပ် တင်နေပါတယ်…";
  if (typeof renderCrypto === "function" && CRYPTO.rows.length) renderCrypto({});
  if (typeof renderStocks === "function") renderStocks();
  lwEnsureLib(function(ok){
    if (!ok){
      if (st) st.textContent = "ဂရပ်စာကြည့်တိုက် တင်မရသေးပါ — အင်တာနက် စစ်ပြီး Crypto / စတော့ ကတ်ကို ထပ်နှိပ်ကြည့်ပါ။";
      return;
    }
    if (!LW.chart){
      try { LW.chart = lwMakeChart(); } catch (e) { LW.chart = null; }
    }
    if (!LW.chart){
      if (st) st.textContent = "ဂရပ် ဖွင့်မရသေးပါ — စာမျက်နှာကို refresh လုပ်ကြည့်ပါ။";
      return;
    }
    lwLoadData(asset, function(got){
      if (!got){
        lwSetSeries(); /* clear the previous asset's chart, if any */
        if (st) st.textContent = "ဒီအရာအတွက် ဂရပ်ဒေတာ မရသေးပါ — ခဏနေမှ ထပ်ကြိုးစားပါ။";
        return;
      }
      if (LW.mode === "candle" && !(LW.candleData && LW.candleData.length)) LW.mode = "line";
      lwSetSeries();
      lwSetCaption();
    });
  });
}
(function lwInit(){
  var wrap = document.getElementById("lwWrap");
  if (!wrap) return;
  var lb = document.getElementById("lwLine"), cb = document.getElementById("lwCandle");
  function lwSwitchMode(m){
    LW.mode = m;
    if (LW.asset && (LW.lineData || LW.candleData)){ lwSetSeries(); lwSetCaption(); return; }
    if (LW.asset) lwShow(LW.asset);
    else lwSetSeries();
  }
  if (lb) lb.addEventListener("click", function(){ lwSwitchMode("line"); });
  if (cb) cb.addEventListener("click", function(){
    if (!(LW.candleData && LW.candleData.length)) return;
    lwSwitchMode("candle");
  });
  var tvLw = document.getElementById("tvLw");
  if (tvLw) tvLw.addEventListener("click", function(){
    var c = byCode(selected);
    lwShow({ kind:"fx", sym:c.code, base:c.code, label:c.name + " (" + c.code + "/MMK)" });
  });
  window.addEventListener("resize", function(){
    if (!LW.chart) return;
    var el = document.getElementById("lwChart");
    if (!el) return;
    try { LW.chart.applyOptions({ width: el.clientWidth }); } catch (e) {}
  });
})();

function setAsOf(d){
  AS_OF = d;
  var el = document.getElementById("asOfDate");
  if (el) el.textContent = d;
}
function refreshAll(){
  render(); renderConverter(); renderTable();
  if (detailCode) showDetail(byCode(detailCode), true);
  TV.key = ""; tvSetSeries();
}

/* ---------- Auto-update: Myanmar market prices follow the market ----------
   The page is taught to follow Myanmar market prices on its own:
   on every visit, whenever the tab becomes visible again, and every
   30 minutes while it stays open, it fetches the live market page for
   each currency pair and reads the visible Buy/Sell rate block on
   that page (day, buy, sell, change, change %). The market site sends no CORS
   headers, so the page asks public CORS relays in parallel and uses
   the first answer that parses; a relay that answers is preferred for
   the remaining pairs. Whenever a fetched market rate differs from
   the one on screen — a newer day, or a same-day revision — the new
   rate is applied to every surface at once (cards, converter, table,
   ticker and the chart's latest point) and the move keeps the
   green/red treatment. If every attempt fails, or nothing has
   changed, the embedded rates stay exactly as they are and the page
   keeps working. Nothing is stored: the check runs fresh each visit. */
var MARKET_PAGES = { USD:"usd-to-mmk", THB:"thb-to-mmk", CNY:"cny-to-mmk", JPY:"jpy-to-mmk", KRW:"krw-to-mmk", VND:"vnd-to-mmk", EUR:"eur-to-mmk" };
var marketBusy = false, lastMarketCheck = 0, marketRetries = 0;
/* Per-source rate freshness: the snapshot's day, and the newest day
   any live source has published. A currency's market/bank rate is
   only "today's" once its own source has stamped it with that day —
   the global AS_OF advances from the aggregate alone, which never
   updates the core pairs' market rates, so AS_OF alone must not
   certify a converter rate as current. */
var SNAP_DAY = AS_OF.replace(/-/g, ""), LATEST_DAY = SNAP_DAY;
var relayOrder = [0, 1, 2, 3];

function round2(n){ return Math.round(n * 100) / 100; }
function marketPageUrl(slug){ return "https://egcurrency.com/en/currency/" + slug + "/market"; }
function relayUrls(url){
  var enc = encodeURIComponent(url);
  /* The market page itself is never fetched directly: it sends no
     CORS headers, so the browser blocks that request every time and
     logs an error in the console for each blocked attempt. Only the
     CORS-open relays below are ever asked. */
  return [
    "https://api.allorigins.win/raw?url=" + enc,
    "https://api.allorigins.win/get?url=" + enc,
    "https://api.codetabs.com/v1/proxy?quest=" + enc,
    "https://r.jina.ai/" + url ];
}
function fetchText(url, ms, outerSignal){
  var ctrl = ("AbortController" in window) ? new AbortController() : null;
  var timer = null;
  if (ctrl){
    timer = setTimeout(function(){ try { ctrl.abort(); } catch (e) {} }, ms || 15000);
    if (outerSignal){
      if (outerSignal.aborted){ try { ctrl.abort(); } catch (e) {} }
      else if (outerSignal.addEventListener) outerSignal.addEventListener("abort", function(){ try { ctrl.abort(); } catch (e) {} });
    }
  }
  var opts = { cache:"no-store" };
  if (ctrl) opts.signal = ctrl.signal;
  var p;
  try { p = fetch(url, opts); }
  catch (e) { if (timer) clearTimeout(timer); return Promise.resolve(null); }
  /* Every failure — network down, relay error status, timeout, or a
     relay cancelled after losing the race — resolves to null here,
     so no rejection ever escapes this helper. */
  return p
    .then(function(r){ if (!r.ok) throw new Error("bad"); return r.text(); })
    .then(function(t){ if (timer) clearTimeout(timer); return t; })
    .catch(function(){ if (timer) clearTimeout(timer); return null; });
}
/* ----- Rate parsing: the visible Buy/Sell block is the truth -----
   The market page carries two different numbers for the same day:
   an embedded JSON rate inside the page data, and the Buy/Sell
   block a visitor actually sees on the rendered page. They do not
   always agree — for USD/MMK the first embedded JSON read
   4,783.33 / 4,735.50 (+0.70%) while the visible block showed the
   correct latest 4,776.66 / 4,728.89 (+0.56%). So the parser reads
   the visible block first and returns those values. An embedded
   JSON rate is accepted only as a cross-check when it matches the
   visible block; it never overwrites it. When a response carries
   embedded JSON but no visible block to verify it against, the
   parser returns null and the caller keeps the rates already on
   screen (the baked snapshot, e.g. USD buy 4,776.66 / sell
   4,728.89) instead of overwriting them with unverified values.
   The quoted unit on that page matches DATA (JPY per 100, KRW/VND
   per 1000), so verified values map straight onto the market fields. */
function parseEmbeddedJsonRate(html){
  if (!html || html.length < 200) return null;
  var dm = html.match(/"dayId":(\d{8}),"from"/);
  var rm = html.match(/"rate":\{"id":\d+,"buy":"([\d.]+)","sell":"([\d.]+)","change":"(-?[\d.]+)","changePercent":"(-?[\d.]+)"/);
  if (!dm || !rm) return null;
  var buy = parseFloat(rm[1]), sell = parseFloat(rm[2]);
  if (!(buy > 0) || !(sell > 0) || sell > buy * 1.02) return null;
  return { dayId: dm[1], buy: buy, sell: sell,
           chg: parseFloat(rm[3]), pct: round2(parseFloat(rm[4]) * 100) };
}
function ratesMatch(a, b){
  return Math.abs(a.buy - b.buy) <= 0.02 && Math.abs(a.sell - b.sell) <= 0.02;
}
/* Reader for the visible rendered Buy/Sell block. Relays return it
   in several shapes, all of which must read the same:
   "Buy 4,776.66 MMK · Sell 4,728.89 MMK · Change 26.66 · Change % ↑ 0.56%"
   "Buy, 4,776.66, MMK, Sell, 4,728.89, MMK, Change, 26.66, Change %, 0.56%"
   "Buy 4,776.66 MMK / Sell: 4,728.89 MMK" under a "2026-10-29" date.
   Markup between label and value is stripped before matching, and
   negative moves carry their sign (a ↓ arrow or a signed change). */
function visibleText(raw){
  var t = String(raw);
  t = t.replace(/<script[\s\S]*?<\/script>/gi, " ");
  t = t.replace(/<style[\s\S]*?<\/style>/gi, " ");
  t = t.replace(/<[^>]*>/g, " ");
  t = t.replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
       .replace(/&amp;/g, "&").replace(/&nbsp;/g, " ");
  return t;
}
/* Renamed from MONTHS: this month-number map previously shared
   the name with the chart's month-NAME array above and overwrote
   it, which made every chart date label print "undefined". */
var MONTH_NUM = { jan:"01", feb:"02", mar:"03", apr:"04", may:"05", jun:"06",
               jul:"07", aug:"08", sep:"09", oct:"10", nov:"11", dec:"12" };
function parseRenderedRate(text){
  if (!text || text.length < 200) return null;
  var t = visibleText(text);
  if (t.indexOf("MMK") === -1) return null;
  var bm = t.match(/Buy[\s,:]*([\d,]+(?:\.\d+)?)[\s,]*MMK/);
  var sm = t.match(/Sell[\s,:]*([\d,]+(?:\.\d+)?)[\s,]*MMK/);
  /* The Change value may carry an explicit "+" sign ("Change
     +33.33"). The old pattern allowed only an optional "-", so on
     a day when every core pair rose, the Change match failed, the
     whole visible block was rejected, the embedded JSON was then
     refused as unverified, and the 2026-10-30 rates were never
     applied — the page sat on the 2026-10-29 snapshot all day.
     Both patterns below accept "+" as well as "-". */
  var cm = t.match(/Change(?!\s*%)[\s,:]*([+-]?[\d,]+(?:\.\d+)?)/);
  var pm = t.match(/Change\s*%[\s,:]*(↑|↓)?[\s,:]*([+-]?[\d,]+(?:\.\d+)?)\s*%/);
  if (!bm || !sm || !cm) return null;
  /* The rate's own date: take the LAST date printed before the Buy
     value (the block's date sits directly above it). The old code
     took the FIRST ISO date anywhere in the page, which can be an
     unrelated earlier date; a dayId older than the snapshot then
     made applyMarketRate reject a perfectly good visible rate.
     Month-name dates ("30 Oct 2026", "Oct 30, 2026") and the page
     data's own dayId are accepted as fallbacks — the dayId supplies
     the DATE only, never a rate. */
  var dayId = null;
  var head = t.slice(0, bm.index);
  var isoAll = head.match(/\d{4}-\d{2}-\d{2}/g);
  if (isoAll && isoAll.length) dayId = isoAll[isoAll.length - 1].replace(/-/g, "");
  if (!dayId){
    var mn = head.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i)
          || head.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i);
    if (mn){
      if (/^\d/.test(mn[1])) dayId = mn[3] + MONTH_NUM[mn[2].slice(0, 3).toLowerCase()] + ("0" + mn[1]).slice(-2);
      else dayId = mn[3] + MONTH_NUM[mn[1].slice(0, 3).toLowerCase()] + ("0" + mn[2]).slice(-2);
    }
  }
  if (!dayId){
    var anyIso = t.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (anyIso) dayId = anyIso[1] + anyIso[2] + anyIso[3];
  }
  if (!dayId){
    var dj = String(text).match(/"dayId":(\d{8})/);
    if (dj) dayId = dj[1];
  }
  if (!dayId) return null;
  function num(s){ return parseFloat(String(s).replace(/,/g, "")); }
  var buy = num(bm[1]), sell = num(sm[1]), chg = num(cm[1]);
  if (!(buy > 0) || !(sell > 0) || sell > buy * 1.02) return null;
  var pct;
  if (pm){
    pct = num(pm[2]);
    if (pm[1] === "↓" && pct > 0) pct = -pct;
    if (pm[1] === "↑" && pct < 0) pct = -pct;
    if (!pm[1] && chg < 0 && pct > 0) pct = -pct;
  } else {
    /* no % in the block: derive it from the change vs the prior close */
    pct = (buy - chg) ? (chg / (buy - chg)) * 100 : 0;
  }
  return { dayId: dayId, buy: buy, sell: sell,
           chg: chg, pct: round2(pct) };
}
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
