# Publish xSonomy to xsonomy.com — GitHub Pages (built by Actions)

The GitHub Action builds the site from Airtable and deploys it to Pages. The
generated `index.html` and `images/` are **never committed**, so the repo can't
get merge conflicts. For how the build works internally, see `DEPLOY.md`.

Placeholders: `‹USERNAME›` = your GitHub username, `‹REPO›` = repo name
(e.g. `xsonomy-catalogue`).

> **Where each step happens:** **GitHub Desktop** (the app) only pushes the source
> files. Everything else — secret, Pages, custom domain — is done on the
> **github.com website**, under your repo's **Settings** tab.

---

## 0. What goes in the repo (SOURCE FILES ONLY)
```
build/template.html
build/build.mjs
.github/workflows/deploy.yml
DEPLOY.md
SETUP-GITHUB.md
.gitignore
```
Do **not** add `index.html` or an `images/` folder — the Action generates and
publishes those. (`.gitignore` already ignores them, so even if they're in your
folder, git skips them.)

**Can't see `.github` or `.gitignore` in Finder?** They start with a dot — press
**Cmd + Shift + .** (period) to show hidden files.

---

## 1. Create the repository
1. github.com → **+ → New repository**.
2. Name `‹REPO›`, visibility **Public** → **Create repository**.

## 2. Push the source files (GitHub Desktop)
1. Install GitHub Desktop, sign in.
2. **File → Clone repository →** pick `‹REPO›`.
3. Copy your xSonomy folder's contents into the clone. The allowlist `.gitignore`
   means only the ~6 source files above show up as changes (your notes, CSVs,
   `index.html`, `images/`, `node_modules` are skipped — that's correct).
4. Enter a summary → **Commit to main** → **Push origin**.

## 3. Add the Airtable token (github.com)
- **Settings → Secrets and variables → Actions → New repository secret.**
  Name `AIRTABLE_TOKEN`; value = an Airtable PAT scoped to this base, `data.records:read`.

## 4. Turn on Pages — as GitHub Actions
- **Settings → Pages → Build and deployment → Source = GitHub Actions.**
  (NOT "Deploy from a branch" — that's the old way that caused conflicts.)

## 5. Set the custom domain
- **Settings → Pages → Custom domain =** `xsonomy.com` → Save.
  (The build also writes a CNAME into each deploy, so it persists.)

## 6. Point DNS at GitHub (GoDaddy)
GoDaddy → **My Products → xsonomy.com → DNS / Manage DNS.**

**a) Apex (`xsonomy.com`) — four A records:**
| Type | Name | Value |
|------|------|-------|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |

**b) www — one CNAME:**
| Type | Name | Value |
|------|------|-------|
| CNAME | www | ‹USERNAME›.github.io |

**c) Remove conflicts:** delete GoDaddy's default parked `@` A record and any
**Domain Forwarding**.

**d) Optional IPv6 — four AAAA records, Name `@`:**
`2606:50c0:8000::153` · `2606:50c0:8001::153` · `2606:50c0:8002::153` · `2606:50c0:8003::153`

## 7. Build & go live
1. Repo → **Actions** → **Build & publish catalogue** → **Run workflow**.
   It pulls Airtable, downloads images, and deploys to Pages.
2. **Settings → Pages →** tick **Enforce HTTPS** once the cert provisions (10–60 min).
3. `https://xsonomy.com` is live and rebuilds itself daily.

---

## If you already set this up the old way (branch deploy)
You previously committed `index.html`. To stop tracking it (one time):
**Repository → Open in Terminal**, then:
```
git rm -r --cached index.html images 2>/dev/null
git add -A
git commit -m "Deploy via Actions; stop tracking generated files"
git push
```
Then do step 4 (Pages Source = GitHub Actions) and step 7.

## Verify checklist
- [ ] Only source files committed (no `index.html` / `images/` in the repo)
- [ ] `AIRTABLE_TOKEN` secret set
- [ ] Pages Source = **GitHub Actions**; custom domain = `xsonomy.com`
- [ ] DNS: 4 A records + www CNAME; parked record/forwarding removed
- [ ] Action run succeeded; `https://xsonomy.com` loads; Enforce HTTPS on

## Notes
- `.com` domains work normally with GitHub Pages.
- Golden rule: only edit files under `build/`. Never touch `index.html`.
