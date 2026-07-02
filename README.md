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

### 2. Put this in its OWN GitHub repo
Because the news feed is served from a **subdomain** (`news.xsonomy.com`), it needs its
own repo — one repo's GitHub Pages can only serve one site, and GitHub only runs workflow
files that live at `.github/workflows/` in the **repo root** of the default branch.

So create a new repo (e.g. `xsonomy-news`) and put the **contents** of this `news-site`
folder at the repo root — i.e. `.github/`, `scripts/`, `src/`, `db/`, `sources.json`,
`package.json` etc. should sit at the top level, NOT inside a `news-site/` subfolder.
After pushing to `main`, "Ingest & deploy news" appears in the **Actions** tab.

### 3. Add repo Secrets and Variables
*Repo → Settings → Secrets and variables → Actions.*

**Secrets** (encrypted):

| Name | Value |
|------|-------|
| `SUPABASE_URL` | your Project URL |
| `SUPABASE_ANON_KEY` | anon public key |
| `SUPABASE_SERVICE_KEY` | service_role key |
| `ANTHROPIC_API_KEY` | Claude API key from console.anthropic.com (entity tagging). Optional — if omitted, ingest still runs and the companies/products pass is skipped. |

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

### 5b. Backfill companies/products over old articles (one-time)
*Actions tab → "Analyze backfill (manual)" → Run workflow.* Runs the LLM entity pass over
every article with `analyzed_at IS NULL`, filling `companies`/`products`. **Resumable** —
each row is stamped when done, so you can stop and re-run to continue, or cap a run with the
`max` input. Needs the `ANTHROPIC_API_KEY` secret. It does not deploy; run "Ingest & deploy
news" (or wait for the daily run) afterwards to publish the chips. Locally: `npm run analyze:backfill`.

### 5c. Enrich the company catalogue (one-time)
*Actions tab → "Enrich companies (manual)" → Run workflow.* Fills `public.companies`
profile + financial fields from Claude's training knowledge only (no web). Guardrails:
never overwrites curated values, leaves uncertain fields NULL (don't trust it to know
financials/CAGE/sanctions for small firms), records a `confidence` level, stamps
`enrichment_status='llm'`, and leaves `publication_status='draft'` for review. **Resumable.**
Needs `ANTHROPIC_API_KEY`. Locally: `npm run enrich:companies` (or `npm run enrich:companies:dry`
for a no-write sample). Review drafts before flipping any to `published`.

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

## Email digest

A **daily digest Tue–Fri at 07:00 UTC**, plus a **weekly roundup Monday 07:00 UTC**
(no daily on Monday, nothing on weekends). Items are grouped by theme and sent via
**Resend**. Each recipient can be filtered to only the topics they care about, every
email carries an unsubscribe link + `List-Unsubscribe` header, and empty days send nothing.

Setup:
1. Sign up at resend.com → **Add domain** → verify `xsonomy.com` (add the DNS records they show). This lets you send from `news@xsonomy.com`. *(To test before verifying, use `DIGEST_FROM=onboarding@resend.dev`.)*
2. **API Keys → Create** → copy the key.
3. In the repo, add **secret** `RESEND_API_KEY`, **variable** `DIGEST_FROM` (e.g. `xSonomy News <news@xsonomy.com>`), and optionally `DIGEST_UNSUBSCRIBE` (defaults to `news@xsonomy.com`).
4. **Recipients & per-person filters**: copy `recipients.example.json` → `recipients.json`, edit, and commit it. Each entry is `{ "email": "...", "tags": [...] }`; an empty `tags` array means *everything*, otherwise the person only gets items carrying one of those tags. (No file? It falls back to the `DIGEST_RECIPIENTS` JSON variable, then to a plain `DIGEST_TO` list.)
5. The `Email digest` workflow runs on the schedule above. Trigger it manually anytime from the Actions tab (choose `day` or `week`).

**Unsubscribe**: there's no subscriber database — the link is a `mailto:` that asks to be removed, and you delete that address from `recipients.json`. Gmail/Apple Mail also show a one-click unsubscribe from the `List-Unsubscribe` header.

Local: `npm run digest:dry` writes a per-recipient `public/_digest_*.html` preview without sending; `npm run digest` sends the daily one.

## Tuning
- **Add/remove outlets**: edit `sources.json`. Set `"specialist": true` to keep every item from a drone-only outlet; `false` applies the UAV keyword gate.
- **Relevance / tags**: keyword lists in `scripts/lib/enrich.mjs`.
- **Companies & products (LLM)**: extracted per-article in `scripts/lib/analyze.mjs` (Claude). It reads the full article body, falls back to title+summary if the page can't be fetched, and writes the `companies` / `products` arrays. Each row is stamped `analyzed_at`, so the daily run only analyzes new/unanalyzed items and retries past failures. Knobs: `ANTHROPIC_MODEL`, `ANALYZE_MAX` (per-run cost cap, default 80), `ANALYZE_CONCURRENCY` (default 4). Skip it with `npm run ingest -- --no-analyze`.
- **Daily look-back window**: `INGEST_MAX_AGE_DAYS` (default 14).
- **Sources without RSS** (`"rss": null` — currently Försvarets forum SE, Yle, C4Defence): covered by the sitemap backfill only; add a feed URL if you find one.

## Notes & caveats
- **RSS depth**: feeds carry only the latest ~20–100 items, which is why history comes from the sitemap backfill, not RSS.
- **Hotlinked images** can break if a publisher blocks hotlinking or changes URLs; the UI falls back to a placeholder tile.
- **Aggregation hygiene**: only headline + short summary + image + backlink are stored — never full article text. The LLM entity pass fetches the body transiently to read it, but only the extracted `companies`/`products` names are persisted.
- **Supabase free tier** pauses a project after ~1 week of inactivity; the daily job keeps it awake. At ~5–10 new items/day plus the backfill you stay well within the free 500 MB.
