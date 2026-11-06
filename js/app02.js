function ltSeedBybit(){
  if (typeof BYBIT_MAP === "undefined" || !BYBIT_MAP || !BYBIT_MAP[selected] || LT.seeded) return;
  var m = BYBIT_MAP[selected], token = LT.token, base = ltBase();
  fetch(m.host + "/v5/market/kline?category=spot&symbol=" + m.s + "&interval=1&limit=60")
    .then(function(r){ if (!r.ok) throw new Error("bad"); return r.json(); })
    .then(function(j){
      if (token !== LT.token || LT.seeded) return;
      var list = j && j.result && j.result.list; if (!list || !list.length) return;
      var us = list.slice().reverse().map(function(r){
        var o = +r[1], h = +r[2], l = +r[3], c = +r[4];
        if (m.inv) return { ts:+r[0] / 1000, o:1 / o, h:1 / l, l:1 / h, c:1 / c };
        return { ts:+r[0] / 1000, o:o, h:h, l:l, c:c };
      });
      var ref = us[us.length - 1].c; if (!(ref > 0)) return;
      var anchor = ltPrice(); if (!(anchor > 0)) anchor = base;
      ltSeedCandles(us.map(function(u){
        return { d:ltDayId(u.ts), lt:ltTimeLabel(u.ts), o:anchor * u.o / ref, h:anchor * u.h / ref, l:anchor * u.l / ref, c:anchor * u.c / ref };
      }));
    }).catch(function(){});
}
/* History-backed LIVE seed: if no intraday kline seed (Binance /
   Bybit) has arrived shortly after the LIVE timeframe opens, the
   chart must not sit on a single flat candle. The pair's own real
   recorded daily closes (HISTORY — for JPY/MMK the Feb–Oct run:
   the slow climb from ~2,450, the volatile Sep–Oct 2,400–2,800
   band, the October plunge to ~1,200 and the recovery to 2,820)
   are drawn as daily candles behind the live edge, scaled by the
   current live factor so their last close IS the live level, and
   the real tick stream then takes over the forming candle at the
   right edge — history shape underneath, genuinely live on top. */
function ltSeedHistory(){
  if (LT.seeded || TV.tf !== "LIVE" || !TV.raw.length) return;
  var pts = TV.raw.slice(-48);
  if (pts.length < 2) return;
  var f = chartFactor(selected); if (!(f > 0) || !isFinite(f)) f = 1;
  ltSeedCandles(tvBuildCandles(pts, "1D").map(function(k){
    return { d:k.d, o:k.o * f, h:k.h * f, l:k.l * f, c:k.c * f };
  }));
}
function ltBuild(){
  LT.code = selected; LT.token++; LT.candles = []; LT.curBucket = -1; LT.seeded = false; LT.lastFactor = NaN;
  LT.base = ltBase();
  TV.candles = LT.candles;
  TV.hover = -1; TV.hoverPrice = null;
  var p = ltPrice();
  if (p > 0) ltPush(p, Math.floor(Date.now() / 1000));
  TV.count = Math.min(Math.max(LT.candles.length, 1), 72);
  TV.start = 0;
  tvDraw();
  ltSeedBinance();
  ltSeedBybit();
  ltSeedUpbit();
  /* Kick the selected pair's fast lane the moment its chart opens,
     so its forming candle starts moving at JPY pace right away
     instead of waiting for the next shared feed cycle. */
  if (typeof fastBinancePoll === "function"){ fastBinancePoll(); fastTvPoll(); fastBybitPoll(); if (typeof fastUpbitPoll === "function") fastUpbitPoll(); if (typeof krakenFeed === "function") krakenFeed(); if (selected === "VND" && typeof coinbaseVndFeed === "function") coinbaseVndFeed(); if (selected === "SGD" && typeof coinbaseSgdFeed === "function") coinbaseSgdFeed(); if (selected === "MYR" && typeof lunoMyrFeed === "function") lunoMyrFeed(); }
  var tok = LT.token;
  setTimeout(function(){
    if (tok === LT.token && !LT.seeded && TV.tf === "LIVE") ltSeedHistory();
  }, 1600);
}
/* Roll the forming candle on time even between ticks, and pick up
   factor moves the flush cycle has not delivered yet. */
