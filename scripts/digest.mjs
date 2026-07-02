// Email digest of newly-ingested UAV/C-UAS items, grouped by theme, sent via Resend.
//
//   node scripts/digest.mjs --period day      # last 24h  (daily digest)
//   node scripts/digest.mjs --period week     # last 7 days (Monday roundup)
//   node scripts/digest.mjs --period day --dry # render HTML to ./public/_digest.html, no send
//
// Env: SUPABASE_URL + (SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY) to read,
//      RESEND_API_KEY to send, DIGEST_TO (comma-separated), DIGEST_FROM, SITE_URL.

import { writeFile, mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDotenv } from "./lib/http.mjs";
import { fetchSince, fetchSubscribers } from "./lib/supabase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const getArg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const PERIOD = getArg("--period", "day");        // "day" | "week"
const DRY = args.includes("--dry");
const HOURS = PERIOD === "week" ? 24 * 7 : 24;

const SITE_URL = (process.env.SITE_URL || "https://news.xsonomy.com").replace(/\/+$/, "");
const FROM = process.env.DIGEST_FROM || "xSonomy News <news@xsonomy.com>";
// mailto used for unsubscribe (no subscription DB — removal is manual via recipients.json)
const UNSUB_ADDR = process.env.DIGEST_UNSUBSCRIBE || "news@xsonomy.com";

// Recipients with optional per-person tag filters.
// Priority: recipients.json  >  DIGEST_RECIPIENTS env (JSON)  >  DIGEST_TO env (all tags).
async function loadRecipients() {
  let base = [];
  const file = join(ROOT, "recipients.json");
  if (existsSync(file)) {
    const j = JSON.parse(await readFile(file, "utf8"));
    base = normaliseRecipients(j.recipients || j);
  } else if (process.env.DIGEST_RECIPIENTS) {
    const j = JSON.parse(process.env.DIGEST_RECIPIENTS);
    base = normaliseRecipients(j.recipients || j);
  } else {
    const list = (process.env.DIGEST_TO || "brntaut@gmail.com").split(",").map((s) => s.trim()).filter(Boolean);
    base = list.map((email) => ({ email, tags: [] }));
  }
  // Merge website sign-ups from the Supabase `subscribers` table. They have no
  // tag filter, so they receive every theme. Deduped against base (base wins).
  let subs = [];
  try {
    subs = normaliseRecipients(await fetchSubscribers());
  } catch (e) {
    console.error(`Could not load Supabase subscribers (${e.message}); using base recipients only.`);
  }
  const seen = new Set(base.map((r) => r.email.toLowerCase()));
  const merged = [...base];
  for (const s of subs) {
    const k = (s.email || "").toLowerCase();
    if (k && !seen.has(k)) { seen.add(k); merged.push(s); }
  }
  console.log(`Recipients: ${base.length} base + ${merged.length - base.length} subscriber(s) = ${merged.length}.`);
  return merged;
}
function normaliseRecipients(arr) {
  return (arr || [])
    .map((r) => (typeof r === "string" ? { email: r, tags: [] } : { email: r.email, tags: Array.isArray(r.tags) ? r.tags : [] }))
    .filter((r) => r.email);
}
// Keep items matching a recipient's tag filter ([] / missing = everything).
export function filterForRecipient(items, tags) {
  if (!tags || !tags.length) return items;
  const want = new Set(tags);
  return items.filter((a) => (a.tags || []).some((t) => want.has(t)));
}

// theme tag -> human label, in priority order (each item lands in its top theme)
const THEMES = [
  ["counter-uas", "Counter-UAS"],
  ["critical-infra", "Critical infrastructure"],
  ["eu-regulatory", "EU & regulatory"],
  ["c2-sensors", "C2 / sensors"],
  ["contract-intel", "Contracts & industry"],
  ["ukraine", "Ukraine / front line"],
  ["swarm", "Swarms"],
  ["maritime", "Maritime"],
];

const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fmtDate = (s) => { if (!s) return ""; const d = new Date(s); return isNaN(d) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }); };

function groupByTheme(items) {
  const buckets = new Map(THEMES.map(([id, label]) => [id, { label, items: [] }]));
  buckets.set("other", { label: "Other", items: [] });
  for (const a of items) {
    const tags = a.tags || [];
    const theme = THEMES.find(([id]) => tags.includes(id));
    buckets.get(theme ? theme[0] : "other").items.push(a);
  }
  return [...buckets.values()].filter((b) => b.items.length);
}

function itemHtml(a) {
  const thumb = a.image_url
    ? `<td width="96" valign="top" style="padding-right:14px;">
         <img src="${esc(a.image_url)}" width="84" height="56" alt="" style="display:block;border-radius:6px;object-fit:cover;width:84px;height:56px;border:1px solid #e2e8f0;">
       </td>`
    : "";
  return `<tr><td style="padding:10px 0;border-bottom:1px solid #eef2f7;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
      ${thumb}
      <td valign="top">
        <div style="font:600 12px/1.4 Arial,sans-serif;color:#2563eb;">${esc(a.source)} <span style="color:#94a3b8;font-weight:400;">· ${fmtDate(a.published_at)}</span></div>
        <a href="${esc(a.url)}" style="font:700 15px/1.35 Arial,sans-serif;color:#0f172a;text-decoration:none;">${esc(a.title)}</a>
        ${a.summary ? `<div style="font:400 13px/1.5 Arial,sans-serif;color:#475569;margin-top:3px;">${esc(a.summary)}</div>` : ""}
      </td>
    </tr></table>
  </td></tr>`;
}

