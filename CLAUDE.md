# xSonomy (catalogue) — Claude Code brief

Read this first, then `docs/STATUS.md`. Update STATUS.md at the end of every session (`/wrap-up`).
System-wide architecture lives in the sister repo: `xsonomy-news/docs/ARCHITECTURE.md`.

## What this repo is
The **public catalogue site** at xsonomy.com — companies and products (UAVs, sensors / counter-UAS) built as a
static site on GitHub Pages from the shared Supabase database. **This repo only reads the DB.** All data
collection, entity extraction and enrichment happen in `brunotaut/xsonomy-news`.

- Owner: Nazar — marketing background, **not a developer**. Explain in plain English, propose before acting.
- DB: Supabase project `uobidcahmrmfdmfbrtkt`. Build uses `SUPABASE_SERVICE_KEY` server-side only; no key reaches the browser.

## How it builds
- `scripts/generate-supabase.mjs` — **the live generator.** Reads `products` (with `specs` JSONB, category `uav` / `sensors`), writes per-category JSON, SEO product pages at `/<category>/<slug>/`, sitemap, robots, copies `src/` → `public/`. `PUBLISH_STATUS` at top: `null` = all rows, `"live"` = only `publication_status='live'`.
- `.github/workflows/deploy.yml` — daily 06:00 UTC + on push + manual → builds with `generate-supabase.mjs` → deploys `public/` to Pages.
- `src/assets/app.js` (+ `companies.js`, `companies.css`) — client-side search/filter grid. `CONFIG` in `app.js` controls filters/tags per category.

## Legacy (Airtable era — safe to delete once confirmed unused)
- `scripts/generate.mjs` (Airtable generator), `scripts/migrate-products-to-supabase.mjs` + `migrate-products.yml` (one-off Airtable→Supabase), `src/assets/app.js.bak`, `AIRTABLE_TOKEN` secret. README still says "Airtable is the database" — it is not.

## Env / secrets
`SUPABASE_URL` (hard-coded in workflow), `SUPABASE_SERVICE_KEY` (secret). Local: `.env`. Never commit keys.

## Working rules
1. Never write to Supabase from this repo. If a data fix is needed, do it in `xsonomy-news` or via the Supabase SQL editor and log it there.
2. `public/` is a build artefact — never hand-edit; run `npm run build:supabase` and preview with `npx serve public`.
3. Keep product/company URLs stable (`slug`) — they are indexed by Google.
4. Any change to which rows are public (`PUBLISH_STATUS`) is a decision — ask Nazar and log it in STATUS.md.
5. Commit small, plain-English messages.

## Commands
`npm run build:supabase` · `npx serve public`