setInterval(function(){
  if (TV.tf !== "LIVE" || document.hidden) return;
  var bucket = Math.floor(Date.now() / 1000 / LT.period);
  if (bucket !== LT.curBucket || chartFactor(selected) !== LT.lastFactor) ltTick();
  /* Per-second badge/button refresh: liveShown is time-invariant
     for every pair except AED, whose LIVE label expires 90 s
     after its last real factor move (see liveShown) — this
     keeps the badge and the timeframe buttons in step with the
     header text tvInfo already re-renders on every draw. */
  tvBadgeUpdate();
}, 1000);
function tvBadgeUpdate(){
  var badge = document.getElementById("tvLiveBadge"), txt = document.getElementById("tvLiveTxt");
  if (!badge || !txt) return;
  var live = selected === "USD" ? false : (liveShown(selected) && selected !== "KGS");
  badge.classList.toggle("off", !live);
  txt.textContent = live ? "LIVE" : "နေ့စဉ်";
  var dot = badge.querySelector(".live-dot");
  if (dot) dot.style.display = live ? "" : "none";
  tvSyncTfButtons();
}
/* Timeframe buttons: pressed = chosen timeframe (see tvSyncTfButtons). Liveness lives on the badge + header. */
function tvSyncTfButtons(){
  var bL = document.getElementById("tfLive"), bD = document.getElementById("tfD"),
      bW = document.getElementById("tfW"), bM = document.getElementById("tfM");
  if (!bL || !bD || !bW || !bM) return;
  /* The pressed button is the timeframe the visitor CHOSE (TV.tf).
     Whether the pair is actually live is a separate fact, carried
     by the badge and the chart header — the old code pressed 1D
     whenever the pair was not live, so clicking LIVE for USD (a
     daily anchor, never live) visibly did nothing even though the
     timeframe had switched. */
  bL.setAttribute("aria-pressed", TV.tf === "LIVE" ? "true" : "false");
  bD.setAttribute("aria-pressed", TV.tf === "1D" ? "true" : "false");
  bW.setAttribute("aria-pressed", TV.tf === "1W" ? "true" : "false");
  bM.setAttribute("aria-pressed", TV.tf === "1M" ? "true" : "false");
}
function tvSetSeries(){
  var cSel = byCode(selected);
  var tsrc = cSel[mode] ? mode : (mode === "market" ? "bank" : "market");
  TV.src = tsrc;
  var key = selected + "_" + tsrc;
  if (key !== TV.key){
    TV.key = key;
    TV.raw = tvParse(HISTORY[key] || "");
    if (TV.tf === "LIVE"){ ltBuild(); }
    else { TV.candles = tvBuildCandles(TV.raw, TV.tf); tvResetView(); tvSnapBase(); }
  }
  tvBadgeUpdate();
  tvAnchorUpdate();
  tvDraw();
}
function tvSetTf(tf){
  if (TV.tf === tf) return;
  TV.tf = tf;
  document.getElementById("tfLive").setAttribute("aria-pressed", tf === "LIVE");
  document.getElementById("tfD").setAttribute("aria-pressed", tf === "1D");
  document.getElementById("tfW").setAttribute("aria-pressed", tf === "1W");
  document.getElementById("tfM").setAttribute("aria-pressed", tf === "1M");
  if (tf === "LIVE"){ ltBuild(); tvBadgeUpdate(); tvAnchorUpdate(); return; }
  TV.candles = tvBuildCandles(TV.raw, TV.tf);
  tvResetView();
  tvSnapBase();
  tvAnchorUpdate();
  tvBadgeUpdate();
  tvDraw();
}
function tvTicks(min, max){
  var span = max - min; if (!(span > 0)) span = 1;
  var raw = span / 5, mag = Math.pow(10, Math.floor(Math.log10(raw))), norm = raw / mag, step;
  if (norm < 1.5) step = 1; else if (norm < 3.5) step = 2; else if (norm < 7.5) step = 5; else step = 10;
  step *= mag;
  var ticks = [], t = Math.ceil(min / step) * step;
  for (; t <= max + step * 0.001; t += step) ticks.push(+t.toFixed(6));
  return ticks;
}
function tvInfo(k, isHover, isRange){
  var c = byCode(selected);
  /* The header names the timeframe honestly. In the LIVE timeframe
     a pair that is not actually live yet — its feed has printed no
     changed value this session (liveShown false: VND before its
     first real move, any pair whose feed never answers) — reads
     နေ့စဉ် here too, matching the badge beside the timeframe
     buttons. Verified live 2026-10-30 22:48–22:50: VND's header
     claimed "VND/MMK · LIVE" while the badge beside the buttons
     already read နေ့စဉ် — the two labels contradicted each other. */
  var isLiveNow = selected !== "USD" && selected !== "KGS" && liveShown(selected);
  var tfLabel = TV.tf;
  if (TV.tf === "LIVE" && !isLiveNow) tfLabel = "နေ့စဉ်";
  var chg = k.c - k.o, pct = k.o ? chg / k.o * 100 : 0;
  var dateTxt;
  if (isRange && k.d2) dateTxt = "ပြသနေသော ကာလ · " + tvFmtDate(k.d, true) + " – " + tvFmtDate(k.d2, true);
  else if (k.lt) dateTxt = k.lt + (isLiveNow ? ' · တိုက်ရိုက်' : '');
  else dateTxt = tvFmtDate(k.d, true) + (TV.tf === "1W" ? " အပတ်" : (TV.tf === "1M" ? " လ" : ""));
  var col = chg > 0 ? TV_UP : (chg < 0 ? TV_DN : "var(--ink-2)");
  document.getElementById("tvInfo").innerHTML =
    '<span class="l1"><span class="pair">' + c.code + '/MMK</span> · ' + tfLabel + ' · ' + (TV.src === "bank" ? "ဘဏ်ဈေး" : "ဈေးကွက်ဈေး") + ' · ' + unitNote(c) +
    ' · <span style="color:var(--ink-3)">' + dateTxt + '</span></span>' +
    '<span class="l2"><span class="ohlc" style="color:' + col + '">O <span class="num">' + fmtChart(k.o) + '</span> &nbsp;H <span class="num">' + fmtChart(k.h) + '</span> &nbsp;L <span class="num">' + fmtChart(k.l) + '</span> &nbsp;C <span class="num">' + fmtChart(k.c) + '</span> &nbsp;<span class="num">' + (chg > 0 ? "+" : "") + fmtChart(chg) + ' (' + pctText(pct) + ')</span></span></span>';
}
function tvDraw(){
  var host = document.getElementById("tvChart");
  if (!host) return;
  /* Responsive viewBox: the desktop 960-wide viewBox shrinks to
     ~380px on a phone, which made axis labels ~4px and unreadable.
     Below 560px container width the chart renders into a 520-wide
     viewBox instead, so labels land at a legible size and candle
     slots stay wide enough to read as candles, not spikes. */
  var hw = host.clientWidth || 0;
  if (hw && hw < 560){ TVW = 520; TVH = 400; TV_AXIS = 62; }
  else { TVW = 960; TVH = 430; TV_AXIS = 78; }
  var tfs = TVW < 600 ? 13.5 : 11.5;
  if (!TV.candles.length){
    host.innerHTML = '<p class="tv-hint" style="padding:26px 4px">ဒီ pair အတွက် ဈေးမှတ်တမ်း မရှိသေးပါ — နောက်ဆုံးဈေးကို ကတ်၊ converter နဲ့ ဇယားမှာ ပြထားပါတယ်။</p>';
    var ti = document.getElementById("tvInfo");
    if (ti) ti.innerHTML = '<span class="pair">' + selected + '/MMK</span>';
    return;
  }
  var full = TV.candles;
  var endN = full.length;
  var all = full.slice(0, endN), n = all.length;
  TV.start = Math.max(0, Math.min(TV.start, n - 1));
  TV.count = Math.max(1, Math.min(TV.count, n - TV.start));
  var vis = all.slice(TV.start, TV.start + TV.count);
  var W = TVW, H = TVH, plotW = W - TV_AXIS, top = TV_TOP, bot = H - TV_BOT, plotH = bot - top;
  var min = Infinity, max = -Infinity, cMin = Infinity, cMax = -Infinity;
  vis.forEach(function(k){
    min = Math.min(min, k.l); max = Math.max(max, k.h);
    cMin = Math.min(cMin, k.c); cMax = Math.max(cMax, k.c);
  });
  var refP = vis[vis.length - 1].c;
  /* A sensible y-axis, in two steps. (1) One candle's wick may not
     stretch the scale: the axis extends at most ~0.9x the close
     range beyond the closes themselves. (2) The axis never zooms
     into a band narrower than 0.25% of the price. The LIVE bug in
     the user's screenshot was exactly this: the whole chart was
     squeezed into a 142.01-142.08 band (0.05%), so ordinary
     1-minute wicks filled the full height as wild red/green
     spikes while the forming candle read O=H=L=C. With a sane
     minimum range the same real candles look like a real market. */
  var ext = Math.max(cMax - cMin, refP * 0.0012);
  min = Math.max(min, cMin - ext * 0.9);
  max = Math.min(max, cMax + ext * 0.9);
  if (!(max - min > 0) || (max - min) < refP * 0.0025){
    var mid = (cMin + cMax) / 2, half = refP * 0.00125;
    min = Math.min(min, mid - half); max = Math.max(max, mid + half);
    if (!(max - min > 0)){ min = mid - half; max = mid + half; }
  }
  var pad = (max - min) * 0.09; if (!(pad > 0)) pad = Math.max(1, max * 0.012);
  min -= pad; max += pad;
  TV.view = { min:min, max:max, plotW:plotW, top:top, plotH:plotH };
  var y = function(p){ return top + (max - p) / (max - min) * plotH; };
  var slot = plotW / vis.length;
  var bodyW = Math.max(1, Math.min(24, slot * 0.62));
  var cx = function(i){ return slot * i + slot / 2; };
  var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + selected + '/MMK candlestick ဂရပ်">';
  /* grid + right price axis */
  tvTicks(min, max).forEach(function(t){
    var gy = y(t);
    s += '<line x1="0" y1="' + gy + '" x2="' + plotW + '" y2="' + gy + '" stroke="var(--line)" stroke-width="1"/>';
    s += '<text x="' + (plotW + 8) + '" y="' + (gy + 4) + '" font-size="' + tfs + '" fill="var(--ink-3)" class="num">' + fmtChart(t) + '</text>';
  });
  s += '<line x1="' + plotW + '" y1="' + top + '" x2="' + plotW + '" y2="' + bot + '" stroke="var(--line)"/>';
  s += '<line x1="0" y1="' + bot + '" x2="' + plotW + '" y2="' + bot + '" stroke="var(--line)"/>';
  /* x labels */
  var stepLbl = Math.max(1, Math.ceil(vis.length / 6));
  vis.forEach(function(k, i){
    if (i % stepLbl !== 0 && i !== vis.length - 1) return;
    var lx = Math.max(24, Math.min(cx(i), plotW - 24));
    s += '<line x1="' + cx(i) + '" y1="' + top + '" x2="' + cx(i) + '" y2="' + bot + '" stroke="var(--line)" stroke-width="1" opacity=".45"/>';
    s += '<text x="' + lx + '" y="' + (bot + 19) + '" font-size="' + tfs + '" fill="var(--ink-3)" text-anchor="middle">' +
      (k.lt ? k.lt : (TV.tf === "1M" ? ((MONTHS[+k.d.slice(4,6) - 1] || k.d.slice(4,6)) + " " + k.d.slice(0,4)) : tvFmtDate(k.d, false))) + '</text>';
  });
  /* last price dashed line + tag */
  var last = all[n - 1], lastIdx = n - 1;
  var lastCol = last.c >= last.o ? TV_UP : TV_DN;
  if (lastIdx >= TV.start && lastIdx < TV.start + TV.count){
    var ly = y(last.c);
    s += '<line x1="0" y1="' + ly + '" x2="' + plotW + '" y2="' + ly + '" stroke="' + lastCol + '" stroke-width="1" stroke-dasharray="5 4" opacity=".75"/>';
    s += '<rect x="' + plotW + '" y="' + (ly - 10) + '" width="' + TV_AXIS + '" height="20" fill="' + lastCol + '"/>';
    s += '<text x="' + (plotW + TV_AXIS / 2) + '" y="' + (ly + 4.5) + '" font-size="12" font-weight="700" fill="#fff" text-anchor="middle" class="num">' + fmtChart(last.c) + '</text>';
  }
  /* close price line */
  var ptsLine = "";
  vis.forEach(function(k, i){ ptsLine += (i ? " " : "") + cx(i).toFixed(1) + "," + y(k.c).toFixed(1); });
  s += '<polyline points="' + ptsLine + '" fill="none" stroke="' + TV_LINE + '" stroke-width="1.3" opacity=".5"/>';
  /* candles */
  vis.forEach(function(k, i){
    var col = k.c >= k.o ? TV_UP : TV_DN, x = cx(i);
    s += '<line x1="' + x + '" y1="' + y(k.h) + '" x2="' + x + '" y2="' + y(k.l) + '" stroke="' + col + '" stroke-width="1.2"/>';
    var yO = y(k.o), yC = y(k.c), yT = Math.min(yO, yC), bh = Math.max(1.4, Math.abs(yC - yO));
    s += '<rect x="' + (x - bodyW / 2) + '" y="' + yT + '" width="' + bodyW + '" height="' + bh + '" fill="' + col + '"/>';
  });
  /* pulsing live dot on the last price point */
  if (lastIdx >= TV.start && lastIdx < TV.start + TV.count){
    s += '<circle class="lp-dot" cx="' + cx(lastIdx - TV.start) + '" cy="' + y(last.c) + '" r="3.6" fill="' + lastCol + '" stroke="#fff" stroke-width="1.2"/>';
  }
  /* crosshair */
  if (TV.hover >= TV.start && TV.hover < TV.start + TV.count){
    var hk = all[TV.hover], hx = cx(TV.hover - TV.start);
    s += '<line x1="' + hx + '" y1="' + top + '" x2="' + hx + '" y2="' + bot + '" stroke="var(--ink-3)" stroke-width="1" stroke-dasharray="4 4"/>';
    if (TV.hoverPrice !== null && TV.hoverPrice >= min && TV.hoverPrice <= max){
      var hy = y(TV.hoverPrice);
      s += '<line x1="0" y1="' + hy + '" x2="' + plotW + '" y2="' + hy + '" stroke="var(--ink-3)" stroke-width="1" stroke-dasharray="4 4"/>';
      s += '<rect x="' + plotW + '" y="' + (hy - 10) + '" width="' + TV_AXIS + '" height="20" fill="var(--ink-2)"/>';
      s += '<text x="' + (plotW + TV_AXIS / 2) + '" y="' + (hy + 4.5) + '" font-size="11.5" font-weight="700" fill="#fff" text-anchor="middle" class="num">' + fmtChart(TV.hoverPrice) + '</text>';
    }
    var tagW = 92, tagX = Math.max(0, Math.min(hx - tagW / 2, plotW - tagW));
    s += '<rect x="' + tagX + '" y="' + bot + '" width="' + tagW + '" height="21" fill="var(--ink-2)"/>';
    s += '<text x="' + (tagX + tagW / 2) + '" y="' + (bot + 15) + '" font-size="11.5" font-weight="700" fill="#fff" text-anchor="middle">' + tvFmtDate(hk.d, true) + '</text>';
    tvInfo(hk, true);
  } else {
    /* No hover: the header describes the VISIBLE RANGE (first
       open, highest high, lowest low, last close) — it used to
       show only the last candle, so on 1W/1M it read like a
       single flat day while the chart showed a whole range. */
    var rH = -Infinity, rL = Infinity;
    vis.forEach(function(kk){ rH = Math.max(rH, kk.h); rL = Math.min(rL, kk.l); });
    tvInfo({ o:vis[0].o, h:rH, l:rL, c:last.c, d:vis[0].d, d2:last.d, lt:null }, false, true);
  }
  s += '</svg>';
  host.innerHTML = s;
}
/* chart interactions: hover crosshair, drag to pan, wheel to zoom */
(function(){
  var host = document.getElementById("tvChart");
  function toView(e){
    var svg = host.querySelector("svg"); if (!svg || !TV.view) return null;
    var r = svg.getBoundingClientRect();
    return { x:(e.clientX - r.left) * TVW / r.width, y:(e.clientY - r.top) * TVH / r.height, rectW:r.width };
  }
  function idxFromX(vx){
    var slot = TV.view.plotW / TV.count;
    return TV.start + Math.max(0, Math.min(TV.count - 1, Math.floor(vx / slot)));
  }
  function priceFromY(vy){
    var v = TV.view;
    return v.max - (vy - v.top) / v.plotH * (v.max - v.min);
  }
  host.addEventListener("pointerdown", function(e){
    var p = toView(e); if (!p) return;
    TV.drag = { x:e.clientX, start:TV.start, moved:false };
    host.classList.add("dragging");
    try { host.setPointerCapture(e.pointerId); } catch (err) {}
  });
  host.addEventListener("pointermove", function(e){
    var p = toView(e); if (!p) return;
    if (TV.drag){
      var slotPx = p.rectW * (TV.view.plotW / TV.count) / TVW;
      var shift = Math.round((e.clientX - TV.drag.x) / slotPx);
      if (shift !== 0) TV.drag.moved = true;
      var ns = Math.max(0, Math.min(TV.candles.length - TV.count, TV.drag.start - shift));
      if (ns !== TV.start){ TV.start = ns; TV.hover = idxFromX(p.x); TV.hoverPrice = priceFromY(p.y); tvDraw(); }
      return;
    }
    var idx = idxFromX(p.x), pr = priceFromY(p.y);
    if (idx !== TV.hover || Math.abs((TV.hoverPrice || 0) - pr) > (TV.view.max - TV.view.min) * 0.002){
      TV.hover = idx; TV.hoverPrice = pr; tvDraw();
    }
  });
  function endDrag(){ if (TV.drag){ TV.drag = null; host.classList.remove("dragging"); } }
  host.addEventListener("pointerup", endDrag);
  host.addEventListener("pointercancel", endDrag);
  host.addEventListener("pointerleave", function(){ if (!TV.drag && TV.hover !== -1){ TV.hover = -1; TV.hoverPrice = null; tvDraw(); } });
  host.addEventListener("wheel", function(e){
    var p = toView(e); if (!p) return;
    e.preventDefault();
    var total = TV.candles.length, anchor = idxFromX(p.x);
    var factor = e.deltaY > 0 ? 1.18 : 1 / 1.18;
    var nc = Math.max(8, Math.min(total, Math.round(TV.count * factor)));
    if (nc === TV.count) return;
    var frac = TV.count ? (anchor - TV.start) / TV.count : 0;
    TV.count = nc;
    TV.start = Math.max(0, Math.min(total - nc, Math.round(anchor - frac * nc)));
    tvDraw();
  }, { passive:false });
  host.addEventListener("dblclick", function(){ tvResetView(); tvDraw(); });
  document.getElementById("tfLive").addEventListener("click", function(){ tvSetTf("LIVE"); });
  document.getElementById("tfD").addEventListener("click", function(){ tvSetTf("1D"); });
  document.getElementById("tfW").addEventListener("click", function(){ tvSetTf("1W"); });
  document.getElementById("tfM").addEventListener("click", function(){ tvSetTf("1M"); });
  document.getElementById("tvReset").addEventListener("click", function(){ tvResetView(); tvDraw(); var n = document.getElementById("tvResetNote"); if (n){ n.textContent = "ဂရပ်ကို မူလ ကာလအပြည့် ပြန်ထားပြီးပါပြီ"; n.classList.add("show"); setTimeout(function(){ n.classList.remove("show"); }, 2600); } });
})();

