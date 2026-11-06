var mode = "market";           /* 'market' | 'bank' */
var selected = "USD";
var convSide = "buy";
var convReverse = false;

function fmt(n, dec){
  if (dec === undefined) dec = (Math.abs(n) < 200 && n % 1 !== 0) ? 2 : (n % 1 === 0 ? 0 : 2);
  return n.toLocaleString("en-US",{minimumFractionDigits:dec, maximumFractionDigits:dec});
}
/* VND display precision: VND/MMK is quoted per 1,000 VND at ~180,
   and the published rate is an integer — so with the generic fmt()
   an integer value renders as "180" and a real small move of the
   underlying USDVND print (e.g. the pair's MMK value stepping
   180.00 -> 180.12 -> 180.34 as USDVND re-prices) collapses back to
   the same integer-looking display and reads as frozen. VND is
   therefore ALWAYS rendered with 2 decimals (180.00) on its card,
   the table, the converter, the ticker and the chart, so any real
   move the feeds print is visible at a glance. No value changes —
   only the number of decimals shown. */
function fmtFx(n, code){
  if (code === "VND") return fmt(n, 2);
  return fmt(n);
}
/* Chart variant of fmtFx: the chart always shows `selected`. */
function fmtChart(n){ return selected === "VND" ? fmt(n, 2) : fmt(n); }
function stateOf(pct){ return pct > 0 ? "up" : (pct < 0 ? "down" : "flat"); }
function arrow(pct){ return pct > 0 ? "▲" : (pct < 0 ? "▼" : "—"); }
function pctText(pct){ return (pct > 0 ? "+" : "") + pct.toFixed(2) + "%"; }
function stateWord(s){ return s === "up" ? "တက်နေသည်" : (s === "down" ? "ကျနေသည်" : "တည်ငြိမ်နေသည်"); }
function unitNote(c){ return c.unit === 1 ? ("1 " + c.code + " အတွက်") : (fmt(c.unit,0) + " " + c.code + " အတွက်"); }
function gapPct(c){ if (!c.market || !c.bank) return null; return (c.market.buy - c.bank.buy) / c.bank.buy * 100; }
function byCode(code){ for (var i=0;i<DATA.length;i++) if (DATA[i].code===code) return DATA[i]; return DATA[0]; }
/* Effective rate for the active mode: when a currency has no rate in
   the active source, the other source is used and labelled as such. */
function rateOf(c){
  if (c[mode]) return { src: mode, d: c[mode] };
  var alt = mode === "market" ? "bank" : "market";
  return { src: alt, d: c[alt] };
}
/* Live factor: the real MMK rate on screen, scaled by the real
   live move of that currency's global USD price since the feed
   anchored (Binance first, then Bybit, then a live forex feed).
   1 when the currency has no live feed — its price then stays on
   the real published MMK rate alone and is never labelled live. */
var LIVEF = {};
/* Codes whose effective live factor has genuinely CHANGED at
   least once this session (set in feedSet only when an applied
   print actually moves the factor — a discarded print or a
   level-preserving re-anchor between two quotes of the same
   pair does not count; see feedSet). The LIVE label of the
   slow / managed pairs — VND, MYR and CNY — is gated on this:
   their real prints can sit unchanged for long stretches
   (verified live 2026-10-30: USDVND's TradingView close and
   Coinbase spot both held one value across a full minute of
   polling and the chart read exactly 180 with O=H=L=C; the
   scanner's USDMYR bid/ask — 4.054 / 4.060 — never changed in
   eight polls over 72 s, and USDCNY's onshore close never
   changed at all), so these pairs may only call themselves LIVE
   once a real feed has actually moved in front of the visitor —
   before that the badge stays off and the chart reads as daily,
   exactly like a pair with no live feed. The gate also covers
   GBP, SGD, AUD and AED (added 2026-10-30 after the 23:20–23:34
   live check): their lanes are poll-based exchange / scanner
   prints that can likewise sit unchanged for a whole visit —
   GBP's and SGD's levels stepped once between reads while every
   candle still read O=H=L=C, and AUD / AED never changed at
   all — so they too must earn the LIVE label with a real changed
   print instead of wearing it from the first anchored quote. A
   pair whose feeds never answer in front of a visitor therefore
   reads နေ့စဉ် (daily) and keeps its real daily candles; it is
   never labelled live on an unmoved print. Other pairs keep the
   existing behaviour (their feeds print changed values
   constantly). */
var LIVE_MOVED = {};
var LIVE_MOVED_AT = {};
var LIVE_GATED = { VND:1, MYR:1, CNY:1, GBP:1, SGD:1, AUD:1, AED:1 };
function liveShown(code){
  if (!LIVEF[code]) return false;
  if (code === "AED"){
    /* AED freshness (added 2026-10-31): AED/USD is a hard peg
       (3.6725), so AED's real Binance midpoint and its USDTUSD
       leg can both sit unchanged for minutes at a time — a
       factor change earned once, early in a session, kept the
       LIVE label on for the whole visit while the chart sat
       flat (verified live 2026-10-31 00:43–01:04: "AED/MMK ·
       LIVE" over O=H=L=C 588.12 across two reads 80+ s apart).
       AED therefore only reads LIVE while a real applied print
       has actually moved its factor within the last 90
       seconds; once the pair has been still that long the card
       badge, the chart badge, the timeframe buttons and the
       chart header all fall back to နေ့စဉ် (daily) — the label
       is never worn over an unmoving price. flushLive and the
       1-second tick interval re-run tvBadgeUpdate, so the
       label expires on time without any new print. */
    return !!LIVE_MOVED[code] && (Date.now() - (LIVE_MOVED_AT[code] || 0) < 90000);
  }
  if (LIVE_GATED[code]) return !!LIVE_MOVED[code];
  return true;
}
function liveFactor(code){
  /* USD/MMK is the anchor itself — its factor is always 1, so its
     price only moves when a new daily rate publishes. */
  if (code === "USD") return 1;
  var f = LIVEF[code];
  if (!f || !(f.ref > 0) || !(f.cur > 0)) return 1;
  var v = f.cur / f.ref;
  if (!(v > 0.85 && v < 1.18)) return 1;
  return v;
}
function dispVal(c, d, side){ return d[side] * liveFactor(c.code); }
/* ---------- currency search (name / code / country) ---------- */
var fxQuery = "";
function fxHay(c){
  return (c.code + " " + c.en + " " + c.name + " " + (c.ctry || "") + " " + (c.kw || "")).toLowerCase();
}
function matchesFx(c){
  if (!fxQuery) return true;
  var q = fxQuery.toLowerCase().replace(/^\s+|\s+$/g, "");
  if (!q) return true;
  return fxHay(c).indexOf(q) !== -1;
}
function toMyDigits(n){ return String(n).replace(/\d/g, function(d){ return "၀၁၂၃၄၅၆၇၈၉"[+d]; }); }
function updateFxCount(shown){
  var el = document.getElementById("fxCount");
  if (!el) return;
  el.textContent = fxQuery ? (toMyDigits(shown) + " / " + toMyDigits(DATA.length) + " မျိုး") : (toMyDigits(DATA.length) + " မျိုး");
}

/* ---------- flag pair icons (TradingView style: two overlapping circles) ----------
   Every flag — the six foreign flags and the Myanmar flag — is drawn as
   inline SVG inside this single file. No external image files and no
   hotlinks, so the icons render identically everywhere, including a
   single-file deploy. */
