# xSonomy — self-updating deploy

The site is a single `index.html` served by GitHub Pages. It is **generated** from
`build/template.html` + your Airtable data by `build/build.mjs`, and rebuilt
automatically by a GitHub Action.

## What's in the repo
```
index.html                     # generated — the published site (don't hand-edit)
build/template.html            # the design/shell with data placeholders
build/build.mjs                # fetches Airtable, maps data, writes index.html
.github/workflows/deploy.yml   # rebuilds + commits on schedule / push / manual
```

## One-time setup

1. **Create an Airtable personal access token** (airtable.com → Builder hub →
   Personal access tokens). Scope: this base only, scope `data.records:read`
   (read-only is enough). Copy the token.
2. **Add it as a GitHub secret:** repo → Settings → Secrets and variables →
   Actions → New repository secret. Name it exactly `AIRTABLE_TOKEN`, paste the value.
   (You set this; it stays in GitHub — the build reads it via `secrets.AIRTABLE_TOKEN`.)
3. **Allow Actions to push:** repo → Settings → Actions → General → Workflow
   permissions → select **Read and write permissions** → Save.
4. **Pages source:** repo → Settings → Pages → Build and deployment →
   Source = *Deploy from a branch*, Branch = `main` / `/ (root)`.

## How updates happen
- **Daily at 05:00 UTC** the Action pulls Airtable, rebuilds `index.html`, and
  commits it if anything changed. Pages republishes automatically.
- **Manually:** repo → Actions → "Build & publish catalogue" → Run workflow.
- **On design changes:** edit `build/template.html` (or have Claude regenerate it),
  push to `main` — the Action rebuilds with the latest data.

## The publish gate (important)
`build/build.mjs` has a `PUBLISH_STATUSES` constant near the top:
- `null` (default) → publishes **all** rows (current review-stage behaviour).
- `["Live"]` → publishes only rows whose Airtable **Status = Live**.

Per the project's human-gate rule, switch this to `["Live"]` once you're reviewing
rows in Airtable. Until rows are marked Live, that setting would show an empty site —
so it ships as `null`. Flip it when ready.

## Local test (optional)
With Node 18+ and a token:
```
AIRTABLE_TOKEN=patXXXX node build/build.mjs
```
Writes a fresh `index.html` you can open in a browser.