/* Redraw on viewport changes (rotation, resize) so the responsive
   viewBox and candle geometry track the real container width. */
window.addEventListener("resize", function(){
  clearTimeout(window.__tvRz);
  window.__tvRz = setTimeout(function(){ if (!document.hidden) tvDraw(); }, 180);
});

/* ---------- Chart: live last candle ----------
   The candles are the pair's real recorded closes. The last candle
   is live: tvApplyLive() scales its close by the pair's real global
   live move (Binance / Bybit / live forex feed against the USD/MMK
   market anchor), so it moves per second for pairs with a live
   feed and stays on the recorded close for pairs without one.
   No invented ticks are ever drawn. */

/* ---------- table ---------- */
function renderTable(){
  var tb = document.getElementById("cmpBody"), html = "", shown = 0;
  var q = fxQuery ? fxQuery.replace(/^\s+|\s+$/g, "") : "";
  var list = q ? azSort(DATA.filter(function(c){ return matchesFx(c); })) : popularList();
  list.forEach(function(c){
    shown++;
    var m = c.market, b = c.bank, g = gapPct(c);
    var lf = liveFactor(c.code);
    var mCell = m
      ? '<td data-l="Market ဝယ်" class="num">' + fmtFx(m.buy * lf, c.code) + '</td><td data-l="Market ရောင်း" class="num">' + fmtFx(m.sell * lf, c.code) + '</td><td data-l="Market ပြောင်းလဲမှု">' + fxTrendHTML(m.pct) + '</td>'
      : '<td data-l="Market ဝယ်">—</td><td data-l="Market ရောင်း">—</td><td data-l="Market ပြောင်းလဲမှု">—</td>';
    var bCell = b
      ? '<td data-l="Bank ဝယ်" class="num">' + fmtFx(b.buy * lf, c.code) + '</td><td data-l="Bank ရောင်း" class="num">' + fmtFx(b.sell * lf, c.code) + '</td>'
      : '<td data-l="Bank ဝယ်">—</td><td data-l="Bank ရောင်း">—</td>';
    html += '<tr>' +
      '<td data-l="">' + flagPair(c.icon, true) + ' ' + c.name + ' · ' + c.code + (c.unit > 1 ? ' <span style="color:var(--ink-3);font-weight:400;font-size:12px">(' + fmt(c.unit,0) + ' ယူနစ်)</span>' : '') + (m && m.buy === m.sell ? ' <span class="single-note">ဝယ် = ရောင်း</span>' : '') + '</td>' +
      mCell + bCell +
      '<td data-l="ကွာဟချက်" class="num">' + (g === null ? '—' : '+' + g.toFixed(1) + '%') + '</td></tr>';
  });
  if (!shown) html = '<tr><td colspan="7" style="text-align:center;color:var(--ink-2)">ရှာမတွေ့ပါ — တခြား နာမည်၊ code သို့မဟုတ် နိုင်ငံနာမည်နဲ့ ထပ်ရှာကြည့်ပါ။</td></tr>';
  tb.innerHTML = html;
}

/* ---------- converter ---------- */
var convSel = document.getElementById("convCur");
var convPrevMain = 0;
var convSig = "";
function fillConvOptions(){
  var q = "";
  var cs = document.getElementById("convSearch");
  if (cs) q = cs.value.toLowerCase().replace(/^\s+|\s+$/g, "");
  var keep = convSel.value || selected;
  convSel.innerHTML = "";
  var ordered = popularList().concat(azSort(DATA.filter(function(c){ return !isPopular(c); })));
  var addedKeep = false;
  ordered.forEach(function(c){
    if (q && fxHay(c).indexOf(q) === -1) return;
    var o = document.createElement("option");
    o.value = c.code; o.textContent = c.name + " (" + c.code + ") · " + (c.ctry || "");
    convSel.appendChild(o);
    if (c.code === keep) addedKeep = true;
  });
  if (!addedKeep){
    var kc = byCode(keep);
    if (kc && kc.code === keep){
      var o2 = document.createElement("option");
      o2.value = keep; o2.textContent = "လက်ရှိ ရွေးထားသည် — " + kc.name + " (" + keep + ")";
      convSel.insertBefore(o2, convSel.firstChild);
      addedKeep = true;
    }
  }
  if (addedKeep) convSel.value = keep;
  else if (convSel.options.length) convSel.value = convSel.options[0].value;
}
function setConvCurrency(code){
  var cs = document.getElementById("convSearch");
  if (cs && cs.value) cs.value = "";
  fillConvOptions();
  convSel.value = code;
}
fillConvOptions();
convSel.value = selected;

function renderConverter(){
  var c = byCode(convSel.value);
  /* Stale first paint: while a live FX sweep is still in flight, the
     converter must not show a rate the sweep has not confirmed for
     today — neither the baked snapshot before the first sweep
     settles, nor a snapshot rate after the aggregate has already
     advanced the page date. Once the sweep settles with no new day,
     the snapshot renders with its own date as the honest fallback.
     The date printed next to the rate is this currency's OWN
     rate-day (srcDay), never the page-global AS_OF: the aggregate
     advances AS_OF when ANY currency reports today, so a currency
     whose own refresh failed would otherwise print today's date
     next to yesterday's rate. */
  var srcDay = (mode === "market" ? c.mDay : c.bDay) || SNAP_DAY;
  var srcDate = isoOfDayId(srcDay);
  if ((!fxFirstSettled || srcDay < LATEST_DAY) && (marketBusy || aggBusy)){
    var box0 = document.getElementById("convResult");
    if (box0) box0.innerHTML = '<div class="r-main">ဈေးအသစ် တောင်းနေသည်…</div><div class="r-sub">ယနေ့ ဈေးကို အတည်ပြုနေပါသည် — ခဏစောင့်ပါ</div>';
    return;
  }
  /* The yellow detail banner must follow the converter currency:
     changing the dropdown used to leave the previous currency's
     banner on screen while the result and chart had moved on. */
  if (detailCode && detailCode !== c.code){
    var dnEl = document.getElementById("detailNote");
    if (dnEl && !dnEl.hidden) showDetail(c, true);
  }
  convFactorSeen[c.code] = liveFactor(c.code);
  var eff = rateOf(c); var rate = eff.d[convSide] * liveFactor(c.code);
  var amt = parseFloat(document.getElementById("convAmt").value);
  if (isNaN(amt) || amt < 0) amt = 0;
  var box = document.getElementById("convResult");
  var sideWord = convSide === "buy" ? "ဝယ်ဈေး" : "ရောင်းဈေး";
  var modeWord = eff.src === "market" ? "ဈေးကွက်ဈေး" : "ဘဏ်ဈေး";
  var cf = document.getElementById("convFlag");
  if (cf) cf.innerHTML = flagPair(c.icon);
  var dd = eff.d, ds = stateOf(dd.pct);
  var perUnit = c.unit > 1 ? '<div class="r-sub">အခြေခံ ရှင်းလင်းချက်: ' + unitNote(c) + ' အတွက် ဈေးပါ — ၁ ' + c.code + ' ≈ <span class="num">' + fmt(rate / c.unit) + '</span> ကျပ်</div>' : '';
  var sanePct = saneFxPct(dd.pct);
  var chgHtml = sanePct === null
    ? '<div class="r-chg"><span class="flat">—</span><span class="lab">ယနေ့ ပြောင်းလဲမှု အတည်မပြုနိုင်သေးပါ · ' + modeWord + '</span></div>'
    : '<div class="r-chg"><span class="' + ds + '">' + arrow(dd.pct) + ' <span class="num">' + pctText(dd.pct) + '</span></span><span class="lab">ယနေ့ ပြောင်းလဲမှု ' + (dd.chg > 0 ? "+" : "") + '<span class="num">' + fmt(dd.chg) + '</span> ကျပ် · ' + modeWord + '</span></div>';
  if (!convReverse){
    document.getElementById("convAmtLabel").textContent = "ပမာဏ (" + c.code + ")";
    var mmk = amt / c.unit * rate;
    box.innerHTML = '<div class="r-main"><span class="num">' + fmt(amt) + '</span> ' + c.code + ' = <span class="num gold" id="convMain">' + fmt(mmk) + '</span> ကျပ်</div>' +
      '<div class="r-sub">' + modeWord + ' · ' + sideWord + ' — ' + unitNote(c) + ' <span class="num">' + fmtFx(rate, c.code) + '</span> ကျပ် · ' + srcDate + '</div>' + chgHtml + perUnit;
  } else {
    document.getElementById("convAmtLabel").textContent = "ပမာဏ (ကျပ် MMK)";
    var fx = amt / rate * c.unit;
    box.innerHTML = '<div class="r-main"><span class="num">' + fmt(amt) + '</span> ကျပ် = <span class="num gold" id="convMain">' + fmt(fx) + '</span> ' + c.code + '</div>' +
      '<div class="r-sub">' + modeWord + ' · ' + sideWord + ' — ' + unitNote(c) + ' <span class="num">' + fmtFx(rate, c.code) + '</span> ကျပ် · ' + srcDate + '</div>' + chgHtml + perUnit;
  }
  var cm = document.getElementById("convMain");
  if (cm){
    var targetVal = convReverse ? fx : mmk;
    var sig = c.code + "|" + (convReverse ? "r" : "f");
    if (sig !== convSig){
      /* The pair (or the conversion direction) just changed:
         the total must be THIS pair's total, computed from the
         current card rate, the moment it is picked — the
         innerHTML above already prints exactly that, so no
         count-up runs. The old path animated from the PREVIOUS
         pair's total (convPrevMain): picking AED right after a
         ~6,302 pair opened the converter on that pair's stale
         630,197.54 total for 100 units, and it only corrected
         when AED's next live tick re-rendered the panel 80+
         seconds later (verified live 2026-10-31 00:43–01:04:
         100 AED opened at 630,197.54 against a 588.12 card,
         snapping to the correct 58,811.70 only on the next
         tick). Same-pair updates (amount edits, buy/sell
         switches, live ticks) keep the count-up below. */
      convSig = sig;
      cm.setAttribute("data-v", targetVal);
      convPrevMain = targetVal;
    } else {
      cm.setAttribute("data-v", convPrevMain);
      countUp(cm, targetVal);
      convPrevMain = targetVal;
    }
  }
}