var FLAG_UID = 0;
var STAR_PTS = "0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34";
function starAt(x, y, r, fill){
  return '<polygon points="' + STAR_PTS + '" transform="translate(' + x + ' ' + y + ') scale(' + r + ')" fill="' + fill + '"/>';
}
var FLAG_ART = {
  "AE": "<rect y=\"0.0\" width=\"48\" height=\"16.6\" fill=\"#00732F\"/><rect y=\"16.0\" width=\"48\" height=\"16.6\" fill=\"#ffffff\"/><rect y=\"32.0\" width=\"48\" height=\"16.6\" fill=\"#000000\"/><rect x=\"0\" y=\"0\" width=\"13\" height=\"48\" fill=\"#FF0000\"/>",
  "AF": "<rect x=\"0.0\" width=\"16.6\" height=\"48\" fill=\"#000000\"/><rect x=\"16.0\" width=\"16.6\" height=\"48\" fill=\"#D32011\"/><rect x=\"32.0\" width=\"16.6\" height=\"48\" fill=\"#007A36\"/><circle cx=\"24\" cy=\"24\" r=\"4.5\" fill=\"#ffffff\"/>",
  "AL": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" fill=\"#E41E20\"/><polygon points=\"24,10 29,19 37,14 34,26 29,23.5 29.5,34 24,29 18.5,34 19,23.5 14,26 11,14 19,19\" fill=\"#000000\"/>",
  "AM": "<rect y=\"0.0\" width=\"48\" height=\"16.6\" fill=\"#D90012\"/><rect y=\"16.0\" width=\"48\" height=\"16.6\" fill=\"#0033A0\"/><rect y=\"32.0\" width=\"48\" height=\"16.6\" fill=\"#F2A800\"/><rect x=\"0\" y=\"22.6\" width=\"48\" height=\"2.8\" fill=\"#F2A800\"/>",
  "AO": "<rect y=\"0.0\" width=\"48\" height=\"24.6\" fill=\"#CC092F\"/><rect y=\"24.0\" width=\"48\" height=\"24.6\" fill=\"#000000\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(24 24) scale(6)\" fill=\"#FFEC00\"/>",
  "AR": "<rect y=\"0.0\" width=\"48\" height=\"16.6\" fill=\"#74ACDF\"/><rect y=\"16.0\" width=\"48\" height=\"16.6\" fill=\"#ffffff\"/><rect y=\"32.0\" width=\"48\" height=\"16.6\" fill=\"#74ACDF\"/><circle cx=\"24\" cy=\"24\" r=\"5\" fill=\"#F6B40E\"/>",
  "AU": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" fill=\"#00247D\"/><rect width=\"24\" height=\"24\" fill=\"#012169\"/><line x1=\"0\" y1=\"0\" x2=\"24\" y2=\"24\" stroke=\"#ffffff\" stroke-width=\"4.32\"/><line x1=\"0\" y1=\"24\" x2=\"24\" y2=\"0\" stroke=\"#ffffff\" stroke-width=\"4.32\"/><line x1=\"0\" y1=\"0\" x2=\"24\" y2=\"24\" stroke=\"#C8102E\" stroke-width=\"1.44\"/><line x1=\"0\" y1=\"24\" x2=\"24\" y2=\"0\" stroke=\"#C8102E\" stroke-width=\"1.44\"/><rect x=\"8.16\" y=\"0\" width=\"7.68\" height=\"24\" fill=\"#ffffff\"/><rect x=\"0\" y=\"8.16\" width=\"24\" height=\"7.68\" fill=\"#ffffff\"/><rect x=\"9.6\" y=\"0\" width=\"4.800000000000001\" height=\"24\" fill=\"#C8102E\"/><rect x=\"0\" y=\"9.6\" width=\"24\" height=\"4.800000000000001\" fill=\"#C8102E\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(12 37) scale(5.5)\" fill=\"#ffffff\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(37 9) scale(2.6)\" fill=\"#ffffff\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(41 19) scale(2.6)\" fill=\"#ffffff\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(37 27) scale(2.6)\" fill=\"#ffffff\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(42 35) scale(2.3)\" fill=\"#ffffff\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(34.5 19) scale(2)\" fill=\"#ffffff\"/>",
  "AZ": "<rect y=\"0.0\" width=\"48\" height=\"16.6\" fill=\"#00B5E2\"/><rect y=\"16.0\" width=\"48\" height=\"16.6\" fill=\"#EF3340\"/><rect y=\"32.0\" width=\"48\" height=\"16.6\" fill=\"#509E2F\"/><path d=\"M 16 24 a 6 6 0 1 0 12 0 a 4.92 4.92 0 1 1 -12 0 Z\" fill=\"#ffffff\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(28.5 24) scale(2.6)\" fill=\"#ffffff\"/>",
  "BA": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" fill=\"#002395\"/><polygon points=\"17,5 43,31 43,43 29,43\" fill=\"#FECB00\"/>",
  "BB": "<rect x=\"0.0\" width=\"16.6\" height=\"48\" fill=\"#00267F\"/><rect x=\"16.0\" width=\"16.6\" height=\"48\" fill=\"#FFC726\"/><rect x=\"32.0\" width=\"16.6\" height=\"48\" fill=\"#00267F\"/><rect x=\"22.6\" y=\"13\" width=\"2.8\" height=\"22\" fill=\"#000000\"/><rect x=\"17.5\" y=\"15\" width=\"2.4\" height=\"11\" fill=\"#000000\"/><rect x=\"28.1\" y=\"15\" width=\"2.4\" height=\"11\" fill=\"#000000\"/><rect x=\"17.5\" y=\"15\" width=\"13\" height=\"2.4\" fill=\"#000000\"/>",
  "BD": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" fill=\"#006A4E\"/><circle cx=\"22\" cy=\"24\" r=\"11\" fill=\"#F42A41\"/>",
  "BF": "<rect y=\"0.0\" width=\"48\" height=\"24.6\" fill=\"#EF2B2D\"/><rect y=\"24.0\" width=\"48\" height=\"24.6\" fill=\"#009E49\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(24 24) scale(6.5)\" fill=\"#FCD116\"/>",
  "BN": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" fill=\"#F7E017\"/><polygon points=\"0,36 36,0 48,0 48,9 9,48 0,48\" fill=\"#ffffff\"/><polygon points=\"0,41 41,0 48,0 48,4 4,48 0,48\" fill=\"#000000\"/><circle cx=\"24\" cy=\"24\" r=\"6\" fill=\"#CF1126\"/>",
  "BO": "<rect y=\"0.0\" width=\"48\" height=\"16.6\" fill=\"#D52B1E\"/><rect y=\"16.0\" width=\"48\" height=\"16.6\" fill=\"#F9E814\"/><rect y=\"32.0\" width=\"48\" height=\"16.6\" fill=\"#007934\"/>",
  "BR": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" fill=\"#009C3B\"/><polygon points=\"24,6 43,24 24,42 5,24\" fill=\"#FFDF00\"/><circle cx=\"24\" cy=\"24\" r=\"8.5\" fill=\"#002776\"/>",
  "BS": "<rect y=\"0.0\" width=\"48\" height=\"16.6\" fill=\"#00A9CE\"/><rect y=\"16.0\" width=\"48\" height=\"16.6\" fill=\"#FFC72C\"/><rect y=\"32.0\" width=\"48\" height=\"16.6\" fill=\"#00A9CE\"/><polygon points=\"0,0 19,24 0,48\" fill=\"#000000\"/>",
  "BW": "<rect y=\"0\" width=\"48\" height=\"18.6\" fill=\"#6CACE4\"/><rect y=\"18\" width=\"48\" height=\"3.6\" fill=\"#ffffff\"/><rect y=\"21\" width=\"48\" height=\"6.6\" fill=\"#000000\"/><rect y=\"27\" width=\"48\" height=\"3.6\" fill=\"#ffffff\"/><rect y=\"30\" width=\"48\" height=\"18.6\" fill=\"#6CACE4\"/>",
  "BY": "<rect y=\"0\" width=\"48\" height=\"32.6\" fill=\"#C8102E\"/><rect y=\"32\" width=\"48\" height=\"16.6\" fill=\"#007A3D\"/><rect x=\"0\" y=\"0\" width=\"6\" height=\"48\" fill=\"#ffffff\"/><polygon points=\"3,10 5.5,16 3,22 0.5,16\" fill=\"#C8102E\"/><polygon points=\"3,28 5.5,34 3,40 0.5,34\" fill=\"#C8102E\"/>",
  "BZ": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" fill=\"#003F87\"/><rect x=\"0\" y=\"0\" width=\"48\" height=\"3.5\" fill=\"#CE1126\"/><rect x=\"0\" y=\"44.5\" width=\"48\" height=\"3.5\" fill=\"#CE1126\"/><circle cx=\"24\" cy=\"24\" r=\"11.5\" fill=\"#ffffff\"/>",
  "CA": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" fill=\"#ffffff\"/><rect x=\"0\" y=\"0\" width=\"11\" height=\"48\" fill=\"#FF0000\"/><rect x=\"37\" y=\"0\" width=\"11\" height=\"48\" fill=\"#FF0000\"/><polygon points=\"24,11 27.5,18.5 33.5,15.5 30.5,23.5 36.5,23.5 29.5,28.5 32.5,36 26.2,31.8 26.2,39.5 21.8,39.5 21.8,31.8 15.5,36 18.5,28.5 11.5,23.5 17.5,23.5 14.5,15.5 20.5,18.5\" fill=\"#FF0000\"/>",
  "CD": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" fill=\"#00A3E0\"/><line x1=\"0\" y1=\"46\" x2=\"46\" y2=\"0\" stroke=\"#F7D618\" stroke-width=\"10\"/><line x1=\"0\" y1=\"46\" x2=\"46\" y2=\"0\" stroke=\"#DC241F\" stroke-width=\"6.5\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(10 10) scale(4.4)\" fill=\"#F7D618\"/>",
  "CH": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" fill=\"#FF0000\"/><rect x=\"20.5\" y=\"13\" width=\"7\" height=\"22\" fill=\"#ffffff\"/><rect x=\"13\" y=\"20.5\" width=\"22\" height=\"7\" fill=\"#ffffff\"/>",
  "CL": "<rect x=\"0\" y=\"24\" width=\"48\" height=\"24\" fill=\"#D52B1E\"/><rect x=\"24\" y=\"0\" width=\"24\" height=\"24\" fill=\"#ffffff\"/><rect x=\"0\" y=\"0\" width=\"24\" height=\"24\" fill=\"#0039A6\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(12 12) scale(5)\" fill=\"#ffffff\"/>",
  "CM": "<rect x=\"0.0\" width=\"16.6\" height=\"48\" fill=\"#007A5E\"/><rect x=\"16.0\" width=\"16.6\" height=\"48\" fill=\"#CE1126\"/><rect x=\"32.0\" width=\"16.6\" height=\"48\" fill=\"#FCD116\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(24 24) scale(5)\" fill=\"#007A5E\"/>",
  "CN": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" fill=\"#DE2910\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(13 13) scale(7)\" fill=\"#FFDE00\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(23 6) scale(2.6)\" fill=\"#FFDE00\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(26 12) scale(2.6)\" fill=\"#FFDE00\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(26 18) scale(2.6)\" fill=\"#FFDE00\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(23 24) scale(2.6)\" fill=\"#FFDE00\"/>",
  "CZ": "<rect y=\"0.0\" width=\"48\" height=\"24.6\" fill=\"#ffffff\"/><rect y=\"24.0\" width=\"48\" height=\"24.6\" fill=\"#D7141A\"/><polygon points=\"0,0 20,24 0,48\" fill=\"#11457E\"/>",
  "DJ": "<rect y=\"0.0\" width=\"48\" height=\"24.6\" fill=\"#6AB2E7\"/><rect y=\"24.0\" width=\"48\" height=\"24.6\" fill=\"#33B733\"/><polygon points=\"0,0 21,24 0,48\" fill=\"#ffffff\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(8.5 24) scale(3.6)\" fill=\"#D21034\"/>",
  "DK": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" fill=\"#C8102E\"/><rect x=\"15\" y=\"0\" width=\"6\" height=\"48\" fill=\"#ffffff\"/><rect x=\"0\" y=\"21\" width=\"48\" height=\"6\" fill=\"#ffffff\"/>",
  "EG": "<rect y=\"0.0\" width=\"48\" height=\"16.6\" fill=\"#CE1126\"/><rect y=\"16.0\" width=\"48\" height=\"16.6\" fill=\"#ffffff\"/><rect y=\"32.0\" width=\"48\" height=\"16.6\" fill=\"#000000\"/><rect x=\"20.5\" y=\"21\" width=\"7\" height=\"6\" fill=\"#C09300\"/>",
  "ET": "<rect y=\"0.0\" width=\"48\" height=\"16.6\" fill=\"#078930\"/><rect y=\"16.0\" width=\"48\" height=\"16.6\" fill=\"#FCDD09\"/><rect y=\"32.0\" width=\"48\" height=\"16.6\" fill=\"#DA121A\"/><circle cx=\"24\" cy=\"24\" r=\"8.5\" fill=\"#0F47AF\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(24 24) scale(3.6)\" fill=\"#FCDD09\"/>",
  "EU": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" fill=\"#003399\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(24.0 10.5) scale(2.3)\" fill=\"#FFCC00\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(30.8 12.3) scale(2.3)\" fill=\"#FFCC00\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(35.7 17.2) scale(2.3)\" fill=\"#FFCC00\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(37.5 24.0) scale(2.3)\" fill=\"#FFCC00\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(35.7 30.7) scale(2.3)\" fill=\"#FFCC00\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(30.8 35.7) scale(2.3)\" fill=\"#FFCC00\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(24.0 37.5) scale(2.3)\" fill=\"#FFCC00\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(17.3 35.7) scale(2.3)\" fill=\"#FFCC00\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(12.3 30.8) scale(2.3)\" fill=\"#FFCC00\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(10.5 24.0) scale(2.3)\" fill=\"#FFCC00\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(12.3 17.2) scale(2.3)\" fill=\"#FFCC00\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(17.2 12.3) scale(2.3)\" fill=\"#FFCC00\"/>",
  "FJ": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" fill=\"#68BFE5\"/><rect width=\"24\" height=\"24\" fill=\"#012169\"/><line x1=\"0\" y1=\"0\" x2=\"24\" y2=\"24\" stroke=\"#ffffff\" stroke-width=\"4.32\"/><line x1=\"0\" y1=\"24\" x2=\"24\" y2=\"0\" stroke=\"#ffffff\" stroke-width=\"4.32\"/><line x1=\"0\" y1=\"0\" x2=\"24\" y2=\"24\" stroke=\"#C8102E\" stroke-width=\"1.44\"/><line x1=\"0\" y1=\"24\" x2=\"24\" y2=\"0\" stroke=\"#C8102E\" stroke-width=\"1.44\"/><rect x=\"8.16\" y=\"0\" width=\"7.68\" height=\"24\" fill=\"#ffffff\"/><rect x=\"0\" y=\"8.16\" width=\"24\" height=\"7.68\" fill=\"#ffffff\"/><rect x=\"9.6\" y=\"0\" width=\"4.800000000000001\" height=\"24\" fill=\"#C8102E\"/><rect x=\"0\" y=\"9.6\" width=\"24\" height=\"4.800000000000001\" fill=\"#C8102E\"/><rect x=\"31\" y=\"15\" width=\"12\" height=\"17\" fill=\"#ffffff\"/><rect x=\"35.8\" y=\"15\" width=\"2.4\" height=\"17\" fill=\"#D21034\"/><rect x=\"31\" y=\"22.3\" width=\"12\" height=\"2.4\" fill=\"#D21034\"/>",
  "GB": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" fill=\"#012169\"/><line x1=\"0\" y1=\"0\" x2=\"48\" y2=\"48\" stroke=\"#ffffff\" stroke-width=\"9\"/><line x1=\"0\" y1=\"48\" x2=\"48\" y2=\"0\" stroke=\"#ffffff\" stroke-width=\"9\"/><line x1=\"0\" y1=\"0\" x2=\"48\" y2=\"48\" stroke=\"#C8102E\" stroke-width=\"3.2\"/><line x1=\"0\" y1=\"48\" x2=\"48\" y2=\"0\" stroke=\"#C8102E\" stroke-width=\"3.2\"/><rect x=\"19\" y=\"0\" width=\"10\" height=\"48\" fill=\"#ffffff\"/><rect x=\"0\" y=\"19\" width=\"48\" height=\"10\" fill=\"#ffffff\"/><rect x=\"21\" y=\"0\" width=\"6\" height=\"48\" fill=\"#C8102E\"/><rect x=\"0\" y=\"21\" width=\"48\" height=\"6\" fill=\"#C8102E\"/>",
  "GE": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" fill=\"#ffffff\"/><rect x=\"20\" y=\"0\" width=\"8\" height=\"48\" fill=\"#FF0000\"/><rect x=\"0\" y=\"20\" width=\"48\" height=\"8\" fill=\"#FF0000\"/><rect x=\"10\" y=\"8\" width=\"2\" height=\"6\" fill=\"#FF0000\"/><rect x=\"8\" y=\"10\" width=\"6\" height=\"2\" fill=\"#FF0000\"/><rect x=\"36\" y=\"8\" width=\"2\" height=\"6\" fill=\"#FF0000\"/><rect x=\"34\" y=\"10\" width=\"6\" height=\"2\" fill=\"#FF0000\"/><rect x=\"10\" y=\"34\" width=\"2\" height=\"6\" fill=\"#FF0000\"/><rect x=\"8\" y=\"36\" width=\"6\" height=\"2\" fill=\"#FF0000\"/><rect x=\"36\" y=\"34\" width=\"2\" height=\"6\" fill=\"#FF0000\"/><rect x=\"34\" y=\"36\" width=\"6\" height=\"2\" fill=\"#FF0000\"/>",
  "GH": "<rect y=\"0.0\" width=\"48\" height=\"16.6\" fill=\"#CE1126\"/><rect y=\"16.0\" width=\"48\" height=\"16.6\" fill=\"#FCD116\"/><rect y=\"32.0\" width=\"48\" height=\"16.6\" fill=\"#006B3F\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(24 24) scale(6.5)\" fill=\"#000000\"/>",
  "GN": "<rect x=\"0.0\" width=\"16.6\" height=\"48\" fill=\"#CE1126\"/><rect x=\"16.0\" width=\"16.6\" height=\"48\" fill=\"#FCD116\"/><rect x=\"32.0\" width=\"16.6\" height=\"48\" fill=\"#009460\"/>",
  "HK": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" fill=\"#DE2910\"/><circle cx=\"24.0\" cy=\"17.8\" r=\"3.4\" fill=\"#ffffff\"/><circle cx=\"29.9\" cy=\"22.1\" r=\"3.4\" fill=\"#ffffff\"/><circle cx=\"27.6\" cy=\"29.0\" r=\"3.4\" fill=\"#ffffff\"/><circle cx=\"20.4\" cy=\"29.0\" r=\"3.4\" fill=\"#ffffff\"/><circle cx=\"18.1\" cy=\"22.1\" r=\"3.4\" fill=\"#ffffff\"/><circle cx=\"24\" cy=\"24\" r=\"2.2\" fill=\"#ffffff\"/>",
  "HT": "<rect y=\"0.0\" width=\"48\" height=\"24.6\" fill=\"#00209F\"/><rect y=\"24.0\" width=\"48\" height=\"24.6\" fill=\"#D21034\"/><rect x=\"18\" y=\"17\" width=\"12\" height=\"14\" fill=\"#ffffff\"/>",
  "HU": "<rect y=\"0.0\" width=\"48\" height=\"16.6\" fill=\"#CE1126\"/><rect y=\"16.0\" width=\"48\" height=\"16.6\" fill=\"#ffffff\"/><rect y=\"32.0\" width=\"48\" height=\"16.6\" fill=\"#436F4D\"/>",
  "ID": "<rect y=\"0.0\" width=\"48\" height=\"24.6\" fill=\"#E70011\"/><rect y=\"24.0\" width=\"48\" height=\"24.6\" fill=\"#ffffff\"/>",
  "IL": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" fill=\"#ffffff\"/><rect x=\"0\" y=\"7\" width=\"48\" height=\"5\" fill=\"#0038b8\"/><rect x=\"0\" y=\"36\" width=\"48\" height=\"5\" fill=\"#0038b8\"/><polygon points=\"24,16.5 30.5,28 17.5,28\" fill=\"none\" stroke=\"#0038b8\" stroke-width=\"1.7\"/><polygon points=\"24,31.5 17.5,20 30.5,20\" fill=\"none\" stroke=\"#0038b8\" stroke-width=\"1.7\"/>",
  "IN": "<rect y=\"0.0\" width=\"48\" height=\"16.6\" fill=\"#FF9933\"/><rect y=\"16.0\" width=\"48\" height=\"16.6\" fill=\"#ffffff\"/><rect y=\"32.0\" width=\"48\" height=\"16.6\" fill=\"#138808\"/><circle cx=\"24\" cy=\"24\" r=\"5.6\" fill=\"#ffffff\" stroke=\"#000080\" stroke-width=\"1.8\"/><circle cx=\"24\" cy=\"24\" r=\"1.6\" fill=\"#000080\"/>",
  "IQ": "<rect y=\"0.0\" width=\"48\" height=\"16.6\" fill=\"#CE1126\"/><rect y=\"16.0\" width=\"48\" height=\"16.6\" fill=\"#ffffff\"/><rect y=\"32.0\" width=\"48\" height=\"16.6\" fill=\"#000000\"/><rect x=\"19\" y=\"21.5\" width=\"10\" height=\"2.2\" fill=\"#007A3D\"/><rect x=\"21\" y=\"25\" width=\"6\" height=\"2\" fill=\"#007A3D\"/>",
  "IS": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" fill=\"#02529C\"/><rect x=\"13.5\" y=\"0\" width=\"9\" height=\"48\" fill=\"#ffffff\"/><rect x=\"0\" y=\"19.5\" width=\"48\" height=\"9\" fill=\"#ffffff\"/><rect x=\"15.75\" y=\"0\" width=\"4.5\" height=\"48\" fill=\"#DC1E35\"/><rect x=\"0\" y=\"21.75\" width=\"48\" height=\"4.5\" fill=\"#DC1E35\"/>",
  "JO": "<rect y=\"0.0\" width=\"48\" height=\"16.6\" fill=\"#000000\"/><rect y=\"16.0\" width=\"48\" height=\"16.6\" fill=\"#ffffff\"/><rect y=\"32.0\" width=\"48\" height=\"16.6\" fill=\"#007A3D\"/><polygon points=\"0,0 20,24 0,48\" fill=\"#CE1126\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(7.5 24) scale(2.9)\" fill=\"#ffffff\"/>",
  "JP": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" fill=\"#ffffff\"/><circle cx=\"24\" cy=\"24\" r=\"10\" fill=\"#BC002D\"/>",
  "KE": "<rect y=\"0\" width=\"48\" height=\"15.0\" fill=\"#000000\"/><rect y=\"14.4\" width=\"48\" height=\"3.0\" fill=\"#ffffff\"/><rect y=\"16.8\" width=\"48\" height=\"15.0\" fill=\"#922529\"/><rect y=\"31.200000000000003\" width=\"48\" height=\"3.0\" fill=\"#ffffff\"/><rect y=\"33.6\" width=\"48\" height=\"15.0\" fill=\"#006600\"/><ellipse cx=\"24\" cy=\"24\" rx=\"5.5\" ry=\"14\" fill=\"#922529\"/><ellipse cx=\"24\" cy=\"24\" rx=\"2\" ry=\"14\" fill=\"#ffffff\"/>",
  "KG": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" fill=\"#E8112D\"/><circle cx=\"24\" cy=\"24\" r=\"10.5\" fill=\"#FFEF00\"/><circle cx=\"24\" cy=\"24\" r=\"5.6\" fill=\"#E8112D\"/><circle cx=\"24\" cy=\"24\" r=\"5.6\" fill=\"none\" stroke=\"#FFEF00\" stroke-width=\"1.2\"/>",
  "KH": "<rect y=\"0\" width=\"48\" height=\"12.6\" fill=\"#032EA1\"/><rect y=\"12\" width=\"48\" height=\"24.6\" fill=\"#E00025\"/><rect y=\"36\" width=\"48\" height=\"12.6\" fill=\"#032EA1\"/><rect x=\"17\" y=\"21\" width=\"14\" height=\"8\" fill=\"#ffffff\"/><rect x=\"19.5\" y=\"16\" width=\"2.8\" height=\"6\" fill=\"#ffffff\"/><rect x=\"22.6\" y=\"14\" width=\"2.8\" height=\"8\" fill=\"#ffffff\"/><rect x=\"25.7\" y=\"16\" width=\"2.8\" height=\"6\" fill=\"#ffffff\"/>",
  "KM": "<rect y=\"0\" width=\"48\" height=\"12.6\" fill=\"#FFD100\"/><rect y=\"12\" width=\"48\" height=\"12.6\" fill=\"#ffffff\"/><rect y=\"24\" width=\"48\" height=\"12.6\" fill=\"#EF3340\"/><rect y=\"36\" width=\"48\" height=\"12.6\" fill=\"#003DA5\"/><polygon points=\"0,0 19,24 0,48\" fill=\"#009639\"/><path d=\"M 3.5999999999999996 24 a 4.4 4.4 0 1 0 8.8 0 a 3.61 3.61 0 1 1 -8.8 0 Z\" fill=\"#ffffff\"/>",
  "KR": "<rect width=\"48\" height=\"48\" fill=\"#ffffff\"/><circle cx=\"24\" cy=\"24\" r=\"11\" fill=\"#0047A0\"/><path d=\"M13 24a11 11 0 0 1 22 0Z\" fill=\"#CD2E3A\"/><circle cx=\"18.5\" cy=\"24\" r=\"5.5\" fill=\"#CD2E3A\"/><circle cx=\"29.5\" cy=\"24\" r=\"5.5\" fill=\"#0047A0\"/><rect x=\"3\" y=\"3.0\" width=\"7\" height=\"1.6\" fill=\"#111111\"/><rect x=\"3\" y=\"5.8\" width=\"7\" height=\"1.6\" fill=\"#111111\"/><rect x=\"3\" y=\"8.6\" width=\"7\" height=\"1.6\" fill=\"#111111\"/><rect x=\"38\" y=\"3.0\" width=\"7\" height=\"1.6\" fill=\"#111111\"/><rect x=\"38\" y=\"5.8\" width=\"7\" height=\"1.6\" fill=\"#111111\"/><rect x=\"38\" y=\"8.6\" width=\"7\" height=\"1.6\" fill=\"#111111\"/><rect x=\"3\" y=\"38.0\" width=\"7\" height=\"1.6\" fill=\"#111111\"/><rect x=\"3\" y=\"40.8\" width=\"7\" height=\"1.6\" fill=\"#111111\"/><rect x=\"3\" y=\"43.6\" width=\"7\" height=\"1.6\" fill=\"#111111\"/><rect x=\"38\" y=\"38.0\" width=\"7\" height=\"1.6\" fill=\"#111111\"/><rect x=\"38\" y=\"40.8\" width=\"7\" height=\"1.6\" fill=\"#111111\"/><rect x=\"38\" y=\"43.6\" width=\"7\" height=\"1.6\" fill=\"#111111\"/>",
  "KW": "<rect y=\"0.0\" width=\"48\" height=\"12.6\" fill=\"#007A3D\"/><rect y=\"12.0\" width=\"48\" height=\"12.6\" fill=\"#ffffff\"/><rect y=\"24.0\" width=\"48\" height=\"12.6\" fill=\"#CE1126\"/><rect y=\"36.0\" width=\"48\" height=\"12.6\" fill=\"#000000\"/><polygon points=\"0,0 14,12 14,36 0,48\" fill=\"#000000\"/>",
  "KY": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" fill=\"#00247D\"/><rect width=\"24\" height=\"24\" fill=\"#012169\"/><line x1=\"0\" y1=\"0\" x2=\"24\" y2=\"24\" stroke=\"#ffffff\" stroke-width=\"4.32\"/><line x1=\"0\" y1=\"24\" x2=\"24\" y2=\"0\" stroke=\"#ffffff\" stroke-width=\"4.32\"/><line x1=\"0\" y1=\"0\" x2=\"24\" y2=\"24\" stroke=\"#C8102E\" stroke-width=\"1.44\"/><line x1=\"0\" y1=\"24\" x2=\"24\" y2=\"0\" stroke=\"#C8102E\" stroke-width=\"1.44\"/><rect x=\"8.16\" y=\"0\" width=\"7.68\" height=\"24\" fill=\"#ffffff\"/><rect x=\"0\" y=\"8.16\" width=\"24\" height=\"7.68\" fill=\"#ffffff\"/><rect x=\"9.6\" y=\"0\" width=\"4.800000000000001\" height=\"24\" fill=\"#C8102E\"/><rect x=\"0\" y=\"9.6\" width=\"24\" height=\"4.800000000000001\" fill=\"#C8102E\"/><circle cx=\"36\" cy=\"34\" r=\"6\" fill=\"#ffffff\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(36 34) scale(3.4)\" fill=\"#CF142B\"/>",
  "KZ": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" fill=\"#00AFCA\"/><rect x=\"2.5\" y=\"0\" width=\"3.5\" height=\"48\" fill=\"#FEC50C\"/><circle cx=\"23\" cy=\"24\" r=\"8.5\" fill=\"#FEC50C\"/><polygon points=\"14,31 32,31 23,37\" fill=\"#FEC50C\"/>",
  "LA": "<rect y=\"0\" width=\"48\" height=\"12.6\" fill=\"#CE1126\"/><rect y=\"12\" width=\"48\" height=\"24.6\" fill=\"#002868\"/><rect y=\"36\" width=\"48\" height=\"12.6\" fill=\"#CE1126\"/><circle cx=\"24\" cy=\"24\" r=\"8\" fill=\"#ffffff\"/>",
  "LK": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" fill=\"#8D153A\"/><rect x=\"3\" y=\"3\" width=\"42\" height=\"42\" fill=\"none\"/><rect x=\"4\" y=\"4\" width=\"5.5\" height=\"40\" fill=\"#00534E\"/><rect x=\"10.5\" y=\"4\" width=\"5.5\" height=\"40\" fill=\"#EB7400\"/><circle cx=\"32\" cy=\"24\" r=\"7.5\" fill=\"#FFBE29\"/>",
  "LR": "<rect x=\"0\" y=\"0.0\" width=\"48\" height=\"4.8\" fill=\"#BF0A30\"/><rect x=\"0\" y=\"4.36\" width=\"48\" height=\"4.8\" fill=\"#ffffff\"/><rect x=\"0\" y=\"8.73\" width=\"48\" height=\"4.8\" fill=\"#BF0A30\"/><rect x=\"0\" y=\"13.09\" width=\"48\" height=\"4.8\" fill=\"#ffffff\"/><rect x=\"0\" y=\"17.45\" width=\"48\" height=\"4.8\" fill=\"#BF0A30\"/><rect x=\"0\" y=\"21.82\" width=\"48\" height=\"4.8\" fill=\"#ffffff\"/><rect x=\"0\" y=\"26.18\" width=\"48\" height=\"4.8\" fill=\"#BF0A30\"/><rect x=\"0\" y=\"30.55\" width=\"48\" height=\"4.8\" fill=\"#ffffff\"/><rect x=\"0\" y=\"34.91\" width=\"48\" height=\"4.8\" fill=\"#BF0A30\"/><rect x=\"0\" y=\"39.27\" width=\"48\" height=\"4.8\" fill=\"#ffffff\"/><rect x=\"0\" y=\"43.64\" width=\"48\" height=\"4.8\" fill=\"#BF0A30\"/><rect x=\"0\" y=\"0\" width=\"20\" height=\"21.8\" fill=\"#002868\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(10 10.9) scale(4)\" fill=\"#ffffff\"/>",
  "MG": "<rect x=\"0\" y=\"0\" width=\"16\" height=\"48\" fill=\"#ffffff\"/><rect x=\"16\" y=\"0\" width=\"32\" height=\"24\" fill=\"#FC3D32\"/><rect x=\"16\" y=\"24\" width=\"32\" height=\"24\" fill=\"#007E3A\"/>",
  "MM": "<rect y=\"0.0\" width=\"48\" height=\"16.6\" fill=\"#FECB00\"/><rect y=\"16.0\" width=\"48\" height=\"16.6\" fill=\"#34B233\"/><rect y=\"32.0\" width=\"48\" height=\"16.6\" fill=\"#EA2839\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(24 24) scale(11)\" fill=\"#ffffff\"/>",
  "MN": "<rect x=\"0.0\" width=\"16.6\" height=\"48\" fill=\"#DA2032\"/><rect x=\"16.0\" width=\"16.6\" height=\"48\" fill=\"#0066B3\"/><rect x=\"32.0\" width=\"16.6\" height=\"48\" fill=\"#DA2032\"/><rect x=\"5.5\" y=\"9\" width=\"5\" height=\"3\" fill=\"#FFD900\"/><circle cx=\"8\" cy=\"16.5\" r=\"2.7\" fill=\"#FFD900\"/><rect x=\"6.6\" y=\"21\" width=\"2.8\" height=\"7\" fill=\"#FFD900\"/><polygon points=\"5.5,31 10.5,31 8,35.5\" fill=\"#FFD900\"/>",
  "MO": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" fill=\"#067662\"/><circle cx=\"24\" cy=\"15\" r=\"2.2\" fill=\"#FFDF1B\"/><ellipse cx=\"13.6\" cy=\"27\" rx=\"3.4\" ry=\"6.5\" fill=\"#ffffff\"/><ellipse cx=\"18.8\" cy=\"27\" rx=\"3.4\" ry=\"6.5\" fill=\"#ffffff\"/><ellipse cx=\"24.0\" cy=\"27\" rx=\"3.4\" ry=\"6.5\" fill=\"#ffffff\"/><ellipse cx=\"29.2\" cy=\"27\" rx=\"3.4\" ry=\"6.5\" fill=\"#ffffff\"/><ellipse cx=\"34.4\" cy=\"27\" rx=\"3.4\" ry=\"6.5\" fill=\"#ffffff\"/><rect x=\"13\" y=\"36\" width=\"22\" height=\"2\" fill=\"#ffffff\"/>",
  "MW": "<rect y=\"0.0\" width=\"48\" height=\"16.6\" fill=\"#000000\"/><rect y=\"16.0\" width=\"48\" height=\"16.6\" fill=\"#CE1126\"/><rect y=\"32.0\" width=\"48\" height=\"16.6\" fill=\"#339E35\"/><circle cx=\"24\" cy=\"13\" r=\"6.5\" fill=\"#CE1126\"/>",
  "MX": "<rect x=\"0.0\" width=\"16.6\" height=\"48\" fill=\"#006847\"/><rect x=\"16.0\" width=\"16.6\" height=\"48\" fill=\"#ffffff\"/><rect x=\"32.0\" width=\"16.6\" height=\"48\" fill=\"#CE1126\"/><circle cx=\"24\" cy=\"24\" r=\"3.6\" fill=\"#B8860B\"/>",
  "MY": "<rect x=\"0\" y=\"0.0\" width=\"48\" height=\"3.9\" fill=\"#CC0001\"/><rect x=\"0\" y=\"3.43\" width=\"48\" height=\"3.9\" fill=\"#ffffff\"/><rect x=\"0\" y=\"6.86\" width=\"48\" height=\"3.9\" fill=\"#CC0001\"/><rect x=\"0\" y=\"10.29\" width=\"48\" height=\"3.9\" fill=\"#ffffff\"/><rect x=\"0\" y=\"13.71\" width=\"48\" height=\"3.9\" fill=\"#CC0001\"/><rect x=\"0\" y=\"17.14\" width=\"48\" height=\"3.9\" fill=\"#ffffff\"/><rect x=\"0\" y=\"20.57\" width=\"48\" height=\"3.9\" fill=\"#CC0001\"/><rect x=\"0\" y=\"24.0\" width=\"48\" height=\"3.9\" fill=\"#ffffff\"/><rect x=\"0\" y=\"27.43\" width=\"48\" height=\"3.9\" fill=\"#CC0001\"/><rect x=\"0\" y=\"30.86\" width=\"48\" height=\"3.9\" fill=\"#ffffff\"/><rect x=\"0\" y=\"34.29\" width=\"48\" height=\"3.9\" fill=\"#CC0001\"/><rect x=\"0\" y=\"37.71\" width=\"48\" height=\"3.9\" fill=\"#ffffff\"/><rect x=\"0\" y=\"41.14\" width=\"48\" height=\"3.9\" fill=\"#CC0001\"/><rect x=\"0\" y=\"44.57\" width=\"48\" height=\"3.9\" fill=\"#ffffff\"/><rect x=\"0\" y=\"0\" width=\"25\" height=\"24\" fill=\"#010066\"/><path d=\"M 4.5 12 a 6 6 0 1 0 12 0 a 4.92 4.92 0 1 1 -12 0 Z\" fill=\"#FFCC00\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(18.5 12) scale(3.6)\" fill=\"#FFCC00\"/>",
  "MZ": "<rect y=\"0\" width=\"48\" height=\"12.6\" fill=\"#009A44\"/><rect y=\"12\" width=\"48\" height=\"3.6\" fill=\"#ffffff\"/><rect y=\"15\" width=\"48\" height=\"12.6\" fill=\"#000000\"/><rect y=\"27\" width=\"48\" height=\"3.6\" fill=\"#ffffff\"/><rect y=\"30\" width=\"48\" height=\"18.6\" fill=\"#FFEC00\"/><polygon points=\"0,0 17,24 0,48\" fill=\"#EF3340\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(6.5 24) scale(2.8)\" fill=\"#ffffff\"/>",
  "NA": "<polygon points=\"0,0 48,0 0,48\" fill=\"#003580\"/><polygon points=\"0,48 48,48 48,0\" fill=\"#009A44\"/><line x1=\"0\" y1=\"48\" x2=\"48\" y2=\"0\" stroke=\"#ffffff\" stroke-width=\"12\"/><line x1=\"0\" y1=\"48\" x2=\"48\" y2=\"0\" stroke=\"#D21034\" stroke-width=\"7\"/><circle cx=\"11\" cy=\"11\" r=\"5\" fill=\"#FFCE00\"/>",
  "NG": "<rect x=\"0.0\" width=\"16.6\" height=\"48\" fill=\"#008751\"/><rect x=\"16.0\" width=\"16.6\" height=\"48\" fill=\"#ffffff\"/><rect x=\"32.0\" width=\"16.6\" height=\"48\" fill=\"#008751\"/>",
  "NO": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" fill=\"#BA0C2F\"/><rect x=\"13.5\" y=\"0\" width=\"9\" height=\"48\" fill=\"#ffffff\"/><rect x=\"0\" y=\"19.5\" width=\"48\" height=\"9\" fill=\"#ffffff\"/><rect x=\"15.75\" y=\"0\" width=\"4.5\" height=\"48\" fill=\"#00205B\"/><rect x=\"0\" y=\"21.75\" width=\"48\" height=\"4.5\" fill=\"#00205B\"/>",
  "NP": "<polygon points=\"9,3 36,19 15,23 40,41 9,45\" fill=\"#DC143C\"/><polygon points=\"9,3 36,19 15,23 40,41 9,45\" fill=\"none\"/><circle cx=\"17\" cy=\"13\" r=\"3.4\" fill=\"#ffffff\"/><path d=\"M 14.8 31 a 4.2 4.2 0 1 0 8.4 0 a 3.44 3.44 0 1 1 -8.4 0 Z\" fill=\"#ffffff\"/>",
  "NZ": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" fill=\"#00247D\"/><rect width=\"24\" height=\"24\" fill=\"#012169\"/><line x1=\"0\" y1=\"0\" x2=\"24\" y2=\"24\" stroke=\"#ffffff\" stroke-width=\"4.32\"/><line x1=\"0\" y1=\"24\" x2=\"24\" y2=\"0\" stroke=\"#ffffff\" stroke-width=\"4.32\"/><line x1=\"0\" y1=\"0\" x2=\"24\" y2=\"24\" stroke=\"#C8102E\" stroke-width=\"1.44\"/><line x1=\"0\" y1=\"24\" x2=\"24\" y2=\"0\" stroke=\"#C8102E\" stroke-width=\"1.44\"/><rect x=\"8.16\" y=\"0\" width=\"7.68\" height=\"24\" fill=\"#ffffff\"/><rect x=\"0\" y=\"8.16\" width=\"24\" height=\"7.68\" fill=\"#ffffff\"/><rect x=\"9.6\" y=\"0\" width=\"4.800000000000001\" height=\"24\" fill=\"#C8102E\"/><rect x=\"0\" y=\"9.6\" width=\"24\" height=\"4.800000000000001\" fill=\"#C8102E\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(38 9) scale(2.8)\" fill=\"#CC142B\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(41.5 18) scale(2.8)\" fill=\"#CC142B\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(38 27) scale(2.8)\" fill=\"#CC142B\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(40.5 37) scale(2.8)\" fill=\"#CC142B\"/>",
  "OM": "<rect y=\"0.0\" width=\"48\" height=\"16.6\" fill=\"#ffffff\"/><rect y=\"16.0\" width=\"48\" height=\"16.6\" fill=\"#EF3340\"/><rect y=\"32.0\" width=\"48\" height=\"16.6\" fill=\"#009639\"/><rect x=\"0\" y=\"0\" width=\"13\" height=\"48\" fill=\"#EF3340\"/>",
  "PG": "<polygon points=\"0,0 48,48 0,48\" fill=\"#000000\"/><polygon points=\"0,0 48,0 48,48\" fill=\"#CE1126\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(10 33) scale(2.5)\" fill=\"#ffffff\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(17 39) scale(2.2)\" fill=\"#ffffff\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(8 41) scale(2)\" fill=\"#ffffff\"/><polygon points=\"29,11 43,19 30,23 34,16\" fill=\"#FCD116\"/>",
  "PH": "<rect y=\"0.0\" width=\"48\" height=\"24.6\" fill=\"#0038A8\"/><rect y=\"24.0\" width=\"48\" height=\"24.6\" fill=\"#CE1126\"/><polygon points=\"0,0 22,24 0,48\" fill=\"#ffffff\"/><circle cx=\"8.5\" cy=\"24\" r=\"3.6\" fill=\"#FCD116\"/>",
  "PK": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" fill=\"#01411C\"/><rect x=\"0\" y=\"0\" width=\"12\" height=\"48\" fill=\"#ffffff\"/><path d=\"M 20.5 24 a 9.5 9.5 0 1 0 19.0 0 a 7.79 7.79 0 1 1 -19.0 0 Z\" fill=\"#ffffff\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(36.5 16.5) scale(3.4)\" fill=\"#ffffff\"/>",
  "PL": "<rect y=\"0.0\" width=\"48\" height=\"24.6\" fill=\"#ffffff\"/><rect y=\"24.0\" width=\"48\" height=\"24.6\" fill=\"#DC143C\"/>",
  "PY": "<rect y=\"0.0\" width=\"48\" height=\"16.6\" fill=\"#D52B1E\"/><rect y=\"16.0\" width=\"48\" height=\"16.6\" fill=\"#ffffff\"/><rect y=\"32.0\" width=\"48\" height=\"16.6\" fill=\"#0038A8\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(24 24) scale(3.2)\" fill=\"#FCD116\"/>",
  "QA": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" fill=\"#8A1538\"/><polygon points=\"0,0 19,0 23,6 19,12 23,18 19,24 23,30 19,36 23,42 19,48 0,48\" fill=\"#ffffff\"/>",
  "RS": "<rect y=\"0.0\" width=\"48\" height=\"16.6\" fill=\"#C6363C\"/><rect y=\"16.0\" width=\"48\" height=\"16.6\" fill=\"#0C4076\"/><rect y=\"32.0\" width=\"48\" height=\"16.6\" fill=\"#ffffff\"/>",
  "RU": "<rect y=\"0.0\" width=\"48\" height=\"16.6\" fill=\"#ffffff\"/><rect y=\"16.0\" width=\"48\" height=\"16.6\" fill=\"#0039A6\"/><rect y=\"32.0\" width=\"48\" height=\"16.6\" fill=\"#D52B1E\"/>",
  "SA": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" fill=\"#165D31\"/><rect x=\"11\" y=\"17\" width=\"26\" height=\"3.2\" fill=\"#ffffff\"/><rect x=\"15\" y=\"23.5\" width=\"18\" height=\"2.6\" fill=\"#ffffff\"/><rect x=\"10\" y=\"33\" width=\"28\" height=\"2.2\" fill=\"#ffffff\"/>",
  "SB": "<polygon points=\"0,0 48,0 0,48\" fill=\"#0051BA\"/><polygon points=\"48,0 48,48 0,48\" fill=\"#009B4D\"/><line x1=\"0\" y1=\"48\" x2=\"48\" y2=\"0\" stroke=\"#FCD116\" stroke-width=\"6\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(13 13) scale(2.6)\" fill=\"#ffffff\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(22 8) scale(2.3)\" fill=\"#ffffff\"/>",
  "SD": "<rect y=\"0.0\" width=\"48\" height=\"16.6\" fill=\"#D21034\"/><rect y=\"16.0\" width=\"48\" height=\"16.6\" fill=\"#ffffff\"/><rect y=\"32.0\" width=\"48\" height=\"16.6\" fill=\"#000000\"/><polygon points=\"0,0 19,24 0,48\" fill=\"#007229\"/>",
  "SE": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" fill=\"#006AA7\"/><rect x=\"13.5\" y=\"0\" width=\"9\" height=\"48\" fill=\"#FECC00\"/><rect x=\"0\" y=\"19.5\" width=\"48\" height=\"9\" fill=\"#FECC00\"/><rect x=\"15.75\" y=\"0\" width=\"4.5\" height=\"48\" fill=\"#FECC00\"/><rect x=\"0\" y=\"21.75\" width=\"48\" height=\"4.5\" fill=\"#FECC00\"/>",
  "SG": "<rect y=\"0.0\" width=\"48\" height=\"24.6\" fill=\"#EF3340\"/><rect y=\"24.0\" width=\"48\" height=\"24.6\" fill=\"#ffffff\"/><path d=\"M 6.5 12 a 6.5 6.5 0 1 0 13.0 0 a 5.33 5.33 0 1 1 -13.0 0 Z\" fill=\"#ffffff\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(21 8) scale(1.7)\" fill=\"#ffffff\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(24.5 11) scale(1.7)\" fill=\"#ffffff\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(21 14.5) scale(1.7)\" fill=\"#ffffff\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(25 16.5) scale(1.7)\" fill=\"#ffffff\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(18.5 11) scale(1.7)\" fill=\"#ffffff\"/>",
  "SH": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" fill=\"#00247D\"/><rect width=\"24\" height=\"24\" fill=\"#012169\"/><line x1=\"0\" y1=\"0\" x2=\"24\" y2=\"24\" stroke=\"#ffffff\" stroke-width=\"4.32\"/><line x1=\"0\" y1=\"24\" x2=\"24\" y2=\"0\" stroke=\"#ffffff\" stroke-width=\"4.32\"/><line x1=\"0\" y1=\"0\" x2=\"24\" y2=\"24\" stroke=\"#C8102E\" stroke-width=\"1.44\"/><line x1=\"0\" y1=\"24\" x2=\"24\" y2=\"0\" stroke=\"#C8102E\" stroke-width=\"1.44\"/><rect x=\"8.16\" y=\"0\" width=\"7.68\" height=\"24\" fill=\"#ffffff\"/><rect x=\"0\" y=\"8.16\" width=\"24\" height=\"7.68\" fill=\"#ffffff\"/><rect x=\"9.6\" y=\"0\" width=\"4.800000000000001\" height=\"24\" fill=\"#C8102E\"/><rect x=\"0\" y=\"9.6\" width=\"24\" height=\"4.800000000000001\" fill=\"#C8102E\"/><rect x=\"31\" y=\"15\" width=\"12\" height=\"17\" fill=\"#FFD700\"/>",
  "SL": "<rect y=\"0.0\" width=\"48\" height=\"16.6\" fill=\"#1EB53A\"/><rect y=\"16.0\" width=\"48\" height=\"16.6\" fill=\"#ffffff\"/><rect y=\"32.0\" width=\"48\" height=\"16.6\" fill=\"#0072C6\"/>",
  "SR": "<rect y=\"0\" width=\"48\" height=\"12.6\" fill=\"#377E3F\"/><rect y=\"12\" width=\"48\" height=\"6.6\" fill=\"#ffffff\"/><rect y=\"18\" width=\"48\" height=\"12.6\" fill=\"#B40A2D\"/><rect y=\"30\" width=\"48\" height=\"6.6\" fill=\"#ffffff\"/><rect y=\"36\" width=\"48\" height=\"12.6\" fill=\"#377E3F\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(24 24) scale(5)\" fill=\"#ECC81C\"/>",
  "ST": "<rect y=\"0\" width=\"48\" height=\"13.6\" fill=\"#12AD2B\"/><rect y=\"13\" width=\"48\" height=\"22.6\" fill=\"#FFEC00\"/><rect y=\"35\" width=\"48\" height=\"13.6\" fill=\"#12AD2B\"/><rect x=\"0\" y=\"21\" width=\"48\" height=\"6\" fill=\"#000000\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(13 24) scale(3.2)\" fill=\"#000000\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(35 24) scale(3.2)\" fill=\"#000000\"/>",
  "SZ": "<rect y=\"0\" width=\"48\" height=\"15.6\" fill=\"#3E5EB9\"/><rect y=\"15\" width=\"48\" height=\"4.6\" fill=\"#FFD900\"/><rect y=\"19\" width=\"48\" height=\"10.6\" fill=\"#000000\"/><rect y=\"29\" width=\"48\" height=\"4.6\" fill=\"#FFD900\"/><rect y=\"33\" width=\"48\" height=\"15.6\" fill=\"#3E5EB9\"/><ellipse cx=\"24\" cy=\"24\" rx=\"4.6\" ry=\"8.5\" fill=\"#ffffff\" stroke=\"#000000\" stroke-width=\"1\"/>",
  "TH": "<rect width=\"48\" height=\"8\" fill=\"#A51931\"/><rect y=\"8\" width=\"48\" height=\"8\" fill=\"#ffffff\"/><rect y=\"16\" width=\"48\" height=\"16\" fill=\"#2D2A4A\"/><rect y=\"32\" width=\"48\" height=\"8\" fill=\"#ffffff\"/><rect y=\"40\" width=\"48\" height=\"8\" fill=\"#A51931\"/>",
  "TJ": "<rect y=\"0\" width=\"48\" height=\"14.6\" fill=\"#CC0000\"/><rect y=\"14\" width=\"48\" height=\"20.6\" fill=\"#ffffff\"/><rect y=\"34\" width=\"48\" height=\"14.6\" fill=\"#CC0000\"/><polygon points=\"19,28 21,21.5 24,25.5 27,21.5 29,28\" fill=\"#F8C300\"/><rect x=\"19\" y=\"28\" width=\"10\" height=\"2\" fill=\"#F8C300\"/>",
  "TN": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" fill=\"#E70013\"/><circle cx=\"24\" cy=\"24\" r=\"10.5\" fill=\"#ffffff\"/><path d=\"M 16.4 24 a 7.6 7.6 0 1 0 15.2 0 a 6.23 6.23 0 1 1 -15.2 0 Z\" fill=\"#E70013\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(25.5 24) scale(3.3)\" fill=\"#E70013\"/>",
  "TO": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" fill=\"#C10000\"/><rect x=\"0\" y=\"0\" width=\"22\" height=\"22\" fill=\"#ffffff\"/><rect x=\"8.5\" y=\"5\" width=\"5\" height=\"12\" fill=\"#C10000\"/><rect x=\"5\" y=\"8.5\" width=\"12\" height=\"5\" fill=\"#C10000\"/>",
  "TR": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" fill=\"#E30A17\"/><path d=\"M 11 24 a 10 10 0 1 0 20 0 a 8.2 8.2 0 1 1 -20 0 Z\" fill=\"#ffffff\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(30.5 24) scale(4.2)\" fill=\"#ffffff\"/>",
  "TT": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" fill=\"#CE1126\"/><line x1=\"0\" y1=\"48\" x2=\"48\" y2=\"0\" stroke=\"#ffffff\" stroke-width=\"11\"/><line x1=\"0\" y1=\"48\" x2=\"48\" y2=\"0\" stroke=\"#000000\" stroke-width=\"7\"/>",
  "TZ": "<polygon points=\"0,0 48,0 0,48\" fill=\"#1EB53A\"/><polygon points=\"0,48 48,48 48,0\" fill=\"#00A3DD\"/><line x1=\"0\" y1=\"48\" x2=\"48\" y2=\"0\" stroke=\"#FCD116\" stroke-width=\"13\"/><line x1=\"0\" y1=\"48\" x2=\"48\" y2=\"0\" stroke=\"#000000\" stroke-width=\"8.5\"/>",
  "UA": "<rect y=\"0.0\" width=\"48\" height=\"24.6\" fill=\"#005BBB\"/><rect y=\"24.0\" width=\"48\" height=\"24.6\" fill=\"#FFD500\"/>",
  "US": "<rect width=\"48\" height=\"48\" fill=\"#ffffff\"/><rect y=\"0.00\" width=\"48\" height=\"6.86\" fill=\"#B22234\"/><rect y=\"13.72\" width=\"48\" height=\"6.86\" fill=\"#B22234\"/><rect y=\"27.44\" width=\"48\" height=\"6.86\" fill=\"#B22234\"/><rect y=\"41.16\" width=\"48\" height=\"6.86\" fill=\"#B22234\"/><rect width=\"26\" height=\"24\" fill=\"#3C3B6E\"/><circle cx=\"4.5\" cy=\"5.5\" r=\"1.35\" fill=\"#ffffff\"/><circle cx=\"10.2\" cy=\"5.5\" r=\"1.35\" fill=\"#ffffff\"/><circle cx=\"15.9\" cy=\"5.5\" r=\"1.35\" fill=\"#ffffff\"/><circle cx=\"21.6\" cy=\"5.5\" r=\"1.35\" fill=\"#ffffff\"/><circle cx=\"4.5\" cy=\"12.0\" r=\"1.35\" fill=\"#ffffff\"/><circle cx=\"10.2\" cy=\"12.0\" r=\"1.35\" fill=\"#ffffff\"/><circle cx=\"15.9\" cy=\"12.0\" r=\"1.35\" fill=\"#ffffff\"/><circle cx=\"21.6\" cy=\"12.0\" r=\"1.35\" fill=\"#ffffff\"/><circle cx=\"4.5\" cy=\"18.5\" r=\"1.35\" fill=\"#ffffff\"/><circle cx=\"10.2\" cy=\"18.5\" r=\"1.35\" fill=\"#ffffff\"/><circle cx=\"15.9\" cy=\"18.5\" r=\"1.35\" fill=\"#ffffff\"/><circle cx=\"21.6\" cy=\"18.5\" r=\"1.35\" fill=\"#ffffff\"/>",
  "UY": "<rect x=\"0\" y=\"0.0\" width=\"48\" height=\"5.8\" fill=\"#ffffff\"/><rect x=\"0\" y=\"5.33\" width=\"48\" height=\"5.8\" fill=\"#0038A8\"/><rect x=\"0\" y=\"10.67\" width=\"48\" height=\"5.8\" fill=\"#ffffff\"/><rect x=\"0\" y=\"16.0\" width=\"48\" height=\"5.8\" fill=\"#0038A8\"/><rect x=\"0\" y=\"21.33\" width=\"48\" height=\"5.8\" fill=\"#ffffff\"/><rect x=\"0\" y=\"26.67\" width=\"48\" height=\"5.8\" fill=\"#0038A8\"/><rect x=\"0\" y=\"32.0\" width=\"48\" height=\"5.8\" fill=\"#ffffff\"/><rect x=\"0\" y=\"37.33\" width=\"48\" height=\"5.8\" fill=\"#0038A8\"/><rect x=\"0\" y=\"42.67\" width=\"48\" height=\"5.8\" fill=\"#ffffff\"/><rect x=\"0\" y=\"0\" width=\"20\" height=\"21.3\" fill=\"#ffffff\"/><circle cx=\"10\" cy=\"10.6\" r=\"5\" fill=\"#FCD116\"/>",
  "VN": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" fill=\"#DA251D\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(24 24) scale(11)\" fill=\"#FFDD00\"/>",
  "VU": "<rect y=\"0.0\" width=\"48\" height=\"24.6\" fill=\"#D21034\"/><rect y=\"24.0\" width=\"48\" height=\"24.6\" fill=\"#009543\"/><polygon points=\"0,0 21,24 0,48\" fill=\"#000000\"/><polygon points=\"0,0 21,24 0,48\" fill=\"none\"/><circle cx=\"7\" cy=\"24\" r=\"3.2\" fill=\"#FDCE12\"/>",
  "WS": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" fill=\"#CE1126\"/><rect x=\"0\" y=\"0\" width=\"24\" height=\"24\" fill=\"#002B7F\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(8 8) scale(2.4)\" fill=\"#ffffff\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(16 8) scale(2.4)\" fill=\"#ffffff\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(12 14) scale(2.4)\" fill=\"#ffffff\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(7 18) scale(2.2)\" fill=\"#ffffff\"/><polygon points=\"0,-1 0.27,-0.34 0.95,-0.31 0.43,0.12 0.59,0.81 0,0.4 -0.59,0.81 -0.43,0.12 -0.95,-0.31 -0.27,-0.34\" transform=\"translate(17 18) scale(2.2)\" fill=\"#ffffff\"/>",
  "ZA": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"15\" fill=\"#E03C31\"/><rect x=\"0\" y=\"33\" width=\"48\" height=\"15\" fill=\"#001489\"/><rect x=\"0\" y=\"15\" width=\"48\" height=\"18\" fill=\"#ffffff\"/><polygon points=\"0,13 27,24 0,35 0,31.5 15,24 0,16.5\" fill=\"#007749\"/><polygon points=\"0,18.5 9,24 0,29.5\" fill=\"#000000\"/>",
  "ZM": "<rect x=\"0\" y=\"0\" width=\"48\" height=\"48\" fill=\"#198A00\"/><rect x=\"34\" y=\"0\" width=\"4.4\" height=\"48\" fill=\"#DE2010\"/><rect x=\"38.8\" y=\"0\" width=\"4.4\" height=\"48\" fill=\"#000000\"/><rect x=\"43.6\" y=\"0\" width=\"4.4\" height=\"48\" fill=\"#EF7D00\"/>"
};
function flagArt(code){
  return FLAG_ART[code] || "";
}
function flagSVG(code, cls){
  var id = "fc" + (++FLAG_UID);
  return '<svg class="' + cls + '" viewBox="0 0 48 48" aria-hidden="true" focusable="false">' +
    '<clipPath id="' + id + '"><circle cx="24" cy="24" r="24"/></clipPath>' +
    '<g clip-path="url(#' + id + ')">' + flagArt(code) + '</g></svg>';
}
function flagPair(icon, sm){
  var ic = (icon || "us").toUpperCase();
  return '<span class="flagpair' + (sm ? " sm" : "") + '" aria-hidden="true">' +
    flagSVG(ic, "f1") + flagSVG("MM", "f2") + '</span>';
}

