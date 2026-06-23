// Offline unit tests for the parser + relevance gate + tagger.
// Uses synthetic RSS/Atom fixtures (no network). Run: npm test
import assert from "node:assert/strict";
import { parseFeed, canonicalUrl, stripHtml, clip } from "./lib/feed.mjs";
import { isRelevant, tagItem } from "./lib/enrich.mjs";

let pass = 0;
const t = (name, fn) => { try { fn(); pass++; console.log("✓", name); } catch (e) { console.error("✗", name, "\n  ", e.message); process.exitCode = 1; } };

const RSS = `<?xml version="1.0"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
  <title>Test Defense Feed</title>
  <item>
    <title><![CDATA[Army awards counter-UAS jammer contract]]></title>
    <link>https://example.com/news/army-cuas-contract/?utm_source=rss&amp;b=2</link>
    <description><![CDATA[<p>The army <b>awarded</b> a C-UAS jammer contract for airport defence.</p>]]></description>
    <pubDate>Mon, 02 Jun 2025 09:30:00 +0000</pubDate>
    <category>Counter-UAS</category>
    <media:content url="https://cdn.example.com/img/cuas.jpg" />
  </item>
  <item>
    <title>Navy commissions new destroyer</title>
    <link>https://example.com/news/navy-destroyer</link>
    <description>A surface combatant joins the fleet at a ceremony.</description>
    <pubDate>Tue, 03 Jun 2025 10:00:00 +0000</pubDate>
  </item>
  <item>
    <title>FPV drone swarm tested in Ukraine</title>
    <link>https://example.com/news/fpv-swarm-ukraine</link>
    <content:encoded><![CDATA[<img src="https://cdn.example.com/img/fpv.png"/> Front-line trials.]]></content:encoded>
    <dc:date>2025-05-20T08:00:00Z</dc:date>
  </item>
</channel></rss>`;

const ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <entry>
    <title>EASA proposes new BVLOS drone rules</title>
    <link rel="alternate" href="https://example.org/easa-bvlos"/>
    <summary>European regulator outlines U-space framework.</summary>
    <published>2025-04-15T12:00:00Z</published>
    <media:thumbnail url="https://cdn.example.org/easa.jpg"/>
  </entry>
</feed>`;

const general = { name: "Test", specialist: false, country: "US", scope: "global" };
const specialist = { name: "DroneSpec", specialist: true, country: "Global", scope: "global" };

t("RSS: parses all items", () => {
  const items = parseFeed(RSS);
  assert.equal(items.length, 3);
});

t("RSS: title CDATA + html stripped", () => {
  const i = parseFeed(RSS)[0];
  assert.equal(i.title, "Army awards counter-UAS jammer contract");
  assert.ok(!/[<>]/.test(i.summary));
});

t("URL canonicalisation strips utm + trailing slash + www", () => {
  assert.equal(canonicalUrl("https://www.Example.com/a/?utm_source=x&b=2#frag"),
                            "https://example.com/a?b=2");
});

t("image: media:content, enclosure, and content img all extracted", () => {
  const items = parseFeed(RSS);
  assert.equal(items[0].image_url, "https://cdn.example.com/img/cuas.jpg");
  assert.equal(items[2].image_url, "https://cdn.example.com/img/fpv.png");
});

t("dates parse to ISO", () => {
  const items = parseFeed(RSS);
  assert.ok(items[0].published_at.startsWith("2025-06-02"));
  assert.ok(items[2].published_at.startsWith("2025-05-20"));
});

t("relevance gate: general outlet drops non-drone item", () => {
  const items = parseFeed(RSS);
  assert.equal(isRelevant(items[0], general), true);   // counter-UAS
  assert.equal(isRelevant(items[1], general), false);  // destroyer, no drones
  assert.equal(isRelevant(items[2], general), true);   // FPV drone
});

t("relevance gate: specialist outlet keeps everything", () => {
  const items = parseFeed(RSS);
  assert.equal(isRelevant(items[1], specialist), true);
});

t("tagger assigns theme tags", () => {
  const items = parseFeed(RSS);
  const tags0 = tagItem(items[0], general);
  assert.ok(tags0.includes("counter-uas"));
  assert.ok(tags0.includes("critical-infra")); // 'airport'
  assert.ok(tags0.includes("contract-intel")); // 'awarded'/'contract'
  const tags2 = tagItem(items[2], general);
  assert.ok(tags2.includes("ukraine"));
  assert.ok(tags2.includes("swarm"));
});

t("Atom: parses entry, link, image, date", () => {
  const items = parseFeed(ATOM);
  assert.equal(items.length, 1);
  assert.equal(items[0].url, "https://example.org/easa-bvlos");
  assert.equal(items[0].image_url, "https://cdn.example.org/easa.jpg");
  assert.ok(items[0].published_at.startsWith("2025-04-15"));
  assert.ok(tagItem(items[0], general).includes("eu-regulatory"));
});

t("clip truncates on word boundary with ellipsis", () => {
  const out = clip("one two three four five", 12);
  assert.ok(out.length <= 12 && out.endsWith("…"));
});

console.log(`\n${pass} checks passed.`);