document.getElementById("btnMarket").addEventListener("click", function(){ if (mode !== "market"){ mode = "market"; render(); renderConverter(); } });
document.getElementById("btnBank").addEventListener("click", function(){ if (mode !== "bank"){ mode = "bank"; render(); renderConverter(); } });
document.getElementById("cmBuy").addEventListener("click", function(){ convSide = "buy"; this.setAttribute("aria-pressed","true"); document.getElementById("cmSell").setAttribute("aria-pressed","false"); renderConverter(); });
document.getElementById("cmSell").addEventListener("click", function(){ convSide = "sell"; this.setAttribute("aria-pressed","true"); document.getElementById("cmBuy").setAttribute("aria-pressed","false"); renderConverter(); });
document.getElementById("swapBtn").addEventListener("click", function(){ convReverse = !convReverse; renderConverter(); });
convSel.addEventListener("change", function(){ selected = this.value; render(); renderConverter(); });
var convSearchEl = document.getElementById("convSearch");
if (convSearchEl) convSearchEl.addEventListener("input", function(){
  /* Filtering only narrows the option list. The chosen currency
     changes only when the user actually picks from the dropdown. */
  fillConvOptions();
  renderConverter();
});
var fxSearchEl = document.getElementById("fxSearch");
if (fxSearchEl) fxSearchEl.addEventListener("input", function(){
  fxQuery = this.value;
  render(); renderTable();
});
/* Header / footer "ရှာဖွေရန်" links land on the search bar and focus it */
var focusSearchLinks = document.querySelectorAll("[data-focus-search]");
for (var fsi = 0; fsi < focusSearchLinks.length; fsi++){
  focusSearchLinks[fsi].addEventListener("click", function(){
    setTimeout(function(){ if (fxSearchEl) fxSearchEl.focus({ preventScroll:true }); }, 400);
  });
}

/* ---------- ticker pause / play ----------
   (This handler used to sit inside the <style> block by mistake,
   where it never ran and its braces risked swallowing real CSS
   rules. It lives in the script now, so the button works.) */
(function(){
  var b = document.getElementById("tickerToggle"), box = document.getElementById("tickerBox");
  if (!b || !box) return;
  b.addEventListener("click", function(){
    var paused = box.classList.toggle("paused");
    b.setAttribute("aria-pressed", paused ? "true" : "false");
    b.textContent = paused ? "▶" : "❚❚";
    b.setAttribute("aria-label", paused ? "Ticker ပြန်စရန်" : "Ticker ခဏရပ်ရန်");
  });
})();

/* ---------- Live pair charts: Binance → Bybit → live forex ----------
   Every currency's MMK pair chart is driven the same honest way:
   the pair's real published MMK rate (above) is the anchor, and
   its movement comes from that currency's real global USD price —
   Binance public spot first (per-second WebSocket, REST fallback,
   with the fiat pairs crossed through BTC exactly like JPY),
   Bybit public spot second (coverage discovered at runtime from
   Bybit's own instrument list), Kraken public spot third (the
   majors it lists: EUR, GBP, CHF, CAD, AUD, NZD — REST-polled,
   plus a WebSocket ticker lane pushing GBP / AUD midpoints and
   their BTC crosses, after live checks found their candles
   flat while the same book's REST prints kept re-pricing), Upbit public
   spot for KRW (the Korean market Binance, Bybit and Kraken do
   not list at all, crossed through BTC the same way),
   Coinbase's public spot rate for VND (the one major public
   source besides the scanner that really prints USDVND),
   Luno's public BTC/MYR book for MYR (Malaysia's real spot
   market, crossed through BTC like JPY — Binance, Bybit and
   Kraken list no MYR pair at all), and a
   real live forex feed (TradingView scanner: FX and FX_IDC
   quotes, both variants polled per currency and the one that
   actually moves is followed; CNY through offshore USDCNH, VND
   off its real bid/ask midpoint) for the rest. The feed
   value is anchored the moment it first arrives, so the level on
   screen is always the real MMK market rate and only the movement
   is live. A currency with no live pair on any source (e.g. KGS)
   keeps its real daily bars and price, unlabelled as live. No
   price is ever invented or simulated. */
var LIVE_PRIO = { binance:3, upbit:2.5, bybit:2, luno:2, kraken:1.5, coinbase:1.5, tv:1 };
var LIVE_LAST = {};
var liveDirty = {}, liveFlushTimer = null, glDirty = null, convFactorSeen = {};
function feedSet(code, src, usdPerUnit, anchorFactor){
  /* USD is the anchor (factor fixed at 1) and KGS has no live pair —
     neither may ever be marked live, whatever a feed returns. */
  if (code === "USD" || code === "KGS") return;
  if (!(usdPerUnit > 0) || !isFinite(usdPerUnit)) return;
  /* Print bookkeeping for the frozen-source rule below: per code
     and source, remember the last value printed and when that
     value last CHANGED. Verified live 2026-10-30: GBP / AUD sat
     flat for 65+ seconds while a higher-priority source held the
     pair on one frozen last-trade print and locked the livelier
     quotes out by priority alone — source priority must never
     let a source that has stopped moving keep the pair. */
  var nowMs = Date.now();
  var book = LIVE_LAST[code] || (LIVE_LAST[code] = {});
  var rec = book[src];
  var printedChange = !rec || rec.val !== usdPerUnit;
  if (printedChange) book[src] = { val:usdPerUnit, t:nowMs };
  var f = LIVEF[code];
  /* LIVE_MOVED is earned ONLY by a real change of the pair's
     effective live factor (see the check at the bottom of this
     function) — never by a raw print change alone. The old rule
     set it whenever ANY source printed a different value than
     its own previous print, including prints feedSet then threw
     away (a lower-priority source locked out by the incumbent)
     and follow-the-mover takeovers between two TradingView
     candidates of the same pair: for CNY and SGD the candidates
     sit at slightly different broker levels, so every takeover
     re-anchored at the SAME factor (the MMK level never stepped,
     every candle read O=H=L=C) while the raw "tv" print value
     flapped between the two levels and tripped LIVE_MOVED —
     verified live 2026-10-30 23:53–00:19: CNY and SGD both read
     "· LIVE" in the chart header across two reads 75+ seconds
     apart with identical O/H/L/C, while their cards never moved.
     A level-preserving re-anchor is not movement; only a print
     that is actually applied AND moves the factor is. */
  var facBefore = (f && f.ref > 0 && f.cur > 0) ? f.cur / f.ref : 1;
  if (f && f.src !== src && LIVE_PRIO[f.src] > LIVE_PRIO[src]){
    /* Frozen-incumbent takeover: the source in charge has not
       printed a changed value for 40 s while THIS source just
       did — hand the pair over with a level-preserving
       re-anchor (the MMK level does not step), exactly like a
       source upgrade. The incumbent reclaims the pair the
       moment it prints a changed value again, through the
       ordinary priority path below. */
    var inc = book[f.src];
    if (printedChange && inc && nowMs - inc.t > 40000){
      var fac0 = f.cur / f.ref; if (!(fac0 > 0) || !isFinite(fac0)) fac0 = 1;
      LIVEF[code] = { src:src, ref:usdPerUnit / fac0, cur:usdPerUnit };
      liveDirty[code] = 1;
      if (!liveFlushTimer) liveFlushTimer = setTimeout(flushLive, 350);
    }
    return;
  }
  if (!f){ LIVEF[code] = { src:src, ref:usdPerUnit, cur:usdPerUnit }; }
  else if (anchorFactor > 0 && isFinite(anchorFactor)){
    /* Level-preserving re-anchor onto a different measuring pair
       (the pair's direct fiat quote -> its BTC cross, the move JPY
       makes from the start): the factor on screen does not jump,
       but from here on the new pair's ticks drive it. */
    LIVEF[code] = { src:src, ref:usdPerUnit / anchorFactor, cur:usdPerUnit };
  }
  else if (f.src !== src){
    /* Source upgrade (e.g. the forex feed anchored the pair, then
       Binance takes over): carry the current live factor across to
       the new source instead of resetting it to 1. Resetting used
       to snap the MMK price straight back to the daily anchor in
       one tick — the sharp drop to a flat line in the LIVE chart.
       But only on a genuinely CHANGED print: an unchanged print
       from another source carries no new information, yet seizing
       on it hands the pair to a source that may then sit frozen
       while the livelier source's ticks are dropped until the
       frozen incumbent's last change ages past the takeover
       window — with both sources polling every few seconds the
       pair spent most of every minute frozen. That was AUD's
       pattern verified live 2026-10-30 22:44–22:46: the level
       stepped once (+0.23) while every 1-minute candle read
       O=H=L=C, even though AUD's Kraken BTC cross printed a new
       midpoint on every poll (eight distinct crosses in eight
       9-second samples) — a re-printed frozen quote kept seizing
       the pair back. A source's first print counts as changed
       (printedChange above), so a stronger source still takes
       over the moment it first answers with a real price. */
    if (!printedChange) return;
    var fac = f.cur / f.ref; if (!(fac > 0) || !isFinite(fac)) fac = 1;
    LIVEF[code] = { src:src, ref:usdPerUnit / fac, cur:usdPerUnit };
  }
  else {
    if (f.cur === usdPerUnit) return;
    /* Bad-tick guard: a real FX pair never moves 1% in a single
       update. A tick that does is a glitch (a stale or thin print,
       or a crossed symbol) — dropping it keeps lone spikes out of
       the cards and out of the live candles. */
    if (Math.abs(usdPerUnit / f.cur - 1) > 0.01) return;
    f.cur = usdPerUnit;
  }
  /* The print was applied: the pair has genuinely MOVED only if
     its effective factor actually changed (a re-anchor preserves
     the factor by construction and lands here with facAfter ===
     facBefore, so candidate / source switches never earn the
     LIVE label on their own). */
  var fNow = LIVEF[code];
  if (fNow && fNow.ref > 0 && fNow.cur > 0){
    var facAfter = fNow.cur / fNow.ref;
    if (Math.abs(facAfter / facBefore - 1) > 1e-6){ LIVE_MOVED[code] = 1; LIVE_MOVED_AT[code] = nowMs; }
  }
  liveDirty[code] = 1;
  if (!liveFlushTimer) liveFlushTimer = setTimeout(flushLive, 350);
}
function flushLive(){
  liveFlushTimer = null;
  var codes = Object.keys(liveDirty); liveDirty = {};
  codes.forEach(patchLiveCard);
  if (codes.length) renderTicker(); /* ticker tracks live ticks too — cards used to move while the ticker sat on the last full render's values */
  if (codes.length) renderTable();
  if (glDirty){ var ch = glDirty; glDirty = null; renderCryptoIfLoaded(ch); }
  if (codes.indexOf(selected) !== -1){ tvApplyLive(); tvDraw(); tvAnchorUpdate(); tvBadgeUpdate(); }
  ltTick(); tvBadgeUpdate();
  /* Converter + detail banner follow EVERY live tick of their
     currency. The old gate compared the factor against a single
     shared lastConvFactor with a 0.0002 (0.02%) threshold: the
     shared value belonged to whichever currency flushed last, so
     after switching currencies the comparison ran against the
     wrong pair's factor, and a pegged pair like AED — whose real
     midpoint ticks are often smaller than 0.02% — fell under the
     threshold tick after tick, so the converter result and the
     detail banner lagged the card / chart indefinitely (the AED
     589.79 vs 604.32 split verified live 2026-10-30). The factor
     is now tracked per currency, any real change re-renders the
     converter, and the detail banner is refreshed in place. */
  var cc = convSel && convSel.value;
  if (cc && codes.indexOf(cc) !== -1){
    var nf = liveFactor(cc);
    if (convFactorSeen[cc] === undefined || convFactorSeen[cc] !== nf){ convFactorSeen[cc] = nf; renderConverter(); }
    if (detailCode === cc) showDetail(byCode(cc), true);
  }
}
function patchLiveCard(code){
  var c = byCode(code); if (!c || c.code !== code) return;
  var eff = rateOf(c), d = eff.d, f = liveFactor(code);
  if (mode === "market" && !c.market){
    /* AED in Market mode shows "—", never bank figures: only the
       LIVE badge may still update. */
    document.querySelectorAll('.fx-card[data-code="' + code + '"]').forEach(function(card){
      var lv = card.querySelector("[data-lv]");
      if (lv && code !== "USD" && code !== "KGS") lv.hidden = !liveShown(code);
    });
    return;
  }
  document.querySelectorAll('.fx-card[data-code="' + code + '"]').forEach(function(card){
    card.querySelectorAll(".val").forEach(function(v){
      var nv = dispVal(c, d, v.getAttribute("data-side"));
      var prev = parseFloat(v.getAttribute("data-v"));
      v.setAttribute("data-v", nv);
      v.textContent = fmtFx(nv, code);
      if (!isNaN(prev) && prev !== nv){ v.classList.remove("flash-up", "flash-down"); void v.offsetWidth; v.classList.add(nv > prev ? "flash-up" : "flash-down"); }
    });
    var sp = card.querySelector(".spread .num");
    if (sp) sp.textContent = fmtFx((d.buy - d.sell) * f, code);
    var lv = card.querySelector("[data-lv]");
    if (lv && code !== "USD" && code !== "KGS") lv.hidden = !liveShown(code);
  });
}