/* ---------- motion helpers: count-up + price flash ---------- */
var REDUCED = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
var prevPrices = {};
function countUp(el, to, forceDec){
  var dec = (forceDec !== undefined) ? forceDec : ((to % 1 === 0) ? 0 : 2);
  if (REDUCED || !window.requestAnimationFrame){ el.textContent = fmt(to, dec); el.setAttribute("data-v", to); return; }
  var raw = el.getAttribute("data-v");
  /* First render of this element (no genuine previous price): show the
     real price immediately. Animating up from 0 would flash wrong
     in-between prices on load and after every refresh. */
  if (raw === null || raw === ""){ el.textContent = fmt(to, dec); el.setAttribute("data-v", to); return; }
  var from = parseFloat(raw);
  el.setAttribute("data-v", to);
  if (from === to){ el.textContent = fmt(to, dec); return; }
  if (el._cu) cancelAnimationFrame(el._cu);
  var t0 = null, dur = 550;
  function frame(t){
    if (!t0) t0 = t;
    var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(from + (to - from) * e, dec);
    if (p < 1) el._cu = requestAnimationFrame(frame);
  }
  el._cu = requestAnimationFrame(frame);
}

/* ---------- ticker ---------- */
function renderTicker(){
  var track = document.getElementById("tickerTrack");
  if (!track) return;
  var items = "";
  DATA.forEach(function(c){
    var d = rateOf(c).d;
    items += '<span class="t-item">' + flagPair(c.icon, true) + '<span class="cd">' + c.code + '/MMK</span>' +
      '<span class="num">' + fmtFx(d.buy * liveFactor(c.code), c.code) + '</span>' + (c.unit > 1 ? '<span class="t-unit">/' + fmt(c.unit, 0) + '</span>' : '') +
      fxTrendHTML(d.pct) + '</span>';
  });
  track.innerHTML = '<div class="t-group">' + items + '</div><div class="t-group" aria-hidden="true">' + items + '</div>';
  track.style.animationDuration = Math.max(30, DATA.length * 2.2) + "s";
}

