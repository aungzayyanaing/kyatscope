# KyatScope Logo Sources — Batch W14

Date verified: 2026-11-06. All logos taken from the company's OWN official website only
(homepage header, brand/press page, or the company's own CDN / official investor-relations site).
No aggregators, no Logo.dev, no Clearbit, no Wikimedia, no favicon APIs.

## VERIFIED (16/16)

| Ticker | Company | File | Format | Source URL (logo taken from) | Notes |
|---|---|---|---|---|---|
| ILMN | Illumina | ILMN.svg | SVG | https://assets.illumina.com/content/dam/illumina-common/logo/illumina-full_logo.svg (found in homepage https://www.illumina.com/) | Orange dot + grey "illumina" wordmark |
| IQV | IQVIA | IQV.svg | SVG | https://www.iqvia.com/-/media/iqvia/iqvia_lg_hrz_rgb.svg (found in homepage https://www.iqvia.com/) | Blue/cyan "IQVIA" wordmark with Q motif |
| DXCM | Dexcom | DXCM.svg | SVG | Inline header SVG (id="mainLogo", "The official logo of Dexcom, Inc.") extracted from homepage https://www.dexcom.com/ | Renders in currentColor (black by default on light background); the site's old Logo.svg path now 404s, so the inline header SVG was used |
| RMD | ResMed | RMD.png | PNG (1182×247) | https://media.resmed.com/20250213074059/resmed_h_pos_clr_rgb_250121.png (found in homepage https://www.resmed.com/) | Horizontal positive colour lockup; verified complete with padding check — earlier "cropped" appearance was the image viewer, not the file |
| BSX | Boston Scientific | BSX.svg | SVG | https://www.bostonscientific.com/content/dam/logo-bsc.svg (found in homepage https://www.bostonscientific.com/) | Navy "Boston Scientific" + "Advancing science for life" |
| EW | Edwards Lifesciences | EW.svg | SVG | https://assets-us-01.kc-usercontent.com:443/6239a81e-8f0f-0040-a1df-b4932a10f6ae/261e0bb6-68dd-4f07-8798-cce9b0c42cc3/logo.svg (found in homepage https://www.edwards.com/ — Kentico Kontent CDN serving the official site) | Stacked "E" monogram + "Edwards" wordmark |
| BAX | Baxter | BAX.svg | SVG | Inline footer SVG extracted from official Baxter Spain site https://www.baxter.es/en/baxter-newsroom (baxter.com and investors.baxter.com block this VM's direct connections — timeout/connection refused) | Blue (#154898) "Baxter" wordmark |
| BDX | Becton Dickinson (BD) | BDX.svg | SVG | https://news.bd.com/images/header-bd-logo.svg (header logo of the official BD newsroom https://news.bd.com/; www.bd.com returns 403 to direct fetch) | Orange sunburst figure + blue "BD" |
| CAH | Cardinal Health | CAH.png | PNG (215×80) | https://s201.q4cdn.com/566741227/files/design/logo.png (header logo of the official Cardinal Health investor site https://ir.cardinalhealth.com/ — Q4 CDN hosting the company's own IR site; cardinalhealth.com itself is unreachable from this VM) | Red swoosh + "CardinalHealth" wordmark |
| MCK | McKesson | MCK.svg | SVG | https://www.mckesson.com/siteassets/images/z-mckesson-logosicons/mck_logo_blue.svg (found in homepage https://www.mckesson.com/) | Blue "McKesson" wordmark with orange bar |
| COR | Cencora | COR.png | PNG (1000×143) | https://www.cencora.com/-/media/assets/corporate/global/logos/cencora-logo.png (found in homepage https://www.cencora.com/) | Purple lowercase "cencora" wordmark |
| HUM | Humana | HUM.svg | SVG | https://assets.humana.com/is/content/humana/2022_Humana_Lockup_RGB_News_Green_No-R_No-Pad_Horiz (header logo of official newsroom https://news.humana.com/, served from Humana's own DAM) | Green (#78BE20) "Humana" wordmark; file is 222 KB because it retains embedded Adobe Illustrator data — artwork itself is the clean vector lockup |
| CI | Cigna Group | CI.svg | SVG | Inline nav SVG (class="tcg-nav-logo") extracted from the official newsroom https://newsroom.thecignagroup.com/ | Green tree symbol + navy "Cigna" + "THE CIGNA GROUP" |
| ELV | Elevance Health | ELV.svg | SVG | https://www.elevancehealth.com/content/dam/elevance-health-non-index/logos/Apex-Header.svg (found in homepage https://www.elevancehealth.com/) | Blue chevron + navy "Elevance Health" |
| CNC | Centene | CNC.svg | SVG | https://investors.centene.com/images/centene-logo.svg (header logo of the official investor site https://investors.centene.com/; the centene.com homepage only exposes a white "reverse" PNG) | Blue "CENTENE" + grey "Corporation" |
| MOH | Molina Healthcare | MOH.png | PNG (2729×794) | https://molinahealthcare.com/en/-/media/Project/PWS/Healthcare/Images/Graphics-Storage/Icons/State-Logos/Molina-Healthcare.png (the site's own header logo, confirmed in homepage JSON at https://molinahealthcare.com/) | Teal three-figures icon + black "MOLINA HEALTHCARE®"; verified complete with padding check |

## NOT FOUND (0)

None. All 16 tickers in batch W14 were verified from official company sources.

## Flags / caveats

- DXCM.svg uses `fill="currentColor"` (as served by dexcom.com) — it renders black unless a green colour is applied by the page CSS. Legible on a light background as-is.
- CAH.png is served from Q4's CDN (s201.q4cdn.com), which hosts Cardinal Health's official investor-relations site; it is not a third-party logo aggregator, but the file does not sit on a cardinalhealth.com domain.
- EW.svg is served from Kentico Kontent's CDN (assets-us-01.kc-usercontent.com), which serves edwards.com's own site assets.
- BAX.svg comes from baxter.es (official Baxter Spain site) because baxter.com / investors.baxter.com refuse connections from this VM; the mark is identical to the global Baxter wordmark.
- HUM.svg is 222 KB (embedded Illustrator data); rendering is unaffected, but it could be slimmed later if page weight matters.
- No logo in this batch is white-only; all are colour/dark versions readable on a light background.
