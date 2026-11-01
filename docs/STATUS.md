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
