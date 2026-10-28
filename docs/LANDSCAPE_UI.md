# European landscape interface

Approved direction: map-first, dark, spacious, flags and charts, minimal text. The new
route is `/landscape/`; existing catalogue and company URLs stay intact.

## Data contract

`scripts/lib/landscape.mjs` reads the reconciled working edition
`europe-uav-cuas-2026`. Inclusion requires **all** of:

- `landscape_candidates.status = included` in that edition (the reconciler's verified membership).
- `companies.publication_status = live` and an existing company slug.
- The canonical headquarters country has `countries.is_landscape_scope = true`.
- At least one explicit assignment under the `uav` or `counter-uas` taxonomy tree.

Do not replace this intersection with all live companies, a fixed snapshot, slug-prefix
matching, or a browser Supabase query. Verification/publication are separate decisions;
the public total will be lower than research totals while verified drafts remain drafts.
This interface does not change either decision, write to Supabase, or modify snapshots.

The build emits an allowlisted `/data/landscape.json`. It includes published product
names/links and company/capability source URLs, not research notes or credentials.
Ancestors are derived structurally; a broad assignment never implies a specific leaf.
Group parents never inherit their subsidiaries' capabilities. Company IDs are unique.

## Counting and interactions

- Metrics, choropleth, bars, donut, country chips and companies share the same filters.
- Domain metrics include overlap; donut segments are **UAV only / C-UAS only / both**.
- Capability counts use distinct company IDs per category. They are not additive.
- Map shading describes database coverage by HQ, not market share or country strength.
- Search matches company, country, product, description and effective taxonomy names.
- Country buttons and chart bars filter; leaf cards open the matching company list.
- Search/country/domain/capability/view survive tab switches and URL/back navigation.
- Company details use explicit capability labels; derived parents carry no invented evidence.
- Maturity is not fetched/assessed in this version. No fake scores, trends or sparklines.
- Empty/error states remain honest, including a map failure fallback to country controls.

## Geography

`src/assets/europe-map.json` contains simplified paths derived from Natural Earth's
public-domain 1:110m Admin 0 countries dataset. Source URL is stored in the JSON.
No third-party map service or API key is needed. Malta has a location marker because
it is omitted at this scale. Country selection remains available through the complete
scope-driven dropdown even where boundaries are too small to select comfortably.

Flags are local SVG assets from `flag-icons` 7.6.0 (MIT; license included in
`src/assets/flags/LICENSE.txt`). They render consistently without emoji-font support.

## Verification / deployment

Run `npm test`, then `npm run build:supabase` with the existing server-side build
credentials, and preview `public/`. Never hand-edit `public/`. The first connected
build must confirm PostgREST exposes `landscape_candidates`, `countries`, `sectors`
and `company_sectors` with the documented fields. Source failures fail closed rather
than silently broadening the public population. No schema migration is included.

Inspect desktop and narrow mobile layouts, map keyboard activation, country/capability
filtering, overlapping domains, empty searches, profile dialog Escape/focus return,
back/forward navigation, and map/data fetch failures. No browser credentials required.

The original catalogue build still determines product page URLs and company details.
Its existing product-name lookup is reused; product identity cleanup is outside this UI change.
