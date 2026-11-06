# KyatScope Logo Sources — Batch W4

Date verified: 2026-11-06
Rule: logos taken from the company's OWN official website only (homepage header logo, brand/press/media-kit page, or the company's own CDN). No aggregators, no favicon APIs, no Wikimedia/Brandfetch/Logo.dev/Clearbit.

## VERIFIED (6)

### ACN — Accenture — NOT FOUND (see below)

### ADBE — Adobe — VERIFIED
- Source page: https://blog.adobe.com/en/publish/2020/05/28/evolving-our-brand-identity (Adobe's own brand-identity post, fetched 2026-11-06)
- Logo URL: https://blog.adobe.com/en/publish/2020/05/28/media_1cc0fcc19cf0e64decbceb3a606707a3ad23f51dd.png?width=750&format=png&optimize=medium
- File: ADBE.png — PNG, 750×328
- Notes: Current Adobe corporate logo (white "A" mark + "Adobe" wordmark). Red-field version — white logo on Adobe-red background, NOT transparent. Legible on light backgrounds as-is. The adobe.com AEM asset (main--edu--adobecom.aem.page/.../adobe-corp-logo.svg) returned 401 Unauthorized, so it was not used.

### DHR — Danaher — VERIFIED
- Source page: https://www.danaher.com/ (homepage, fetched 2026-11-06)
- Logo URL: https://www.danaher.com/themes/custom/danaher/logo.svg
- File: DHR.svg — SVG
- Notes: Official Danaher theme logo. Verified by inspecting the file: "Danaher" wordmark paths plus the embedded Danaher swoosh artwork (two gradient swoosh JPEGs extracted and visually checked — blue-purple and purple-pink swooshes).

### LIN — Linde — VERIFIED
- Source page: https://www.linde.com/ (homepage, fetched 2026-11-06)
- Logo URL: https://assets.linde.com/-/media/shared/logo/linde-logo-desktop.png (bare URL; the ?r=… version in the page HTML returned Akamai "Access Denied", the bare URL downloads fine)
- File: LIN.png — PNG, 196×98
- Notes: White "Linde" script + swoosh on a blue field (blue background is baked into the official asset). Small (196×98) — the only size the official site serves for the desktop logo.

### CSCO — Cisco — NOT FOUND (see below)

### ABT — Abbott Laboratories — VERIFIED
- Source page: https://www.abbott.com/ (homepage, fetched 2026-11-06)
- Logo URL: https://www.abbott.com/content/dam/corp/abbottglobal/test-hub/Abbott-Logo.png
- File: ABT.png — PNG, 1328×283
- Notes: Dark-blue Abbott "a" mark + "ABBOTT" wordmark, legible on light backgrounds. Visually verified.

### NKE — Nike — VERIFIED
- Source page: https://www.nike.com/ (homepage, fetched 2026-11-06)
- Logo URL: https://static.nike.com/a/images/f_png,q_auto:eco/61b4738b-e1e1-4786-8f6c-26aa0008e80b/swoosh-logo-black.png (page lists the f_jpg variant; the f_png variant of the same asset returns a real PNG)
- File: NKE.png — PNG, 1600×1600
- Notes: Black Nike swoosh on transparent background. Visually verified — current mark.

### TXN — Texas Instruments — NOT FOUND (see below)

### QCOM — Qualcomm — NOT FOUND (see below)

### AMGN — Amgen — VERIFIED
- Source page: https://www.amgen.com/ (homepage, fetched 2026-11-06)
- Logo URL: https://www.amgen.com/-/media/Themes/Global/Global/Global/images/migration/Footer/d-amgen-print-logo.svg
- File: AMGN.svg — SVG
- Notes: Blue (#0063c3) AMGEN wordmark, readable on light backgrounds. The footer logo on the same page is white-only (#fff); the print-logo variant was used instead. Verified by source inspection (no SVG renderer in this VM): path geometry is byte-identical to the official white footer logo (d-amgen-logo.svg / m-amgen-logo.svg), only the fill differs (#0063c3 vs #fff).

## NOT FOUND (4) — keep letter monogram

### ACN — Accenture — NOT FOUND
- Tried: accenture.com homepage (browser + curl), /us-en/about/company, newsroom.accenture.com (curl + browser), the "Reinvented with Accenture" brand article, web search for an accenture.com logo asset.
- Reason: the Accenture logo is inline/JS-rendered on their site; no downloadable logo asset (SVG/PNG) was found anywhere on accenture.com. No substitute used.

### CSCO — Cisco — NOT FOUND
- Tried: cisco.com homepage, /c/en/us/about.html, Brand Center (brand-center.html), Logo Usage Guidelines, Corporate Logo page, newsroom.cisco.com (all via browser crawler — curl to cisco.com is Akamai-blocked with "Access Denied").
- Reason: no downloadable logo asset anywhere on cisco.com. Cisco's own Corporate Logo page states the corporate logo is only available via a permission-request form (ciscologos@cisco.com / online request tool), not as a direct download. No substitute used.

### TXN — Texas Instruments — NOT FOUND
- Tried: ti.com homepage and /about-ti/company/overview.html (curl), investor.ti.com (blocked — 369-byte error page), newsroom.ti.com (browser fetch failed), the TI "Signature & logo" brand page https://www.ti.com/legal/terms-conditions/trademarks/signature-and-logo.html (browser — text only, no logo image), web search.
- Reason: the TI logo/signature is inline/CSS-rendered on ti.com; no downloadable logo asset was found on the official site. No substitute used.

### QCOM — Qualcomm — NOT FOUND
- Tried: qualcomm.com homepage (curl), /company/about, /news/media-resources, /news/press-kit, investor.qualcomm.com, MWC Barcelona 2025 press kit (browser — lists product/Dragonwing logos only, no corporate logo asset), web search.
- Reason: no downloadable corporate logo asset on qualcomm.com. The only qualcomm.com-hosted logo found is a 16×16 favicon (unusable). The full Qualcomm logo appears on qualcomm.com pages only via cdn.cookielaw.org (a third-party consent-management CDN — not allowed). No substitute used.
