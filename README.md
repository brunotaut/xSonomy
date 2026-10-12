# xSonomy — catalogue site

The public catalogue at **[xsonomy.com](https://xsonomy.com)**: companies and products across
unmanned systems — UAVs, counter-UAS, sensors, software. A static site on GitHub Pages, built
from a shared Supabase database.

**This repo only reads the database.** Collection, entity extraction and enrichment all happen in
the sister repo [`brunotaut/xsonomy-news`](https://github.com/brunotaut/xsonomy-news), which also
publishes the news feed at [uav360.xyz](http://uav360.xyz/).

## How a product becomes a page

1. `scripts/generate-supabase.mjs` reads `products` (with its `specs` JSONB), the taxonomy
   (`product_taxonomy_view`) and the news links (`article_products` + `articles`).
2. It writes `public/`: one JSON file per category for the client-side grid, an SEO page per
   product at `/<category>/<slug>/`, company pages, a sitemap and `robots.txt`.
3. `.github/workflows/deploy.yml` runs that build daily at 06:00 UTC, on every push to `main`,
   and on demand — then deploys `public/` to GitHub Pages.

The browser never talks to Supabase. The service key is used at build time only.

## Commands

```bash
npm run build:supabase     # build public/ from Supabase
npx serve public           # preview the built site
npm run images:find        # look for photos for products that lack one
npm run images:accept -- 0 3 7   # publish reviewed candidates (see below)
```

Local builds need a `.env` with `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` (copy `.env.example`).
In CI both come from repository secrets.

## Product images

Photos come from a curated manifest, `data/product-images.json`, not from the database —
`products.image_url` only ever held expired links. Each entry carries its licence and author,
and product pages render that credit, which CC BY / CC BY-SA require.

Images are **not** added automatically. The weekly `find-images` workflow proposes candidates
and writes a contact sheet; a person has to look at them before anything is published, because
roughly half of automatic name matches are a different thing with the same name — an F/A-18 for
"Hornet", a Pentax camera for "K1000". See `docs/STATUS.md` for the measured numbers.

| File | Meaning |
|---|---|
| `data/product-images.json` | published photos, with licence and author |
| `data/image-candidates.json` | awaiting review — not on the site |
| `data/image-rejected.json` | reviewed and refused; never proposed again |
| `data/image-searched.json` | searched, no article found; retried after 180 days |

## Layout

```
scripts/generate-supabase.mjs   the build
scripts/find-images.mjs         weekly image search (proposes only)
scripts/accept-images.mjs       promote reviewed images
src/                            static assets + the catalogue shell, copied into public/
data/                           curated data this repo owns
docs/STATUS.md                  running log — read this before picking up work
public/                         build output, never edited by hand
```

## Conventions

- Never write to Supabase from here. Data fixes belong in `xsonomy-news` or the SQL editor.
- `public/` is a build artefact — change `src/` or the generator instead.
- Product and company URLs are derived from `slug` and are indexed by Google; keep them stable.
- Update `docs/STATUS.md` at the end of a session.
