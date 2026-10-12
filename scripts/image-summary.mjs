// Print a markdown review summary of the pending image candidates.
// Used by the Find product images workflow to fill the Actions run summary, where
// GitHub renders the thumbnails so the batch can be judged without checking anything out.

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CANDIDATES = join(ROOT, "data", "image-candidates.json");
const cell = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");

const list = existsSync(CANDIDATES) ? JSON.parse(await readFile(CANDIDATES, "utf8")) : [];

const out = [`## Image candidates: ${list.length}`, ""];
if (!list.length) {
  out.push("Nothing new to review.");
} else {
  out.push("**None of these are on the site yet.** Check that each picture really is the",
    "product named — about half of automatic name matches are something else entirely",
    "(an F/A-18 for \"Hornet\", a Pentax camera for \"K1000\", bread for \"Palianytsia\").",
    "",
    "Promote the good ones and push:",
    "",
    "```bash",
    `npm run images:accept -- 0 3 7`,
    "```",
    "",
    "Anything not promoted is remembered as rejected and will not be proposed again.",
    "",
    "| # | Product | Wikipedia article | Licence | Image |",
    "|---|---|---|---|---|");
  list.forEach((c, i) => {
    out.push(`| ${i} | ${cell(c.name)} | ${cell(c.article)} | ${cell(c.licence)} | <img src="${cell(c.preview || c.url)}" width="150"> |`);
  });
}
console.log(out.join("\n"));