/* ----- Binance: real fiat spot pairs (verified against Binance
   exchangeInfo); JPY crossed through BTCJPY/BTCUSDT, and every
   fiat pair with a BTC<fiat> book crossed the same way through
   BN_BTCX below — the direct fiat quotes alone print too rarely
   to give the forming 1-minute candle a real range on their own
   (THB/EUR verified flat live on the old 5-second candles). ----- */
var BN_FIAT = {
  EUR:{ s:"EURUSDT", inv:false }, THB:{ s:"USDTTHB", inv:true },
  IDR:{ s:"USDTIDR", inv:true },  BRL:{ s:"USDTBRL", inv:true },
  ZAR:{ s:"USDTZAR", inv:true },  AED:{ s:"USDTAED", inv:true },
  MXN:{ s:"USDTMXN", inv:true },  TRY:{ s:"USDTTRY", inv:true },
  KZT:{ s:"USDTKZT", inv:true },  ARS:{ s:"USDTARS", inv:true }
};
var BN_PX = {};
/* ----- The JPY pattern, generalised: BTC crosses for the Binance
   fiat currencies. JPY/MMK ticks every second because it is NOT
   read off a single fiat pair: it is crossed through BTC
   (BTCUSDT / BTCJPY), and the hyper-liquid BTCUSDT leg prints a
   new price many times a minute, so the crossed USD-per-unit
   moves on nearly every poll and the forming candle's O/H/L/C
   genuinely walk up and down. The direct fiat pairs are the
   opposite: USDTTHB can sit on one last price for minutes (its
   whole move is one 0.01 tick), and EURUSDT steps a single
   0.0001 tick at a time — read directly, THB/EUR sat flat at
   O=H=L=C (verified live 2026-10-29 22:49–22:53: THB pinned at
   142.05 across three reads, EUR stepping once in 75 seconds,
   while JPY ticked up and down throughout). So every Binance
   fiat currency that also has a BTC<fiat> book is crossed the
   same way — USD-per-unit = BTCUSDT / BTC<fiat> (x USDTUSD) —
   and the direct quote stays as the fallback for the moments
   the cross book has not printed yet. The cross's level can sit
   a fraction away from the direct quote's (the BTC premium), so
   the first cross print re-anchors the feed at the factor
   already on screen (see feedSet's anchorFactor) instead of
   stepping the price; after that, the cross's own real ticks
   drive the pair exactly as BTCJPY's drive JPY. ----- */
var BN_BTCX = { EUR:"BTCEUR", THB:"BTCTHB", IDR:"BTCIDR", BRL:"BTCBRL", ZAR:"BTCZAR", MXN:"BTCMXN", TRY:"BTCTRY", ARS:"BTCARS" };
var BN_XMODE = {};
function bnCrossFeed(code){
  var xs = BN_BTCX[code]; if (!xs) return false;
  var btc = BN_PX["BTCUSDT"], x = BN_PX[xs];
  if (!(btc > 0 && x > 0)) return false;
  var cross = btc / x * (BN_PX["USDTUSD"] || 1);
  if (!BN_XMODE[code]){
    BN_XMODE[code] = 1;
    feedSet(code, "binance", cross, liveFactor(code));
  } else feedSet(code, "binance", cross);
  return true;
}
function bnRecompute(){
  var uu = BN_PX["USDTUSD"];
  var u = BN_PX["USDTUSD"] || 1;
  for (var code in BN_FIAT){
    if (bnCrossFeed(code)) continue;
    var m = BN_FIAT[code], p = BN_PX[m.s];
    if (p > 0) feedSet(code, "binance", m.inv ? u / p : p * u);
  }
  if (BN_PX["BTCUSDT"] > 0 && BN_PX["BTCJPY"] > 0)
    feedSet("JPY", "binance", BN_PX["BTCUSDT"] / BN_PX["BTCJPY"] * u);
}
function bnFeedRows(rows){
  if (!rows) return;
  rows.forEach(function(r){
    /* USDTAED is never written from a last-trade field: on the
       USD-pegged book the last trade can sit frozen for many
       minutes, and BN_PX["USDTAED"] is owned by the real best
       bid/ask midpoint lanes (the socket's bookTicker and the
       bnAedBookPoll REST backstop). This rows path is driven by
       fetchGlobal's 24hr ticker every 5 s, so letting its
       lastPrice through overwrote the live midpoint with the
       frozen trade all visit — and the one load-time switch
       from a last-price-based value to a midpoint-based value
       moved AED's factor by the half-spread and tripped
       LIVE_MOVED with no market movement at all, so AED wore
       the LIVE label over a flat candle (verified live
       2026-10-31 00:43–01:04: header "AED/MMK · LIVE",
       O=H=L=C 588.12 across two reads 80+ s apart). The frozen
       miniTicker write in bnSocket was blocked for exactly this
       reason; the 24hr rows path is now blocked the same way. */
    if (r.symbol === "USDTAED") return;
    var p = parseFloat(r.lastPrice); if (p > 0) BN_PX[r.symbol] = p;
  });
  bnRecompute();
}
function bnSocket(){
  if (!("WebSocket" in window)) return;
  var syms = ["EURUSDT","USDTTHB","USDTIDR","USDTBRL","USDTZAR","USDTAED","USDTMXN","USDTTRY","USDTKZT","USDTARS","USDTUSD","BTCUSDT","BTCJPY","BTCEUR","BTCTHB","BTCBRL","ETHUSDT","BNBUSDT","SOLUSDT","XRPUSDT"];
  var url = "wss://stream.binance.com:9443/stream?streams=" + syms.map(function(s){ return s.toLowerCase() + "@miniTicker"; }).join("/") + "/usdtaed@bookTicker";
  var ws;
  try { ws = new WebSocket(url); } catch (e) { return; }
  ws.onmessage = function(ev){
    try {
      var m = JSON.parse(ev.data), d = m && m.data;
      if (!d || !d.s) return;
      /* AED is pegged to the USD, so USDTAED's last trade can sit
         still for long stretches while its order book keeps
         re-pricing: the pair is read off the real best bid/ask
         midpoint (bookTicker), which moves whenever either side
         of the book moves. Same real Binance book, livelier
         field — the midpoint replaces the last price in BN_PX,
         and bnRecompute feeds it like any other print. */
      if (d.s === "USDTAED" && d.b && d.a){
        var bb = parseFloat(d.b), aa = parseFloat(d.a);
        if (bb > 0 && aa > 0){ BN_PX["USDTAED"] = (bb + aa) / 2; bnRecompute(); }
        return;
      }
      /* The USDTAED miniTicker also lands here once a second with
         the pair's LAST TRADE — which, on a USD-pegged book, can
         sit frozen for many minutes. Letting it through overwrote
         the bookTicker midpoint above on every tick, so AED's
         live factor kept snapping back to the one frozen print
         and the pair read O=H=L=C all visit (verified live
         2026-10-30 23:20–23:34: AED flat at 589.95 across both
         reads). The midpoint lanes (this socket's bookTicker and
         the bnAedBookPoll REST backstop) own USDTAED; the frozen
         last trade no longer writes BN_PX for it. */
      if (d.s === "USDTAED") return;
      var p = parseFloat(d.c); if (!(p > 0)) return;
      BN_PX[d.s] = p;
      bnRecompute();
      for (var j = 0; j < GLIVE.length; j++){
        if (GLIVE[j].sym === d.s){
          var old = GLIVE[j].price;
          GLIVE[j].price = p;
          var o = parseFloat(d.o); if (o > 0) GLIVE[j].pct = (p - o) / o * 100;
          var hh = parseFloat(d.h), ll = parseFloat(d.l);
          if (hh > 0) GLIVE[j].high = hh;
          if (ll > 0) GLIVE[j].low = ll;
          if (old !== p){ glDirty = glDirty || {}; glDirty[d.s] = p > old ? 1 : -1; if (!liveFlushTimer) liveFlushTimer = setTimeout(flushLive, 350); }
        }
      }
    } catch (e) {}
  };
  ws.onclose = function(){ setTimeout(bnSocket, 20000); };
  ws.onerror = function(){ try { ws.close(); } catch (e) {} };
}
/* REST backstop for the AED midpoint above, for the moments the
   WebSocket is down: the same real best bid/ask from Binance's
   public bookTicker endpoint. */
