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
- **Discontinued is off by default** (`UAV_CFG.hideStatus`): those 84 products are excluded until
  the Discontinued box is ticked. Ticking it then behaves like any other facet option — it shows
  *only* discontinued, not "everything plus discontinued".


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

