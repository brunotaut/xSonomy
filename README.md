# xSonomy catalogue (static site)

Stage 1 catalogue frontend. **Airtable is the database**; this repo builds a static
site from it and hosts it free on **GitHub Pages**. Search and filtering run entirely
client-side — nothing hits Airtable when a visitor loads the page.

## How it works

1. `scripts/generate.mjs` fetches rows from the two Airtable tables (`Listings` →
   `radar` / `acoustic`, `UAVs` → `uav`) and, for each:
   - writes per-category JSON for the client-side grid,
   - **downloads its image** into `public/images/` (Airtable URLs expire, so we never
     link to them directly),
   - generates a **real, crawlable HTML page** at `/<category>/<slug>/` with its own
     `<title>`, meta description, OpenGraph image, and Product JSON-LD (SEO).
2. It also writes `sitemap.xml`, `robots.txt`, and a crawlable product index on the
   homepage, then copies the front-end (`src/`) into `public/`.
3. `src/assets/app.js` loads the JSON and renders the searchable/filterable grid.
   Cards link to the static per-product pages (no pop-up). The only outbound action
   is the product's **Website** link.
4. GitHub Actions builds and deploys `public/` to GitHub Pages — daily, on manual
   trigger, and on push. `public/CNAME` keeps the `xsonomy.com` custom domain.

## Publish gate
`PUBLISH_STATUS` at the top of `scripts/generate.mjs`:
- `null` (default) — publish every row (review-stage; matches the current live site).
- `"Live"` — publish only rows whose Airtable **Status = Live** (the human gate).

Flip it to `"Live"` once you're approving rows in Airtable.

## One-time setup
1. **Airtable token** → repo *Settings → Secrets and variables → Actions → New
   repository secret*, named `AIRTABLE_TOKEN` (scoped to this base, `data.records:read`).
2. **Pages** → *Settings → Pages → Build and deployment → Source = GitHub Actions*.
3. **Custom domain** → *Settings → Pages → Custom domain* = `xsonomy.com`.
4. Push to `main`; the workflow builds and deploys.

## Switching the live site to this build (cutover)
The site currently runs the older React build. To replace it with this one **in the
same repo** (keeps your domain, DNS, and `AIRTABLE_TOKEN`):
1. In your repo clone, delete the old files (`build/`, `index.html`, `template.html`,
   `DEPLOY.md`, `SETUP-GITHUB.md`, the old `.github/workflows/deploy.yml`, `.gitignore`).
2. Copy **everything from this `catalogue-site/` folder** into the repo root
   (`scripts/`, `src/`, `package.json`, `.github/workflows/deploy.yml`, `.gitignore`,
   `.env.example`, `README.md`).
3. Commit & push. `AIRTABLE_TOKEN` and Pages settings already exist, so the workflow
   runs, builds, and republishes `xsonomy.com` from this build.

## Local build
```bash
cp .env.example .env      # paste your token into .env
npm run build             # writes ./public  (index.html, /uav, /radar, /acoustic, images, sitemap.xml)
npx serve public          # open the printed URL
```

## Configuration
- Base/table IDs + publish gate: top of `scripts/generate.mjs`.
- Filters, search, card tags per category: `CONFIG` in `src/assets/app.js`.
- Fields hidden from the public detail page: `HIDDEN` in `scripts/generate.mjs`.
