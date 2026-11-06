# KyatScope Logo Sources — Batch W3

Date verified: 2026-11-06. All logos taken from the company's own official website only (homepage header logo, brand/media-library page, or the company's own CDN asset). No aggregators, no Logo.dev, no Clearbit, no Wikimedia, no favicon APIs. Every file was visually verified by rendering/reading it.

## XOM — Exxon Mobil
- Source page: https://investor.exxonmobil.com/ (official ExxonMobil investor relations site; www.exxonmobil.com and corporate.exxonmobil.com block curl with Akamai "Access Denied")
- Logo URL: https://d1io3yog0oux5.cloudfront.net/_846a550cf4695dce9fa5578132c6e6a1/exxonmobil/logo.png
- File: XOM.png (PNG, 306×80)
- Status: VERIFIED — red "ExxonMobil" wordmark, current mark, legible on light background. Note: asset is served from the IR site's CloudFront CDN host.

## UNH — UnitedHealth Group
- Source page: https://www.unitedhealthgroup.com/
- Logo URL: https://www.unitedhealthgroup.com/content/dam/uhg/icons/Icons/uhg-logo--desktop-2022.svg
- File: UNH.svg (SVG)
- Status: VERIFIED — black "UNITEDHEALTH GROUP" wordmark, current mark, legible on light background.

## ORCL — Oracle
- Source page: https://www.oracle.com/ (the "Technical Difficulties" error page served from www.oracle.com; direct curl fetches are blocked by Akamai, so no downloadable logo file URL exists on the live site)
- Logo URL: none — the logo is an inline SVG embedded in that Oracle-served page (`<div id="u30logo">`); extracted verbatim. Only an XML declaration and `xmlns` attribute were added so the file is valid standalone SVG; the artwork itself is untouched.
- File: ORCL.svg (SVG, 231×30)
- Status: VERIFIED — red "ORACLE" wordmark, current mark, legible on light background.

## CRM — Salesforce
- Source page: https://www.salesforce.com/
- Logo URL: https://images.ctfassets.net/ct4bxoykjwgb/4d9QNKh54Xnpy6bT3mgffN/0da717aa8debd3941435a18bce842d80/logo-salesforce-no-type.svg
- File: CRM.svg (SVG)
- Status: VERIFIED — blue (#00b3ff) Salesforce cloud mark, current mark, legible on light background. Note: this is the cloud mark only (file name is "logo-salesforce-no-type"); no "salesforce" wordmark version is served on the homepage.

## ABBV — AbbVie
- Source page: https://news.abbvie.com/image-gallery (official AbbVie News Center media library — "our official AbbVie media including our logo"; www.abbvie.com itself drops curl connections)
- Logo URL: https://news.abbvie.com/file.php/177358/AbbVieLogo_Preferred_DarkBlue_on_white_low+lr.jpg
- File: ABBV.jpg (JPEG, 1200×903)
- Status: VERIFIED — dark-blue lowercase "abbvie" wordmark on white, the preferred logo from AbbVie's own media library, legible on light background.

## CVX — Chevron
- Source page: https://www.chevron.com/
- Logo URL: https://www.chevron.com/-/media/shared-media/images/hallmark-2023.png
- File: CVX.png (PNG, 96×96)
- Status: VERIFIED — the Chevron hallmark (blue/red chevron mark), the site's actual header logo (`alt="Chevron"`, class `hallmark-theme-dark`), legible on light background. Note: small at 96×96 (the only header-logo size served); the footer SVG variant was rejected because its artwork renders off-centre.

## KO — Coca-Cola
- Source page: https://www.coca-colacompany.com/
- Logo URL: https://www.coca-colacompany.com/content/dam/corporate/us/en/header-footer/Header%20Icon.svg
- File: KO.svg (SVG, 125×20)
- Status: VERIFIED — black "THE Coca-Cola COMPANY" lockup, the site's header logo, legible on light background. Note: the other candidate on the same page, `tccf-square-logo.jpg`, was REJECTED after visual check — it is "THE Coca-Cola FOUNDATION" logo, not the Company logo. The white `tccc-logo-white.jpg` renders black-on-white and was not needed.

## PEP — PepsiCo
- Source page: https://www.pepsico.com/
- Logo URL: https://digitalassets.pepsico.com/asset/fe5c5aad-b8cd-4dd5-a1b2-d79302ff1f1c/Presentation-PNG/PepsiCo-Logo-header.png
- File: PEP.png (PNG, 1500×456)
- Status: VERIFIED — current PepsiCo logo (colourful globe/"P" mark + navy "pepsico" wordmark), the site's header logo (`alt="Pepsico Logo"`), legible on light background. Served from PepsiCo's own digital-assets CDN.

## MRK — Merck
- Source page: https://www.merck.com/
- Logo URL: https://www.merck.com/wp-content/uploads/sites/124/2025/08/site-logo.svg
- File: MRK.svg (SVG)
- Status: VERIFIED — teal/green Merck clover mark + black "MERCK" wordmark, current mark, legible on light background.

## TMO — Thermo Fisher Scientific
- Source page: https://www.thermofisher.com/
- Logo URL: https://www.thermofisher.com/store/global-header-footer-static/global/svg/thermofisher-logo.svg
- File: TMO.svg (SVG, 485.52×223.55)
- Status: VERIFIED — white "Thermo Fisher SCIENTIFIC" wordmark on a solid red background. Flag: the red background is baked into the official header asset (a full-size red rect), so the file renders as a red tile with white text — correct company and legible, but it will look like a solid red block rather than a transparent logo. No transparent variant is served on the site.

## Summary
- VERIFIED: 10 / 10 (XOM, UNH, ORCL, CRM, ABBV, CVX, KO, PEP, MRK, TMO)
- NOT FOUND: none
