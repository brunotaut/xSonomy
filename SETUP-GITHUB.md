# Publish xSonomy to xsonomy.ai — GitHub Pages setup

A complete, do-this-in-order guide. Assumes: domain `xsonomy.ai` registered at
GoDaddy, host = GitHub Pages. For how the auto-rebuild works internally, see `DEPLOY.md`.

Placeholders: replace `‹USERNAME›` with your GitHub username and `‹REPO›` with your
repo name (e.g. `xsonomy-catalogue`).

---

## 0. What goes in the repo
These 7 items (with their folders):
```
index.html                     # the served site (generated)
build/template.html
build/build.mjs
.github/workflows/deploy.yml
DEPLOY.md
SETUP-GITHUB.md
.gitignore
```
**Can't see `.github` or `.gitignore` in Finder?** They start with a dot, so macOS
hides them. Press **Cmd + Shift + .** (period) in Finder to show hidden files.

You don't have to hand-pick them, though: `.gitignore` is an **allowlist** — it tells
git to ignore *everything* in this folder except those 7 items. So with the GitHub
Desktop method below you can just copy the whole xSonomy folder in and git commits
only the right files (your notes, CSVs, mockups, `node_modules`, etc. are skipped).

---

## 1. Create the repository
1. Sign in at github.com.
2. Top-right **+ → New repository**.
3. Name: `‹REPO›` (e.g. `xsonomy-catalogue`). Visibility: **Public**
   (free GitHub Pages needs public; the catalogue is public anyway).
4. Leave everything else blank → **Create repository**.

## 2. Upload the files (keep the folder structure!)
The `build/` and `.github/workflows/` folders **must** stay nested. Two ways:

**A — GitHub Desktop (recommended — handles hidden files, makes future pushes one click):**
1. Install GitHub Desktop, sign in.
2. **File → Clone repository →** pick `‹REPO›` → clone to your computer.
3. Copy **everything** from your xSonomy folder into the cloned folder (you can select
   all — the allowlist `.gitignore` skips the files that shouldn't be published).
   Make sure `.gitignore` itself comes along (Cmd+Shift+. to see it).
4. In GitHub Desktop the left panel will show only the ~7 site files as changes
   (this confirms the allowlist worked) → enter a summary → **Commit to main** →
   **Push origin**.

**B — Web upload:**
1. On the repo page: **Add file → Upload files**.
2. Drag the whole set in — drag the **folders** `build` and `.github` (not just the
   loose files) so the structure is preserved.
3. **Commit changes**.

> ⚠️ If after upload you don't see `.github/workflows/deploy.yml` at that exact path,
> the Action won't run. Re-upload preserving folders.

## 3. Give the Action its token + permission
1. **Settings → Secrets and variables → Actions → New repository secret.**
   - Name: `AIRTABLE_TOKEN`
   - Value: an Airtable personal access token (airtable.com → Builder hub → Personal
     access tokens; scope this base only, `data.records:read`).
2. **Settings → Actions → General → Workflow permissions →** select
   **Read and write permissions** → **Save**. (Lets the build commit `index.html`.)

## 4. Turn on GitHub Pages
1. **Settings → Pages.**
2. **Build and deployment → Source = Deploy from a branch.**
3. Branch = **main**, folder = **/ (root)** → **Save**.
4. After ~1 min the temporary URL works: `https://‹USERNAME›.github.io/‹REPO›/`.

## 5. Set the custom domain
1. Still on **Settings → Pages → Custom domain**, enter: `xsonomy.ai` → **Save**.
   (This commits a `CNAME` file to the repo root — leave it there.)
2. GitHub will show "DNS check in progress" — expected until step 6 propagates.

## 6. Point DNS at GitHub (GoDaddy)
GoDaddy → **My Products → xsonomy.ai → DNS / Manage DNS.**

**a) Apex (`xsonomy.ai`) — add four A records:**
| Type | Name | Value |
|------|------|-------|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |

**b) www — add one CNAME:**
| Type | Name | Value |
|------|------|-------|
| CNAME | www | ‹USERNAME›.github.io |

(Just the github.io host — no `https://`, no `/‹REPO›`.)

**c) Remove conflicts:** delete GoDaddy's default parked `@` A record and any
**Domain Forwarding** on the domain — these break the connection.

**d) Optional (IPv6) — four AAAA records, Name `@`:**
`2606:50c0:8000::153` · `2606:50c0:8001::153` · `2606:50c0:8002::153` · `2606:50c0:8003::153`

## 7. Enforce HTTPS
1. Back on **Settings → Pages**, wait until the domain check passes (DNS + cert
   usually settle in 10–60 min, occasionally a few hours).
2. Tick **Enforce HTTPS**.

## 8. First build from Airtable
1. Repo → **Actions** tab → **Build & publish catalogue** → **Run workflow** → Run.
2. It pulls Airtable, regenerates `index.html`, commits it; Pages republishes.
3. After it succeeds, `https://xsonomy.ai` shows the live catalogue. From then on it
   rebuilds automatically every day (and on every push).

---

## Verify checklist
- [ ] `https://‹USERNAME›.github.io/‹REPO›/` loads (before DNS)
- [ ] `AIRTABLE_TOKEN` secret set; workflow permissions = read/write
- [ ] A records (4) + www CNAME added at GoDaddy; parked record/forwarding removed
- [ ] Pages custom domain = `xsonomy.ai`; Enforce HTTPS ticked
- [ ] Actions run succeeded; `https://xsonomy.ai` and `https://www.xsonomy.ai` load

## Notes
- `.ai` domains work normally with GitHub Pages — nothing special needed.
- The `CNAME` file in the repo root must stay; the daily build only rewrites
  `index.html`, so it won't disturb your domain config.
- Steps that need a login (GitHub, GoDaddy, enabling HTTPS, the Airtable token) are
  yours to do — credentials can't be handled for you.
