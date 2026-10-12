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