function bnAedBookPoll(){
  fetch("https://data-api.binance.vision/api/v3/ticker/bookTicker?symbol=USDTAED")
    .then(function(r){ if (!r.ok) throw new Error("bad"); return r.json(); })
    .then(function(j){
      var bb = parseFloat(j.bidPrice), aa = parseFloat(j.askPrice);
      if (bb > 0 && aa > 0){ BN_PX["USDTAED"] = (bb + aa) / 2; bnRecompute(); }
    }).catch(function(){});
}
setTimeout(bnAedBookPoll, 2500);
setInterval(bnAedBookPoll, 15000);

/* ----- Bybit: public spot. Coverage is discovered from Bybit's
   own live ticker list at runtime — only fiat pairs Bybit really
   lists are used; if Bybit is unreachable, the forex feed below
   covers those currencies instead. ----- */
var BYBIT_MAP = null;
function bybitFeed(code, m, p){
  var u = BN_PX["USDTUSD"] || 1;
  if (p > 0) feedSet(code, "bybit", m.inv ? u / p : p * u);
}
function bybitPoll(){
  if (!BYBIT_MAP) return;
  Object.keys(BYBIT_MAP).forEach(function(code){
    var m = BYBIT_MAP[code];
    fetch(m.host + "/v5/market/tickers?category=spot&symbol=" + m.s)
      .then(function(r){ if (!r.ok) throw new Error("bad"); return r.json(); })
      .then(function(j){
        var t = j && j.result && j.result.list && j.result.list[0];
        if (t) bybitFeed(code, m, parseFloat(t.lastPrice));
      }).catch(function(){});
  });
}
function bybitDiscover(){
  var hosts = ["https://api.bybit.com", "https://api.bytick.io"];
  function attempt(i){
    if (i >= hosts.length) return;
    fetch(hosts[i] + "/v5/market/tickers?category=spot")
      .then(function(r){ if (!r.ok) throw new Error("bad"); return r.json(); })
      .then(function(j){
        var list = j && j.result && j.result.list;
        if (!list || !list.length){ attempt(i + 1); return; }
        var px = {};
        list.forEach(function(t){ var p = parseFloat(t.lastPrice); if (p > 0) px[t.symbol] = p; });
        BYBIT_MAP = {};
        DATA.forEach(function(c){
          if (BN_FIAT[c.code] || c.code === "JPY" || c.code === "USD") return;
          if (px[c.code + "USDT"]) BYBIT_MAP[c.code] = { s:c.code + "USDT", inv:false, host:hosts[i] };
          else if (px["USDT" + c.code]) BYBIT_MAP[c.code] = { s:"USDT" + c.code, inv:true, host:hosts[i] };
        });
        Object.keys(BYBIT_MAP).forEach(function(code){ bybitFeed(code, BYBIT_MAP[code], px[BYBIT_MAP[code].s]); });
        if (Object.keys(BYBIT_MAP).length) setInterval(bybitPoll, 15000);
        if (TV.tf === "LIVE") ltSeedBybit();
      }).catch(function(){ attempt(i + 1); });
  }
  attempt(0);
}

/* ----- Kraken: public spot ticker (no account, no sign-in) for
   the major fiat pairs Kraken really lists — EUR, GBP, AUD, NZD
   quoted USD-per-unit, CHF and CAD quoted units-per-USD and
   inverted. It sits between Bybit and the forex feed in
   priority: a real exchange print for the majors that have no
   Binance fiat pair (GBP, CHF, CAD, AUD, NZD), never overriding
   Binance or Bybit where those answer. Response keys are
   Kraken's internal Z-prefixed names (ZEURZUSD and friends),
   verified against the live API. ----- */
var KRAKEN_MAP = {
  EUR:{ p:"EURUSD", key:"ZEURZUSD", inv:false }, GBP:{ p:"GBPUSD", key:"ZGBPZUSD", inv:false },
  AUD:{ p:"AUDUSD", key:"ZAUDZUSD", inv:false }, NZD:{ p:"NZDUSD", key:"ZNZDZUSD", inv:false },
  CHF:{ p:"USDCHF", key:"ZUSDZCHF", inv:true },  CAD:{ p:"USDCAD", key:"ZUSDZCAD", inv:true }
};
/* Every Kraken pair is read off its real bid/ask MIDPOINT, never
   the last trade alone: on Kraken's thinner fiat books the last
   trade can sit unchanged for minutes while the quote keeps
   re-pricing (verified live 2026-10-30, six 10-second samples:
   AUDUSD showed 2 distinct last trades against 4 distinct
   midpoints; GBP's midpoint moved in all six samples). GBP and
   AUD get the JPY recipe on top: Kraken really lists BTCGBP
   (result key XXBTZGBP) and BTCAUD (key XBTAUD) — verified
   against the live API — so USD-per-unit is crossed through
   BTC, BTCUSD midpoint / BTC<fiat> midpoint, and ticks at BTC
   pace; the pair's direct midpoint is the fallback for the
   moments a cross leg has not answered. The first cross print
   re-anchors at the factor already on screen, so the MMK level
   never steps when the cross takes over. */
var KR_BTCX = { GBP:"XXBTZGBP", AUD:"XBTAUD" };
var KR_XMODE = {};
function krMid(t){
  if (!t) return 0;
  var b = t.b && parseFloat(t.b[0]), a = t.a && parseFloat(t.a[0]);
  if (b > 0 && a > 0) return (b + a) / 2;
  var c = t.c && parseFloat(t.c[0]);
  return c > 0 ? c : 0;
}
function krakenFeed(){
  var pairs = Object.keys(KRAKEN_MAP).map(function(k){ return KRAKEN_MAP[k].p; })
    .concat(["BTCUSD", "BTCGBP", "BTCAUD"]).join(",");
  fetch("https://api.kraken.com/0/public/Ticker?pair=" + pairs)
    .then(function(r){ if (!r.ok) throw new Error("bad"); return r.json(); })
    .then(function(j){
      var res = j && j.result; if (!res) return;
      var btcUsd = krMid(res["XXBTZUSD"] || res["BTCUSD"]);
      Object.keys(KRAKEN_MAP).forEach(function(code){
        var m = KRAKEN_MAP[code];
        var xs = KR_BTCX[code];
        if (xs && btcUsd > 0){
          var xm = krMid(res[xs]);
          if (xm > 0){
            var cross = btcUsd / xm;
            if (!KR_XMODE[code]){ KR_XMODE[code] = 1; feedSet(code, "kraken", cross, liveFactor(code)); }
            else feedSet(code, "kraken", cross);
            return;
          }
        }
        var mid = krMid(res[m.key] || res[m.p]);
        if (mid > 0) feedSet(code, "kraken", m.inv ? 1 / mid : mid);
      });
    }).catch(function(){});
}
setTimeout(krakenFeed, 2000);
setInterval(krakenFeed, 10000);

/* ----- Kraken WebSocket (v2 ticker channel): the same real
   Kraken book as the REST poll above, pushed instead of polled,
   for GBP and AUD — the two majors whose forming candles kept
   reading O=H=L=C in live checks (2026-10-30 23:20–23:34: GBP's
   level stepped once between reads while every candle stayed
   flat; AUD never moved at all). Their REST prints demonstrably
   re-price every few seconds when sampled directly (the BTC
   crosses moved in all six 9-second samples taken against the
   live API that evening), so the pairs were starved by the
   poll cadence / poll failures in front of the visitor, not by
   a still market. The socket carries the ticker channel for
   GBP/USD, AUD/USD and the BTC legs of their crosses; every
   push is read off the real bid/ask midpoint and crossed
   through BTC exactly like krakenFeed (same "kraken" source,
   same KR_XMODE first-cross anchor), so the two lanes agree on
   one recipe and whichever print lands drives the pair. If the
   socket never connects, nothing is lost: the REST poll and
   the forex feed below keep running exactly as before. No
   price is invented — a silent socket simply never feeds. ----- */
var KR_WS_MID = {};
function krakenWsFeed(){
  var btc = KR_WS_MID["BTC/USD"];
  [["GBP", "BTC/GBP", "GBP/USD"], ["AUD", "BTC/AUD", "AUD/USD"]].forEach(function(spec){
    var code = spec[0], xm = KR_WS_MID[spec[1]], dm = KR_WS_MID[spec[2]];
    if (btc > 0 && xm > 0){
      var cross = btc / xm;
      if (!KR_XMODE[code]){ KR_XMODE[code] = 1; feedSet(code, "kraken", cross, liveFactor(code)); }
      else feedSet(code, "kraken", cross);
    } else if (dm > 0) feedSet(code, "kraken", dm);
  });
}
function krakenSocket(){
  if (!("WebSocket" in window)) return;
  var ws;
  try { ws = new WebSocket("wss://ws.kraken.com/v2"); } catch (e) { return; }
  ws.onopen = function(){
    try { ws.send(JSON.stringify({ method:"subscribe", params:{ channel:"ticker", symbol:["GBP/USD", "AUD/USD", "BTC/USD", "BTC/GBP", "BTC/AUD"] }, req_id:1 })); } catch (e) {}
  };
  ws.onmessage = function(ev){
    try {
      var m = JSON.parse(ev.data);
      if (!m || m.channel !== "ticker" || !m.data) return;
      m.data.forEach(function(d){
        if (!d || !d.symbol) return;
        var b = parseFloat(d.bid), a = parseFloat(d.ask), mid = (b > 0 && a > 0) ? (b + a) / 2 : parseFloat(d.last);
        if (mid > 0) KR_WS_MID[d.symbol] = mid;
      });
      krakenWsFeed();
    } catch (e) {}
  };
  ws.onclose = function(){ setTimeout(krakenSocket, 20000); };
  ws.onerror = function(){ try { ws.close(); } catch (e) {} };
}
setTimeout(krakenSocket, 2400);

