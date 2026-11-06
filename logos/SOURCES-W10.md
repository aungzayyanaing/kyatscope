# KyatScope Logo Sources — Batch W10

Date verified: 2026-11-06
Batch tickers: PAYX, FIS, GPN, SPGI, MCO, ICE, CME, NDAQ, CBOE, BEN, TROW, AMP, BK, STT, MTB, PNC, USB, TFC, KEY, RF
Rule: official company website only (homepage header logo, brand/press page, or company-owned CDN). No aggregators, no Logo.dev/Clearbit/favicon APIs, no Wikimedia/Brandfetch.

## VERIFIED (14)

| Ticker | Company | Source URL (logo taken from) | File | Format | Status |
|---|---|---|---|---|---|
| PAYX | Paychex | https://www.paychex.com/themes/custom/paychex2/images/svg/logo-paychex.svg (header logo on https://www.paychex.com/) | PAYX.svg | SVG | VERIFIED — blue (#004B8D) "Paychex" wordmark, legible on light background |
| GPN | Global Payments | https://www.globalpayments.com/-/media/project/global-payments/corporate/corporate/global/site-logos/logoprimary-with-wordmark.svg (header logo on https://www.globalpayments.com/) | GPN.svg | SVG | VERIFIED — blue (#262AFF) "Global Payments" wordmark + G mark |
| MCO | Moody's | https://www.moodys.com/web/en/us/v3/images/header/v3-header-logo.svg (header logo on https://www.moodys.com/) | MCO.svg | SVG | VERIFIED — **white-only**: all fills are white; correct "Moody's" wordmark, invisible on a light background without a dark backing |
| ICE | Intercontinental Exchange | Inline SVG extracted from https://www.ice.com/ homepage (`<svg><title>ICE Logo</title>…`, viewBox 0 0 79 80) — no separate logo file exists on the site | ICE.svg | SVG | VERIFIED — ICE flag mark + "ICE" wordmark. Note: fills use site-CSS classes (`fill-current` / `text-ice-blue` / `text-black`), so standalone it renders monochrome black; shape and lettering are correct and legible |
| NDAQ | Nasdaq | Inline SVG extracted from https://www.nasdaq.com/ homepage (`nef-logo` component, viewBox 0 0 70 60, fill #0090BA) — the referenced https://www.nasdaq.com/sites/default/files/nasdaq-logo.png returns 404 | NDAQ.svg | SVG | VERIFIED — blue (#0090BA) Nasdaq "N" mark |
| CBOE | Cboe Global Markets | Inline SVG extracted from https://www.cboe.com/ homepage header (viewBox 0 0 303.4 100.2) — no separate logo file on the site | CBOE.svg | SVG | VERIFIED — "Cboe" wordmark with green-square mark. Note: fills use Tailwind classes (`tw-fill-[#2AD870]`, `tw-fill-interface-common-base-01`), so standalone it renders monochrome black; shape and lettering are correct and legible |
| BEN | Franklin Resources (Franklin Templeton) | https://www.franklintempleton.com/assets/images/logos/FT_logo_pos_RGB@2x.png (header logo on https://www.franklintempleton.com/) | BEN.png | PNG (394×76) | VERIFIED — "FRANKLIN TEMPLETON" wordmark with Benjamin Franklin portrait, black on transparent |
| AMP | Ameriprise Financial | https://www.ameriprise.com/webfiles/1792725666585/assets/ampcom/images/amp-schema.png (schema.org Organization logo on https://www.ameriprise.com/ homepage) | AMP.png | PNG (500×500) | VERIFIED — blue Ameriprise compass-star mark (mark only, no wordmark) |
| BK | BNY Mellon (BNY) | https://www.bny.com/content/dam/bnymellon/web/logo/bnym-logo.png (header logo on https://www.bnymellon.com/) | BK.png | PNG (580×330) | VERIFIED — current "BNY" brand (teal arrow + navy BNY), company rebranded from BNY Mellon to BNY |
| STT | State Street | https://www.statestreet.com/web/Homepage/images/state-street-logo-final.svg (from https://www.statestreet.com/us/en) | STT.svg | SVG | VERIFIED — blue (#001aff) "STATE STREET" wordmark + symbol |
| MTB | M&T Bank | https://www.mtb.com/content/dam/mtb-web/images/mtb_logo_white.svg (header logo on https://www.mtb.com/ — the only logo version on the site) | MTB.svg | SVG | VERIFIED — **white-only**: fill #fff "M&T Bank" wordmark, invisible on a light background without a dark backing |
| USB | U.S. Bancorp (U.S. Bank) | https://www.usbank.com/etc.clientlibs/ecm-global/clientlibs/clientlib-resources/resources/images/svg/logo-personal.svg (header logo on https://www.usbank.com/) | USB.svg | SVG | VERIFIED — red shield + navy "bank" wordmark |
| TFC | Truist Financial | https://static.truist.com/content/dam/global-images/truist-logo.svg (header logo on https://www.truist.com/) | TFC.svg | SVG | VERIFIED — **white-only**: fill #fff "Truist" wordmark, invisible on a light background without a dark backing |
| RF | Regions Financial | https://www.regions.com/rdcresources/content/media/img/regions-logo.svg (header logo on https://www.regions.com/) | RF.svg | SVG | VERIFIED — green Regions tree mark (#88BB00) + "REGIONS" wordmark (#558800) |

## NOT FOUND (6) — keep letter monogram

| Ticker | Company | Reason |
|---|---|---|
| FIS | Fidelity National Information Services | Logo URL confirmed on the official homepage via browser fetch (https://www.fisglobal.com/-/media/fisglobal/files/2024-homepage-redesign/images/FIS_c_rgb.png) but Akamai denies this VM's IP ("Access Denied") and direct downloads time out. No file saved. |
| SPGI | S&P Global | curl returns Akamai "Access Denied" for spglobal.com; browser fetch is blocked by policy for this domain. No logo asset obtained. No file saved. |
| CME | CME Group | cmegroup.com and investor.cmegroup.com block this VM's IP ("blocked due to suspected web scraping activity"); browser text of the homepage and a press-release page exposed no official logo file (only a PRNewswire-hosted logo link, third-party, not used). No file saved. |
| TROW | T. Rowe Price | Homepage references https://www.troweprice.com/content/dam/site-assets/logos/troweprice-logo.svg but that URL returns 404; no other logo asset surfaced on the homepage. No file saved. |
| PNC | PNC Financial | curl to pnc.com timed out repeatedly; browser text of the homepage exposed no logo asset (only the Equal Housing Lender logo). No file saved. |
| KEY | KeyCorp (KeyBank) | curl to key.com timed out repeatedly; browser text of the homepage exposed no logo asset. No file saved. |

## Notes
- All 14 saved files were read back and inspected on 2026-11-06 before being listed as VERIFIED; no unverified file was left on disk.
- White-only files (MCO, MTB, TFC) need a dark backing / dark tile in the site UI or they will be invisible on a light background.
- ICE and CBOE are inline SVGs extracted verbatim from the official homepages; their fills depend on site CSS, so standalone they render monochrome black — still the correct, legible marks.
