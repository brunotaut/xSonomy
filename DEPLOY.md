# xSonomy — self-updating deploy

The site is **built and published by GitHub Actions**, not stored in the repo.
`build/build.mjs` pulls your Airtable data + images and generates `index.html`,
which the Action deploys straight to GitHub Pages. Nothing generated is ever
committed, so there are no merge conflicts.

## Files in the repo (source only)
```
build/template.html            # the design/shell with data placeholders
build/build.mjs                # fetches Airtable, downloads images, writes index.html
.github/workflows/deploy.yml   # builds + deploys to Pages (schedule / push / manual)
DEPLOY.md
SETUP-GITHUB.md
.gitignore                     # ignores the generated index.html + images/
```
`index.html` and `images/` are **generated** — they appear locally when you run the
build, but git ignores them. Don't commit or hand-edit them.

## One-time setup
1. **Airtable token** → repo **Settings → Secrets and variables → Actions →
   New repository secret**, name `AIRTABLE_TOKEN` (scope: this base, read-only).
2. **Pages source = GitHub Actions:** repo **Settings → Pages → Build and deployment
   → Source = GitHub Actions** (NOT "Deploy from a branch").
3. **Custom domain:** Settings → Pages → Custom domain = `xsonomy.com` (the build also
   writes a CNAME into every deploy, so it sticks).

## How updates happen
- **Daily 05:00 UTC** — pulls Airtable, rebuilds, redeploys.
- **On push to main** — rebuilds (so design changes to `build/template.html` go live).
- **Manually** — Actions tab → "Build & publish catalogue" → Run workflow.

## The golden rule
Only ever edit files under `build/`. Never touch `index.html` — the Action owns it.
This is what keeps the repo conflict-free.

## Publish gate
`build/build.mjs` → `PUBLISH_STATUSES`: `null` publishes all rows (current);
set to `["Live"]` to publish only Airtable rows with Status = Live.

## Local preview (optional)
```
AIRTABLE_TOKEN=patXXXX node build/build.mjs   # writes a local index.html + images/
```