/* ----- Coinbase: public exchange-rates (no account, no sign-in,
   CORS-open) — a genuinely NEW, independent real feed for VND.
   VND had exactly one source before (the TradingView scanner's
   FX_IDC:USDVND bid/ask midpoint), so the frozen-incumbent
   takeover could never fire for it and no second print existed
   to arbitrate against. The alternatives were checked against
   the live APIs on 2026-10-30: Binance, Bybit and Kraken list
   NO VND pair at all, and TradingView's scanner answers nothing
   for OANDA:USDVND (nor FX:USDVND) — only FX_IDC:USDVND prints.
   Coinbase's public spot endpoint DOES print USDVND
   (rates.VND = dong per USD, 25,803.16 at check time against
   TradingView's 25,802 close — a real, independent quote), so
   VND now has two real sources: Coinbase (priority 1.5) over
   the TradingView midpoint (priority 1), with feedSet's normal
   priority + frozen-incumbent rules arbitrating between them.
   Anchored on first print like every feed here, so only the
   movement is live — the level stays VND's real published MMK
   rate. Polled every 15 s, and every 6 s while VND is the pair
   on screen. No price is invented: if Coinbase never answers,
   VND simply stays on the TradingView print and, per the
   LIVE_MOVED gate, is not labelled LIVE until a real print
   actually changes. ----- */
function coinbaseVndFeed(){
  fetch("https://api.coinbase.com/v2/exchange-rates?currency=USD")
    .then(function(r){ if (!r.ok) throw new Error("bad"); return r.json(); })
    .then(function(j){
      var vnd = j && j.data && j.data.rates && parseFloat(j.data.rates.VND);
      if (vnd > 0) feedSet("VND", "coinbase", 1 / vnd);
    }).catch(function(){});
}
function fastCoinbasePoll(){ if (selected === "VND") coinbaseVndFeed(); }
setTimeout(coinbaseVndFeed, 2200);
setInterval(coinbaseVndFeed, 15000);
setInterval(fastCoinbasePoll, 6000);

/* ----- Coinbase SGD/USD spot: a second, independent real feed
   for SGD (added 2026-10-31). SGD's only lane was the
   TradingView scanner follow set, whose arbitration thrashed
   between candidates and ate the movement (see tvFollow). The
   alternatives were checked against the live APIs that night:
   Binance lists no SGD pair (BTCSGD / USDTSGD rejected as
   invalid symbols), Luno has no SGD market (XBTSGD returns
   "Market not available" and no SGD pair appears in its ticker
   list), and Kraken lists no SGD pair either. Coinbase's public
   price API DOES quote SGD/USD directly (USD per SGD — the
   exact unit every feed here consumes), and it genuinely moves:
   in the 2026-10-31 00:26 probe it printed 0.78234916 →
   0.78237058 across 35 s while its BTC/SGD cross moved
   0.78253 → 0.78236, in line with the scanner's own stepping
   USDSGD prints. Same public Coinbase API family as the VND
   lane above (no account, no sign-in, CORS-open), same
   priority (1.5, over the scanner's 1), anchored on first print
   like every feed here so only the movement is live and the
   level stays SGD's real published MMK rate. Polled every 15 s,
   and every 6 s while SGD is the pair on screen. No price is
   invented: if Coinbase never answers, SGD simply stays on the
   scanner prints and, per the LIVE_MOVED gate, is not labelled
   LIVE until a real applied print actually moves its factor. */
function coinbaseSgdFeed(){
  fetch("https://api.coinbase.com/v2/prices/SGD-USD/spot")
    .then(function(r){ if (!r.ok) throw new Error("bad"); return r.json(); })
    .then(function(j){
      var p = j && j.data && parseFloat(j.data.amount);
      if (p > 0) feedSet("SGD", "coinbase", p);
    }).catch(function(){});
}
function fastCoinbaseSgdPoll(){ if (selected === "SGD") coinbaseSgdFeed(); }
setTimeout(coinbaseSgdFeed, 2400);
setInterval(coinbaseSgdFeed, 15000);
setInterval(fastCoinbaseSgdPoll, 6000);

/* ----- Luno: public BTC/MYR ticker — a genuinely NEW, independent
   real feed for MYR. MYR was the pair with no moving source at
   all (verified live 2026-10-30 22:41–22:43: the chart sat at
   O=H=L=C 1181.07, 0.00%, across a full 65-second watch, and the
   card never changed): Binance lists no MYR pair (USDTMYR /
   BTCMYR / MYRUSDT all rejected by its API), Bybit, Kraken, OKX
   and Bitget list none either, Coinbase's MYR reference rate did
   not change across two minutes of sampling, and the TradingView
   scanner's only USDMYR print (FX_IDC, read off its bid/ask
   midpoint) held bid 4.054 / ask 4.060 unchanged through eight
   polls over 72 seconds — an indicative overnight quote, not a
   trading one. Luno is Malaysia's real spot exchange and its
   public XBTMYR book is ACTIVE and re-prices at BTC pace
   (verified live 2026-10-30: bid stepped 314,487 → 314,337 →
   314,272 across four samples in 30 s). MYR is crossed exactly
   like JPY: USD-per-ringgit = BTCUSDT / BTC-MYR, read off the
   book's real bid/ask midpoint. Luno's API sends no CORS headers
   (verified: no Access-Control-Allow-Origin, with or without an
   Origin header), so the ticker is fetched through the same
   public relays the EgCurrency auto-update below already races —
   the first relay to return a parseable real print wins, and if
   every relay fails the cycle is simply skipped and MYR stays on
   its TradingView midpoint, unlabelled until a feed really moves
   (see LIVE_GATED). Anchored on first print like every feed here,
   so only the movement is live — the level stays MYR's real
   published MMK rate. Polled every 20 s, and every 8 s while MYR
   is the pair on screen. No price is invented. ----- */
var LUNO_XMODE = {}, lunoBusy = false;
function lunoMyrFeed(){
  if (lunoBusy) return;
  if (!(BN_PX["BTCUSDT"] > 0)) return; /* the cross needs its USD leg */
  lunoBusy = true;
  var released = false;
  function release(){ if (!released){ released = true; lunoBusy = false; } }
  setTimeout(release, 14000); /* a hung relay never wedges the lane */
  var urls = relayUrls("https://api.luno.com/api/1/ticker?pair=XBTMYR");
  var pending = urls.length;
  if (!pending){ release(); return; }
  urls.forEach(function(u){
    fetchText(u, 12000).then(function(t){
      if (released) return;
      var j = null;
      if (t){
        /* Relays wrap the payload differently (raw JSON, a JSON
           envelope, a reader page with the JSON inline): take the
           ticker object itself wherever it sits in the text. */
        var m = String(t).match(/\{\s*"pair"\s*:\s*"XBTMYR"[\s\S]*?\}/);
        if (m){ try { j = JSON.parse(m[0]); } catch (e) { j = null; } }
      }
      if (!j){ if (--pending === 0) release(); return; }
      var bid = parseFloat(j.bid), ask = parseFloat(j.ask);
      if (!(bid > 0 && ask > 0)){ if (--pending === 0) release(); return; }
      release();
      var btc = BN_PX["BTCUSDT"]; if (!(btc > 0)) return;
      var cross = btc / ((bid + ask) / 2) * (BN_PX["USDTUSD"] || 1);
      if (!LUNO_XMODE.MYR){ LUNO_XMODE.MYR = 1; feedSet("MYR", "luno", cross, liveFactor("MYR")); }
      else feedSet("MYR", "luno", cross);
    });
  });
}
function fastLunoPoll(){ if (selected === "MYR") lunoMyrFeed(); }
setTimeout(lunoMyrFeed, 2600);
setInterval(lunoMyrFeed, 20000);
setInterval(fastLunoPoll, 8000);

/* ----- Live forex feed (TradingView scanner, FX / FX_IDC real
   quotes) for every remaining currency with a real traded pair.
   All quotes are USD-per-unit crosses: usdPerUnit = 1 / close.
   Each currency is asked under BOTH scanner prefixes (FX: and
   FX_IDC:): coverage and cadence differ per currency — a pair
   one variant carries can sit frozen on the other (verified
   2026-10-30: FX_IDC:USDCNY returned 6.6606 unchanged in nine
   polls over two minutes while USDCNH changed six times, and
   USDVND's close never moved at all). So no variant is locked
   in just for answering first: both variants stay in the poll
   set, and the feed follows whichever variant actually MOVES —
   a variant that prints a new value takes over the pair with a
   level-preserving re-anchor (the MMK level never steps when
   the followed quote switches between two real quotes of the
   same pair), and a variant that has stopped moving yields to
   one that still moves. CNY is quoted through the offshore
   USDCNH pair first — the freely traded yuan, which ticks
   like a normal FX pair — with onshore USDCNY as fallback,
   plus further independent USDCNH prints (OANDA:, SAXO: and
   IG: — all three verified answering the scanner 2026-10-30,
   SAXO and IG added after a live check found CNY still flat:
   in any given minute some CNH prints sit still while others
   step, so the follow set carries every real print the
   scanner offers and follows whichever one moved) riding in
   the same follow-the-mover set. The broker CNH prints enter
   twice each — their close and their bid/ask midpoint as
   separate candidates — because the two fields take turns
   moving (see tvRowFeed). SGD rides the same pattern: its
   FX_IDC close froze in the 2026-10-30 23:20–23:34 live check
   while OANDA: / SAXO: / IG: USDSGD closes kept stepping, so
   all three are in SGD's follow set; SAXO:USDAUD likewise
   joins AUD's set after its FX_IDC print sat frozen across a
   full probe while SAXO's close stepped in every sample. VND and MYR, whose interbank
   closes can sit unchanged for long stretches, are read off
   the real bid/ask midpoint, which re-prices whenever either
   side of the quote moves. A
   currency no variant answers for simply never feeds: it
   keeps its real daily candles, unlabelled. Requests go out
   in chunks of 60 tickers so one rejected chunk can never
   silence the whole cycle. ----- */