/* ---------- ordering: Popular first; everything else A-Z by country ---------- */
var POPULAR_ORDER = ["USD","THB","CNY","JPY","KRW","VND","SGD","MYR","EUR","GBP","AUD","AED"];
function isPopular(c){ return POPULAR_ORDER.indexOf(c.code) !== -1; }
function azKey(c){ return ((c.ctry || c.en || c.code) + "").toLowerCase(); }
function azSort(list){ return list.slice().sort(function(a,b){ var x = azKey(a), y = azKey(b); return x < y ? -1 : (x > y ? 1 : (a.code < b.code ? -1 : 1)); }); }
function popularList(){ return POPULAR_ORDER.map(function(code){ return byCode(code); }).filter(function(c){ return c && isPopular(c); }); }
/* Top gainers are computed from the live data every render — never a fixed list. */
function topGainers(){
  /* Absurd one-day moves (|pct| > 10%) are bad source reads, not
     real gainers — they never top this list (see saneFxPct). */
  var arr = DATA.map(function(c){ return { c: c, pct: rateOf(c).d.pct }; }).filter(function(x){ return saneFxPct(x.pct) !== null; });
  arr.sort(function(a,b){ return (b.pct - a.pct) || (a.c.code < b.c.code ? -1 : 1); });
  return arr.slice(0, 5).map(function(x){ return x.c; });
}
var detailCode = "";
function showDetail(c, light){
  var el = document.getElementById("detailNote"); if (!el) return;
  var eff = rateOf(c), d = eff.d, s = stateOf(d.pct);
  detailCode = c.code;
  el.hidden = false;
  /* The detail banner inside the converter panel must show the
     SAME live-factored values as the card and chart. It used to
     print the raw stored rate while the card printed
     rate x liveFactor, so for AED (bank-only, driven live by the
     Binance USDTAED midpoint) the panel sat frozen on the baked
     bank values — Buy 589.79 / Sell 549.77 — while the card and
     chart walked 595.07 → 602.37 → 604.32 (verified live
     2026-10-30 23:53–00:19). It now reads dispVal like the card,
     and flushLive re-runs it (light = no scroll, no focus) on
     every live tick of its currency, so the panel can no longer
     lag the card. */
  el.innerHTML = "<strong>" + c.name + " (" + c.code + "/MMK)</strong> — " + (eff.src === "market" ? "ဈေးကွက်ဈေး" : "ဘဏ်ဈေး") +
    " · ဝယ်ဈေး <span class=\"num\">" + fmtFx(dispVal(c, d, "buy"), c.code) + "</span> · ရောင်းဈေး <span class=\"num\">" + fmtFx(dispVal(c, d, "sell"), c.code) + "</span> ကျပ် (" + unitNote(c) + ")" +
    " · ယနေ့ " + fxTrendHTML(d.pct);
  if (light) return;
  var panel = document.getElementById("convPanel");
  if (panel) panel.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" });
  try { el.focus({ preventScroll: true }); } catch (e) {}
}
function createCard(c, rank){
  var eff = rateOf(c), d = eff.d, s = stateOf(d.pct);
  /* AED has no market rate: in Market mode its buy/sell must read
     "—", never the bank figures as if they were market. */
  var noMarket = (mode === "market" && !c.market);
  var buyTxt = noMarket ? "—" : fmtFx(dispVal(c, d, "buy"), c.code);
  var sellTxt = noMarket ? "—" : fmtFx(dispVal(c, d, "sell"), c.code);
  var spreadTxt = noMarket ? "ဘဏ်ဈေးသာ ရှိသည်"
    : stateWord(s) + ' · ကွာဟချက် <span class="num">' + fmtFx((d.buy - d.sell) * liveFactor(c.code), c.code) + '</span> ကျပ်' + ((d.buy === d.sell) ? ' · <span class="single-note">ဝယ် = ရောင်း (တစ်ဈေးတည်း)</span>' : '');
  var btn = document.createElement("button");
  btn.className = "fx-card fade" + (c.code === selected ? " selected" : "");
  btn.setAttribute("aria-label", c.name + " " + c.code + " အသေးစိတ်ကြည့်ရန်");
  btn.setAttribute("data-code", c.code);
  btn.setAttribute("data-letter", azKey(c).charAt(0).toUpperCase());
  btn.innerHTML =
    (rank ? '<span class="rank">#' + rank + '</span>' : '') +
    '<span class="fx-top">' + flagPair(c.icon) +
    '<span class="fx-names"><span class="nm">' + c.name + '</span><span class="cd">' + c.code + ' / MMK · ' + c.en + '</span></span>' +
    '<span class="fx-unit">' + unitNote(c) + '<br>ပြထားသည်</span></span>' +
    '<span class="fx-prices">' +
      '<span class="col"><span class="lab">ဝယ်ဈေး</span><span class="val num" data-side="buy">' + buyTxt + '</span></span>' +
      '<span class="col"><span class="lab">ရောင်းဈေး</span><span class="val num" data-side="sell">' + sellTxt + '</span></span>' +
    '</span>' +
    '<span class="fx-foot">' + fxTrendHTML(d.pct) +
    (c.code === "USD"
      ? '<span class="anchor-badge"><i aria-hidden="true">◆</i>နေ့စဉ် anchor ဈေး</span>'
      : '<span class="lv" data-lv="' + c.code + '"' + (liveShown(c.code) ? '' : ' hidden') + '><span class="lv-dot"></span>LIVE</span>') +
    '<span class="spread">' + spreadTxt + '</span></span>';
  btn.addEventListener("click", function(){
    selected = c.code;
    setConvCurrency(c.code);
    render(); renderConverter();
    showDetail(c);
    if (typeof LW !== "undefined" && LW.asset && LW.asset.kind === "fx") lwShow({ kind:"fx", sym:c.code, base:c.code, label:c.name + " (" + c.code + "/MMK)" });
  });
  if (eff.src !== mode){
    var chip = document.createElement("span");
    chip.className = "src-chip";
    chip.textContent = eff.src === "bank" ? "ဘဏ်ဈေးသာ ရှိသည်" : "ဈေးကွက်ဈေးသာ ရှိသည်";
    btn.querySelector(".fx-names").appendChild(chip);
  }
  btn.querySelectorAll(".val").forEach(function(v){
    if (noMarket) return; /* "—" stays "—": no count-up onto a bank value */
    var side = v.getAttribute("data-side"), target = dispVal(c, d, side);
    var key = c.code + "_" + eff.src + "_" + side, prev = prevPrices[key];
    if (prev !== undefined && prev !== target){ v.classList.add(target > prev ? "flash-up" : "flash-down"); v.setAttribute("data-v", prev); }
    prevPrices[key] = target;
    countUp(v, target, c.code === "VND" ? 2 : undefined);
  });
  return btn;
}
function fillGrid(id, list, ranked){
  var grid = document.getElementById(id); if (!grid) return;
  grid.innerHTML = "";
  list.forEach(function(c, i){ grid.appendChild(createCard(c, ranked ? i + 1 : 0)); });
}
/* ---------- render: Top Gainers + Popular by default; the rest only via search (A-Z) ---------- */
function render(){
  document.getElementById("btnMarket").setAttribute("aria-pressed", mode === "market");
  document.getElementById("btnBank").setAttribute("aria-pressed", mode === "bank");
  var h1m = document.getElementById("h1Mode");
  if (h1m) h1m.textContent = mode === "market" ? "· ဈေးကွက်ဈေး" : "· ဘဏ်ဈေး";
  var mn = document.getElementById("modeNote");
  if (mn) mn.textContent = mode === "market" ? "ဈေးကွက်ဈေး · MARKET" : "ဘဏ်ဈေး · BANK";

  fillGrid("gridGainers", topGainers(), true);
  fillGrid("gridPopular", popularList(), false);

  var q = fxQuery ? fxQuery.replace(/^\s+|\s+$/g, "") : "";
  var panel = document.getElementById("searchPanel");
  var results = [];
  if (q){
    results = azSort(DATA.filter(function(c){ return matchesFx(c); }));
    if (panel) panel.hidden = false;
    fillGrid("gridSearch", results, false);
    var gs = document.getElementById("gridSearch");
    if (gs && !results.length){
      var empty = document.createElement("div");
      empty.className = "grid-empty";
      empty.textContent = "ရှာမတွေ့ပါ — တခြား နာမည်၊ code သို့မဟုတ် နိုင်ငံနာမည်နဲ့ ထပ်ရှာကြည့်ပါ။";
      gs.appendChild(empty);
    }
    var bar = document.getElementById("azBar");
    if (bar){
      bar.innerHTML = "";
      var seen = {};
      results.forEach(function(c){
        var L = azKey(c).charAt(0).toUpperCase();
        if (seen[L]) return; seen[L] = 1;
        var b = document.createElement("button");
        b.type = "button"; b.textContent = L;
        b.setAttribute("aria-label", L + " နဲ့ စတဲ့ နိုင်ငံများဆီ သွားရန်");
        b.addEventListener("click", function(){
          var target = document.querySelector('#gridSearch [data-letter="' + L + '"]');
          if (target) target.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "center" });
        });
        bar.appendChild(b);
      });
    }
  } else if (panel) panel.hidden = true;

  updateFxCount(q ? results.length : DATA.length);
  renderTicker();
  tvSetSeries();
}

