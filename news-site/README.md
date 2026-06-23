# xSonomy — UAV & Counter-Drone news feed

A daily, fully-automated news feed for xSonomy. A scheduled job polls ~40 proven
defence / drone-industry outlets, keeps only UAV-relevant items, tags them, and stores
them in **Supabase (Postgres)**. A static site (GitHub Pages) renders the recent feed and
queries Supabase live for search, tag filters and the full archive. Every card links back
to the original source — xSonomy aggregates headlines, it doesn't host the articles.

## Architecture

```
 GitHub Actions (cron, 24h)
        │
        ├─ ingest.mjs ── fetch RSS (sources.json) → parse → relevance gate → tag → upsert ─┐
        │                                                                                   ▼
        │                                                                          Supabase (Postgres)
        │                                                                                   │
        └─ generate.mjs ── pull recent window ──► build ./public ──► deploy to GitHub Pages ◄┘ (client also
                                                                                                queries Supabase
                                                                                                for archive/search)
 backfill.mjs (manual) ── crawl each outlet's sitemaps for ~300 days → OG meta → same path ──► Supabase
```

- **Storage**: Supabase. Images are **not** stored — we keep the source's image URL and hotlink it.
- **Relevance**: specialist drone outlets pass everything; general defence outlets must mention a UAV/drone keyword (`scripts/lib/enrich.mjs`).
- **Tags**: keyword-mapped to themes — `counter-uas`, `critical-infra`, `eu-regulatory`, `c2-sensors`, `contract-intel`, `ukraine`, `swarm`, `maritime` — plus the feed's own categories and a region tag.
- **Dedup**: canonical URL (UTM/`www`/trailing-slash stripped) is the unique key; re-running never creates duplicates.

## Files

| Path | What it does |
|------|--------------|
| `sources.json` | The 40 outlets (RSS URL, specialist flag, theme hints). Edit to add/remove media. |
| `db/schema.sql` | Supabase table + indexes + RLS read policy. Run once. |
| `scripts/ingest.mjs` | Daily RSS ingest → Supabase. |
| `scripts/backfill.mjs` | One-time historical crawl via sitemaps. |
| `scripts/generate.mjs` | Builds the static site into `./public`. |
| `scripts/lib/*` | RSS/Atom parser, enrichment, Supabase REST, sitemap/OG scraper. |
| `src/` | Frontend (index template, CSS, client JS). |
| `.github/workflows/` | `ingest-and-deploy.yml` (daily) + `backfill.yml` (manual). |

---

## One-time setup (your steps)

### 1. Create the Supabase project
1. Sign up at supabase.com → **New project** (free tier is fine).
2. **SQL Editor → New query** → paste all of `db/schema.sql` → **Run**.
3. **Project Settings → API** — copy three values:
   - `Project URL` → `SUPABASE_URL`
   - `anon` `public` key → `SUPABASE_ANON_KEY` (safe to ship to the browser)
   - `service_role` key → `SUPABASE_SERVICE_KEY` (**secret**, server-side only)

### 2. Put this folder in a GitHub repo
Either commit `news-site/` into your existing site repo (the workflows already scope
themselves to `news-site/**`), or push it as its own repo.

### 3. Add repo Secrets and Variables
*Repo → Settings → Secrets and variables → Actions.*

**Secrets** (encrypted):

| Name | Value |
|------|-------|
| `SUPABASE_URL` | your Project URL |
| `SUPABASE_ANON_KEY` | anon public key |
| `SUPABASE_SERVICE_KEY` | service_role key |

**Variables** (plain):

| Name | Value (example) |
|------|-----------------|
| `SITE_URL` | `https://news.xsonomy.com` (no trailing slash) |
| `HOME_URL` | `https://xsonomy.com/` |
| `NEWS_CNAME` | `news.xsonomy.com` *(only if using a custom domain)* |

### 4. Enable Pages
*Repo → Settings → Pages → Build and deployment → Source = **GitHub Actions**.*
If using a subdomain, add a DNS `CNAME` record `news` → `<your-user>.github.io`.

### 5. Backfill the archive (one-time)
*Actions tab → "Historical backfill (manual)" → Run workflow* (days `300`, max per source `300`).
This is slow (crawls sitemaps + fetches article pages). Re-runnable safely.

### 6. Done — it runs itself
The daily workflow ingests new items, rebuilds, and redeploys at 05:00 UTC. You can also
trigger "Ingest & deploy news" manually anytime.

---

## Local development
```bash
cp .env.example .env     # paste your Supabase values
npm test                 # offline parser/tagger tests (no network)
npm run ingest:dry       # fetch + filter, print what WOULD be stored, no writes
npm run ingest           # real ingest into Supabase
npm run build            # build ./public
npx serve public         # preview
```

## Tuning
- **Add/remove outlets**: edit `sources.json`. Set `"specialist": true` to keep every item from a drone-only outlet; `false` applies the UAV keyword gate.
- **Relevance / tags**: keyword lists in `scripts/lib/enrich.mjs`.
- **Daily look-back window**: `INGEST_MAX_AGE_DAYS` (default 14).
- **Sources without RSS** (`"rss": null` — currently Försvarets forum SE, Yle, C4Defence): covered by the sitemap backfill only; add a feed URL if you find one.

## Notes & caveats
- **RSS depth**: feeds carry only the latest ~20–100 items, which is why history comes from the sitemap backfill, not RSS.
- **Hotlinked images** can break if a publisher blocks hotlinking or changes URLs; the UI falls back to a placeholder tile.
- **Aggregation hygiene**: only headline + short summary + image + backlink are stored — never full article text.
- **Supabase free tier** pauses a project after ~1 week of inactivity; the daily job keeps it awake. At ~5–10 new items/day plus the backfill you stay well within the free 500 MB.