var TV_FX_SET = { CAD:1, CHF:1, HKD:1, JPY:1, KRW:1, INR:1, MXN:1, PLN:1, HUF:1, SEK:1, NOK:1, DKK:1, TRY:1, ZAR:1, CLP:1 };
var TV_TICKERS = {}, TV_LOCK = {}, TV_SEEN = {}, TV_SYM2CODE = {};
DATA.forEach(function(c){
  if (c.code === "USD" || c.code === "KGS") return;
  if (c.code === "CNY"){
    /* PEPPERSTONE: and CAPITALCOM: USDCNH join the set (added
       2026-10-31): a live probe that night (00:26, two samples
       35 s apart) found both answering the scanner and both
       stepping (6.65302 → 6.65300 and 6.65351 → 6.65349) in a
       window where FX_IDC:USDCNH and IG:USDCNH sat unchanged —
       two more real, independently-moving CNH prints for the
       follow set. Onshore FX_IDC:USDCNY stayed frozen, as
       expected for the managed onshore print. */
    TV_TICKERS[c.code] = ["FX_IDC:USDCNH", "FX:USDCNH", "FX_IDC:USDCNY", "FX:USDCNY", "OANDA:USDCNH", "SAXO:USDCNH", "IG:USDCNH", "PEPPERSTONE:USDCNH", "CAPITALCOM:USDCNH"];
  } else if (c.code === "SGD"){
    /* SGD's follow set carries the broker prints too (added
       2026-10-30): in the 23:20–23:34 live check SGD's level
       stepped once while every candle read O=H=L=C, and probing
       the scanner that evening showed why — FX_IDC:USDSGD's
       close changed twice in 70 s and then froze, its bid/ask
       never changed at all, and FX:USDSGD answered nothing,
       while OANDA:, SAXO: and IG: USDSGD closes stepped in most
       10-second samples. Same follow-the-mover set as CNY's:
       whichever real print actually moves is followed.
       PEPPERSTONE: and CAPITALCOM: USDSGD join it (2026-10-31,
       same live probe as CNY's additions: both answered and
       both stepped inside 35 s). SGD also has the Coinbase
       SGD/USD spot lane below as an independent second source. */
    TV_TICKERS[c.code] = ["FX_IDC:USDSGD", "FX:USDSGD", "OANDA:USDSGD", "SAXO:USDSGD", "IG:USDSGD", "PEPPERSTONE:USDSGD", "CAPITALCOM:USDSGD"];
  } else if (c.code === "AUD"){
    /* SAXO:USDAUD joins AUD's set (added 2026-10-30): the
       scanner's FX_IDC:USDAUD sat completely frozen (close
       1.4210, bid/ask unchanged) across a full 70-second probe
       while SAXO:USDAUD's close stepped in every sample —
       AUD's flat live candle that evening was a frozen followed
       print, not a still market. Kraken (REST + WebSocket)
       stays AUD's stronger lane; this is its moving fallback. */
    TV_TICKERS[c.code] = ["FX_IDC:USDAUD", "FX:USDAUD", "SAXO:USDAUD"];
  } else {
    TV_TICKERS[c.code] = TV_FX_SET[c.code]
      ? ["FX:USD" + c.code, "FX_IDC:USD" + c.code]
      : ["FX_IDC:USD" + c.code, "FX:USD" + c.code];
  }
  TV_TICKERS[c.code].forEach(function(t){ TV_SYM2CODE[t] = c.code; });
});
function tvTickersFor(code){
  /* Both variants stay in the poll set even after one is being
     followed: the follow choice only decides whose prints are
     used, and a frozen followed variant must be able to yield
     to the moving one (see tvRowFeed). */
  return TV_TICKERS[code] || [];
}
var TV_CHANGED_AT = {};
function tvFollow(code, key, val){
  /* Follow-the-mover arbitration for one real scanner print
     (identified by `key` — usually the ticker itself; CNY's and
     SGD's broker tickers enter two candidates each, see
     tvRowFeed): the followed print keeps the pair while it keeps
     moving, and a print that actually changed takes over with a
     level-preserving re-anchor. An unchanged print changes
     nothing and is ignored.
     Incumbent stickiness (added 2026-10-31): a challenger may
     only take over once the FOLLOWED candidate has printed no
     change for 25 s. The old rule let any changed candidate seize
     the pair instantly, and for CNY / SGD that thrashed: their
     candidate sets are wide (up to ten close / midpoint prints
     per pair, each stepping at a different moment), so the lock
     switched on nearly every poll — and every switch re-anchors
     at the current factor, discarding the movement the previous
     candidate had accumulated. Each candidate only ever
     contributed a single print before being replaced, so the
     factor never moved and every 1-minute candle read O=H=L=C
     even though a live probe the same night (2026-10-31 00:26)
     showed the scanner's CNH and SGD prints themselves stepping
     in most 35-second samples — the market moved, the arbitration
     ate it. With stickiness the followed candidate keeps the pair
     through consecutive polls, its own successive changed prints
     land in feedSet's same-source path and the factor (and the
     candle) genuinely moves; a candidate that truly freezes
     still yields after 25 s to one that is moving. */
  var prev = TV_SEEN[key];
  TV_SEEN[key] = val;
  var changed = prev !== undefined && prev !== val;
  if (changed) TV_CHANGED_AT[key] = Date.now();
  var locked = TV_LOCK[code];
  if (locked && locked !== key){
    if (!changed) return;
    if (Date.now() - (TV_CHANGED_AT[locked] || 0) < 25000) return;
    TV_LOCK[code] = key;
    feedSet(code, "tv", val, liveFactor(code));
    return;
  }
  TV_LOCK[code] = key;
  feedSet(code, "tv", val);
}
function tvRowFeed(row){
  var code = TV_SYM2CODE[row.s];
  if (!code) return;
  var close = row.d && row.d[0];
  if (!(close > 0)) return;
  var val = 1 / close;
  if (code === "VND" || code === "MYR"){
    /* These pairs' close prints can sit still while their
       markets still re-price: follow the real bid/ask
       midpoint, which moves whenever either quote side does
       (MYR verified live 2026-10-30: its FX: variant does not
       answer at all and the FX_IDC close sat frozen — the
       midpoint is the liveliest real field the quote has). */
    var bid = row.d[1], ask = row.d[2];
    if (bid > 0 && ask > 0) val = 2 / (bid + ask);
  }
  if ((code === "CNY" || code === "SGD") && /^(OANDA|SAXO|IG|PEPPERSTONE|CAPITALCOM):/.test(row.s)){
    /* CNY / SGD through the broker prints (CNY added 2026-10-30,
       SGD given the same treatment 2026-10-31): the brokers
       quote on coarser grids — OANDA's close is a 4-decimal
       print that can sit on one value while its own bid/ask
       midpoint (5 decimals) steps, and SAXO's close steps in
       samples where its midpoint sits still (both patterns seen
       in the evening probes, while the pairs' live candles read
       O=H=L=C across full visits). Neither field alone follows
       the pair reliably, so each broker ticker enters BOTH its
       real close and its real bid/ask midpoint as separate
       follow candidates and the arbitration above follows
       whichever one actually moved. Both are the broker's own
       real quotes of the same pair; takeovers re-anchor, so the
       MMK level never steps when the followed candidate switches
       between them. */
    tvFollow(code, row.s + "~c", val);
    var cb = row.d[1], ca = row.d[2];
    if (cb > 0 && ca > 0) tvFollow(code, row.s + "~m", 2 / (cb + ca));
    return;
  }
  tvFollow(code, row.s, val);
}
function tvPost(tickers){
  return fetch("https://scanner.tradingview.com/forex/scan", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ symbols: { tickers: tickers }, columns: ["close", "bid", "ask"] })
  }).then(function(r){ if (!r.ok) throw new Error("bad"); return r.json(); })
    .then(function(j){ ((j && j.data) || []).forEach(tvRowFeed); });
}
function tvFeed(){
  var tickers = [];
  Object.keys(TV_TICKERS).forEach(function(k){ tickers = tickers.concat(tvTickersFor(k)); });
  var chunks = [];
  for (var i = 0; i < tickers.length; i += 60) chunks.push(tickers.slice(i, i + 60));
  (function next(i){
    if (i >= chunks.length) return;
    tvPost(chunks[i]).catch(function(){}).then(function(){ next(i + 1); });
  })(0);
}
document.addEventListener("visibilitychange", function(){ if (!document.hidden){ tvFeed(); bybitPoll(); } });
setTimeout(tvFeed, 900);
setInterval(tvFeed, 20000);
setTimeout(bybitDiscover, 2500);
setTimeout(bnSocket, 1200);

/* ----- Upbit: public spot for KRW, the pair no feed above
   lists (Binance, Bybit and Kraken carry no KRW pair at all —
   verified against their live symbol lists 2026-10-30 — so the
   slow TradingView scanner print was KRW's only source, and
   its forming candle sat flat). Upbit is Korea's real spot
   market: its KRW-BTC book prints a new price every few
   seconds all day (verified live: the trade price changed in
   every 15-second sample) and its public API is CORS-open.
   KRW is crossed exactly like JPY: USD-per-won = BTCUSDT /
   BTC(KRW), with Upbit's own KRW-USDT book as the direct
   fallback for the moments the BTC leg has not printed. A
   WebSocket carries the live prints; REST polls back it up
   (every 20 s for the cards, every 3 s while KRW is the pair
   on screen). Anchored on first print like every feed here,
   so only the movement is live — the level stays the pair's
   real published MMK rate. No price is invented. ----- */
var UPBIT = { btc:0, usdt:0 };
function upbitFeed(){
  var u = BN_PX["USDTUSD"] || 1;
  if (UPBIT.btc > 0 && BN_PX["BTCUSDT"] > 0)
    feedSet("KRW", "upbit", BN_PX["BTCUSDT"] / UPBIT.btc * u);
  else if (UPBIT.usdt > 0)
    feedSet("KRW", "upbit", u / UPBIT.usdt);
}
function upbitPoll(){
  fetch("https://api.upbit.com/v1/ticker?markets=KRW-BTC,KRW-USDT")
    .then(function(r){ if (!r.ok) throw new Error("bad"); return r.json(); })
    .then(function(rows){
      (rows || []).forEach(function(t){
        var p = parseFloat(t.trade_price); if (!(p > 0)) return;
        if (t.market === "KRW-BTC") UPBIT.btc = p;
        else if (t.market === "KRW-USDT") UPBIT.usdt = p;
      });
      upbitFeed();
    }).catch(function(){});
}
function upbitSocket(){
  if (!("WebSocket" in window)) return;
  var ws;
  try { ws = new WebSocket("wss://api.upbit.com/websocket/v1"); } catch (e) { return; }
  ws.onopen = function(){
    try { ws.send(JSON.stringify([{ ticket:"kyatscope-krw" }, { type:"ticker", codes:["KRW-BTC", "KRW-USDT"] }])); } catch (e) {}
  };
  ws.onmessage = function(ev){
    function handle(txt){
      try {
        var t = JSON.parse(txt); if (!t || !t.code) return;
        var p = parseFloat(t.trade_price); if (!(p > 0)) return;
        if (t.code === "KRW-BTC") UPBIT.btc = p;
        else if (t.code === "KRW-USDT") UPBIT.usdt = p;
        else return;
        upbitFeed();
      } catch (e) {}
    }
    if (ev.data && typeof ev.data.text === "function") ev.data.text().then(handle).catch(function(){});
    else if (typeof ev.data === "string") handle(ev.data);
  };
  ws.onclose = function(){ setTimeout(upbitSocket, 20000); };
  ws.onerror = function(){ try { ws.close(); } catch (e) {} };
}
