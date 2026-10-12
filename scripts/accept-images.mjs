// Promote reviewed image candidates into the published manifest.
//
//   npm run images:accept -- 0 3 7      promote candidates 0, 3 and 7
//   npm run images:accept -- all        promote every candidate (only after looking at them)
//   npm run images:accept -- none       reject the whole batch
//
// Whatever is not promoted is recorded in data/image-rejected.json so the weekly search
// does not keep proposing the same wrong picture. The candidates file is then cleared.

import { readFile, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = join(ROOT, "data", "product-images.json");
const REJECTED = join(ROOT, "data", "image-rejected.json");
const CANDIDATES = join(ROOT, "data", "image-candidates.json");
const SHEET = join(ROOT, "review", "image-candidates.html");

const readJson = async (p, fallback) => (existsSync(p) ? JSON.parse(await readFile(p, "utf8")) : fallback);

const args = process.argv.slice(2);
if (!args.length) {
  console.error("usage: npm run images:accept -- <indices…> | all | none");
  process.exit(1);
}

const candidates = await readJson(CANDIDATES, []);
if (!candidates.length) { console.log("no candidates waiting — run `npm run images:find` first"); process.exit(0); }

let take;
if (args[0] === "all") take = candidates.map((_, i) => i);
else if (args[0] === "none") take = [];
else {
  take = args.map(Number);
  const bad = take.filter((n) => !Number.isInteger(n) || n < 0 || n >= candidates.length);
  if (bad.length) { console.error(`out of range: ${bad.join(", ")} (have 0..${candidates.length - 1})`); process.exit(1); }
}

const manifest = await readJson(MANIFEST, {});
const rejected = await readJson(REJECTED, {});
const chosen = new Set(take);

let added = 0;
for (const [i, c] of candidates.entries()) {
  if (chosen.has(i)) {
    manifest[c.name] = { url: c.url, licence: c.licence, author: c.author, source: c.source, article: c.article };
    added++;
  } else {
    rejected[c.name] = { article: c.article, reason: "reviewed: image did not depict the product" };
  }
}

await writeFile(MANIFEST, JSON.stringify(manifest, null, 2));
await writeFile(REJECTED, JSON.stringify(rejected, null, 2));
await writeFile(CANDIDATES, "[]");
if (existsSync(SHEET)) await rm(SHEET);

console.log(`promoted ${added}, rejected ${candidates.length - added}`);
console.log(`manifest now has ${Object.keys(manifest).length} products with a photo`);
console.log("commit and push — the next build publishes them");