/* ---------- TradingView-style candlestick chart ----------
   Candles are aggregated from the  daily closing prices in
   HISTORY above. 1D: open = previous day's close. 1W / 1M: open = the
   period's first daily close, high / low = highest / lowest daily close
   in the period, close = last daily close. Candle colors inside this
   chart only: real green (#1e9e50) for up candles, red for down. */
var TV_UP = "#1e9e50", TV_DN = "#ef5350", TV_LINE = "#c99a1b";
var TV = { tf:"LIVE", key:"", src:"market", raw:[], candles:[], start:0, count:0, hover:-1, hoverPrice:null, view:null, drag:null };

/* USD/MMK chart level: the chart follows the card / table /
   converter Market rate EXACTLY. USD is the anchor itself, so its
   chart factor is fixed at 1 \u2014 the chart anchor, the last close
   and the last candle's O/H/L/C are the recorded Market close
   (4826.66 on 2026-10-30: the HISTORY USD_market last point, equal
   to the DATA USD market buy the cards show), never any separate
   order-book level. When the market auto-update fetches a newer
   Market rate it rewrites DATA + HISTORY and calls refreshAll(),
   which rebuilds this chart on the new rate, so the graph moves
   with the card price and with nothing else. */
function chartFactor(code){
  if (code === "USD") return 1;
  return liveFactor(code);
}
var TVW = 960, TVH = 430, TV_AXIS = 78, TV_TOP = 12, TV_BOT = 28;
var MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function tvPad(n){ return (n < 10 ? "0" : "") + n; }
function tvDayId(dt){ return "" + dt.getFullYear() + tvPad(dt.getMonth() + 1) + tvPad(dt.getDate()); }
function tvDate(dayId){ return new Date(+dayId.slice(0,4), +dayId.slice(4,6) - 1, +dayId.slice(6,8)); }
function tvFmtDate(dayId, withYear){
  /* Never render "undefined": the month-name lookup must always
     resolve. (Root cause of the "30 undefined 2026" bug: a second
     `var MONTHS` — the month-number map in the rate parser, now
     renamed MONTH_NUM — overwrote this array, so MONTHS[9] was
     undefined.) Guard the index and fall back to the numeric
     month if the name is somehow missing. */
  if (!dayId || String(dayId).length < 8) return "";
  var mi = +dayId.slice(4,6) - 1;
  var mn = (mi >= 0 && mi < 12) ? MONTHS[mi] : null;
  if (!mn) mn = dayId.slice(4,6);
  return (+dayId.slice(6,8)) + " " + mn + (withYear ? " " + dayId.slice(0,4) : "");
}
function tvParse(str){
  if (!str) return [];
  return str.split(",").filter(function(p){ return p.indexOf(":") > 0; }).map(function(p){ var a = p.split(":"); return { d:a[0], p:parseFloat(a[1]) }; });
}
function tvBuildCandles(pts, tf){
  if (tf === "1D"){
    return pts.map(function(pt, i){
      var o = i > 0 ? pts[i-1].p : pt.p;
      return { d:pt.d, o:o, h:Math.max(o, pt.p), l:Math.min(o, pt.p), c:pt.p };
    });
  }
  var groups = {}, order = [];
  pts.forEach(function(pt){
    var dt = tvDate(pt.d), key, startId;
    if (tf === "1W"){
      var mon = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() - ((dt.getDay() + 6) % 7));
      key = tvDayId(mon); startId = key;
    } else {
      key = pt.d.slice(0,6); startId = key + "01";
    }
    if (!groups[key]){ groups[key] = { d:startId, o:pt.p, h:pt.p, l:pt.p, c:pt.p }; order.push(key); }
    var g = groups[key];
    g.h = Math.max(g.h, pt.p); g.l = Math.min(g.l, pt.p); g.c = pt.p;
  });
  return order.map(function(k){ return groups[k]; });
}
function tvResetView(){
  var n = TV.candles.length;
  TV.hover = -1; TV.hoverPrice = null;
  /* Visible range matches the label: 1D = last 30 daily candles,
     1W = last 26 weekly candles (~6 months), 1M = all monthly (~12 months). */
  var want = n;
  if (TV.tf === "LIVE") want = Math.min(n, 72);
  else if (TV.tf === "1D") want = Math.min(n, 30);
  else if (TV.tf === "1W") want = Math.min(n, 26);
  TV.count = want; TV.start = n - want;
}
function tvAnchorUpdate(){
  var el = document.getElementById("tvAnchor");
  if (!el || !TV.raw.length) return;
  var lastPt = TV.raw[TV.raw.length - 1];
  if (selected === "USD"){
    /* The USD label is the card price itself, in every timeframe
       (LIVE included): the recorded Market close (4826.66 on
       20261030) with its own date. No other level is shown. */
    var dailyText = "နောက်ဆုံး close " + fmtChart(lastPt.p) + " ကျပ် · " + tvFmtDate(lastPt.d, true);
    el.textContent = dailyText;
    return;
  }
  el.textContent = "နောက်ဆုံး close " + fmtChart(lastPt.p * chartFactor(selected)) + " ကျပ် · " + tvFmtDate(lastPt.d, true);
}
/* The last candle is the live candle: its close follows the
   pair's real global live move (liveFactor) against the recorded
   close, so the candle genuinely moves when the global market
   moves and stays still when it does not. TV.lastBase keeps the
   recorded candle so every redraw starts from real data. */
