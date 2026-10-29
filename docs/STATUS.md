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
