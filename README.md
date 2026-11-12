# KyatScope

KyatScope is a static, single-page web app that shows foreign-exchange rates in Myanmar kyat (MMK). The interface is in Burmese, with currency names also given in English.

Live site: https://kyatscope.vercel.app

## What it does

- **Exchange rates for 103 currencies:** each currency shows a market buy price, a market sell price, and the daily change in percent. Some currencies are quoted per 100 or 1,000 units (for example, JPY per 100 and KRW and VND per 1,000); the page states the unit for each currency.
- **Market and bank rates:** switch between market rates and bank rates, and compare them in the rates table. A few currencies are bank-only — for example, AED is shown as bank-only on the live site.
- **Top movers and most-used currencies:** the page highlights the five currencies with the largest daily rise and the currencies most commonly used in Myanmar, such as USD, THB, CNY, JPY, KRW, VND, SGD, MYR, EUR, GBP, and AUD.
- **Search:** find a currency by name, code, or country name.
- **Currency converter:** choose a currency and an amount, then calculate the kyat amount using the buy rate or the sell rate.
- **Basic calculator:** add, subtract, multiply, divide, and work with percentages. Its result can be sent into the currency converter as the amount.
- **Rate chart:** a chart for the selected currency, with LIVE, 1D, 1W, and 1M ranges and a line-chart view.
- **Global Live crypto:** live crypto prices, sourced from Binance spot prices (see "Data sources" below).
- **Foreign stocks Live:** 237 US stocks plus the S&P 500 index, listed as NASDAQ / NYSE, with company logos from `logos/`.

## Data and scope

- The rates shown when the page loads come from an embedded snapshot in `js/data01.js`, dated 2026-10-30. The market values in that snapshot were checked against EgCurrency's visible buy/sell blocks on 2026-10-30 (see the comment at the top of `js/data01.js`). The app then tries to fetch newer market rates, and the page says so while it is fetching.
- Rates change over time. The site itself warns visitors to confirm the latest rate before exchanging money. The rates here are indicative only — KyatScope does not buy or sell currency, and it is not financial advice.
- There is no account, sign-in, or backend in this repository. Everything runs in the browser from the files in this repo.

## Data sources

As credited in the site footer and in the code:

- Currency market rates: EgCurrency (visible buy/sell blocks; see `js/data01.js` and `js/app04.js`)
- Crypto: Binance / CoinGecko
- Stocks: Yahoo Finance
- Stock logos: official company websites

## How to run it

There is no build step and nothing to install. The site is plain HTML, CSS, and JavaScript.

Option 1 — open it directly:

1. Download or clone this repository.
2. Open `index.html` in a browser.

Option 2 — serve it locally:

```sh
git clone https://github.com/aungzayyanaing/kyatscope.git
cd kyatscope
python3 -m http.server 8000
```

Then open http://localhost:8000 in a browser.

## Project structure

```text
index.html   The whole app: markup and styles (921 lines)
js/
  data01.js  Embedded exchange-rate snapshot (2026-10-30) and currency list
  hist01.js - hist06.js
             Historical data used by the rate chart
  app01.js - app04.js
             App logic: rates, converter, calculator, chart, crypto, and stocks
logos/       Company logos for the stocks section, named by ticker (for example, AAPL, MSFT)
LICENSE      MIT License
```

## License

MIT — see [LICENSE](LICENSE).