function tvApplyLive(){
  if (TV.tf === "LIVE") return; /* the live tick engine owns the candles */
  if (!TV.candles.length || !TV.lastBase) return;
  /* USD candles stay on the recorded Market close in EVERY
     timeframe (factor 1 above), so their O/H/L/C match the card /
     table price exactly (4826.66 on 2026-10-30) — daily and
     LIVE alike. */
  var f = (selected === "USD") ? 1 : chartFactor(selected), last = TV.candles[TV.candles.length - 1], b = TV.lastBase;
  last.c = b.c * f;
  last.h = Math.max(b.h, last.c);
  last.l = Math.min(b.l, last.c);
}
function tvSnapBase(){
  var lc = TV.candles[TV.candles.length - 1];
  TV.lastBase = lc ? { c:lc.c, h:lc.h, l:lc.l } : null;
  tvApplyLive();
}

/* ---------- LIVE tick engine: the main chart itself ticks ----------
   In the LIVE timeframe the candlesticks are built from the selected
   Myanmar X Other pair's real live tick stream, not from recorded
   history: the forming candle is a real 1-minute candle
   (LT.period = 60s), so every real feed tick inside that minute
   updates the SAME candle — its open stays fixed, each tick widens
   the high / low and moves the close (green when it ticks up, red
   when it ticks down) — a new candle opens only when the minute
   bucket rolls, never per tick, and the chart's last-price dashed
   line and tag follow the close. The candle period was 5 seconds
   before, and that was the flat-candle bug: a 5s bucket only ever
   caught one or two prints, so at any glance the forming candle
   read O = H = L = C even while the last price stepped between
   observations (verified live 2026-10-29 23:11–23:14: THB stepped
   142.09 -> 142.04 and EUR 5,314.81 -> 5,315.77 between reads
   while every individual candle stayed flat). At 60 seconds the
   fast lanes (Binance 2.5s, Bybit 5s, forex 6s) land dozens of
   real ticks per candle, so the forming candle carries a genuine
   O/H/L/C range built only from real feed ticks. Seeding: where
   Binance lists real intraday klines for the pair's global symbol
   (the BTC<fiat> cross for JPY and for every Binance fiat pair
   that has one — crossed exactly like BTCJPY, because the direct
   fiat-pair klines are near-flat while the cross carries BTC's
   real minute-by-minute range — the BN_FIAT direct symbols as
   fallback, USDTUSD for USD)
   the last hour of REAL 1-minute candles is converted to MMK
   against the pair's real published anchor level, so the chart
   opens with genuine recent candles and the live ticks take over
   the last one; Bybit klines seed pairs Bybit lists. A pair with no
   kline source starts from its real current anchor rate and
   accumulates only real ticks. Nothing is ever simulated. */