const themeLabel = (id) => (THEMES.find(([t]) => t === id) || [id, id])[1];

export function buildHtml(items, period = "day", opts = {}) {
  const groups = groupByTheme(items);
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const label = period === "week" ? "Weekly roundup" : "Daily digest";
  const filterNote = opts.tags && opts.tags.length
    ? `Filtered to your topics: ${opts.tags.map(themeLabel).join(", ")}. `
    : "";
  const unsubscribeUrl = opts.unsubscribeUrl ||
    `mailto:${UNSUB_ADDR}?subject=${encodeURIComponent("Unsubscribe " + (opts.email || ""))}`;
  const sections = groups.map((g) => `
    <tr><td style="padding:22px 0 6px;">
      <div style="font:700 13px/1 Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#0ea5a3;">${esc(g.label)} <span style="color:#cbd5e1;">(${g.items.length})</span></div>
    </td></tr>
    <tr><td><table role="presentation" cellpadding="0" cellspacing="0" width="100%">${g.items.map(itemHtml).join("")}</table></td></tr>`).join("");

  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f1f5f9;padding:24px 0;"><tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
      <tr><td style="background:#0c0f14;padding:20px 24px;">
        <div style="font:800 20px/1 Arial,sans-serif;color:#ffffff;letter-spacing:.5px;">xSonomy</div>
        <div style="font:600 13px/1.4 Arial,sans-serif;color:#7cf0c8;margin-top:4px;">UAV &amp; Counter-Drone — ${esc(label)}</div>
      </td></tr>
      <tr><td style="padding:18px 24px 0;">
        <div style="font:400 13px/1.5 Arial,sans-serif;color:#64748b;">${esc(today)} · ${items.length} new item${items.length === 1 ? "" : "s"}</div>
      </td></tr>
      <tr><td style="padding:0 24px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%">${sections}</table></td></tr>
      <tr><td style="padding:18px 24px 26px;">
        <a href="${esc(SITE_URL)}/" style="font:700 14px/1 Arial,sans-serif;color:#ffffff;background:#2563eb;text-decoration:none;padding:11px 20px;border-radius:8px;display:inline-block;">Open the full feed →</a>
      </td></tr>
      <tr><td style="background:#f8fafc;padding:16px 24px;border-top:1px solid #e2e8f0;">
        <div style="font:400 11px/1.5 Arial,sans-serif;color:#94a3b8;">${esc(filterNote)}Headlines aggregated from proven defence &amp; drone-industry media. Each link points to the original publisher. — xSonomy</div>
        <div style="font:400 11px/1.5 Arial,sans-serif;color:#94a3b8;margin-top:8px;">
          You're receiving this because you're on the xSonomy news list.
          <a href="${esc(unsubscribeUrl)}" style="color:#64748b;text-decoration:underline;">Unsubscribe</a>.
        </div>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

async function sendResend(to, subject, html, unsubscribeUrl) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set.");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM, to: [to], subject, html,
      headers: { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Resend ${res.status} for ${to}: ${body}`);
  return body;
}

async function main() {
  await loadDotenv();
  const recipients = await loadRecipients();
  const since = new Date(Date.now() - HOURS * 3600000).toISOString();
  const items = await fetchSince(since, 600);
  console.log(`${items.length} new items in the last ${HOURS}h (period=${PERIOD}). ${recipients.length} recipient(s).`);

  if (!items.length) {
    console.log("Nothing new — skipping all sends (no empty emails).");
    return;
  }

  let sent = 0, skipped = 0;
  for (const r of recipients) {
    const mine = filterForRecipient(items, r.tags);
    if (!mine.length) { skipped++; console.log(`  – ${r.email}: 0 matching items, skipped`); continue; }
    const unsubscribeUrl = `mailto:${UNSUB_ADDR}?subject=${encodeURIComponent("Unsubscribe " + r.email)}`;
    const html = buildHtml(mine, PERIOD, { email: r.email, tags: r.tags, unsubscribeUrl });
    const subject = `xSonomy ${PERIOD === "week" ? "weekly" : "daily"} UAV digest — ${mine.length} new`;

    if (DRY) {
      await mkdir(join(ROOT, "public"), { recursive: true });
      const safe = r.email.replace(/[^a-z0-9]+/gi, "_");
      await writeFile(join(ROOT, "public", `_digest_${safe}.html`), html);
      console.log(`  – ${r.email}: ${mine.length} items (dry, not sent)`);
      continue;
    }
    await sendResend(r.email, subject, html, unsubscribeUrl);
    sent++;
    console.log(`  ✓ ${r.email}: ${mine.length} items`);
  }
  if (!DRY) console.log(`Done. Sent ${sent}, skipped ${skipped} (no matching items).`);
}

// Only run when invoked directly (so tests can import buildHtml without sending).
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
