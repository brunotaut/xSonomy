// Offline render test for the email digest (no network). Writes a preview HTML
// you can open in a browser, and asserts the key structure. Run: node scripts/test-digest.mjs
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildHtml, filterForRecipient } from "./digest.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const sample = [
  { url: "https://example.com/a", title: "Army awards C-UAS jammer contract", summary: "A new counter-drone system for airport defence.",
    image_url: "https://picsum.photos/200/120", source: "Breaking Defense", published_at: "2026-06-22T09:00:00Z", tags: ["counter-uas", "critical-infra", "contract-intel"] },
  { url: "https://example.com/b", title: "EASA proposes new BVLOS rules", summary: "European regulator outlines U-space framework.",
    image_url: null, source: "Defence Industry Europe", published_at: "2026-06-22T07:30:00Z", tags: ["eu-regulatory"] },
  { url: "https://example.com/c", title: "FPV drone swarm trialled on the front line", summary: "Front-line trials of coordinated FPV drones.",
    image_url: "https://picsum.photos/200/121", source: "Militarnyi", published_at: "2026-06-21T16:00:00Z", tags: ["ukraine", "swarm"] },
  { url: "https://example.com/d", title: "Quarterly drone market roundup", summary: "Industry overview.",
    image_url: null, source: "DroneLife", published_at: "2026-06-21T12:00:00Z", tags: [] },
];

const html = buildHtml(sample, "day");

assert.ok(html.includes("Daily digest"), "has period label");
assert.ok(html.includes("Counter-UAS"), "has counter-uas section");
assert.ok(html.includes("EU &amp; regulatory"), "has eu section");
assert.ok(html.includes("Ukraine / front line"), "has ukraine section");
assert.ok(html.includes("Other"), "ungrouped item lands in Other");
assert.ok(html.includes("Army awards C-UAS jammer contract"), "renders titles");
assert.ok(html.includes("4 new items"), "shows count");
assert.ok(!/undefined|NaN/.test(html), "no undefined/NaN leaked into output");

const weekly = buildHtml(sample, "week");
assert.ok(weekly.includes("Weekly roundup"), "weekly label");

// unsubscribe footer + List-Unsubscribe-friendly mailto
const personal = buildHtml(sample, "day", { email: "a@b.com", tags: ["contract-intel"], unsubscribeUrl: "mailto:news@xsonomy.com?subject=Unsubscribe%20a@b.com" });
assert.ok(/Unsubscribe<\/a>/.test(personal), "has unsubscribe link");
assert.ok(personal.includes("Filtered to your topics: Contracts &amp; industry"), "shows recipient filter note");

// per-recipient tag filter
assert.equal(filterForRecipient(sample, []).length, 4, "empty filter = all");
assert.equal(filterForRecipient(sample, ["contract-intel"]).length, 1, "contract-intel filter");
assert.equal(filterForRecipient(sample, ["eu-regulatory", "ukraine"]).length, 2, "multi-tag filter (OR)");
assert.equal(filterForRecipient(sample, ["maritime"]).length, 0, "no match = empty");

const out = join(ROOT, "digest-preview.html");
await writeFile(out, html);
console.log("✓ all digest render checks passed");
console.log("  preview written to", out);