var LT = { code:"", token:0, period:60, candles:[], curBucket:-1, lastFactor:NaN, seeded:false, base:0 };
var LT_HOSTS = ["https://data-api.binance.vision", "https://api.binance.com"];
function ltBase(){
  if (TV.raw.length) return TV.raw[TV.raw.length - 1].p;
  var c = byCode(selected), eff = rateOf(c);
  return eff.d ? eff.d.buy : 0;
}
function ltTimeLabel(ts){
  /* LIVE candles are 1-minute candles (and the Binance / Bybit seed
     klines are 1-minute too), so the axis / info label is the
     candle's minute, HH:MM — seconds would always read :00. */
  var dt = new Date(ts * 1000);
  return tvPad(dt.getHours()) + ":" + tvPad(dt.getMinutes());
}
function ltDayId(ts){ return tvDayId(new Date(ts * 1000)); }
/* The LIVE session trades against the anchor captured when the
   timeframe was opened (LT.base). Reading ltBase() live instead
   let a mid-session daily-rate refresh move the level under the
   already-drawn candles — another cliff in the chart. The frozen
   base applies until the pair or timeframe is rebuilt. */
function ltPrice(){ return (LT.base > 0 ? LT.base : ltBase()) * chartFactor(selected); }
function ltPush(price, ts){
  var bucket = Math.floor(ts / LT.period);
  var last = LT.candles[LT.candles.length - 1];
  if (!last || bucket !== LT.curBucket){
    var o = last ? last.c : price;
    LT.candles.push({ d:ltDayId(ts), lt:ltTimeLabel(bucket * LT.period), o:o, h:Math.max(o, price), l:Math.min(o, price), c:price });
    LT.curBucket = bucket;
    if (LT.candles.length > 240) LT.candles.splice(0, LT.candles.length - 240);
    TV.candles = LT.candles;
    TV.start = Math.max(0, LT.candles.length - TV.count);
  } else {
    /* Single-tick glitch guard inside the forming candle: a real
       tick never jumps the pair 0.6% from the previous tick inside
       one 1-minute candle.
       Ignoring the print keeps a lone bad tick from drawing a
       full-height spike wick while O/H/L/C stay consistent. */
    if (last.c > 0 && Math.abs(price / last.c - 1) > 0.006) return;
    last.c = price;
    last.h = Math.max(last.h, price);
    last.l = Math.min(last.l, price);
  }
}
function ltTick(){
  if (TV.tf !== "LIVE" || LT.code !== selected) return;
  var p = ltPrice(); if (!(p > 0)) return;
  ltPush(p, Math.floor(Date.now() / 1000));
  LT.lastFactor = chartFactor(selected);
  if (!document.hidden) tvDraw();
}
function ltSeedCandles(list){
  if (TV.tf !== "LIVE" || !list.length) return;
  var live = LT.candles.slice(-1);
  LT.candles = list.concat(live);
  LT.seeded = true;
  TV.candles = LT.candles;
  TV.count = Math.min(LT.candles.length, 72);
  TV.start = LT.candles.length - TV.count;
  TV.hover = -1;
  if (!document.hidden) tvDraw();
}
function ltSeedBinance(){
  var code = selected, token = LT.token, base = ltBase();
  var sym = null, inv = false, xsym = null;
  if (code === "USD") sym = "USDTUSD";
  else if (code === "JPY") xsym = "BTCJPY";
  else if (typeof BN_BTCX !== "undefined" && BN_BTCX[code]) xsym = BN_BTCX[code];
  else if (typeof BN_FIAT !== "undefined" && BN_FIAT[code]){ sym = BN_FIAT[code].s; inv = BN_FIAT[code].inv; }
  if (!sym && !xsym) return;
  function conv(rows, xRows){
    if (token !== LT.token || TV.tf !== "LIVE" || !rows || !rows.length || LT.seeded) return;
    var us = rows.map(function(r, i){
      var o = +r[1], h = +r[2], l = +r[3], c = +r[4];
      if (xRows && xRows[i]){
        var jo = +xRows[i][1], jh = +xRows[i][2], jl = +xRows[i][3], jc = +xRows[i][4];
        return { ts:+r[0] / 1000, o:o / jo, h:h / jl, l:l / jh, c:c / jc };
      }
      if (inv) return { ts:+r[0] / 1000, o:1 / o, h:1 / l, l:1 / h, c:1 / c };
      return { ts:+r[0] / 1000, o:o, h:h, l:l, c:c };
    });
    var ref = us[us.length - 1].c; if (!(ref > 0)) return;
    /* Scale the seed so its last close IS the current live price:
       seeding against the raw daily anchor while the live candle
       traded at anchor x live-factor drew a visible cliff between
       the seeded candles and the live ones. */
    var anchor = ltPrice(); if (!(anchor > 0)) anchor = base;
    ltSeedCandles(us.map(function(u){
      return { d:ltDayId(u.ts), lt:ltTimeLabel(u.ts), o:anchor * u.o / ref, h:anchor * u.h / ref, l:anchor * u.l / ref, c:anchor * u.c / ref };
    }));
  }
  function get(host, s){
    return fetch(host + "/api/v3/klines?symbol=" + s + "&interval=1m&limit=60").then(function(r){ if (!r.ok) throw new Error("bad"); return r.json(); });
  }
  var triedDirect = false;
  function attempt(i){
    if (i >= LT_HOSTS.length){
      /* Cross book unreachable on both hosts: fall back to the
         pair's direct Binance klines rather than no seed at all. */
      if (xsym && !triedDirect && typeof BN_FIAT !== "undefined" && BN_FIAT[code]){
        triedDirect = true; sym = BN_FIAT[code].s; inv = BN_FIAT[code].inv; xsym = null;
        attempt(0);
      }
      return;
    }
    if (xsym){
      Promise.all([get(LT_HOSTS[i], "BTCUSDT"), get(LT_HOSTS[i], xsym)]).then(function(rs){ conv(rs[0], rs[1]); }).catch(function(){ attempt(i + 1); });
    } else {
      get(LT_HOSTS[i], sym).then(function(rows){ conv(rows, null); }).catch(function(){ attempt(i + 1); });
    }
  }
  attempt(0);
}
