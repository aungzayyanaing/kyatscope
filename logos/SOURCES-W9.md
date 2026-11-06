# KyatScope Logo Sources — Batch W9

Date verified: 2026-11-06. All logos taken from the company's OWN official website only
(homepage header logo, brand/press/media-kit page, or company-owned CDN asset).
No Google Images, Logo.dev, Clearbit, favicon APIs, Wikimedia, Brandfetch or aggregators used.

## VERIFIED (10)

| Ticker | Company | Source URL (logo taken from) | File | Format | Status |
|---|---|---|---|---|---|
| SYK | Stryker | https://www.stryker.com/etc/designs/stryker/images/header/logo.png (found in https://www.stryker.com/ homepage HTML) | SYK.png | PNG | VERIFIED |
| ZTS | Zoetis | https://www.zoetis.com/_assets/img/zoetis_logo.svg (found in https://www.zoetis.com/ homepage HTML) | ZTS.svg | SVG | VERIFIED |
| APD | Air Products | https://prd-us.airproducts.com/-/media/images/navigation/header/air-products-logo.png?h=43&w=198&hash=D778F4AFEA9427DBD5FFD8B85CC5EAB2 (found in https://www.airproducts.com/ homepage HTML) | APD.png | PNG | VERIFIED |
| SHW | Sherwin-Williams | https://www.sherwin-williams.com/content/dam/sherwin/tag/aem-main/global-gateway/final-page-assets/sw-logo-header-up.png (found in https://www.sherwin-williams.com/ homepage HTML) | SHW.png | PNG | VERIFIED |
| AME | AMETEK | https://www.ametek.com/-/media/project/oneweb/oneweb/oneweb/logos/default-logo.png (found in https://www.ametek.com/ homepage HTML) | AME.png | PNG | VERIFIED |
| ITW | Illinois Tool Works | https://www.itw.com/images/ITW-logo---dk-gray.svg (found in https://www.itw.com/ homepage HTML; dark-gray version, readable on light background) | ITW.svg | SVG | VERIFIED |
| PCAR | PACCAR | https://www.paccar.com/img/logo_paccar.png (found in https://www.paccar.com/ homepage HTML) | PCAR.png | PNG | VERIFIED |
| HLT | Hilton | https://www.hilton.com/modules/assets/svgs/logos/brand/HI.svg (Hilton Hotels & Resorts brand logo, listed in https://www.hilton.com/ homepage images; navy #002F61 "H" monogram + HILTON wordmark) | HLT.svg | SVG | VERIFIED |
| MAR | Marriott | https://news.marriott.com/static-assets/page-resources/newscenter/media-resources/images/mi-logo-rgb-300x234.png ("Marriott International Logo - RBG" on https://news.marriott.com/media-resources) | MAR.png | PNG | VERIFIED |
| CMI | Cummins | Inline SVG extracted from the https://www.cummins.com/ homepage HTML itself (header `site-logo__dark` link, black "C" mark + ®). No separate asset file: the logo is embedded in the official homepage source. | CMI.svg | SVG | VERIFIED — note: symbol-only "C" mark, no wordmark text in the SVG |

## NOT FOUND (10) — keep letter monogram

| Ticker | Company | Reason |
|---|---|---|
| UAL | United Airlines | united.com times out (no response) via curl; brand.united.com is a login-gated brand DAM (HTTP 429, no logo asset URL exposed); newsroom.united.com returns 403. No downloadable official logo found. |
| LUV | Southwest Airlines | southwest.com homepage is a JS shell with no logo asset in fetched HTML; swamedia.com and investors.southwest.com expose no logo image. Only third-party PRNewswire-hosted logo links exist — not company-owned, not used. |
| MDT | Medtronic | Official logo URL confirmed in fetched homepage HTML (https://www.medtronic.com/content/dam/medtronic-wide/medtronic-logo.svg) but the asset server returns an "Incorrect Browser" 403 page to curl, wget and the page fetcher — bot-walled, not downloadable from this environment. No file saved. |
| ECL | Ecolab | ecolab.com returns HTTP 504 / empty body to curl (repeated attempts); page fetcher renders text only with no logo asset exposed. |
| EMR | Emerson Electric | emerson.com Cloudflare-blocked (403) for curl; emerson.com/en-us/newsroom returns 403; fetched homepage/history/Go-Boldly pages expose no logo asset. |
| ETN | Eaton | eaton.com times out (no response) via curl at multiple timeouts; eaton.emotion.com brand center unreachable; fetched Eaton news pages expose no logo asset. |
| PH | Parker-Hannifin | parker.com returns Akamai "Access Denied" (403); investors.parker.com exposes no logo image (only a Win Strategy diagram). Only third-party PRNewswire-hosted logo links exist — not used. |
| ROK | Rockwell Automation | rockwellautomation.com Akamai-blocked (403) for curl; homepage via page fetcher exposes only white sub-brand logos (Allen-Bradley, FactoryTalk, LifecycleIQ), no downloadable corporate Rockwell Automation logo. |
| DOV | Dover | dovercorporation.com homepage and about pages expose no logo asset (only cookie-banner image and page banners). |
| ADP | Automatic Data Processing | adp.com returns Akamai "Access Denied" (403); ADP Logo Guidelines page offers only a PDF download (no image); mediacenter.adp.com exposes no logo image. |

## Notes

- Every VERIFIED file was read back and visually checked: correct company, current mark,
  legible, color/dark version readable on a light background. No white-only logos in this batch.
- No wrong or placeholder file was left on disk for any NOT FOUND ticker (the blocked
  Medtronic download attempt was deleted).
- Files live in ~/workspace/kyatscope/logos/ alongside other batches' files; only the
  W9 files listed above were created by this batch.
