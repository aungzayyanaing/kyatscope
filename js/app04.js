
render();
renderConverter();
renderTable();
var ccEl = document.getElementById("curCount");
if (ccEl) ccEl.textContent = toMyDigits(DATA.length);
updateFxCount(DATA.length);
try { checkMarketUpdate(); } catch (e) {}
try { checkAggregateUpdate(); } catch (e) {}
setInterval(function(){ try { checkMarketUpdate(); } catch (e) {} try { checkAggregateUpdate(); } catch (e) {} }, 30 * 60 * 1000);
document.addEventListener("visibilitychange", function(){ if (!document.hidden){ try { checkMarketUpdate(); } catch (e) {} try { checkAggregateUpdate(); } catch (e) {} } });
