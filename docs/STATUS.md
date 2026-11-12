# STATUS — xSonomy catalogue

_Last updated: 2026-09-05 (initial, from repo inspection; verify in session 1)_

## Working now
- Daily build from Supabase `products` → xsonomy.com via GitHub Pages (`deploy.yml`, 06:00 UTC).
- Client-side search/filter for UAVs and Sensors; SEO product pages; companies view (`companies.js`).

## Known gaps / doubts (verify)
- README is stale (describes Airtable). `db/schema.sql` here is a copy of the news repo's and doesn't cover `products`/`companies`.
- Is the companies section built from `companies` table or only from products? Check `generate-supabase.mjs` + `companies.js`.
- `PUBLISH_STATUS` is `null` — every row is public, including LLM drafts. Decide the gate.
- Legacy Airtable files still present.

## Next tasks (in order)
1. **Confirm the live path** — read `generate-supabase.mjs` end to end; write a 10-line "how a product becomes a page" note into this file.
2. **Remove Airtable legacy** (after Nazar confirms the migration is final): scripts, workflow, `.bak`, secret; rewrite README (short).
3. **Publish gate** — surface `publication_status` / `confidence` on cards, then flip `PUBLISH_STATUS` to `"live"` once review is routine.
4. **"New this week / month" section** on the site — consumes the same query the reports job (news repo task #4) will use.

## Decisions log
- 2026-09-05 — This repo stays read-only against the DB.

## Session notes
_(newest first; `/wrap-up` appends here)_

### 2026-11-03 — funding research checkpoint 22 publication

The source-audited investment workstream reviewed 20 additional published-landscape identities and imported 11 attributable financing, equity and grant events for seven companies. The read-only landscape build now projects 397 events across 235 companies, 775 event participations and 605 investor profiles. The checkpoint adds PCO's PLN261m production support, PDKINEMATICS' EUR2m seed, Pelixar's disclosed EU-backed grant, Piaggio Aero's EUR190m capital increase, four POLARIS investments, PGZ's PLN44m Treasury subscription, and Primoco UAV's two public-market subscriptions.

Original currencies, source date precision and explicit participant roles are retained. Cumulative totals, launched crowdfunding, proposed bonds, contracts, acquisitions and group or subsidiary financing are excluded or kept as source holds. The production rollback rehearsals restored the exact baselines, and the atomic imports plus idempotent reruns resolved 397 approved events, 235 covered companies, 775 participations and 605 investor profiles.

### 2026-11-03 — funding research checkpoint 21 publication

The source-audited investment workstream reviewed 20 additional published-landscape identities and imported 12 attributable financing, equity, debt and grant events for ten newly covered companies. The read-only landscape build now projects 386 events across 228 companies, 759 event participations and 593 investor profiles. The checkpoint adds beneficiary-specific EU grants for Norsk Elektro Optikk, OLEDCOMM and Optoelectronica-2001; Novadem's DAP grant; two Occam Industries rounds; Oko Camera's MITS investment and IT Arena award; OODALOOP's Innofounder award; Orbion's mixed pre-seed package; Parrot's 2015 rights issue; and Patria's eALLIANCE grant.

Original currencies, amount qualifiers and explicit participant roles are retained; grants, equity, debt and mixed packages remain distinct. Consortium totals, contracts, secondary share sales, planned raises, conflicting programme figures and grants hosted by another legal entity are excluded or kept as source holds. The production rollback rehearsal restored the exact 374/218/736/580 baseline, and the atomic import plus idempotent rerun resolved 386 approved events, 228 covered companies, 759 participations and 593 investor profiles.


### 2026-11-03 — funding research checkpoint 20 publication

The source-audited investment workstream reviewed 20 additional published-landscape identities and imported 10 attributable financing and grant events for six newly covered companies. The read-only landscape build now projects 374 events across 218 companies, 736 event participations and 580 investor profiles. The checkpoint adds two MGI Engineering public grants, Monava's Gungnir-led pre-seed, Monopulse's ILTE loan and Coinvest-led equity round, Motion Robotics' SEASHORE grant, two MSP InnTech EU contributions, and NORDA Dynamics' Angel One and Varangians-led rounds.

Original currencies, public date precision and amount qualifiers are retained; debt, grants and equity remain distinct. Consortium budgets, procurement, issuer spending, predecessor and group-level transactions, proposed consolidations and unsupported accelerator or programme claims are excluded or kept as source holds. The production rollback rehearsal restored the exact 364/212/717/571 baseline, and the atomic import plus idempotent rerun resolved 374 approved events, 218 covered companies, 736 participations and 580 investor profiles.


### 2026-11-03 — funding research checkpoint 19 publication

The source-audited investment workstream reviewed 20 additional published-landscape identities and imported 11 attributable financing, grant, debt and ownership events for eight newly covered companies. The read-only landscape build now projects 364 events across 212 companies, 717 event participations and 571 investor profiles. The checkpoint adds Nuburu's Lyocon acquisition, BAE Systems' Malloy Aeronautics acquisition, Cohort's two-stage Marlborough Communications ownership history, the Flowing River acquisition and Eden Rock debt raise for Marshall Land Systems, EOS's MARSS acquisition, two MaXon Systems rounds, the mixed Andera/Bpifrance/Tikehau MC2 Technologies transaction and MESKO's Reprivatisation Fund support.

Original currencies, disclosed precision and amount qualifiers are retained; grants, debt, mixed transaction financing and secondary acquisition consideration remain distinct. Contingent earnouts, issuer spending, open raises, registry capital, proposed public support, group financing misattributable to subsidiaries and unsupported secondary-database claims are excluded or kept as source holds. The production rollback rehearsal restored the exact 353/204/700/563 baseline, and the atomic import plus idempotent rerun resolved 364 approved events, 212 covered companies, 717 participations and 571 investor profiles.


### 2026-11-03 — funding research checkpoint 18 publication

The source-audited investment workstream reviewed 20 additional published-landscape identities and imported 13 attributable financing, grant and ownership events for eleven newly covered companies. The read-only landscape build now projects 353 events across 204 companies, 700 event participations and 563 investor profiles. The checkpoint adds BAE Systems' Kirintec acquisition, two public grants for Kongsberg Defence & Aerospace, CIG's Kray investment, Kseonics' Brave1 grant, the Leonardo-Baykar LBA Systems joint venture, Hexagon's Leica Geosystems acquisition, Liebherr Aerospace's France Relance support, two LiveLink Aerospace grants, LMT's EIB loan, LV-Teh's defence grant and Lynred's France 2030 support.

Original currencies and disclosed precision are retained; grants, debt, primary investment, joint-venture formation and secondary acquisition consideration remain distinct. Proposed listings, issuer spending, registry capital, project totals, programme ceilings, subsidiary financing and unsupported secondary-database claims are excluded or kept as source holds. The production rollback rehearsal restored the exact 340/193/686/556 baseline, and the atomic import resolved 353 approved events, 204 covered companies, 700 participations and 563 investor profiles.

### 2026-11-03 — funding research checkpoint 17 publication

The source-audited investment workstream reviewed 20 additional published-landscape identities and imported 19 attributable financing, grant and ownership events for ten newly covered companies. The read-only landscape build now projects 340 events across 193 companies, 686 event participations and 556 investor profiles. The checkpoint adds the Fincantieri NexTech acquisition of IDS, Impianti's IPO, Infozahyst's development investment, three Innov'ATM financings, Grupo Oesia's Inster acquisition, Intelligent Energy's 2013-2017 financing and ownership history, QinetiQ's two-step Inzpire acquisition, Jenoptik's IPO, Kaedra's MIT grant and Green Flag Ventures' Kara Dag investment.

Original currencies and precision are retained; grants, convertibles, primary equity and secondary acquisitions remain distinct. Subsidiary financing, consortium budgets, programme ceilings and open fundraising are excluded. The rollback rehearsal restored the exact 321/427/672/183/549 baseline, and the atomic import plus idempotent rerun both resolved 340 events, 456 sources, 686 participations, 193 covered companies and 556 investors with zero source-integrity gaps.

### 2026-11-03 — funding research checkpoint 16 publication

The source-audited investment workstream reviewed 21 additional published-landscape identities and imported 23 attributable events for 12 newly covered companies. The read-only landscape build now projects 321 events across 183 companies, 672 event participations and 549 investor profiles. The checkpoint adds Griff Aviation's 2018-2022 financings, six issuer-level Amper transactions, two HAVELSAN EU grants, investments or grants for Hecto Drone, Heliguy and Hellion Tech, HENSOLDT's primary IPO proceeds, the Quantum Systems acquisition of Hevi Optronics, Hexadrone's first round, Carlyle's HGH acquisition, Huless's mixed financing disclosure and two Hybrid Drones investments.

Financing semantics remain explicit: secondary IPO shares, seller proceeds, subsidiary financings, projected capex and fundraising intentions are excluded; debt, grants, equity, mixed financing and secondary ownership events stay labelled separately. The rollback rehearsal restored the exact 298/392/649/171/535 baseline, and the atomic import plus idempotent rerun both resolved 321 events, 427 sources, 672 participations, 183 covered companies and 549 investors with zero source-integrity gaps.

### 2026-11-03 — funding research checkpoint 15 publication

The source-audited investment workstream reviewed 20 additional published-landscape identities and imported twelve attributable events for ten companies. The read-only landscape build now projects 298 events across 171 companies, 649 event participations and 535 investor profiles. The checkpoint adds Flowcopter's grant and TEKEVER acquisition, two FLYDE disclosures, FlyFocus's institutional round, Flying Eye's management buyout, Frequentis's primary IPO proceeds, Freya's seed, the General Dynamics acquisition of Santa Bárbara Sistemas, General Cherry's credit line, Germandrones' capital increase and Greenjets' Series A.

Financing semantics remain explicit: the Frequentis IPO excludes secondary shareholder sales; General Cherry is debt; Flowcopter's grant is distinct from its acquisition; acquisition consideration is not presented as issuer proceeds; unnamed investors and aggregate historical claims remain undisclosed. The rollback rehearsal restored the exact 286/375/629/161/516 baseline, and the atomic import plus idempotent rerun both resolved 298 events, 392 sources, 649 participations, 171 covered companies and 535 investors.


### 2026-11-03 — funding research checkpoint 14 publication

The source-audited investment workstream reviewed 20 additional published-landscape identities and imported nine attributable events for eight companies. The read-only landscape build now projects 286 events across 161 companies, 629 event participations and 516 investor profiles. The checkpoint adds HENSOLDT's acquisition of ESG, the EUROSAM joint-venture formation, Ineo Defense's acquisition of Exavision, investments in Fadron and Falcons, FarmFleet's pre-seed, CSG's two-step acquisition of Fiocchi, and mixed founder financing for Fire Point.

Acquisition consideration is labelled as secondary rather than issuer proceeds; contingent consideration, parent-level Exail financing, contracts, donations, programme totals, prospective raises and contradictory secondary-database claims remain excluded or explicit source holds. A production rollback rehearsal and the atomic import both resolved 286 events, 375 event sources, 629 participations, 161 covered companies and 516 investors.


### 2026-11-02 — funding research checkpoint 07 publication

The source-audited investment workstream reviewed 20 additional published-landscape identities and added 13 approved financing or investment events. The read-only landscape build now projects 188 events across 99 companies, 525 event participations and 447 investor profiles. The batch adds verified historical records for Tytan Technologies, Robin Radar, Marduk Technologies, Delair, Wingcopter, Windracers and Dufour Aerospace, plus investor links for The Fourth Law.

Financing semantics remain explicit: Parcom's Robin Radar acquisition is secondary; grants, equity and debt stay separate; undisclosed strategic investments retain null amounts; cumulative totals and consortium budgets remain source holds. The Marduk 2024 grant was corrected from undisclosed to EUR93,875 with an expected-old-value transaction and exact rollback manifest.

Validation: the production rehearsal restored the exact 175/507/436/98 baseline, the 2024 Marduk correction rollback restored its null before-image, the atomic import was idempotent, every approved batch event and participation retains a source, and 154/154 writer-repository tests passed.


### 2026-11-02 — Insights chapter

Added `/landscape/insights/` and a separate Insights navigation link from the map, next-map route and Events. Six live charts cover HQ country concentration, exclusive UAV/C-UAS/both company mix, detailed capabilities, a country/capability heatmap, hub/investor location coverage and twelve calendar months of confirmed events. A shared country filter updates all six; bars and heatmap cells link to the corresponding atlas filters and event calendar. Data tables and explicit methodology accompany the charts.

Uses existing public exports only; no DB writes or new publication rules. Counts are distinct company identities; capability overlap is disclosed. Network counts exclude associated site records, investor meeting-only locations and country research associations; cross-country organisation counts are explicitly non-additive. Events exclude past/undated editions, retain zero months and count ongoing editions once. Secondary feed failures remain local to their chart with retry; no invented sample data. Route is included in sitemap and consent-gated analytics.

Validation: 105/105 tests passed, including the whole static generator and six aggregation/date tests. Desktop browser QA confirmed six charts, Germany filtering, zero-company Luxembourg without invalid numbers, full data tables, no page overflow, and a Ukraine bar opening the matching 94-company atlas selection. Responsive layouts use one column below 800px and a contained heatmap scroll area.


### 2026-11-02 — funding research checkpoint 06 publication

The source-audited investment workstream reviewed 21 additional published-landscape
identities and added five approved financing or investment events for Aether Aeronautics,
Agilica and Aktyvus Photonics. The read-only landscape build now projects 175 events
across 98 companies, 507 event participations and 436 investor profiles. Aether's
secondary share purchase is explicitly separated from its primary capital increase;
Aktyvus Photonics' ILTE loan and EU grant remain distinct; six unresolved secondary or
aggregate claims stay documented as source holds.

Validation: production rollback rehearsal restored the exact baseline, the atomic import
was idempotent, all approved events and participations retain source links, and 154/154
repository tests passed.

### 2026-11-02 — City locations and map density

Nazar requested capitals, known company cities, graduated country shading and glowing city dots across company, hub/site and investor layers. Added a GeoNames CC BY 4.0 locality gazetteer, 32 capitals, anchored city groups, count-scaled circular markers, separate mint/purple/gold layers, country density gradients and zoom-dependent labels. Clicking a city opens its matching company/hub/investor lists. Country-only records retain dashed, explicitly approximate markers; office and test-site kinds remain distinct in details and tooltips. The read-only export now includes existing HQ city/coordinates. No database edits or publication-gate changes.

Validation: 99/99 tests passed, including whole-generator HQ city/coordinate projection. New geographic tests cover country-constrained aliases, blank names, identity deduplication, unknown-city placement, monotonic density/size and stable anchors. Browser QA confirmed all three layers, London investor city details, zoom, circular-only location markers and no desktop overflow. Gazetteer sources and limitations: `scripts/geography/README.md`.

### 2026-11-02 — Events header aligned with landscape

Removed the extra xSonomy logo/back-link header row from Events at Nazar’s request. The page now starts directly with the ecosystem introduction, matching the landscape page structure. Existing navigation and event functionality are unchanged.

### 2026-11-02 — funding research checkpoint 05 publication

The source-audited investment workstream reviewed 21 more published-landscape
identities, added 19 approved events for 15 companies, and corrected two guarded
existing facts. The read-only landscape build now projects 170 events across 95
companies, 504 event participations and 434 investor profiles. The Arke Telekom
announcement date now follows the issuer timestamp, and DeltaQuad remains labelled
announced because the transaction was explicitly subject to regulatory approval.
Rollback rehearsal, idempotent import, source integrity and 154 repository tests passed.

### 2026-11-02 — Events chapter on the landscape

Nazar authorised publishing the events module. Added Events to the landscape menu, opening `/landscape/events/`: a responsive timeline and monthly calendar with country, topic, year and specialist/adjacent filters, an undated-edition tab, source-backed detail dialogs and all-day calendar downloads. Filters and selected editions are shareable through the URL. Far-future editions remain available without an upper cutoff; source dates and research checks stay distinct from build timestamps.

The generator reads `ecosystem_events` and `ecosystem_event_sources` server-side, projects 57 dated editions plus 15 undated records to `/data/landscape-events.json`, and references it from the landscape payload. No keys reach the browser, no DB writes, and no existing company/investor/hub publication rules changed. Dated records require an organiser/institution date source; undated records cannot produce calendar entries. New route is included in sitemap and consent-gated analytics.

Validation: full Node suite passed, including read-only whole-generator fixtures; event tests cover future-year retention, source gating, accent-insensitive filters, ongoing events, share state, leap/year boundaries, escaping and Unicode iCalendar folding. Browser QA on the real research snapshot confirmed timeline, 2029 calendar/details, separate TBA state and absence of calendar-download action for undated editions. Desktop screenshot and overflow inspection passed; responsive breakpoints are implemented, but this browser API does not expose viewport resizing for a separate phone-sized run. Production build and page verification follow the publication commit.

### 2026-11-02 — funding research checkpoint 04 publication

The source-audited investment workstream added 28 approved financing events for 17
published-landscape companies. The read-only landscape build now projects 151 events
across 81 companies, 458 event participations and 395 investor profiles. Original
currencies, amount qualifiers, financing types, issuer identity, source URLs and explicit
investor roles are retained. Consortium-level grants and other unattributable claims were
held rather than assigned to a company. The database import passed rollback rehearsal,
idempotent rerun and source-integrity validation before this deployment trigger.

### 2026-10-28 — map-first landscape interface (review branch)

Implemented the approved visual direction at `/landscape/`: Europe choropleth,
local SVG country flags, capability bars, disjoint UAV-only / C-UAS-only / both
donut, company list/details, technology exploration, URL-preserved filters and
responsive layouts. No made-up historical trends or maturity scores.

The generator now projects the reconciled `europe-uav-cuas-2026` **included** set,
intersected with **live**, canonical in-scope countries and UAV/C-UAS taxonomy.
Reads only; no publication changes, DB mutations, snapshot changes or research
handoff changes. Existing product/company routes stay intact. Public counts can
be lower than research counts because verified draft companies remain unpublished.

Validation: 9 Node tests pass, including a full generator run against a local
read-only API fixture; Chromium interaction checks pass for country/map keyboard,
search/domain/capability filtering, profile dialog/Escape, URL/back navigation,
empty/error states, map-failure fallback, and 390px/320px responsive overflow.
Screenshots in `docs/previews/` use **synthetic demo data**, not live counts.

Live Supabase credentials are unavailable in this workspace. The new PR workflow
runs tests and a connected, read-only build for repository-owned branches, with
no Pages deployment. Its result must be checked before merge. No merge/deployment
has been performed. See `docs/LANDSCAPE_UI.md` for data and interaction contracts.

### 2026-10-13 — Google Analytics with Consent Mode v2
GA4 (`G-8WL3V0JVBR`) on ~5,300 pages, with storage denied until the visitor opts in.

Two insertion points cover the whole site: `src/index.html` (the catalogue shell, which is
also the source of the five section pages) and `GA_TAG` in the generator, interpolated into
all five generated templates — product, company registry, company, companies shell and the
C-UAS vendors page.

**Ordering is the part that matters.** `gtag('consent','default', …)` with everything denied
runs *inline in the head, before* `gtag.js` loads. If it ran after, GA would set its cookies
first and the consent state would arrive too late. A stored "granted" choice is restored in
the same inline block so returning visitors are measured from the first hit.

The banner lives in `src/assets/consent.js`, loaded `defer` — it only draws UI and records the
choice, so it cannot affect whether cookies are set. Choice is kept in `localStorage`
(`xs-consent`), wrapped in try/catch for private mode. Decline is as prominent as Accept.

Verified in a browser, all four paths:
| | cookies | banner |
|---|---|---|
| first visit, no choice | **none at all** | shown |
| accepts | `_ga`, `_ga_8WL3V0JVBR` appear | dismissed |
| returns having accepted | present, consent restored before first hit | not shown |
| declines | **none** | not shown again |

The measurement ID is a public identifier, so it stays in source rather than a secret.

**Not built:** a way to change the decision later. If that is wanted, expose a link that clears
`xs-consent` and reloads. Also note consent is per-browser via localStorage, not per-person.

### 2026-10-13 — Actions runtime bumped to clear the Node 20 deprecation
`actions/checkout@v4` and `actions/setup-node@v4` run on Node 20, which GitHub now forces
onto Node 24 with a warning. Both moved to `@v5` (node24 runtime, verified against each
action's `action.yml`) in `deploy.yml` and `find-images.yml`. The same bump was applied to
all nine workflows in `xsonomy-news`, since the warning affected every workflow in both repos.

`node-version` also went 20 -> 22, Node 20 having reached end of life in April 2026. That
changes the runtime the generator itself runs on, so the first build after this is worth a
glance — though the generator is plain ESM using built-in `fetch`.


### 2026-10-13 — enrichment of thin pages, batch 1
**2,320 products have no summary — and every single one already has news articles linked.**
So this is synthesis from material already in the database, not web research. 958 of them have
a `primary` mention (an article principally about that product), which is the best source.

Batch 1: 10 products reviewed, **8 written, 2 refused** — the same ~20% error rate as the image
work, and for the same reason: the extraction that linked article to product is sometimes wrong.
- **ARCHER AI** — none of its linked articles mention it; they are about Neros and Perennial in
  the Pentagon drone competition. Looks like a bad entity extraction. Left empty, needs review.
- **AS21 Redback** — Hanwha's infantry fighting vehicle, filed under Counter-UAS. Its one
  "primary" article is a generic air-defence roundup. Wrong category, no usable evidence.

Written (summary + `source_urls` + `enrichment_status='news-derived'`, `confidence` left at
`low` because these are press-derived, not manufacturer-confirmed): Alexa Spatium, Apollo,
Archer, Bullfrog M240, Chaparral, Compact Laser Weapon System, DJI SDR Transmission 2, DragonFire.

Every sentence comes from the linked articles; nothing was inferred or recalled.

**Corrections spotted, not applied**
- **Archer** has no company in the DB; the articles are unambiguous that it is **Neros
  Technologies**.
- **DJI SDR Transmission 2** is filed under Software but is a hardware video transmitter.
- **AS21 Redback** is miscategorised as Counter-UAS.

⚠ **Outstanding:** `CLAUDE.md` rule 1 says DB changes made from here must be logged in
`xsonomy-news`. This session could not reach that repo (blocked as a shared resource), so this
entry is the only record. It needs copying across.

**Rate.** Judging each product means reading its articles, so this runs ~10 per batch. At 958
primary-mention products that is ~95 batches — work for many sessions, or for a scheduled job
that does a batch a day. Worth deciding before grinding through it by hand.


### 2026-10-12 — every category published; Airtable removed
**Nazar: the `live` tag means nothing, publish everything, pick the sections yourself.**

**1,350 products were invisible.** The generator fetched `category: "in.(UAV,Sensor)"`, so
Counter-UAS (423), Effector (284), Software (357) and Other (286) never reached the site —
and they were the fastest-growing categories (+490 in the last 45 days). Now every category
publishes, and an unrecognised one falls into `other` rather than disappearing.

**Sections chosen** (`CATEGORIES` + `BUCKET_OF` drive everything, including the tabs):
| Section | DB categories | Rows |
|---|---|---|
| UAVs | UAV | 1,353 |
| Counter-UAS | Counter-UAS + Effector | 707 |
| Sensors | Sensor | 478 |
| Software | Software | 357 |
| Other | Other | 286 |

Counter-UAS and Effector share a section because they are two halves of one kill chain —
detect/C2 and defeat — and `Category` is a filter inside it so they can still be separated.

**Lean cards for the thin sections.** Those rows arrive from news extraction: country is filled
on ~80%, company ~60%, summary under 20%, specs ~3%. A sensor-style spec grid would be mostly
dashes, so `leanCard()` shows name, company, country, type, summary-if-present and the news
count. Filters are limited to what exists: Country, Category, Subcategory.

**Slugs are now deduped per section** rather than globally, so a name shared across sections
can never shift an existing URL. Verified there are no slug collisions across all 3,181
products today, so no current URL changed.

**Renamed the nav item "C-UAS Systems" to "C-UAS Vendors"** — that page is a company
directory, and the name collided with the new Counter-UAS products section. URL unchanged.

**`PUBLISH_STATUS` is moot** — `publication_status` is `'live'` on all 1,353 UAV rows, so the
gate never filtered anything. Left in place as a no-op; everything publishes.

**Airtable removed**: `scripts/generate.mjs`, `migrate-products-to-supabase.mjs`,
`migrate-products.yml`, `app.js.bak` deleted; footer line, npm scripts, `.env.example` and
stale comments cleaned; README rewritten around the real build.
⚠ The `AIRTABLE_TOKEN` repository secret is now unused — delete it in GitHub settings.


### 2026-10-12 — weekly image search, with a review gate
New products now get an image search automatically. **It does not publish.**

**Why there is a human step.** Measured on the 220 candidates reviewed by hand: 116 right,
104 wrong. The best text-only auto-accept rule tested (company name present in the article
title) reached **90% precision on that labelled set** — one wrong photo in ten — and several
of its failures were articles that were *correct* while the image was a logo, an airshow shot
or the wrong variant, which no rule on text can detect. 90% is not good enough to publish
unseen on a reference catalogue, so the pipeline stops at a contact sheet.

**Moving parts**
- `.github/workflows/find-images.yml` — Mondays 07:00 UTC + manual. Runs the search, writes
  the Actions run summary (GitHub renders the thumbnails there), commits candidates.
- `scripts/find-images.mjs` — `npm run images:find`. Same strict matcher as the manual pass:
  every significant word of the product name must appear in the article title.
- `scripts/accept-images.mjs` — `npm run images:accept -- 0 3 7` (or `all` / `none`).
  Promotes to the manifest; everything not promoted goes to the rejected list.
- `scripts/image-summary.mjs` — renders the review table.

**State files, which together account for all 1,353 UAVs**
- `data/product-images.json` — 140 published, with licence and author.
- `data/image-rejected.json` — 105 reviewed and refused; never proposed again.
- `data/image-searched.json` — 1,108 searched with no article found. Retried after
  `IMAGE_RECHECK_DAYS` (180) because Wikipedia grows.
- `data/image-candidates.json` — the pending batch, normally empty.

Without the searched list the weekly job would re-search ~1,100 misses every Monday and
never get to genuinely new rows; with it, a normal week looks at only what is new.
`IMAGE_MAX_LOOKUPS` (400) caps any single run.

**Not automated on purpose:** promotion. Someone has to look at the pictures.


### 2026-10-12 — image pass 2: 140 products now have photos
Ran the strict matcher over all 1,328 remaining UAVs in one sweep (`generator=search` +
`pageimages`, one API call per product), giving **220 candidates**, then reviewed every one on
a contact sheet in five batches. **116 accepted, 104 rejected** — on top of the first 25, that
is **140 products with a verified photo** (~10% of the catalogue), 24.3 MB, average 174 KB.

**Accept rate falls sharply with obscurity**, which is why batching matters:
batch 1 23/45 · batch 2 23/45 · batch 3 13/45 · batch 4 19/45 · batch 5 38/40.
The last batch scored highest because those rows are real, well-documented airframes
(Camcopter S-100, Orion, Leleka-100, Searcher, X-47A); the middle batches are short ambiguous
names that collide with everything.

**What the eye caught that the matcher did not** — all exact title matches, all wrong:
`Hornet` → an F/A-18 *and* a wasp · `LUCAS` → George Lucas · `Vampire` → Buffy the Vampire
Slayer · `Patroller` → HMS Patroller · `Anadolu` → a Turkish warship · `Palianytsia` → bread ·
`K1000` → a Pentax camera · `Halo` → a Filipino dessert · `C20`/`C31` → Sauber F1 cars ·
`C6` → a Citroën · `Mk4` → a VW Polo · `LUMINA-M` → a Chevrolet · `MAUL` → an axe ·
`Orbiter 4` → the Moon · `Thunderhead` → a roller coaster · `Dire WOLF` → a skeleton ·
`Behemoth` → a metal band · `Orlan` → a fashion portrait · `L-Series` → an Audi V8.
**Roughly half of all exact-title matches were wrong.** Never ship this pass unreviewed.

Also dropped `MQM-170 Outlaw`: its Commons file is a PNG that Wikimedia would not re-render
below 966 KB at any width.

**Remaining ~1,213 UAVs have no freely-licensed image** and the well is now dry — the matcher
has seen every product once. Further coverage needs licensed stock or manufacturer press-kit
permission, not more searching.


### 2026-10-12 (later still) — product photos: 25 verified images for the top-100 UAVs
"Images for all products" is not achievable and the measurement is worth keeping.

**The old images were never real.** `products.image_url` holds 8 rows, all expired Airtable
signed URLs that 404. That is why every card has always shown a schematic.

**Measured coverage.** Against Wikipedia/Wikimedia Commons — the only source that is licensed
for reuse — a random 100-product sample gave **21 strict-match hits, of which ~18 were correct**.
The other 79 have no freely-licensed photo. Manufacturer and defence-press photos are almost all
all-rights-reserved, so re-hosting them is not an option.

**Fuzzy matching is dangerous, not merely imprecise.** Of 51 rejected matches in the sample:
`DROGEN` → *List of equipment of the French Army*, `Formula A` → *Kow Otani* (a composer),
`T-3` → *Jean Alesi*, `Inspektor-201` → *Peugeot 403*, `Charger` → *List of Danger Force episodes*.
Even after strict name matching, 6 of 31 top-100 candidates were wrong **and had to be caught by
eye**: Gerbera (flowers), Hornet (a wasp), LOCUST (a grasshopper), Spirit (a hot-air balloon),
Bullet (ammunition), Prime Air (the Amazon wordmark).

**Shipped:** `data/product-images.json`, 25 hand-checked images for the most-mentioned products,
each with author, licence and Commons source. Licences: 13 public domain, 8 CC BY-SA, 4 CC BY,
plus OGL/CC0. The generator prefers the manifest over `products.image_url`, `attachImage`
downloads into `public/images/`, and product pages render a `figcaption` credit — required by
CC BY / BY-SA. Curation lives in this repo because the catalogue must not write to Supabase;
moving it into the DB later is a straight copy.

**To extend:** rerun the matcher on the next tranche, but the eyeball step is not optional — it
caught 19% of candidates. Scripts kept out of the repo (scratchpad only); the method is the
strict all-tokens-in-title test plus a contact sheet.


### 2026-10-12 (later) — news on product pages, mentions on cards
Wires the catalogue to the news side of the DB (`articles` + `article_products`) — the same
feed that powers **uav360.xyz**. 970 of 1,353 UAV products have at least one mention
(7,770 links over 6,119 articles; average 4.3 per product, busiest has 197).

- `fetchNews()` does two paged reads and joins them in JS rather than using a PostgREST
  embed, so it does not depend on the FK being exposed. `article_products` has no id
  column, but (article_id, product_id) is unique — verified — which is the stable
  tiebreaker `sbFetchAll` needs. 373 articles have no `published_at`; they sort last.
- **Product pages** gain an "In the news" section after the spec table: up to 12 cards
  (`NEWS_ON_PAGE`), newest first, each linking to the **original publisher**. uav360.xyz
  has no per-article pages of its own — only a homepage and monthly digests that link out
  the same way — so there is nothing else to link to. A footer line credits uav360.xyz.
- **The image/schematic container moved to the end**, below the news section; the
  review-stage disclaimer stays last.
- **Catalogue cards** show the mention count under the completeness %, hidden at zero
  (383 UAVs have none, and an empty line on each would be noise). The count travels in
  `uav.json` as `Mentions`; the articles themselves deliberately do NOT — they would add
  megabytes to a file the browser loads up front, so `productPage()` receives them
  separately via a slug-keyed map. `Mentions` is in `HIDDEN`, so it does not also appear
  as a spec-table row.


### 2026-10-12 — filters reordered to the sheet, Regulatory class removed
- Taxonomy field names are now derived from `taxonomy_facets.name` in `fetchTaxonomy()` instead of
  a hand-written map, so sidebar labels and product-page spec rows always match the source sheet.
- **`weight_class` is no longer split.** The NATO classes and the FAA / UK-EU regulatory marks are
  one 11-option **Weight / class** group again, as in the sheet; the separate **Regulatory class**
  group is gone. (Reverses the split made on 2026-09-07.)
- **Domain is back** on /uav/, in sheet position 3.
- Sidebar order is now: Country, Role (neither is a taxonomy facet, so they sit above the block),
  then the sheet's facet order 1-14 with dual-use lifted out to the bottom toggle, then Status last.
- All 14 typed facet names were checked against the DB with a SQL join before shipping — the
  en-dashes in "Mission / use case – civil/military" are easy to get wrong by hand.

**Two groups show fewer options than the sheet lists, by design.** `buildFacets()` hides any option
that matches zero products, because a checkbox that filters to nothing is dead UI:
- Signature / detectability — 10 of 13 (Acoustic, Thermal and Visual profile are unassigned; the
  2026-09 classification brief states they were deliberately never used).
- Threat vector — 8 of 10 (EW/cyber spoofing and EW/cyber network intrusion have no products).
They will appear on their own once any product is tagged with them.

**Domain has 5 options in the DB, not 6** (Aerial, Ground, Surface, Underwater, Space) — flagged to
Nazar; if the sheet really has a sixth it has not been imported.


### 2026-09-07 (later still) — data-completeness % on cards, default sort by it
Each UAV card now carries a small bar + percentage, and the grid leads with the
best-documented products (name is the tie-break; sensors keep alphabetical).

**Definition** — `completeness()` in `app.js`, a fixed **19-item checklist** so the number is
comparable across the catalogue:
- identity (4): Company, Country, Summary, Website
- specs (5): MTOW, Range, Endurance, Max speed, Max payload
- classification (9): Domain, Airframe, Weight class, Propulsion, Control, Range band,
  Speed regime, Origin, Signature
- mission (1): satisfied by any of military / civil / dual-use

Deliberately **excluded**: strike depth, threat vector, regulatory class and dual-use, which are
role-dependent — counting them would penalise a survey drone for not being a weapon. `Image` is
excluded too: no product has one (the generator's `attachImage` never populates it, so every card
falls back to the schematic SVG — worth investigating separately).

Distribution across 1,082 UAVs: mean 57%, median 63%, 56 products at 100%, 21 at or below 9%.
The bottom of the list is the queue's junk — Bandit, C20, C26, Vadris, VEX AIR all score 5%.
Colour: green >=75%, grey 40-74%, amber <40%.


### 2026-09-07 (later) — Role restored, Status filter added
- **Role** (`UAV · Role`) put back on /uav/ as requested, with every option. Caveat recorded:
  it is free text — **235 distinct values across 425 products, 179 of which match exactly one
  product**. Usable, but the list is long and full of near-duplicates ("ISR", "ISR /
  reconnaissance", "Tactical ISR", "reconnaissance"). Normalising it into buckets is an open
  offer, not done.
- **Status** added, normalised at build time by `normaliseStatus()` from the same kind of free
  text (155 spellings) into six buckets: In Production 207, Discontinued 84, Development 57,
  Prototype 48, Cancelled 9, N/A 677. N/A is always emitted, so it is a real bucket rather than
  a gap. The raw `UAV · Production status` still shows on product pages; the normalised `Status`
  is kept off them by `HIDDEN`.
- **Status is the one opt-OUT group.** Every bucket starts ticked except **Cancelled** and
  **Discontinued**, and unticking a box hides those products — so the boxes read as "what is on
  the page" rather than "narrow to this". `UAV_CFG.statusField` / `statusOffByDefault` drive it;
  `resetFilters()` seeds the set and `buildFacets()` reflects it in the checkbox state.
  Every other group stays opt-in (nothing ticked = no constraint), so `matches()` keeps its
  empty-set shortcut for them and skips it for Status — untick all six and you correctly get zero
  results. Default view: 989 of 1,082 (93 hidden: 84 discontinued + 9 cancelled).


### 2026-09-07 — UAV filters rebuilt on the shared taxonomy
Replaced the /uav/ sidebar filters with the 14-facet taxonomy (`taxonomy_facets` /
`taxonomy_options` / `product_taxonomy` in Supabase, classified in the news repo).

- `generate-supabase.mjs` now fetches `product_taxonomy_view` and attaches one array
  field per facet to each product row, keyed on **`product_id`** — the site's slug is
  generated here from the product name, so `product_taxonomy_view.product_slug` does
  **not** reliably match it. `id` was added to the products select for this.
- `weight_class` is split into two filter groups — **Weight class** (NATO) and
  **Regulatory class** (FAA / UK-EU marks) — because the two schemes are not mutually
  exclusive and read as one confusing list.
- **Domain** is attached but not filtered on /uav/ (98% "Aerial", so it filters nothing);
  it still shows on product pages.
- **Dual-use** is a single toggle at the foot of the sidebar, not a group (35 products).
- Numeric range sliders (MTOW / endurance / range / max speed) removed — they only
  worked on 23–26% of rows; the taxonomy bands cover 55–76%.
- Each group shows a **"N not yet classified"** count, so an unselected filter is not
  mistaken for "no such products".
- Taxonomy fields render on product detail pages and in their JSON-LD (intended).

Coverage at time of change (of 1,082 UAV rows): airframe 76%, propulsion 75%, origin 75%,
control 72%, weight 71%, signature 65%, range 61%, mission-military 58%, threat vector 57%,
speed 55%, regulatory 44%, mission-civil 34%, strike depth 22%, dual-use 3%.
Roughly double the old filters on every comparable dimension.

Adds ~423 kB uncompressed to `data/uav.json`. Sensors are unaffected — no sensor product
is tagged yet.

**Not verified:** the build was not run (no `.env`/`SUPABASE_SERVICE_KEY` locally). Logic was
checked against live data via SQL and the UI was driven in a browser against a 12-product
fixture built from real rows. First CI build should confirm PostgREST exposes
`product_taxonomy_view`.


---

## 2026-10-26 — C-UAS grouping chips are now derived, not read from stored rows
*(written 2026-10-26, merged and deployed 2026-10-29 — figures below were re-measured on the day it shipped)*

`fetchCuasCapabilities()` in `generate-supabase.mjs` used to pick sectors with
`slug.startsWith("cuas-")` and chip a company with whatever rows it happened to hold.
That treated `cuas-detection` (a grouping) and `cuas-det-radar` (a capability) as the
same kind of thing, so "Detection" only appeared on companies where somebody had
*also* stored the parent row.

It now walks `parent_id` from the `counter-uas` root and chips each company with its own
capabilities **plus every grouping above them**. The database stopped storing those
parent rows on the same day — see `xsonomy-news/docs/CUAS_DERIVED_PARENT_TAXONOMY_MIGRATION_REPORT.md`.

**The figures in the original draft of this entry are superseded.** It predicted 199 vendors
and Detection 47 → 85, Mitigation 85 → 123, Tracking 0 → 35. Two things happened between
writing and shipping: the stored parent rows were deleted, which pushed the grouping counts
*further* down, and 162 verified companies were published on 2026-10-29, which enlarged the
registry. Both sides below were measured against live data on 2026-10-29, so the comparison
isolates this fix and nothing else.

Effect on `/cuas-systems/`:

| Chip | Before (prefix logic) | After (derived) |
|---|---:|---:|
| **Vendors in the registry** | 300 | **300 — unchanged** |
| Detection | 18 | **118** |
| Mitigation | 31 | **180** |
| Tracking / Identification | *absent* | **52 — new chip** |
| Integrated | 51 | 51 |
| Command & Control | 29 | 29 |

All ten specific capability chips are unchanged: Interceptor UAV 65, Kinetic 42, RF Detection 40,
RF Jamming 38, Radar 37, EO/IR 26, Acoustic 21, AI / Computer Vision 19, Sensor Fusion 16,
Directed Energy 13, GNSS 5. Only the groupings above them move, which is the point: a radar
company was not being counted under Detection unless a redundant parent row said so.

Verified by the deployed build, not predicted: `npm test` passes all 10 tests on the merged
tree, and the live `/data/cuas-systems.json` was read back after deployment.

### 2026-10-28 — Primes and drone detail
Added an explicit company-type Primes category/filter and overview platform-type and mission cards. Types come from the existing taxonomy; prime status comes only from company_type. Filters remain shareable and intersect country/domain selection. No database changes.

---

## 2026-10-29 — 162 verified landscape companies published (PUBLISH_STATUS change)

**Approved by Nazar** on 2026-10-29 ("go"), recorded in
`xsonomy-news/research-agent/decisions/2026-10-29-publish-verified-landscape.md`. Logged here under
rule 4 of CLAUDE.md, which makes any change to which rows are public a decision rather than a task.

Merits verification of the European UAV & Counter-UAS landscape finished on 2026-10-29 with **567
verified companies**. Only **405** of them were published, so **162 verified companies existed in
the database but appeared nowhere on the public site**. All 162 were `draft`. They are now `live`.

- Companies live, whole catalogue: **2,304 → 2,466**.
- Verified landscape companies published: **405 → 567**. Unpublished: **0**.
- Changed fields: `publication_status` and `updated_at`, nothing else.
- Prior statuses retained for rollback in
  `xsonomy-news/research-agent/reports/2026-10-29-publication-manifest.csv`.

Every one of the 162 was checked against all five conditions in `scripts/lib/landscape.mjs` before
writing — `included`, scope country, slug present, taxonomy inside the UAV/C-UAS trees, and the
`live` status itself — plus slug collisions and redirect shadowing. Zero failures, zero skipped.

**Their products were not published.** 26 of the 162 have products, 36 of 37 rows still `draft`, so
those company pages will render with empty product lists. That is a separate decision and was not
made here.

Full report: `xsonomy-news/research-agent/reports/2026-10-29-verified-publication.md`.

### 2026-10-29 — Atlas UI staging
Added `/landscape-next/` with the approved map-led interface, multi-select facets, search, prime filter, drag/zoom, collision-separated markers, URL-restored selection/layers/camera, mobile filter panel and bottom detail sheet. Uses the existing `/data/landscape.json` publication without database changes. Demo hubs/investors and snapshot fallback are disabled on the public catalogue; retained only in the separate private UI prototype. Existing company profile URLs remain unchanged. Browser QA covered desktop and 320/390px embedded viewport layouts, filtering, empty results, company details and URL restoration. Automated filter/URL/collision checks included.

### 2026-10-29 — Atlas main rollout
After successful staging build/deployment and browser verification on xsonomy.com/landscape-next/, promoted the atlas to /landscape/. Preserved the previous interface at /landscape-classic/ for rollback, canonical URL and analytics injection. Legacy query filters are accepted, including both-domain selection; company and product URLs are unchanged. Real hub/investor data remains a research dependency and demos are hidden publicly. Added keyboard focus retention after facet and marker updates.

## 2026-10-29 — 36 draft products corrected and published (PUBLISH_STATUS change)

**Authorised by Nazar** on 2026-10-29, after the source-backed correction package was reviewed.
Logged here under rule 4 of CLAUDE.md. This is the companion to the company publication earlier
the same day, which deliberately left these products in `draft`.

The 36 products belonging to the 162 newly published landscape companies were corrected and are
now `live`. Those 25 company pages no longer render with empty product lists.

- Products live, whole catalogue: **3,492 → 3,528**.
- Changed fields: `summary` (36), `source_urls` (15), `country` (8), `name` (2), `category` (1),
  `publication_status` (36), `updated_at`. **No `slug` was touched** — rule 3 holds, including on
  the two renamed products, which keep `ukropter-drone` and `argonian-argonian-dome`.
- Company ownership unchanged on all 36.
- Prior values retained for rollback in
  `xsonomy-news/research-agent/reports/2026-10-29-draft-product-publication-applied.csv`, with a
  ready-to-run `...-publication-rollback.sql`.

Every source was read before the write, not merely status-checked. Three products previously held
for lack of evidence turned out to have evidence after all: **RP-24** and **C4PER** were wrong URL
guesses (the pages exist at `/system/rp-mlrs-24/` and `/solutions/andromeda/c4per`), and **Shield X
SkyBlock**'s manufacturer page was live but unrecorded. Two products previously judged ready —
**Robotto Spectre** and **Spectre-1** — carried summaries their cited pages did not support, and
were rewritten from pages that do. **OBRIY** and **STEZHKA** had each other's descriptions; STEZHKA
also moved `Software → Other`, the only category change.

Drift check before writing: zero on all six fields across all 36 rows. The update is guarded and
idempotent — it matches only rows still in `draft` whose values actually differ, so a rerun changes
nothing.

Full report: `xsonomy-news/research-agent/reports/2026-10-29-draft-product-corrections.md`.

**Deployed and verified** on build `2026-10-29T23:57:55.490Z`. All 36 product pages and all 25
company pages return 200, and those company pages now list their products. Landscape still 567,
companies still 2,466.

**One exception, not fixed.** `pageUrlByProduct` in `scripts/generate-supabase.mjs:1237` keys
product page URLs by product *name*, so when two live products share a name the last bucket
processed wins for both owners. Bionic System Solutions' **Komodo** now links to `/other/komodo/`
(DOK-ING's ground robot) and HADES' **HAWK** links to `/cuas/hawk-2/` (the ownerless HAWK). Both
products' own pages are correct. Publishing these products surfaced a dormant defect rather than
creating one — before today neither was linked at all. ANDROMEDA escapes it only by letter case.
The fix is to key that map by product id. Flagged for a decision; code changes were out of scope
for the publication.

### 2026-10-29 — Atlas cache consistency
Final browser verification found the previous staging model could remain cached while the new main HTML loaded. Main and staging now load content-hashed application/model filenames; old files are retained for cached pages. Run `node scripts/version-atlas.mjs` after changing canonical atlas/model sources, then test. Tests target the model loaded by the page. No database changes.

## 2026-10-30 — Company pages now link to their own product (interface fix)

Fixes the exception logged in the entry above. `pageUrlByProduct` in
`scripts/generate-supabase.mjs` mapped products to page URLs by **name**, so when two live
products shared a name the last one written won for every owner. It is now keyed on the product
**id**, filled while the pages are generated — the only point where the database id and the
generated slug are both in hand — and `fetchCompanyProducts` selects `id` to look it up.

Measured on the live site, build `2026-10-30T00:19:09.744Z`:

| | before | after |
|---|---|---|
| Bionic System Solutions → Komodo | `/other/komodo/` (DOK-ING's ground robot) | `/cuas/komodo/` |
| HADES Defense Systems → HAWK | `/cuas/hawk-2/` (an unrelated HAWK) | `/cuas/hawk/` |

Across all 567 landscape companies **exactly those two links changed** — none gained, none lost.
DOK-ING keeps `/other/komodo/`, and the ANDROMEDA pair is untouched. No slug changed, so no URL
moved; products 3,528, companies 2,466 and landscape 567 all unchanged.

`landscape.json` is built from the same map and was wrong in the same two places; it is fixed with
it. A new end-to-end test, `scripts/test/company-product-links.test.mjs`, covers both shapes — a
name shared across two buckets and one shared inside a single bucket where `slugify` appends
`-2` — and was confirmed to fail against the old name-keyed lookup. `npm test` 17 of 17.

## 2026-10-30 — 19 entity-extraction errors removed from the catalogue (PUBLISH_STATUS change)

**Asked for by Nazar** on 2026-10-30. Logged here under rule 4 of CLAUDE.md.

Records that are not companies — publications, universities, an NGO, an industry cluster, a
procurement platform, an accelerator, a recruiter, an acquisition vehicle, a membership
association, two research institutes, three composite slash-name labels and one product line —
were `live` in the public catalogue. They are now `draft`, so they no longer render.

- Companies live: **2,466 → 2,447** (19 removed).
- Products live: **3,528 → 3,521** (7 removed — the artefact products belonging to those records,
  such as the GOKTURK-3, PRISMA and COSMO-SkyMed satellites. Leaving them live would have added
  seven more ownerless products to the public site).
- Changed field: `publication_status` and `updated_at` only. **Nothing was deleted.**
- Landscape unchanged at **567**; all 567 verified companies still published; the 36 products
  published yesterday all still live.
- Prior statuses and a ready-to-run rollback:
  `xsonomy-news/research-agent/reports/2026-10-30-entity-error-removal-manifest.csv` and
  `...-removal-rollback.sql`.

Their nineteen URLs now 404. That is the intended outcome — these pages should not exist — and no
redirect was created, because there is nowhere correct to send a reader. No `slug_redirects` row
pointed at any of them.

**Four records were deliberately kept.** ams OSRAM, Aston Harald Composite, JFG Composites and
Klaveness were excluded from the landscape on merits, not because the record is wrong. They are
real companies and belong in a company catalogue even when they are out of this landscape's scope.

**The pattern is wider than this list.** A sweep of the live catalogue found **22 composite
slash-name records** (only 3 were caught by the European work; others include Northrop Grumman /
IAI and Shahed Aviation Industries / HESA, though some slash names are legitimate single entities
such as the Thales / Elbit U-TacS joint venture) and **about 40 live universities and research
institutes** (Harvard, Duke, Yale School of Public Health, University of Tokyo, DLR, TNO,
Fraunhofer IDMT and others). Removing Rzeszów, Porto, TUBITAK UZAY and Laser Zentrum Hannover
while those stay live is inconsistent. Whether a university or research institute belongs in this
catalogue at all is a policy question that has not been answered, and it was not answered here.

---

## 2026-10-30 — "Research & academia" is now its own class, outside the company count

Nazar approved the counting rule proposed in
`xsonomy-news/research-agent/reports/2026-10-30-composite-and-academia-review.md`. The policy
question the entry above left open is answered: **universities and research institutes stay in the
catalogue, but they are not companies.**

**No database or schema change was needed.** The class is `company_type IN ('research_institute',
'university')` — both values were already permitted by the `companies_company_type_check`
constraint and already in use on 36 live records. What was wrong was only that the *site* counted
them as companies. The split now happens in `scripts/generate-supabase.mjs`, where `/companies/`
and the new `/research/` are built from the same fetch.

- `/companies/` now lists and counts **2,411 suppliers**, down from 2,447.
- **`/research/` is new**: the same registry UI, filters and table over the **36** universities,
  national laboratories and research institutes. In the sitemap, listed in static HTML, linked
  from the homepage and from a "Research" tab in every header.
- **Nothing was removed.** Every one of the 36 keeps its `/companies/<slug>/` page at the same
  indexed URL, keeps its products, and keeps its landscape place. The landscape is still **567** —
  Delft (MAVLab), Fraunhofer IDMT, NPTs 'Virazh' and Roke Manor Research are in it on reconciled
  merits, and membership has never run on entity type.

`PUBLISH_STATUS` is untouched and no row's publication changed. `companiesShell` and `cuasShell`
were factored into one `registryShell()` rather than copied a third time; the refactor was proven
byte-for-byte by generating both pages before and after and diffing. New regression test
`scripts/test/research-registry.test.mjs`; suite 18/18.

**One thing is pending and it is Nazar's to run.** Eleven `company_type` values are wrong, so the
class's membership is imperfect: five records mistyped as research are actually companies (Roke
Manor Research is a Chemring-owned engineering firm, not an institute) and six universities carry
no type at all. The guarded, idempotent SQL and its rollback are in
`xsonomy-news/research-agent/reports/2026-10-30-research-academia-class.sql`, to run in the
Supabase SQL editor — both database-write tools were refused in that session. After it runs:
**2,410 companies · 37 research & academic organisations.** The site needs no rebuild logic change
either way.

**Still open, and deliberately not decided here**, because each is a publication change under rule
4: unpublishing `Pixhawk` (an open hardware standard, not an organisation — an extraction error
missed on 30 Oct because it is typed `research_institute`); CyArk, WeRobotics and LMI, which are
not UAV organisations; reinstating the four academic records removed earlier that this policy
would have kept (Rzeszów, Porto, Laser Zentrum Hannover, TUBITAK UZAY); and whether a relevance
test should apply to Harvard and Yale School of Public Health at all.

---

## 2026-10-30 — European defence investor research imported; approved records exported

A 106-record investor research dataset (European Defence & UAV Investor Research,
`research-1`) was imported into a **new staging layer in Supabase**, and the approved
subset is now exported through this repo's existing landscape pipeline.

**This repo's part is read-only, as always.** `scripts/lib/landscape.mjs` gained an
investor projection; `generate-supabase.mjs` writes it to **`/data/landscape-investors.json`**
and puts a `{count, locations, url, membership}` pointer in `landscape.json`, so the map
payload does not carry investor data but a consumer of the existing endpoint can still
find it. **No frontend change** — no page reads the new file yet.

- **21 investors, 38 locations** are live in the export, from 12 confirmed deals and 9
  stated mandates. The other 85 records stay in staging: 16 adjacent investors, 4
  unverified candidates and 3 financial programmes among them.
- Approval is earned, not copied: the build revalidates each candidate for a city-level
  location with coordinates, an evidence URL, a review date and a deal-or-mandate status.
  An approved record with **no location fails the build** rather than shipping.
- The caveats ship **in the payload**, because each is a mistake a reader would otherwise
  make: a country association is an index entry, not a headquarters or an eligibility
  claim; a coordinate is a city centroid, not an office; offices, contact addresses,
  meeting venues and legal registrations are different things; a published ticket range is
  not available capital; an empty field means not established, never zero.
- **Nothing else moved.** The landscape is still **567**, live companies **2,447**, and the
  200 investors already extracted from news articles are untouched — 12 of the new records
  match one and record a *link*, never a merge. No company, product or taxonomy row was
  written.

Four new unit tests cover the caveats, the location-kind distinction and both failure
modes; suite **22/22**.

Full detail, counts and the response schema:
`xsonomy-news/research-agent/reports/2026-10-30-investor-research-import.md`.
Reproduction steps: `xsonomy-news/research-agent/imports/README-investor-research.md`.

**One gap, and one judgement.** The fund-vehicle table is deliberately empty: the dataset
names vehicles inside prose notes, and parsing entity names out of sentences would be
invention. And the dataset itself calls the 21 "candidates, not completed editorial
approval" — they were promoted so the export has content; reverting them to `review` is one
SQL statement, recorded in the report.

---

## 2026-10-30 — the 11 pending organisation-type corrections are applied

The membership corrections left pending by the entry above are done. Nazar approved the
exact 11 `company_type` changes and the rebuild; this entry records the execution.

**The write route worked this time.** The earlier session's refusal was not circumvented —
the same guarded statement was applied through the permitted migration route, as
`research_academia_class_membership_corrections`.

Before applying, each of the 11 was rechecked against the live record: **zero drift**, all
eleven still `live`, all eleven still needing the change. A dry run projected exactly
11 rows, 2,410 suppliers, 37 research organisations and landscape 567 — which is what the
apply produced.

| | Before | After |
|---|---|---|
| `/companies/` suppliers | 2,411 | **2,410** |
| `/research/` organisations | 36 | **37** |
| Live companies | 2,447 | 2,447 (unchanged) |
| Landscape membership | 567 | **567** (unchanged) |
| Live products | 3,521 | 3,521 (unchanged) |

**Five records left `/research/` because they are not research organisations**: CASC /
CAAA → `state_owned`, Chengdu Aircraft Design and Research Institute → `division`, NPO
Android Technology → `sme`, **Roke Manor Research → `division`** (a Chemring-owned
engineering firm; "Research" is its trading name), SGS-CSTC → `jv`. **Six universities
joined it** because they carried no type at all: Central Michigan, Embry-Riddle, Peking,
Hong Kong, Maryland, Pennsylvania.

**Roke Manor Research is in the published landscape and stayed there.** Membership runs on
reconciled merits, not entity type, so retyping it moved which registry lists it and
nothing else.

`company_type` and `updated_at` were the only columns written. No publication change, no
reinstatement, no merge, no ownership change, no deletion, no slug change — none of which
this instruction authorised. A rerun of the statement now matches **0 rows**. Tests 22/22.

Applied manifest, before-values and a ready-to-run rollback:
`xsonomy-news/research-agent/reports/2026-10-30-research-academia-class-applied.csv`,
`...-class-rollback.sql`, and the execution report `...-class-execution.md`.

## 2026-10-31 — The investor layer on /landscape/ now shows the real records

The Atlas investor layer was a single fictional record, `Example Ventures` in Paris, gated
off behind `data-demo="false"`. It now reads the approved export the import produced,
`/data/landscape-investors.json`: **21 investors across 38 published locations in 17
countries**, the counts read from the file rather than written into the code.

Investors are a different organisation class from the companies, and the page keeps them
apart. The headline figures swap labels in the investor section — approved investor
records, countries with investor locations, matching investors and their locations — and
never join the 567 landscape companies, the primes or the 37 research organisations.
**One investor is one identity however many locations it publishes**, so the record count
and the location count are always reported separately.

What the map shows: one marker per matching published location, filled for an office or
contact city and hollow for a meeting location, with the existing spiral placement keeping
every overlapping marker selectable — London and Munich each carry two investors. Markers
are keyboard-reachable buttons whose labels name the kind and say the coordinate is an
approximate city centre.

Filters are synchronised between map and list: search over investor names and portfolio
companies, country of **published location**, investor type, stage and technology focus,
all preserved in the URL hash the page already used. Published stage ranges
("Pre-seed–B", "Seed–B+", "Stage-agnostic") are read onto one ladder so a stage filter can
work at all; cards keep the published wording, and a record with no published stage stays
filterable as *Not established* rather than being folded into a guess.

The caveats the import recorded travel with the data onto the page: `countryAssociations`
is shown as a research index and never as headquarters or investment geography, a stated
mandate is never presented as a confirmed investment, a portfolio mention is never
presented as a verified relationship to a similarly named catalogue company, and a
published ticket range is never presented as available capital.

The investor export is fetched separately from `landscape.json`. If it fails the company
layer is untouched: the status line says so, a retry button appears, the investor layer
and legend withdraw, and a failed *refresh* keeps the records already on screen instead of
blanking them.

No database records were changed, the import was not repeated and publication eligibility
is unchanged. Company filters, counts and the map itself are as they were — 567 companies,
29 countries, 252 counter-UAS, 15 counter-UAS primes, 37 capability bars. Tests 29/29
(seven new in `scripts/test/atlas-investors.test.mjs`).

## 2026-10-31 — 13 composite-name records renamed

The 12 approved Tier A renames plus the dependent row F (`Vega Radio Engineering
Corporation`) are applied. Rechecked first against the live records: **zero drift** — every
current name matched the package manifest exactly, all 13 were `live`, none carried any
alias, and the collision dry run came back empty on all five checks (no name clash exact or
normalised, no alias clash with another record, another alias or another company's name).

The write was `companies.name` on 13 rows plus 11 `company_aliases` rows. **Nothing else.**
A rerun now matches 0 rows.

| | Before | After |
|---|---|---|
| Live companies | 2,447 | 2,447 |
| `/companies/` suppliers | 2,410 | 2,410 |
| `/research/` organisations | 37 | 37 |
| **Landscape membership** | **567** | **567** |
| Live products | 3,521 | 3,521 |
| Live names containing `" / "` | 19 | **7** |

**Every URL is unchanged.** Slugs were not touched, and company pages are keyed on `slug`,
so nothing moved and no redirect was needed (rule 3 satisfied by doing nothing). Product
pages derive their slug from the product name, so they did not move either. `Meridian` and
`UAV Tactical Systems (U-TacS)` are still `included` in the landscape and `Brolis Defence
Group` still `excluded` — membership is keyed on `company_id`, never on the name.

Row F carries no alias deliberately: `(Luch Design Bureau, Rybinsk)` was wrongly appended to
the parent's name — KB Luch is Vega's subsidiary, not another name for it — so keeping it
would preserve the error rather than the history.

The 7 names still containing `" / "` are exactly the unauthorised records: 1 merge, 3
unpublish/reassign, 2 held and ECA Group / Infotron. No publication change, no
reinstatement, no merge, no deletion, no ownership change, no slug change.

Execution report, before-values and rollback:
`xsonomy-news/research-agent/reports/2026-10-31-composite-renames-execution.md`,
`...-composite-renames.sql`, `...-composite-renames-rollback.sql`.

## 2026-10-31 — Exail re-screened; a landscape change is proposed, not made

Option E2 was taken: **ECA Group / Infotron was not merged into Exail.** Exail was
re-screened first, against the full landscape criteria rather than aircraft manufacturing
alone. Nothing was written — this is a proposal awaiting a decision.

**The finding.** Exail was excluded on the test *"is it an aerial UAV OEM"*. That is not
the test the landscape uses. The taxonomy has a whole UAV Ecosystem branch, and the
landscape already includes suppliers who build no aircraft: **SBG Systems** (French,
inertial navigation, included) and **Civitanavi** (Italian, whose own record reads *"an
ecosystem supplier, not a UAV OEM"*, included). Excluding Exail while including its French
competitor for the same capability is not defensible.

**Current, Exail-owned, aerial evidence** — the thing the exclusion note said it was
waiting for: Exail's **UmiX-40 IMU was selected for the navigation system of the Airbus
SIRTAP tactical UAS** (12 May 2025, Exail's own newsroom). Exail's product range carries a
*"Land and air navigation & pointing"* category today.

**Three of yesterday's four findings were wrong**, and this corrects them. The newest IT180
material is not a 2015 ECA release — an Exail item of 1 July 2023 calls the IT180-60 *"its"*
aerial drone and quotes the Director of Exail's *Land and Air robotics division*. And the
UMIS datasheet does not merely integrate third-party UAVs: it lists UAVs among Exail's own
toolbox vehicles and says Exail provides unmanned systems *"at sea and in the air"*.

**Recommended:** admit Exail as a Navigation / GNSS + Components ecosystem supplier — not
as a UAV OEM — adding the two sector rows in the same change, because Exail has **zero**
taxonomy rows and the build skips any company without one, so flipping the status alone
would leave the page and the database disagreeing.

**The count, not steered.** Admitting Exail: 567 → **568**. Merging ECA into Exail
afterwards: 568 → **567**. Merging without admitting Exail: 567 → **566**. The 567 that
falls out of the first two is a coincidence of two independent decisions, **not a target**.

Also found and not fixed: 12 Exail products are mis-categorised as UAVs (all maritime),
3 are duplicate bare designations, 2 are family names held as products, 1 has no source,
and **DORCUS is not an Exail product at all**. `iXblue` is still unresolved.

Review and exact-ID corrections:
`xsonomy-news/research-agent/reports/2026-10-31-exail-rescreen.md`.
### 2026-10-31 — expanded investor directory
User authorised inclusion of unverified investor candidates and the supplied Ukraine workbook. Added 118 research records (106 previous + 12 distinct additions), with 26 Ukraine-linked records. Approved DB records take precedence; the supplemental research dataset does not mutate Supabase. Private OSY Fly fit/outreach notes are omitted. Country association markers are explicitly not offices. US-only investors remain in the directory. Added direct list URL and Ukraine-linked toggle.

## 2026-10-31 — Spotter Global's composite product record split, and a dead redirect path fixed

The last loose end from the rename verification. Spotter Global's one live product row was
named `AX250 · GAX500-3D` — two real radars in one record. Splitting it turned up something
worse than the naming.

**The row carried Robin Radar's specs.** Its figures contradicted themselves (5.4 kg *and*
29 kg, 18 Hz *and* 30 rpm), and every odd value — `29 kg; 550 mm dia x 630 mm; 2x 12 W`,
`1.0 s (30 rpm)`, `5 km` — matches Robin Radar Systems' **IRIS**, where they are still
present and still correctly labelled. They had been copy-pasted across with the `IRIS`
labels stripped, so the catalogue was publishing a Dutch competitor's radar as Spotter's,
**at 20x the real detection range**: the AX250 reaches 250 m, not 5 km. Robin's own record
is undamaged.

Now two rows. The existing id stays with the **AX250** (so the record keeps its history),
rebuilt from the SpotterRF AX-250-3D datasheet; **GAX500-3D** is a new row from Spotter's
CH3D material. Both `live` — the GAX500-3D was already published inside the composite row,
so leaving it `draft` would have *removed* live content. `PUBLISH_STATUS` untouched.
Source URLs went from none to 2 and 4.

**Unknown left as unknown.** The GAX500-3D has no published frequency band and Spotter never
says whether CH3D has moving parts, so both fields are blank rather than guessed; the
unsourced micro-Doppler claim and the unsourced price estimate are gone from both. No new
filter values were invented.

**The URL was saved, but only after fixing the generator.** Product URLs come from the
product *name*, not `products.slug`, so `/sensors/ax250-gax500-3d/` could not survive the
rename. The redirect machinery wrote every product stub to `/uav/` regardless of the
product's section — for a sensor, a dead page pointing at another dead page. All 52
existing redirects are company ones, so **this had never run**; this split is the first
product redirect in the table. The section is now resolved from the target's own built page,
and a product redirect with no live target is skipped with a warning instead of guessed.
Redirects had no test coverage at all; there is now one that fails against the old generator.

Live products 3,521 → 3,522, sensors 500 → 501, redirect stubs 52 → 53, tests 30 → 31 all
passing. Landscape unaffected at **567** — membership is keyed on companies, not products.

**Flagged, not fixed:** `IRIS · ELVIRA` (Robin Radar) and `EchoGuard / EchoShield (MESA)`
(Echodyne) have the same two-products-one-row shape, and the first is the source of this
contamination. The other ~114 records with `·` in the name are mostly deliberate portfolio
entries and were left alone.

Two sweeps over the radar records before closing out. Exact duplicate spec strings across
companies: **none** — and that would not have caught this one either, because the pasted
values had been partly edited, so string matching is the wrong detector. Sweeping instead for
records that contradict *themselves* found one real defect: **`MAVERICK Fortress-3D`
(Silentium Defence)** has an unresolved analyst note sitting in a published spec field —
*"Note: 'MAVERICK/Fortress-3D' is a Silentium Defence passive radar; DeTect's drone radar is
HARRIER…"* — and a rotating scan type against a passive-coherent-location modality, which
cannot both be true. It looks like the same two-vendors-one-row confusion, between Silentium
Defence and DeTect, and needs a re-screen rather than a tidy-up.

Report, SQL and rollback:
`xsonomy-news/research-agent/reports/2026-10-31-spotter-global-product-split.md`.
### 2026-10-31 — investor financial profiles and portfolio links
Added separately typed source-backed financial metrics to seven investor profiles, with scope, dates and sources. No aggregate round sizes are attributed to a fund. Missing data remains explicitly not established. Portfolio links resolve only unique exact names in published database company rows, carrying company IDs/slugs; ambiguous and absent names remain unlinked. `docs/investor-portfolio-reconciliation.json` is the database owner's queue, including relationships and evidence. No Supabase rows were created in this read-only catalogue repository.

## 2026-11-01 — investor portfolio links became stored relationships

Portfolio links were computed at build time: a unique exact name match against **published**
companies. That link existed only while the name happened to match, could never reach an
unpublished company, and carried no evidence of its own. They are database rows now —
`investor_companies`, 61 of them, each with a source URL, a review date, an evidence status
and a persistent company id.

**The 38 "unresolved" names were not 38 missing companies.** Delian Alliance Industries was
already in the catalogue as a **draft**, which is precisely why the old matcher could not see
it. Two more were spelling variants, now resolved by alias: the investor publishes *Unmanned
Defense Systems* where the company is *Unmanned Defence Systems*, and MD One publishes
*Milvus* where the company is *Milvus Advanced*.

**16 companies verified and created**, 8 published and 8 deliberately not. `/companies/`
describes itself as a directory of UAV and counter-UAS companies, so therapeutics,
nanomaterials, rocket launch, satellite analytics, ground logistics autonomy, enterprise
security and test equipment are created as drafts: the relationship is stored and the holding
is shown, but the public directory and its stated count stay true. **None of the 16 has a
taxonomy row or a landscape row** — the landscape build requires an explicit sector
assignment, so a company created from a portfolio listing cannot enter it. Portfolio
membership is not an eligibility argument. Landscape unchanged at **567**.

**Matching is curated where automation was wrong.** A substring pass tied the French
Systematic Paris Region cluster to Systematic A/S, a Danish software company, and iNTACT to
INTA. Those are recorded as rejected false positives so nobody makes them later.

**Amounts stay separate.** `investor_contribution` and `round_total` are independent nullable
pairs with a CHECK that a contribution cannot exceed its round. Three are disclosed: Coinvest
Capital's own €0.9M share of the €3.2M round it led into Unmanned Defence Systems, and
Sienna's €7M and €11.8M, where no round total is published and so none is recorded. EIFO →
Six Robotics is stored as `fund_of_funds`, because the cited source is about EIFO investing in
the D3 **fund**, not in that company.

**Financial metrics are typed, not lumped.** Twelve types keep the distinctions a single
"fund size" field destroys: Flyer One's €50M is an announced *launch size* (a target), Keen's
is a *first close* stored as a `minimum` bound so "more than €150M" never renders as exact,
Vsquared's is a *final close*, and Dark Star's "9" counts *investments* while Flyer One's
"97 companies" counts *distinct portfolio companies*.

**The supplement is gone.** `investor-directory.json` and `investor-profiles.mjs` are deleted
after proving parity: 118 records in and out, no slug lost, Ukraine count unchanged at 26, and
every holding name still present either as a resolved relationship or as a listed unresolved
holding. The projection was broadened from the 21 records that had a city location to all 118,
each keeping its own evidence label — 94 of them are placed only by country association, which
is why a JSON file had to exist alongside the database at all.

Tests 41/41. Live: 118 records, 61 relationships, 52 with a profile URL, 14 metrics, 26
unresolved holdings each with a reason.

Import, rollback and the ambiguity/idempotency test results:
`xsonomy-news/research-agent/imports/README-investor-portfolio.md`.

## 1 November 2026 — the Hubs tab becomes real

`b4491ae`. Frontend only: no import was repeated, no database row touched, no publication
rule changed. The export this consumes was already live from the previous session.

**The demo hubs are deleted, not hidden.** The Hubs tab used to be five invented cities —
Prague, Munich, Paris, London, Kyiv — kept behind a `data-demo` flag that was switched off,
so visitors saw no Hubs tab at all. The array is gone from `atlas.js`, the DEMO badge is gone
from the tab, and the footer no longer promises that hubs will appear later. Nothing in the
code can now produce a hub record that did not come from `/data/landscape-hubs.json`: a
failed fetch yields an error state with a retry, never a fallback.

**Counts derived from the file, never hardcoded.** Live: **37 independent hub organisations,
1 associated site, 38 records, 40 locations across 25 countries.** The three units are
reported separately and never added together — the AIRlabs Steinalpl test area is a `site_of`
the AIRlabs Austria network and is counted as an associated site, not as a 38th organisation.
Filtered counts follow the same rule: Austria shows *1 organisation · 1 associated site · 2
locations*, and ATLAS Flight Centers contributes two site localities under one organisation.

**A contact office is not a flight-test site, and the map says so.** Hubs are triangles,
distinct from company circles and investor squares. 36 solid triangles are test, flight-test,
research-laboratory and simulation-laboratory localities; 4 hollow ones are the Graz network
office, the Andenes operator contact city, the Attard contact office and the Kyiv programme
delivery city. Each hollow marker's accessible name ends *"not a flight-test site"*, the
legend repeats the distinction, and every locality line in the panel carries its own kind.

**Planned capability never reads as availability.** BVLOS appears under *"the source's own
wording"* with the caveat beside it. Unmanned Valley reads *"Planned 2027 per operator not
current"*; Snowdonia reads *"Documented in CAA test site information subject to
authorisation"*. There is no BVLOS badge or boolean to misread.

**Unconfirmed matches stay unconfirmed.** Bofors Test Center shares a name with the catalogue
company Bofors, which is the BAE artillery business — it renders as *"Possible match — not
confirmed"* with its reason and **no link**. Only `facility_of_matched_organisation` and
`related_organisation_different_function` may become links. The unpublished `operated_by →
CATEC` relationship is shown as text saying the record is held in research staging, so there
is no broken link. The NaviSpot/PSNC shared campus renders as two separate operators.

Two things fixed while verifying: hub search folds accents, so typing `kakolewo` finds
*Kąkolewo* and `troia` finds *Tróia*; and the source's own BVLOS wording keeps its acronyms
rather than rendering as a lowercased database token.

Checked live in a browser at desktop and 375px: 40 markers all keyboard-focusable with
`role="button"`, no two within 6px of each other, 38 cards, filters and selection round-trip
through the URL, reset clears the two new facets, no horizontal scroll on mobile, and the
panel opens and closes. A simulated hub outage left companies (567) and investors (118)
working with a retry that recovered the layer. Tests 55/55.

**Remaining blocker:** `matchedCompanyId` and `matchedInvestorId` are database UUIDs, and
neither DLR nor MITS Capital appears in the published landscape or investor payloads under
those ids, so a confirmed match currently renders its role and note without a profile link.
Adding `matchedCompanySlug` / `matchedInvestorSlug` to the export would light the links up
with no interface change — that is an export change, outside this task's scope.

## 1 November 2026 — investor corrections and a new kind of fact

The database work and its rollback live in `xsonomy-news`
(`research-agent/reports/2026-11-01-investor-corrections.md`). What changed here is the
export, the interface and the tests.

**Fund positions are their own array.** `investor_fund_positions` holds capital one investor
committed to another manager's fund — EIFO's US$5m into D3, SmartCap's four published
commitments, the EIF's €30m into Sienna's defence credit fund, the NATO Innovation Fund as an
LP in three funds. They are **never** merged into `portfolio`, are counted separately in
`landscape.json` (`fundPositions`, beside `portfolioRelationships` and `unresolvedHoldings`),
render under their own heading with their own caveat, and link across to the manager's own
record when it is published. A commitment to a fund is not a holding in that fund's companies,
and nothing in the payload or the interface lets the two be added together.

**A retired relationship leaves the export.** `v_landscape_investors` now filters
`retired_at is null`. A holding withdrawn because its cited source did not support it stops
being published, while the row and its reason stay in the table for audit. Rockaway Alpha
Defense now shows no portfolio at all and two unresolved entries, which is the honest state.

Also carried through from tables that already had them: a relationship's fund `vehicle` and an
unresolved holding's `reviewedAt`. Investor search now reaches stored portfolio-company names
and fund-position managers, so the "Search investors & portfolio companies" placeholder is
true; accent-free names like `d3` and `defence fund` both find their record.

**Counts from this build:** 118 records, 41 locations, **74** portfolio relationships, **13**
unresolved holdings, **9** fund positions, **23** investors with financial figures (was 7).
Landscape **567**, unchanged — none of the ten companies created in the database pass has a
taxonomy or candidate row, so a portfolio listing still cannot admit a company to it.

Three of those ten are published and now have pages: `/companies/airvolve/`,
`/companies/kelluu/`, `/companies/mutable-tactics/`. The other seven are drafts and generate
no page, so the export gives them `published: false` and no URL.

Tests **59/59** (four new): a fund position never becomes a portfolio holding and neither
array leaks into the other; an undisclosed commitment stays undisclosed rather than zero; an
unpublished manager gets no link target and a non-web source is dropped; an investor with no
fund positions gets an empty array rather than a missing field; and search reaches both
stored holdings and fund managers.

**Verified live** at `/landscape/?view=investors`: EIFO's one holding and one fund position
under separate headings; Coinvest's €510,000 contribution and €825,000 round total as
distinct lines; BSV Ventures' Airvolve holding with the Baltic Sandbox Ventures former-name
note; MITS Capital's contested $50m target with the contest spelled out; SmartCap's four
commitments each linking through to the manager. Mobile at 375px: no horizontal scroll, the
new link is a 35px touch target.

Every source URL written in the database pass was then link-checked, and the one that did not
resolve was removed rather than published: Varangians' €9.1m close had a single source, which
now returns 404. That is why the figure count is 23 investors and not 24, and it is the reason
for the second deploy.

## 2026-11-01 — Exail admitted, ECA merged into it, and 11 product pages moved sections

Supersedes the "landscape change is proposed, not made" entry of 2026-10-31. **Nazar
authorised** three things and all three are applied and live: the reviewed admission and
merge (with the `merged_with` lineage row and ECA retired in both landscape editions,
history preserved), the Exail description, and **category-only** corrections for the
products whose maritime identity is evidenced. One guarded 17-step transaction, run in
`xsonomy-news` and against the Supabase SQL editor — this repo still only reads.

Write-up, applied SQL and rollback: `xsonomy-news/research-agent/reports/
2026-11-01-exail-merge-applied.md` (+ `.sql`, `-rollback.sql`).

**Landscape stays 567** — +1 Exail admitted, −1 ECA retired. Those are two independent
decisions that happen to cancel; both were authorised, so both landed. Live companies
2,458 → 2,457; suppliers 2,421 → 2,420; the 37 research & academic organisations, the 118
investor records and the 38 hub records are untouched. Exail shows on the map with
`domains: ['uav']`, sectors `eco-navigation` + `eco-components`, a 335-character
description where it previously had none, and 19 products.

**This repo's change: a product's old URL now survives a category correction.** A product
page lives at `/<section>/<slug>/`, where the section comes from `products.category` and
the slug from the product *name*. So correcting a category moves the page —
`/uav/drix-h-8/` → `/other/drix-h-8/` — while the slug stays the same. The redirect table
could not express that: `fetchRedirects` wrote every stub into the section of its
**target**, so a same-slug stub landed on top of the live page it pointed at and was
skipped as a collision, and the database's `from_slug <> to_slug` CHECK rejected the row
outright. Redirects now carry `from_section`, the generator writes the stub there, and the
canonical still points at the target's own section. NULL keeps the old behaviour, so all
53 pre-existing rows — including `ax250-gax500-3d → ax250` — are unaffected.

Verified live after the 16:26 UTC rebuild: all 11 `/other/<slug>/` pages are real pages,
all 11 `/uav/<slug>/` URLs still answer with a canonical to the new one, `uav.json` is
1,444 and `other.json` 382 (matching the database), `/uav/it180-sth-u/` is unmoved, and
`/companies/eca-group/` and `/companies/eca-group-infotron/` both canonical straight to
`/companies/exail/` rather than chaining. Tests **60/60**, including a new one that builds
the whole site and proves the cross-section redirect works — and that without
`from_section` the move cannot be expressed at all.

**Held back on purpose, both reported:** `Exail A27` (no source anywhere names the product,
so its identity and therefore its category cannot be established) and `DORCUS` (not an
Exail product at all — an ownership question Nazar left pending). No product was renamed,
retired, deduplicated or unpublished.

**Found while verifying, not fixed:** 101 live landscape companies still render with an
empty description, and the same "filed under category UAV but is not an aerial system"
taxonomy flag sits on 19 further products outside Exail that are still categorised UAV.
Each deserves its own pass.

## 2026-11-01 — Hub cards now link to the profiles their matches point at

DLR and MITS Capital were both **confirmed** catalogue matches that the hub panel still
rendered as plain text. Two unrelated causes, both fixed. Write-up and rollback:
`xsonomy-news/research-agent/reports/2026-11-01-hub-profile-links.md`.

**Why it could not work.** The panel resolved a match by searching the payloads this page
already loads. For a company it searched `landscape.json`'s company array — which holds
only the 567 landscape members. DLR is a research institute, counted *outside* that list,
so its id was never in the array; `/companies/dlr-german-aerospace-center/` had existed
the whole time. For an investor it compared the hub's `matchedInvestorId` against the
investor payload's ids — but hub records point at the **legacy `investors` table** while
the published records are `investor_research` rows keyed on their own ids, so *no*
investor match could ever have resolved, for any hub.

**The fix, in the right layer.** `v_landscape_hubs` now resolves each stored id to a
published profile — by id, in SQL, never by name and never by building a slug — and
returns null when no published profile exists. The export emits `matchedCompanySlug`,
`matchedCompanyUrl`, `matchedCompanyName`, `matchedInvestorSlug`, `matchedInvestorName`
and `matchConfirmed`, and the panel renders what it was given. `atlas.js`'s own
`ASSERTED_MATCH` copy of the confirmed-role list is **deleted** — holding the rule in two
places is what let it drift from the data.

**A link needs two independent conditions:** the relationship is a reviewed conclusion,
*and* the target has a published profile. **Bofors Test Center is why they are separate** —
its matched company is published and `/companies/bofors/` returns 200, but the match is
only `needs_review`, so the export withholds the slug and url entirely and the panel says
*"A possible match, not confirmed… so this is deliberately not a link."* A rejected
false positive gets its own wording. Nothing turned Bofors Test Center into a confirmed
relationship.

**Verified on the live page**, not just in the export: DLR's panel renders
`DLR (German Aerospace Center) — company profile ↗` to
`https://xsonomy.com/companies/dlr-german-aerospace-center/` (200, and the page's own `h1`
is DLR), and MITS Accelerator renders `MITS Capital / Lightning Fund — investor record →`
opening `mits-capital-lightning-fund`. Hub counts (37 organisations + 1 site, 40
locations, 25 countries), eligibility, filters and the 567-company landscape are unchanged.
Tests **66/66**.

One correction mid-flight: the first deploy linked correctly but still *labelled* the
company from the landscape payload, so DLR read as `dlr-german-aerospace-center`. The
name now travels with the slug from the row that resolved it.

## 2026-11-01 — Investor figures now labelled by what they are; coverage 23 → 55

Write-up and per-investor ledger:
`xsonomy-news/research-agent/reports/2026-11-02-investor-semantics-and-coverage.md`
(+ `-financial-ledger.md`). Database work ran in `xsonomy-news`; this repo still only reads.

**The bug worth remembering: a note never reaches a label.** Four figures carried careful
explanatory prose and the wrong structured type, and the interface reads the type. A listed
trust's net asset value was stored as the manager's **total** assets (Seraphim), an average
cheque as a published **range** with min = max (DTCP), and grant money and grant counts as
**equity invested** and **investments made** (Brave1). Flyer One's €50M sat as a *target*
when its own source says Fund V was "launched at €50 million" — stating no target and
reporting no close. Five new metric types separate them, and a `vehicle_nav` now **cannot**
be stored without a named vehicle.

**This repo's part: the card had to move with the data.** `invCards` picks each figure by
metric type, so retyping would have silently emptied the slot each one used to fill —
Seraphim's would have vanished from the AUM line, DTCP's from the ticket line, Brave1's from
the invested line, all while sitting in the export. Each slot now reads every type that
belongs in it (`SCALE_METRICS`, `TICKET_METRICS`, `DEPLOYED_METRICS`) and labels the
corrected ones honestly: **Vehicle NAV**, **Average ticket**, **Grants disbursed**, **Own
capital invested**. A test forbids any slot being keyed on a single bare type again.

**Second card change.** The unverified-candidate notice read *"Unverified candidate. Limited
information is available; inclusion is not confirmation of investment activity"* — directly
above sourced figures and sourced holdings. It now says what is unestablished is the
investor's **defence relevance, not its existence**, and where sourced facts are present it
says they stand on their own sources. The softer wording survives for a record with nothing.

Verified live after the 17:40 UTC rebuild: 118 investor records, 100 observations across 55
investors, 100 relationship rows over **70 unique companies** (different numbers), 82 rows
linking a published profile and every one of those URLs returning 200, 7 unresolved
holdings, 13 fund positions in their own section, zero retired relationships exported, no
amount rendered as zero. Landscape **567**, companies 2,457 → 2,464. Tests **72/72**.
Checked on a 375 px viewport: no horizontal scroll and every portfolio link resolves.

**Not finished, and not claimed to be: 40 of the 118 investors have still never been
researched financially.** They are listed in the ledger and identifiable from the data.

## 2026-11-01 — 28 non-aerial products moved out of /uav/

Nazar authorised the prepared batch. Review, manifest, applied SQL and rollback:
`xsonomy-news/research-agent/reports/2026-11-02-non-aerial-product-batch.*`. Database work
ran in `xsonomy-news`; this repo still only reads.

Twenty-eight products categorised `UAV` were not aerial vehicles — uncrewed surface
vessels (Saildrone Explorer/Spectre/Surveyor/ARES, the Kraken K3/K5/K7, Mako, GULL,
SEASTRIKE, Lightfish, MAGURA V5, Saronic Corsair, Sea Baby), underwater vehicles (REMUS
100/130, Hugin, Gavia, Lionfish, Ghostfin, Sub Sea Baby) and ground robots (Hunter WOLF,
WOLF-X, Ascento Guard, FireAnt, Kuryer, Max1, Dot). Products categorised UAV: **1,444 →
1,416**; Other: **382 → 410**. Live products unchanged at 3,522 — nothing was published or
unpublished.

**Their pages moved** from `/uav/<slug>/` to `/other/<slug>/`, and all 28 old URLs are
preserved by `from_section='uav'` redirect stubs. Checked before applying: every slug was
free in `/other/` and no namesake was left behind in `/uav/`, so nothing inherited a
vacated slug. Redirect rows: 65 → 93.

**The candidate set was 36, not the 19 the earlier report named** — that count matched one
note phrasing, while the taxonomy's own `domain` facet finds eleven more carrying no such
note. Eight are deliberately held, listed in the report.

**One flag was wrong and the data said so.** Katana carried a knowledge-seeded
`domain = Surface (USV)` beside a web-sourced `airframe = Single-rotor / helicopter`; it is
the helicopter that won DARPA's Lift Challenge. A catalogue-wide sweep for that
contradiction returned Katana alone. It **stays a UAV** at `/uav/katana/` and the bad
taxonomy row was corrected instead.

## 1 November 2026 — the investor research queue is empty, and one figure would have been invisible

**The 40-record research queue is finished: 0 untouched records.** Across the whole
directory, **102 of 118** investors now carry typed, sourced figures (55 before this pass),
**16** are recorded as researched-with-nothing-usable, and **none** is unresearched. 207
current observations across 104 registered vehicles. The queue is measurable, not asserted:
it is the set of records with no `investor_financial_research_log` row and no current metric.

**A new metric type was needed and nearly rendered nothing.** Karista publishes about
€220M "raised since its creation" — which is not assets under management (a point-in-time
figure net of realisations) and not capital deployed. Storing it as either would have
published one thing as another, so `cumulative_capital_raised` was added. But the atlas
derives `METRIC_ORDER` from `METRIC_LABEL` and keys its list-card slots on the metric type,
so a type absent from both is **dropped silently from the detail panel and the card** — the
figure would have been researched, stored, and invisible. The label, the slot and a
`SCALE_PREFIX` entry (so "raised since inception" is never captioned "AUM") were added, and
**a test now asserts every type the database can store has a label and exactly one slot.**
It was mutation-checked: remove the label and it fails with that reason.

**What the research refused to do** is as much of the result as what it stored:

- **11 of the 104 vehicles carry no figure on purpose.** They exist so a sibling fund's
  number cannot drift onto a fund that has none — Rockaway's defence sub-fund (target
  €450M) beside Rockaway Alpha (€1bn+ target, ~€150M portfolio); IVC's DefenceTech fund
  (no published size) beside its ClimateTech fund, whose €60M is what gets misquoted as
  "IVC's €60M fund"; iG TECH's three Hungarian funds, which are not required to publish.
- **Round totals are not cheques.** Prima Materia *led* Helsing's €600M round; its own
  outlay was €100M of a €102.5M Series A. Tech Horizons *led* a >$20M Series A. Neither
  round total was stored as the investor's capital.
- **Group AUM is not defence capacity.** Tikehau's ~€53bn group AUM, Omnes's €6.7bn and
  Saab's group accounts are all labelled as what they are; Tikehau's A&D strategy
  (~€600M) and TDS fund (€150M) sit at their own levels.
- **Four NSSIF figures measure four different things** — £14.9M committed in FY2024-25
  (official), the £85m 2017 programme, ~£220M cumulative (third-party), and a
  "£100m per annum" claim found only in a job advert, which was not stored.
- **Kibo's €155M is a combined close** across Fund III and Opportunity Fund I, recorded
  with an explicit warning not to attribute it to either alone.
- **An AI-generated "report"** surfaced in search listing six defence funds that appear in
  no primary source. None were used; the trap is named in the Defence Invest log row.

**Two identities resolved.** N1 is the Czech group at n1.rocks (U-Tech Fund, backed by
Barta, Průša and Winkler), not the Kyiv N1 Investment Company whose "$20m" sits in
directories. "Rockaway Alpha Defense" is the Defense sub-fund of Rockaway Alpha Fund SICAV,
distinct from the Alpha sub-fund the record's name conflates it with.

**Unknown amounts remain `null` and render as unknown — never zero.** There is a test.

## 1 November 2026 (later) — Tech Horizons is one organisation, and the rollback predicate is gone

**Tech Horizons resolved on a register number, not a name.** The record held a €150M raise
attributed to "Presto Tech Horizons" and a €300K–€3M ticket range attributed to a
Luxembourg "Tech Horizons" profile, both on one vehicle, with prose saying the match was
unproven. The manager's own legal notice gives `RCS Luxembourg B282214`, and the Luxembourg
register's entry for that number runs **Presto GP III Sàrl → Presto Tech Horizons GP Sàrl →
Tech Horizons GP Sàrl**. Same organisation. Corroborated by the launch coverage calling it
Presto Ventures' *third* fund (the vehicle was formerly Presto Ventures III SCSp) and by
Vidar Systems and Bavovna AI appearing on the manager's own portfolio page.

Domicile is now Luxembourg (`Tech Horizons SCSp`, Capellen) and the office is Prague. The
old note "office vs domicile pending verification" is answered.

**The identity work found two wrong figures.** The €150M cited an article headlined
"European Defense Tech Fund Secures €150M" — which is **Keen Venture Partners'** first
close, mentioning this fund only in passing with no amount attached. Re-sourced to the June
2024 launch coverage, re-dated from 2025-11 to 2024-06, and still labelled an *announced
launch size*: no source reports a close. And the €300K–€3M range is **contradicted by the
manager's own site**, which states €1M–€5M; it is now withdrawn from publication, kept for
audit, and replaced by the official range as `source_confirmed`.

Counts unchanged: **118 investors, 102 with figures, 207 observations.** One observation
was traded for a better-sourced one.

**Two new guards, because a caveat does not filter an export.** A composite foreign key
means one investor's figure can no longer name another investor's fund, and a new
`attribution_status` column with a CHECK means a figure whose owner is unproven cannot be
`is_current` — so it cannot reach the site, while staying available to the next pass. The
generator drops such a figure a second time. Both were proven by statements *expected to
fail*, which wrote nothing.

**Rollback.** The one remaining unscoped statement — nulling `retired_kind` wherever it
equalled `unsupported_evidence` — would have reached a row the *coverage* pass retired, was
not the before-image anyway, and would have failed its own CHECK. Replaced with exact ids
and guards. The two latest passes now have their own manifest with 239 exact ids; passes A
and B are declared to have none. Nine specific reversals are marked **unavailable** rather
than guessed, including the prior scope text of five re-typed metrics, which no report ever
recorded. Nothing was executed against production.

**A correction to the last entry.** It reported news tests 41/41. One was in fact failing on
the committed tree: the coverage pass regenerated the ledger and dropped its pointer to the
rollback manifest. Fixed. Catalogue **75/75**, news **48/48**.

### Non-aerial batch 2: the authorised part is applied and live

**Six product pages did not move — two did.** `/uav/dire-wolf/` and `/uav/ghost-shark/` are
now `/other/dire-wolf/` and `/other/ghost-shark/`, with `slug_redirects` rows keeping the
old URLs working. **LUNA-2, MMCM, rMCM and XLUUV were not moved** — LUNA-2 was excluded
from the authorisation and the other three went to a retirement proposal instead, so the
prepared plan's six-record move did not happen and the figures below are not the ones the
last entry predicted.

**`/uav/exail-a27/` is now a 404.** Exail A27 was unpublished: Exail's AUV range is A9-M,
A18-M, A6K-M and Ulyx and no source names an A27. The record, its taxonomy, its sources and
its Exail link are all preserved in the database for audit — only the page is gone. No
redirect was created, because there is no product to redirect to, and the generator skips
any redirect whose target is not live anyway.

**Ghost Shark's manufacturer now reads Anduril, not Albacore.** Albacore's own site names
exactly one vehicle, Ghostfin, which stays a separate record and keeps its page.

| | Before | After |
|---|---:|---:|
| Live products, UAV | 1,416 | **1,413** |
| Live products, Other | 410 | **412** |
| Live products, total | 3,522 | **3,521** |
| `slug_redirects` | 95 | **97** |

UAV falls by three, not two: two moved and one was unpublished. Tests **75/75**. No
catalogue code changed — this is a data change, deployed through the normal daily build.
Full detail in `xsonomy-news`:
`research-agent/reports/2026-11-01-non-aerial-product-batch-2-applied.md`.

### Batch 2 closed out: three pages retired, one more moved

**`/uav/mmcm/`, `/uav/rmcm/` and `/uav/xluuv/` are now 404s.** All three were retired as
product records — two were procurement programmes and one was a US Navy size class, not
products at all. The records, their article links and their taxonomy are preserved in the
database for audit; only the pages are gone, and no redirects were created because there is
nothing to redirect to.

**`/uav/luna-2/` is now `/other/luna-2/`**, with a redirect keeping the old URL working.
The satellite stays published: it is the only orbital record in the catalogue, so this was
one record to place rather than a scope rule to write, and it is well sourced.

**Ghost Shark's sources now read anduril.com and defence.gov.au.** They had pointed at an
article about Albacore's *Ghostfin* — a different vehicle with a similar name, which is how
the wrong manufacturer got onto the record in the first place.

| | Start of day | Now |
|---|---:|---:|
| Live products, UAV | 1,416 | **1,409** |
| Live products, Other | 410 | **413** |
| Live products, total | 3,522 | **3,518** |
| `slug_redirects` | 95 | **98** |

Four `/uav/` pages became 404s across the day (Exail A27 plus these three) and three moved
to `/other/` with their old URLs preserved. Tests **75/75**. No catalogue code changed —
all of it is data, deployed through the normal build. Detail in `xsonomy-news`:
`research-agent/reports/2026-11-01-batch-2-decisions-applied.md`.

**One question still open** and touching no page: two products categorised `Other` carry an
**aerial** domain row — a piloted light aircraft and a servo actuator. Whether a domain row
describes what a product *is* or what it *flies on* needs an answer before more records
inherit the ambiguity.

**Investor data, same day.** The Tech Horizons €150M observation was re-typed from
`fund_size_target` to `fund_size_stated` — the cited source says the fund was *launched at*
€150M and uses no target language, so the card caption "Fund size (announced target)" was
claiming more than the source does. It now reads "Fund size (stated)". Coverage is
unchanged at 118 investors and 207 observations; no catalogue code changed. Detail in
`xsonomy-news`: `research-agent/reports/2026-11-01-tech-horizons-and-rollback-closeout.md`.

### Extraction fix (in `xsonomy-news`) — nothing changes on the site

The pipeline that created the bad catalogue rows has been fixed at source: a name is only
created as a product if a source positively says it is one, a quoted span has to be found
in the actual article, and a manufacturer is only linked when **one span names both the
product and the maker**. Unverified candidates are now saved as `review` instead of `live`,
so they never reach xsonomy.com — the site shows the same products it showed before.

The one thing to expect: **catalogue growth from the news backlog pauses.** 719 already-
analysed articles carry no evidence, so roughly 1,000 new product names will sit in review
rather than publishing themselves. There is a one-command backfill to clear that, which has
not been run. Detail in `xsonomy-news`:
`research-agent/reports/2026-11-01-extraction-identity-fix.md`.

Also prepared and not applied: deleting two stale "aerial" taxonomy rows from Cassio S and
DA 15-N.ISS — a piloted light aircraft and a servo actuator that were tagged as uncrewed
aerial systems because the tag was copied from a category they no longer have.

### Two stale "aerial" tags removed

**Cassio S** and **DA 15-N.ISS** no longer claim an aerial-UAV domain. Both were tagged
that way because the tag had been copied from a category they no longer have — a piloted
light aircraft and a servo actuator, filed as uncrewed aerial systems by inheritance. Both
pages stay exactly where they are (`/other/cassio-s/` and `/other/da-15-n-iss/`), keep
their companies and their news links, and simply carry no taxonomy field now, which is how
every other component in the catalogue is treated.

**Worth knowing, found while checking those URLs:** a product's public URL is generated from
its **Name**, not from the `slug` column in the database
(`generate-supabase.mjs:1203`). DA 15-N.ISS is stored with slug `da-15-niss` but published
at `/other/da-15-n-iss/`. So renaming a product moves its page, while editing the stored
slug does nothing — the opposite of what "keep the slug stable" implies. Nothing is broken
today; it just means renames are the thing to be careful with, not slug edits.

No other product is affected: aerial tags on non-UAV products went from 2 to **0**.

Upstream, the extraction pipeline that produced the earlier bad records was hardened again
after review found two defects in the first fix — a manufacturer could still be inferred
from two names appearing in one sentence, and the duplicate guard caught less than claimed.
Detail in `xsonomy-news`:
`research-agent/reports/2026-11-02-extraction-validation-and-taxonomy-applied.md`.


### 2026-11-02 — structured company funding pilot on the landscape

The catalogue now reads service-only `v_company_funding_rounds` and `v_company_investment_research`, projecting approved sourced rounds onto included live companies. Five pilot companies carry one verified 2026 round each, with 35 round participations. Investor export/search also carries the associated funding company identities without merging them into generic portfolio relationships. Company and investor panels link both ways; legacy rows already represented by structured rounds are not shown again as undated evidence.

Amount basis and close status are explicit (notably Tekever: announced USD 580m size, first close with undisclosed exact proceeds). All five histories are labelled partial. No cumulative company funding totals are computed. Data, schema, exact sources, dry-run importer and rollback are in xsonomy-news commit f705ff6f98ca682a4ed0ef7e39df631123fcd33b, report `research-agent/reports/2026-11-02-company-funding-pilot.md`. The DB update is logged there; this catalogue remains read-only.

Validation: 86 catalogue tests pass, including a full read-only generator build and source/amount/coverage checks. The database schema and idempotent importer also passed local PostgreSQL tests and a production rollback dry run. Publishing uses the existing Pages workflow.


### 2026-11-02 — publish earlier financing histories

Read-only funding export now preserves event kind, same-company extension parent and unknown dates (sorted last). Company and investor cards distinguish financing, lenders and individual contributions. Primary-source history import in xsonomy-news expands five-company pilot to 24 events / 110 participations and catalogue to 177 investors. No inferred funding totals. 87 catalogue tests pass; atlas asset versioned. Next 25 identities queued for research in xsonomy-news, not claimed researched.

Funding history source commit: `74179987b30bb8189ee3d1b72753dd8e31e6b0ea`.


### 2026-11-02 — financing amounts retain source qualifiers

Funding export and cards preserve approximate, more-than, at-least and up-to values, avoiding false exact proceeds. Expansion in writer repo adds 44 sourced financing events across 23 further companies: 68 events and 215 participations overall, with 235 investor profiles. 88 catalogue tests pass. Source currencies and individual contributions remain separate.


### 2026-11-02 — verified financing expansion published

Read-only rebuild for writer commit `65bc1d27a573d3d1781bba85ecef72df05e22aeb`: 101 approved financing events across 54 companies, 306 investor participations and 287 investor profiles. Further 33 source-reviewed events include loans, mixed funding and historical original currencies. Full programme remains in progress; discovery candidates are not imported facts. Existing 88 catalogue tests pass; unchanged renderer preserves amount qualifiers and event sources.


### 2026-11-02 — autonomous funding checkpoint 03

Read-only rebuild requested for writer commit `2f9faa1ac23df56f595b5e98e99c9b21a895c609`: 123 approved sourced financing events across 65 companies, 376 round participations and 342 investor profiles. This checkpoint reviewed 20 published-landscape identities and imported 22 confirmed events, including the distinct October Buntar round, Volocopter Series C–E history, Skyports Series B/C, and separated Dronamics grant/equity financing. Lower bounds, signed commitments, unnamed participants and ownership transactions remain explicit rather than normalised into invented exact rounds.

Writer validation: 146 tests pass; production rollback rehearsal restored the 101-event baseline; atomic import and idempotent rerun produced zero source or participant-source mismatches. The full programme remains in progress.


### 2026-11-02 — company website and founding year in headers

Company map panels and full company profiles now show an external website link and founding year directly beneath the name when present. Landscape export includes foundedYear from the existing founded_year field. Missing facts are omitted; HTTP(S) links are parsed and escaped. A new versioned atlas entry retains the existing versioned model import. No database changes.

Validation: atlas scripts and companyPage function passed syntax checks; empty/invalid-value rendering checked. Local Node/browser execution unavailable in this session; deployment build is the integration check.


### 2026-11-03 — recovered funding checkpoint 08 publication

Rebuild the read-only catalogue from writer commit `a77422057d307c13d287cb0cc33d1e8cd57586bb`: 203 approved sourced financing/investment events across 106 companies, 541 participations and 457 investor profiles. The prepared package adds 15 events, enriches one existing event and corrects FlyingBasket's 2022 Cysero amount to approximately EUR1.5m with guarded before-values. Production rollback rehearsal restored all seven table fingerprints; atomic import, idempotency, source constraints and unchanged legacy relationships verified. 169 existing writer tests plus one checkpoint-specific PostgreSQL regression pass. Full programme remains incomplete; 82 identities have bounded public-source review dispositions. No publication-gate or UI change.


### 2026-11-03 — funding research checkpoint 09 publication

Rebuild the read-only catalogue from writer commit `4a7de48a293ec537fa5e3a48ed2a3e6028360de8`: 213 approved sourced financing/investment events across 115 companies, 550 participations and 463 investor profiles. This checkpoint source-reviewed 20 additional published-landscape identities and added ten attributable events for nine companies, including acquisitions, public-market financing and company-specific grants. Secondary consideration, original currencies, amount qualifiers and unknown amounts remain explicit; unclosed raises, authorised capital, contracts and consortium totals were held rather than converted into financing facts.

Production rollback rehearsal reached the expected post-import counts and restored the exact seven-table baseline. Atomic import, idempotent rerun, source integrity and duplicate-key checks passed. Full programme remains incomplete; 102 identities now have bounded public-source review dispositions. No publication-gate or UI change.

### 2026-11-03 — funding research checkpoint 10 publication

Rebuild the read-only catalogue from writer commit `9cd9889479abbd735606be231507b430c4625b09`: 228 approved sourced financing/investment events across 124 companies, 568 participations and 472 investor profiles. This checkpoint source-reviewed 20 additional published-landscape identities and imported 15 attributable events for nine companies, including equity rounds, strategic investments and acquisitions, a development-bank loan, and company-specific public grants. Original currencies, lower-bound qualifiers, participant roles and unknown amounts remain explicit; unclosed raises, project totals without beneficiary allocations and unsupported financing claims were held for reconciliation.

Production rollback rehearsal reached the expected post-import counts and restored the exact seven-table baseline. Atomic import, idempotent rerun, source integrity, participant-source and duplicate-key checks passed. Full programme remains incomplete; 122 identities now have bounded public-source review dispositions. No publication-gate or UI change.

### 2026-11-03 — funding research checkpoint 11 publication

Rebuild the read-only catalogue from writer commit `aec44822cc4a15dc910b26ba8e2c8c02db00567f`: 247 approved sourced financing/investment events across 131 companies, 586 participations and 481 investor profiles. This checkpoint source-reviewed 20 additional published-landscape identities and imported 19 attributable events for nine companies, including public equity offerings, direct company and beneficiary-level grants, seed and debt financing, employee ownership, and acquisitions. Original currencies, issuer-level allocations, transaction consideration and unknown amounts remain explicit; parent-company acquisition prices, consortium totals, prospective programme funding and unsupported secondary claims were held for reconciliation.

Production rollback rehearsal reached the expected post-import counts and restored the exact seven-table baseline. Atomic import, idempotent rerun, source integrity, participant-source and duplicate-key checks passed. Full programme remains incomplete; 142 identities now have bounded public-source review dispositions. No publication-gate or UI change.


### 2026-11-03 — funding research checkpoint 12 publication

Rebuild the read-only catalogue from writer commit `0a4df3acdb4974dc02e3eff4745dfbcfea5f02d7`: 264 approved sourced financing/investment events across 144 companies, 606 participations and 498 investor profiles. This checkpoint source-reviewed 20 additional published-landscape identities and imported 17 attributable events for thirteen companies, including primary public offerings, company-level equity financings, acquisitions and a signed public grant. Original currencies, primary versus secondary proceeds, acquisition consideration, awarded support ceilings, explicit investor roles and unknown amounts remain distinct; consortium budgets, university-level funding, prospective grants and unsupported secondary claims were held for reconciliation.

Production rollback rehearsal reached the expected post-import counts and restored the exact baseline. Atomic import, idempotent rerun, source integrity, participant-source and duplicate-key checks passed. Full programme remains incomplete; 162 identities now have bounded public-source review dispositions. No publication-gate or UI change.


### 2026-11-03 — funding research checkpoint 13 publication

Rebuild the read-only catalogue from writer commit `d80aab15698617340508a5cb0bd4aa0a7572ee58`: 277 approved sourced financing/investment events across 153 companies, 619 participations and 510 investor profiles. This checkpoint source-reviewed 20 additional published-landscape identities and imported 13 attributable events for eleven companies, including acquisitions, a crowdfunded bond financing, strategic investments, a joint-venture formation and a Series A. Original currencies, acquisition consideration, contingent earn-outs, conflicting instrument descriptions, unnamed investors and unknown amounts remain explicit; aggregate historical totals, offering ceilings, prospective investments and issuer-ambiguous facility funding were held for reconciliation.

Production rollback rehearsal restored the exact baseline; the corrected count assertion, atomic import, idempotent rerun, source integrity, participant-source and duplicate-key checks passed. Full programme remains incomplete; 182 identities now have bounded public-source review dispositions. No publication-gate or UI change.


## Funding research checkpoint 23 — 2026-11-03

- Imported 7 source-audited events for Prometheus UAV, PZL Defence, Leonardo PZL-Świdnik, QinetiQ, Qognifly, Ratel Robotics and Restube.
- Production rollback rehearsal passed before the atomic import; the idempotent rerun produced no duplicates.
- Funding catalogue after import: 404 events across 242 companies, 779 event-investor participations and 609 investor profiles.
- Reviewed 20 additional published European landscape identities (286 of 567 reviewed); unresolved consortium allocations, conditional ownership events and undisclosed guarantees remain explicitly held rather than guessed.
- Audit manifest: [company-funding-research-23-2026-11-03.json](https://github.com/brunotaut/xsonomy-news/blob/main/research-agent/imports/company-funding-research-23-2026-11-03.json)
- Audit report: [2026-11-03-company-funding-research-23.md](https://github.com/brunotaut/xsonomy-news/blob/main/research-agent/reports/2026-11-03-company-funding-research-23.md)


## Funding research checkpoint 24 — 2026-11-03

- Imported 14 source-audited financing, grant, credit and ownership events for 11 companies reviewed in the RETIA–Safran segment.
- Production rollback rehearsal passed before the atomic import; an idempotent rerun produced no duplicates.
- Funding catalogue after import: 418 events across 253 companies, 789 event-investor participations and 614 investor profiles.
- Reviewed 20 additional published European landscape identities (306 of 567 reviewed); group/subsidiary allocations, unrelated same-name projects and aggregate grant histories remain explicitly held rather than guessed.
- Audit manifest: [company-funding-research-24-2026-11-03.json](https://github.com/brunotaut/xsonomy-news/blob/main/research-agent/imports/company-funding-research-24-2026-11-03.json)
- Audit report: [2026-11-03-company-funding-research-24.md](https://github.com/brunotaut/xsonomy-news/blob/main/research-agent/reports/2026-11-03-company-funding-research-24.md)

## Funding research checkpoint 25 — 2026-11-03

- Source commit: [`ab435c46d410ea38e9af5cf6a7b5ef37da46f167`](https://github.com/brunotaut/xsonomy-news/commit/ab435c46d410ea38e9af5cf6a7b5ef37da46f167)
- Imported 16 source-audited financing events across 13 published landscape companies, including 25 event sources and 27 round participations.
- Production rollback rehearsal, atomic import and idempotent rerun passed.
- Verified database totals before rebuild: 434 events, 264 companies with events, 816 round participations and 636 investor profiles.
- Audit report: [company funding research checkpoint 25](https://github.com/brunotaut/xsonomy-news/blob/main/research-agent/reports/2026-11-03-company-funding-research-25.md)

## Funding research checkpoint 26 — 2026-11-03

- Source commit: [`9b9ac5513843731b35928214b66729d70944e3dd`](https://github.com/brunotaut/xsonomy-news/commit/9b9ac5513843731b35928214b66729d70944e3dd)
- Reviewed 20 published landscape identities and imported 15 new source-audited events; equity, grants, debt, acquisitions and conditional commitments remain separate.
- Production rollback rehearsal, atomic import, source-integrity assertions and idempotent rerun passed.
- Verified database totals before rebuild: 449 events, 270 companies with events, 843 round participations and 652 investor profiles.
- Audit report: [company funding research checkpoint 26](https://github.com/brunotaut/xsonomy-news/blob/main/research-agent/reports/2026-11-03-company-funding-research-26.md)

## Funding research checkpoint 27 — 100-company parallel pilot reconciliation — 2026-11-03

- Source commit: [`1d1d6b077c10bfea6a4b5a3b3e89b2f49b5ea6b3`](https://github.com/brunotaut/xsonomy-news/commit/1d1d6b077c10bfea6a4b5a3b3e89b2f49b5ea6b3)
- Reconciled 100 pilot identities: 59 have bounded public-source review dispositions and 41 retain independent second-pass holds.
- Imported 46 new source-audited events and 52 supported participations; grants, debt, equity and secondary ownership transactions remain distinct.
- Production rollback rehearsal restored the exact baseline; atomic import and idempotent rerun passed.
- Verified database totals before rebuild: 495 events, 299 companies with events, 895 round participations and 675 investor profiles.
- First-pass lane timing was not captured, so no concurrency speedup is claimed.
- Audit report: [100-company parallel funding pilot](https://github.com/brunotaut/xsonomy-news/blob/main/research-agent/reports/2026-11-03-funding-parallel-pilot.md)



## Funding research checkpoint 28 — 100-company pilot second pass — 2026-11-03

- Source commit: [`e57e5115765931f2576762fe28c159108d2b6ce9`](https://github.com/brunotaut/xsonomy-news/commit/e57e5115765931f2576762fe28c159108d2b6ce9)
- Completed the second pass for all 41 held identities; all 100 pilot companies now have bounded public-source dispositions.
- Imported 19 supported events across 13 companies and 16 explicitly sourced participant roles; 14 unresolved source limitations remain documented as holds rather than zero-funding claims.
- Production rollback rehearsal, atomic import, post-import integrity checks and idempotent rerun passed.
- Verified database totals before rebuild: 514 events, 312 companies with events, 911 round participations and 681 investor profiles.
- Measured second-pass active time and throughput are recorded without claiming a causal parallel speedup.
- Audit report: [company funding research checkpoint 28](https://github.com/brunotaut/xsonomy-news/blob/main/research-agent/reports/2026-11-03-company-funding-research-28.md)


## Funding research checkpoint 29 — partial-history reconciliation — 2026-11-03

- Source commit: [`fc1ef94c7c39907e4a00f0fc834a599ad1fbf026`](https://github.com/brunotaut/xsonomy-news/commit/fc1ef94c7c39907e4a00f0fc834a599ad1fbf026)
- Reviewed 20 previously partial published-landscape identities and added 40 supported events across 10 companies.
- Added 32 grants, four equity events, three instrument-undisclosed financings and one debt facility, preserving original currencies, date precision and explicit participant roles.
- Production rollback rehearsal, atomic import, post-import integrity checks and idempotent rerun passed.
- Verified database totals before rebuild: 554 events, 312 companies with events, 949 round participations and 689 investor profiles.
- Audit report: [company funding research checkpoint 29](https://github.com/brunotaut/xsonomy-news/blob/main/research-agent/reports/2026-11-03-company-funding-research-29.md)


## Funding checkpoint 30 — 4 November 2026

Six financing events for Griff Aviation and Hecto Drone were imported after production rollback rehearsal and an idempotent atomic import. Database totals are 560 events, 954 participations and 690 investor profiles. Source manifest is research-agent/imports/company-funding-research-30-2026-11-04.json in brunotaut/xsonomy-news, committed as 7d196df56f4bfaa5def5013f1d21bcb907918a1a. Live publication verification is pending.


## Funding checkpoint 31 — 4 November 2026

Granta Autonomy's EUR59,275.78 Erkė development grant and Heliguy's amount-undisclosed SAM equipment grant were imported after production rollback rehearsal and idempotent atomic import. Verified DB totals are 562 events, 956 participations and 692 investor profiles. Manifest commit d522b37060f478c9e2e449649f6ee17f98b0a748 in brunotaut/xsonomy-news. Live verification pending.


## Funding checkpoint 32 — 4 November 2026

Six beneficiary-specific Greenjets grants imported with production rollback rehearsal and idempotent atomic import. Database totals are 568 events, 962 participations and 692 investor profiles. Manifest research-agent/imports/company-funding-research-32-2026-11-04.json in brunotaut/xsonomy-news. Live verification pending.


## Funding checkpoint 33 — 4 November 2026

HAVELSAN HIVEMIND EUR220,000 and MARITIME EUR400,750 beneficiary grants imported after production rollback rehearsal and idempotent atomic import. Database totals are 570 events, 964 participations and 692 investor profiles. Source manifest company-funding-research-33-2026-11-04.json in brunotaut/xsonomy-news. Live verification pending.


## Funding checkpoint 34 — 4 November 2026

Writer source commit 27de54aab831db3670d27bf320c5917408693d19. Harmattan Series B participation evidence added for Bpifrance and Future French Champions. Production rollback rehearsal, atomic import and idempotency verified: 570 events, 966 participations, 693 investor profiles. Rebuild catalogue; live verification pending.


## Funding checkpoint 36 — 4 November 2026

Writer 3231de6fc88bb5c03f576ae7203f6979158fce56. Five Amper historical cash capital increases added after production rollback rehearsal, atomic import and idempotency check. 575 events, 966 participations, 693 investor profiles. Registration dates explicitly qualified; convertible financing holds preserved. Rebuild for publication.


## Funding checkpoint38 — 4 November2026

Writer a8c5b485e9275b95e38ece1d76e564caaf7dff31. Zuri EUR300k2021 financing added after production rollback rehearsal, atomic import and idempotency.576 events,968 participations,695 investor profiles. Instrument and cheque splits remain undisclosed. Rebuild for publication.


## Funding checkpoint40 — 5 November2026

Writer 43a3397e810088d07f9a694bfe486d90625bf396. Specim2017 EUR3.5m Bocap investment added after rollback rehearsal, atomic import and idempotency.577 events,969 participations,696 profiles. Year precision retained; instrument undisclosed. Rebuild catalogue.


## Funding checkpoint45 — 5 November2026

Writer 212e586f478305f1b3d2d82c81df7a64fd85228e. INLEAP pre-seed and Ventis participation added after rollback rehearsal, atomic import and idempotency.578 events,971 participations,697 profiles. Announcement/closing period distinction explicit; amount undisclosed. Rebuild catalogue.


## Funding checkpoint49 — 5 November2026

Writer bd6d46ecceec0c817df8a126bb104a6821fd1813. Manna USD25m2021 Series A and Meteomatics undisclosed2024 strategic round added after production rollback rehearsal, atomic import and idempotency.580 events,978 participations,701 investor profiles. Historical Draper Esprit mapped to existing Molten profile. Rebuild catalogue.


## Funding checkpoint50 — 5 November2026

Writer 7ad70acc4c354b2a5b930a7283981e4167f984fe. Three KrattWorks support allocations and LiveLink OWGP award added after production rollback rehearsal, atomic import and idempotency.584events,981participations,702profiles. Unknown dates/amounts retained, programme totals excluded. Rebuild catalogue.


### Funding research checkpoint 51 — 2026-11-05

Rebuild public catalogue after source-audited Lyocon USD500,000 funded operational debt tranche. Database verified at 585 events, 982 participations and 702 investor profiles; rollback rehearsal and idempotent import passed. Writer checkpoint: 80e106ff479bc6fa1b4b41dd30c4784760964a3a.


### Funding research checkpoint 52 — 2026-11-05

Rebuild for two Lynred CORDIS beneficiary allocations, with predecessor continuity preserved. Production rollback, atomic import and idempotency verified: 587 events, 984 participations, 702 investor profiles. Writer 1a1b98f6dfb942be176e505dd61a59fb61ec956e. Checkpoint51 publication verified before this import.


### Funding research checkpoint 53 — 2026-11-05

Rebuild after source-audited18new events,24new participations and explicit Kitemill precision correction. Production rollback, expected-old correction/reversal, atomic import and idempotency passed:605events,1008participations,705profiles. Writer source commit 374828e09f58994afd5b69619f5efcf6d6be3322. Existing co-lead roles and curated profiles retained.


### Funding checkpoint 54 — 2026-11-05

Rebuild after25source-confirmed events and34new participations. Production rollback, atomic import and idempotency verified at630events,1,042participations,719profiles. Credit limits, bond nominal principal, awards and paid proceeds kept distinct. Writer cee0c4d35319ccaef1c91adb0483b87e74a9eab1.


### Funding checkpoint 55 — 2026-11-05

Rebuild after seven Exail beneficiary grants, one Intelligent Energy operating-company equity issuance, and guarded corrections to Fotokite and Unifly. The rollback rehearsal and import verification passed at 638 events, 1,049 participations and 719 investor profiles. Writer 4a8a6726258f3de1ceda5614b8d930032aa89148.

### 2026-11-05 — funding research checkpoint 56 publication

Writer checkpoint `ec143702ef0d7a707ba9429173e162b27caadad8` added Greenjets' completed USD7m Pre-Series A and six assigned Latvian grants for FIXAR-AERO SIA. It added five source-backed company–investor relationships and corrected two historical disclosures from original transaction-party sources. Production rollback restored the pre-import baseline, and the atomic import and idempotency checks returned 645 approved events across 314 companies, 1,063 event participations and 729 investor profiles.


### 2026-11-07 — Unifly source correction

Writer commit 36382fda2ddc87412690c06daf3a09254a123e47 corrects the existing 2016 Series A to EUR5m and its public announcement date to 21 November 2016. Original issuer press release confirms completion and distinguishes the 17 November signing. Production rollback and idempotent atomic correction succeeded.


### 2026-11-08 — Unifly PMV loan disclosure

Writer commit 6b12437fde366d52658baa4789a4fd5c2eb31064 imported PMV's historical loan disclosure for Unifly with undisclosed amount and terms. The public announcement date is distinguished from the 2018 lending year. The tested importer passed production rollback and idempotent atomic application. Rebuild the existing read-only catalogue to publish the source-backed record.


### 2026-11-08 — Infini portfolio relationship

Writer c8161348cb36da9bd086d2dcec4b03541211e36b adds Infini's original-source portfolio relationship with FlyTech UAV after production rollback and idempotent atomic import. Round date and individual contribution remain undisclosed.


### 2026-11-08 — Indra and INLEAP financing

Writer 8630bff89ed4db1589fd3a71587313da8dd83f81 adds Indra's signed EUR385m EIB loan, with drawdown undisclosed, and HTGF's explicitly confirmed lead role in the existing INLEAP pre-seed. Original lender and investor sources verified. Production rollback restored prior state and repeated atomic application was idempotent.


### 2026-11-08 — Jenoptik original-currency financing

Writer dc84b53fbb85b66b49f94d90f4aa0f758f984f7f adds EUR350m and USD59m components of one 2021 promissory-note issuance, preserving original currencies and shared-issuance context. Production rollback and atomic idempotency passed. Existing December2021 revolving facility remains separate.


### 2026-11-08 — Kitemill investor relationships

Writer 266ab428dba9662b049393a17dd6545f2eb79420 adds issuer-confirmed Expanding Dreams BV and Jérôme Guillet portfolio relationships, preserving undisclosed dates and cheque sizes. Tested importer production rollback restored baseline and atomic idempotent application succeeded.

### 2026-11-09 — Leonardo and Manna financing

Writer f310ec85983437edf295f3be7d3e1eddfa29c9b2 adds the signed EUR600m Leonardo term loan and the 2023 disclosure of Coca-Cola HBC's investment in Manna, with amount and transaction date undisclosed. Production rollback restored the baseline and the atomic replay preserved existing events.

### 2026-11-09 — Published funding follow-ups

Writer 55b43853f160118a0ebb34cd5bcc9c2b8dd9d7da adds 23 verified financing events, corrects RESTUBE’s crowdfunding instrument and documents the termination of ScoutDI’s proposed acquisition. It adds the sourced Series C2 investor and preserves existing event amounts. Production rollback and atomic replay passed.

### 2026-11-09 — Funding securities and grants

Writer a0698c02d56fe8ed497b406660bcda81de9c5861 adds 26 sourced financing events and revises four existing records, including Sensofusion’s final primary IPO proceeds and three Innovate UK beneficiary grant offers. The production rollback rehearsal restored the baseline, and the atomic import replay passed.

### 2026-11-09 — sees.ai beneficiary award precision

Writer a5007ab261ab5fdeb4a79cd56796b5fecb296a80 records two sees.ai grant offers to the penny from the Innovate UK workbook, retaining event IDs and all participant links. A rollback rehearsal and atomic replay passed.

### 2026-11-09 — Prepared funding reconciliations

Writer 05de12faa6b7e80839ce37123b10f750f01da0cd adds 30 source-backed financing and ownership events and corrects three existing records using original contracts and an issuer prospectus. Production rollback restored the baseline and atomic importer replay passed.

### 2026-11-09 — Published-company funding evidence

Writer 2c4ed3903ca623b1f42caf08eee276a82290214b adds 43 evidenced financing and ownership events and updates an existing Threod Systems grant to its original award amount. Contractual capacities and offers are identified separately from proceeds. Production rollback restored the baseline and the atomic importer replay passed.

### 2026-11-09 — Landscape financing follow-ups

Writer 9fd1b149e13867fd7205cb6d106147c64c6f638c adds 28 source-backed financing and ownership events after checking the prior production baseline, rehearsing rollback and verifying an atomic importer replay. Grant limits, nominal bond principal and ownership consideration are distinguished from proceeds.

### 2026-11-09 — Issuer funding reconciliation

Writer da154a71d932dac45df84f270a886351c409b6fc adds 32 source-backed events, corrects two existing grant facts and links FirstMark to the existing Harmattan Series B. Beneficiary allocations, nominal facility limits and offers are distinguished from paid proceeds. Production rollback and atomic importer replay passed.

### 2026-11-09 — issuer and grant funding publication

The investment research import added 91 source-checked financing events. Production rollback and importer replay passed. The build reads 925 approved events, 1131 event participation links and 752 approved investor profiles. The manifest and audit checkpoint are in [xsonomy-news at 5d59feeedd1a](https://github.com/brunotaut/xsonomy-news/tree/5d59feeedd1af0e89ea96892f275acf405835c19/research-agent).

### 2026-11-09 — funding award follow-up publication

The source audit added 47 financing events and refined the public announcement date on one existing investment. The production rollback rehearsal and guarded date reversal passed. This rebuild reads 972 approved events, 1139 participation links and 755 investor profiles. The manifest and audit are in [xsonomy-news](https://github.com/brunotaut/xsonomy-news/tree/7e3ba9ee1ca58e2faa18526cb8abe48af339dc93/research-agent).

### 2026-11-09 — industry financing evidence publication

The source audit added 58 financing records and refined three existing records. Production rollback, importer replay and guarded field reversal passed. The rebuild reads 1030 approved events, 1153 participation links and 757 investor profiles. The [writer checkpoint](https://github.com/brunotaut/xsonomy-news/tree/3ddcb0e4c04bf588accd2343f7409b5a7a92c86b/research-agent) contains the manifest and audit.

### 2026-11-10 — published-landscape funding reconciliation

The source audit reconciled 20 published identities and added eight verified financing events with seven participation links. Subsidiary financing, consortium totals and unsupported secondary amounts remain explicit holds. Production rollback, importer replay and atomic count checks passed. The rebuild reads 1038 approved events, 1160 participation links and 761 approved investor profiles. The [writer checkpoint](https://github.com/brunotaut/xsonomy-news/tree/dd3dbac5b9332cc9080a7b3453214cb16b7aeabd/research-agent) contains the manifest and audit.

### Funding evidence refresh — 2026-11-10

- Source checkpoint: [`f574972ae861`](https://github.com/brunotaut/xsonomy-news/commit/f574972ae861e924f0327fe48e3486c382eaaba6). Production rehearsal restored the baseline, then the atomic importer verified 24 new events and 21 source-backed participation links. This entry triggers the existing catalogue build.


### 2026-11-11 — Publish verified funding research

Nazar authorised a minimal catalogue write to trigger the existing build, without schedule changes. Source audit: research-agent/reports/2026-11-11-funding-landscape-ninth-night.json in brunotaut/xsonomy-news. Production rollback and atomic imports verified; expected 1,587 approved funding events, 1,380 participations and 820 investor profiles. Publish approved records only and retain the four exact funding exclusions. Live publication must be verified after deployment.


### 2026-11-11 — Verified tenth funding import

Nazar's explicit permission allows this minimal publication trigger without schedule changes. Source commit `12fd37c444f14eabc4dd05ad863b026f3ceb612d` in xsonomy-news contains three supported events and two guarded corrections, tested by repeated production rollback and atomic import. Previous21 manifests verified live:511 approved event records,9 withheld records and289 participation links. This build should add two INCAS funded participations and expose corrected Motion/Samel semantics; 2Excel is outside landscape membership and remains a DB fact. Expected landscape1,589 events/1,380 links and investor directory821 profiles; global approved DB events1,590. Verify live after deployment.


### 2026-11-11 — Verified eleventh funding import

Nazar's explicit permission allows this minimal publication trigger without schedule changes. Source commit `a5983d149d1712d09d2b5a6d3f089c8685e29c56` in xsonomy-news checkpoints 21 company reviews, 28 new approved events, one guarded Hecto correction, 19 round links, four generic investor relationships, 19 investor profiles and 33 source rows. Production rollback rehearsal, atomic import, repeated idempotency run and post-import audits passed; global approved DB counts are 1,618 events, 1,400 round links, 840 investor profiles and 365 funded companies. The 28 new events are outside the 567-company published landscape; the build should retain 1,589 landscape events and 1,380 landscape links while publishing the corrected Hecto amount and refreshed investor directory. Verify live after deployment.


### 2026-11-11 — Verified twelfth funding import

Nazar's explicit permission allows this minimal publication trigger without schedule changes. Source commit `3e2dd0d782e8e57fa4f0179da897ded437dcc80b` in xsonomy-news checkpoints 24 wider-cohort reviews, 29 new approved events, 56 round links, seven generic investor relationships, 46 investor profiles and 51 source rows. Production repeated-import rollback, atomic import and post-import value/source/participant/preservation audits passed; global approved DB counts are 1,647 events, 1,456 round links, 886 investor profiles and 378 funded companies. All 29 new events belong to wider-cohort issuers outside the 567-company published landscape, so the build should retain 1,589 landscape events and 1,380 landscape links while refreshing the investor directory to 886 profiles. Verify live after deployment.

### 2026-11-11 — Verified thirteenth funding import

Nazar's explicit permission allows this minimal publication trigger without schedule changes. Source commit `1f97d729e96420e46dd03781a1648794424e407c` in xsonomy-news checkpoints 24 wider-cohort reviews, 46 new approved events, 76 round links, 43 investor profiles and 56 source rows. Production repeated-import rollback, atomic import and post-import value/source/participant/preservation audits passed; global approved DB counts are 1,693 events, 1,532 round links, 929 investor profiles and 395 funded companies. All 46 new events belong to wider-cohort issuers outside the 567-company published landscape, so the build should retain 1,589 landscape events and 1,380 landscape links while refreshing the investor directory to 929 profiles. Verify live after deployment.


### 2026-11-11 — Verified fourteenth funding import

Nazar's explicit permission allows this minimal publication trigger without schedule changes. Source commit `57fa95610342412b6e202e9227554e144c0ae90a` in xsonomy-news checkpoints 24 wider-cohort reviews, 34 new approved events, 91 round links, 59 investor profiles and 43 source rows. Production repeated-import rollback, atomic import and post-import count audits passed; global approved DB counts are 1,727 events, 1,623 round links, 988 investor profiles and 405 funded companies. All 34 new events belong to wider-cohort issuers outside the 567-company published landscape, so the build should retain 1,589 landscape events and 1,380 landscape links while refreshing the investor directory to 988 profiles. Verify live after deployment.

## Funding research publication trigger — fifteenth wider-cohort batch (2026-11-11 15:06 UTC)

Source checkpoint `90fa507ca9591150198c2e58214530a726bd88aa` imported 38 approved funding events, 49 round links, 31 investor profiles and 44 source rows after a production rollback rehearsal. Global approved database counts are now 1,765 events, 1,672 round links, 1,019 investor profiles and 420 companies with partial funding coverage. All 38 new events belong to wider-cohort issuers outside the 567-company published landscape; the existing build should therefore retain the landscape event/link totals while publishing the refreshed investor directory. No schedules or build logic changed.

- 2026-11-11 16:08 UTC — Triggered sixteenth source-audited funding publication build (68 approved events; wider-cohort batch).

- 2026-11-11T17:20:00Z — Triggered existing production build after the seventeenth audited funding import (60 approved events; no schedule changes).

- 2026-11-11T18:20:00Z — Triggered existing production build after the eighteenth source-audited funding import (28 approved events, 76 round links, 53 investor profiles and two generic investor relationships; no schedule changes).

- 2026-11-11T19:01:00Z — Triggered existing production build after the nineteenth source-audited funding import (71 approved events, 211 round links and 161 investor profiles; no schedule changes).

- 2026-11-11T20:19:52Z — Triggered existing production build after the twentieth source-audited funding import (41 approved events, 41 round links and 27 investor profiles; no schedule changes).

- 2026-11-11T21:47:35Z — Recovery trigger for the already-imported twentieth funding batch after workflow #388 remained queued with zero jobs; verified all 41 manifest rounds approved in Supabase; no schedule or build-logic changes.
- 2026-11-11T22:01:40.899Z: funding publication refresh requested for xsonomy-news checkpoint 519d58b1d61ed75c7f605d61c6dd82bb665a6a20 (twenty-first manifest; schedules unchanged).

- 2026-11-11T23:02:42.239Z: funding publication refresh requested for xsonomy-news checkpoint 518ceb1163c4b9695083fdf697a01008a38a2f47 (twenty-second manifest: 27 approved events, 45 round links, 41 investor profiles and three generic relationships; schedules unchanged).
- 2026-11-12T00:02:08.380Z — Funding research twenty-third batch: source checkpoint `2921c7a1276591ceee816422a9e5348c351f6156`; 29 approved events, 47 round-participation links, 13 verified ownership/portfolio relationships, 23 new investor profiles, and 45 event-source rows. Production rollback rehearsal, atomic import, post-import idempotency rehearsal and database audit passed; rebuilding to publish the verified data.

- 2026-11-12T01:10:20.478Z — Funding research twenty-fourth batch: source checkpoint `a8c3107a06e74f77820bccaf46fb607da850e483`; 52 approved events, 74 round-participation links, eight verified ownership/portfolio relationships, 53 new investor profiles, and 85 event-source rows. Production rollback rehearsal, atomic import, post-import idempotency rehearsal and database audit passed; rebuilding to publish the verified data. Schedules unchanged.

- 2026-11-12T02:04:52.569Z — Funding research twenty-fifth batch: source checkpoint `51845bcf81e76582a85366abf9ce632ae79142ad`; 41 approved events, 49 round-participation links, four verified ownership/portfolio relationships, 24 new investor profiles, and 58 event-source rows. Production rollback rehearsal, atomic import, post-import idempotency rehearsal and database audit passed; rebuilding to publish the verified data. Schedules unchanged.

- 2026-11-12T03:06:50.688Z — Funding research twenty-sixth batch: source checkpoint `15537519134061b54002908679ca1fbaf0bcf693`; 39 approved events, 72 round-participation links, four verified ownership/portfolio relationships, 43 new investor profiles, and 48 event-source rows. Production rollback rehearsal, atomic import, post-import idempotency rehearsal and database audit passed; rebuilding to publish the verified data. Schedules unchanged.

- 2026-11-12T03:54:40.094Z — Funding research twenty-seventh batch: source checkpoint `fe4db278a35c9b94d1f92f16d7daddc12cab7c2b`; 34 approved events, 31 round-participation links, three verified ownership/portfolio relationships, 18 new investor profiles, and 38 event-source rows. Production rollback rehearsal, atomic import, post-import idempotency rehearsal and database audit passed; rebuilding to publish the verified data. Schedules unchanged.

- 2026-11-12T05:04:21.311Z — Funding research twenty-eighth batch: source checkpoint `71fb28d3e1998495432cd1765142940d13696cc2`; 26 approved events, 32 round-participation links, sixteen verified ownership/portfolio relationships, 26 new investor profiles, and 34 event-source rows. Production rollback rehearsal, atomic import, post-import idempotency rehearsal and database audit passed; rebuilding to publish the verified data. Schedules unchanged.

- 2026-11-12T06:02:03Z — Funding research twenty-ninth batch: source checkpoint `6d30fb3527748b420135aebf7b8834e1d8279308`; 67 approved events, 74 round-participation links, four verified ownership/portfolio relationships, 33 new investor profiles, and 89 event-source rows. Production rollback rehearsal, atomic import, post-import idempotency rehearsal and database audit passed; rebuilding to publish the verified data. Schedules unchanged.

- 2026-11-12T07:03:38Z — Funding research thirtieth batch: source checkpoint `f36ca5fa690a0fd450dccfbdfb63296ad61016ca`; 37 approved events, 61 round-participation links, thirteen verified ownership/portfolio relationships, 27 new investor profiles, and 54 event-source rows. Production rollback rehearsal, atomic import, post-import idempotency rehearsal and database audit passed; rebuilding to publish the verified data. Schedules unchanged.

- 2026-11-12T08:14:13.632Z — Funding research thirty-first batch: source checkpoint `8e38be5a25e73a60522e0c2a029d746b49abeabd`; 65 approved events, 121 round-participation links, ten verified ownership/portfolio relationships, 69 new investor profiles, and 110 event-source rows. Production rollback rehearsal, atomic import, post-import idempotency rehearsal and database audit passed; rebuilding to publish the verified data. Schedules unchanged.

- 2026-11-12T08:59:52.254Z — Funding research thirty-second batch: source checkpoint `4e125c68d9d0100a310bdd9d3d0194c2ad1f505d`; 39 approved events, 77 round-participation links, nine verified ownership/portfolio relationships, 49 new investor profiles, and 54 event-source rows. Rollback rehearsal, atomic import, idempotency and database audit passed; schedules unchanged.

- 2026-11-12T10:04:57.684Z — Funding research thirty-third batch: source checkpoint `0e228a43c0a47c4bd77bac5186b736eec562aa62`; 38 approved events, 48 round-participation links, six verified ownership/portfolio relationships, 35 new investor profiles, and 55 event-source rows. Rollback rehearsal, atomic import, idempotency and database audit passed; schedules unchanged.
