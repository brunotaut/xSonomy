#!/usr/bin/env node
/**
 * xSonomy catalogue build.
 * Fetches the UAVs + Listings tables from Airtable, maps them to the shapes the
 * front-end expects, downloads product images, injects everything into
 * build/template.html, and writes ../index.html (+ ../images/).
 *
 * Runs in GitHub Actions (which can reach api.airtable.com). Requires env
 * AIRTABLE_TOKEN (a personal access token scoped to this base; read-only is enough).
 * Node 18+ (uses global fetch).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const TOKEN = process.env.AIRTABLE_TOKEN;
const BASE = "appwMCCtt57i8SNbR";
const T_UAV = "tblUIEuwkxizjAb05";
const T_SENSOR = "tblTGH1m1Txi3eibs";

/* ---- PUBLISH GATE -------------------------------------------------------
 * Which rows go live. Per the project's human-gate rule, production should be
 * ["Live"] only. Default null = publish everything (review-stage behaviour) so
 * the site isn't empty before rows are approved. Flip to ["Live"] when ready.   */
const PUBLISH_STATUSES = null; // e.g. ["Live"]
/* ------------------------------------------------------------------------ */

// ---- field IDs (from Airtable schema; stable even if field names change) ----
const U = {
  name:"fldLWd2QpS2U8EPAC", company:"fld83i9LYjDPOVPuH", country:"fldiWHDYr4tOTBmWg",
  subtype:"fld7TEFyLOhTbucAj", summary:"fldbaCr7g8ZVjB3G1", website:"fldxthb20Dj1kc4nZ",
  status:"fldvJv8Tg7wIfcIEP", sourceUrls:"fldnVag3PInuGJHGn", confidence:"fldzt3icx23QtytZD",
  frame:"fldWHnrCEvMD81qwk", mission:"fldmV6NywJGAe3inI", speed:"fld3WHiFL5Qcv6YGB",
  mtow:"fldvAemhhLGbAhtEo", payload:"fldRa0Ez64pvcxNhb", endurance:"fldhb7yHmt3lBEzUc",
  range:"fldYtIpBeUYSNDH0q", propulsion:"fldnPkaeNoLxOt9ZT", year:"fldEsuyrAiFnccKLK",
  production:"fldVAHi3ZlCFQ2DMe", cls:"fldSJ0rTFBwhpyuC0", role:"fld3HcQEplxobjlJf",
  combat:"fldVNDJFOBp02jjaB", image:"fldng82meOtH3QZbc",
};
const S = {
  name:"fldP9VC0nFwnkVu43", company:"fldwMFOLXInXz9z5G", category:"fld4uDczDuHcuriBQ",
  subtype:"fld8oQOTtQCERTtIP", country:"fldvNZegzVP45IPbC", summary:"fldBxeAXf4c58DQjR",
  website:"fldtshlqzZonPg3kz", status:"fldYuY02DsAjgd6p0", sourceUrls:"fldPxzVG6bQfUDjLI",
  confidence:"fldiGkcGgm9XVnKpS", radarType:"fldUpqZkCcaUYtDz0", band:"fldmj0gBMZx1Jggka",
  radarDetect:"fldJxrwKelrxliXr6", radarCoverage:"fldfF0JgcYaM87DJH", use:"fldaYFfyzvV9iU0Qt",
  price:"fldXqQ6c8G8860kB6", modality:"fldOYs992okz3wk2G", formFactor:"fldBXmrBIBGAaSqys",
  acType:"fldSLyzIEzoNYehev", acDetect:"fldBSUFERca3UaAni", acCoverage:"fldHhpBqN4tTWuxDn",
  classification:"fldhy0OoSaGVzfPXz", partners:"fldcF8E9XVcVQ1Eci", architecture:"flddRITP6Ud2wNPhr",
  weight:"fld8hObnNitSl7WqD", frequency:"fldebLlA8SYB4q1Z1", image:"fldP3b1e2imhm9vsP",
};

// ---- helpers ----
async function fetchAll(table) {
  const out = [];
  let offset;
  do {
    const url = new URL(`https://api.airtable.com/v0/${BASE}/${table}`);
    url.searchParams.set("pageSize", "100");
    url.searchParams.set("returnFieldsByFieldId", "true");
    if (offset) url.searchParams.set("offset", offset);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!res.ok) throw new Error(`Airtable ${table} ${res.status}: ${await res.text()}`);
    const j = await res.json();
    out.push(...j.records);
    offset = j.offset;
  } while (offset);
  return out;
}
const num = (v) => (typeof v === "number" ? v : (v == null || v === "" ? null : (isNaN(parseFloat(v)) ? null : parseFloat(v))));
const firstNum = (txt) => {
  if (txt == null) return null;
  const m = String(txt).replace(/[–—]/g, "-").match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
};
const up = (s) => (s == null ? null : String(s).toUpperCase());
const isLive = (f, statusFld) => !PUBLISH_STATUSES || PUBLISH_STATUSES.includes(f[statusFld]);
const ceilTo = (v, step) => Math.max(step, Math.ceil((v || 0) / step) * step);
const distinct = (arr) => [...new Set(arr.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));

const slugSeen = new Set();
const slugId = (name) => {
  let base = String(name || "ITEM").toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 14) || "ITEM";
  let id = base, i = 2;
  while (slugSeen.has(id)) id = `${base}-${i++}`;
  slugSeen.add(id);
  return id;
};

// Images: pick the large thumbnail (small file); URLs expire, so download at build time.
const pickImage = (f, fld) => {
  const a = f[fld];
  if (Array.isArray(a) && a.length) {
    const at = a[0];
    const url = (at.thumbnails && at.thumbnails.large && at.thumbnails.large.url) || at.url;
    return url ? { url, type: at.type || "image/jpeg" } : null;
  }
  return null;
};
const extFromType = (t) => ({ "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" }[t] || "jpg");
const IMG_DIR = join(__dir, "..", "images");
async function downloadImages(rows) {
  for (const r of rows) {
    if (r._img) {
      try {
        const res = await fetch(r._img.url);
        if (res.ok) {
          const buf = Buffer.from(await res.arrayBuffer());
          const rel = `images/${r.id}.${extFromType(r._img.type)}`;
          mkdirSync(IMG_DIR, { recursive: true });
          writeFileSync(join(__dir, "..", rel), buf);
          r.image = rel;
        } else { console.error(`image ${r.id}: HTTP ${res.status}`); }
      } catch (e) { console.error(`image ${r.id}: ${e.message}`); }
    }
    delete r._img;
  }
}

const COUNTRY_SHORT = { Poland: "PL", Ukraine: "UA" };
const ROLE_FIX = { "LOITERING MUNITION": "LOITERING" };
const frameToSchematic = (frame) => {
  const f = (frame || "").toUpperCase();
  if (f.includes("VTOL")) return "vtol";
  if (f.includes("FPV")) return "quad";
  return "fixed";
};

// ---- map UAVs ----
function mapUAV(records) {
  const rows = records.filter((r) => isLive(r.fields, U.status)).map((r) => {
    const f = r.fields;
    const name = f[U.name] || "Unnamed";
    const mission = Array.isArray(f[U.mission]) ? f[U.mission] : (f[U.mission] ? [f[U.mission]] : []);
    let role = f[U.role] || mission[0] || null;
    role = up(role); if (role && ROLE_FIX[role]) role = ROLE_FIX[role];
    const countryFull = f[U.country] || null;
    return {
      id: slugId(name),
      codename: name.toUpperCase(),
      name,
      manufacturer: f[U.company] || null,
      country: COUNTRY_SHORT[countryFull] || (countryFull ? countryFull.slice(0, 2).toUpperCase() : "—"),
      countryFull: countryFull || "—",
      cls: up(f[U.cls]) || "—",
      role: role || "—",
      frame: up(f[U.frame]) || "—",
      subtype: f[U.subtype] || "—",
      range_km: num(f[U.range]),
      payload_kg: num(f[U.payload]),
      flight_min: num(f[U.endurance]),
      speed: num(f[U.speed]),
      mtow: num(f[U.mtow]),
      propulsion: f[U.propulsion] || null,
      year: num(f[U.year]),
      confidence: f[U.confidence] || "Medium",
      production: f[U.production] || "—",
      combat: f[U.combat] || "Unknown",
      schematic: frameToSchematic(f[U.frame]),
      summary: f[U.summary] || "",
      website: f[U.website] || "",
      note: f[U.sourceUrls] || "",
      image: null,
      _img: pickImage(f, U.image),
    };
  });
  const MAX = {
    range: ceilTo(Math.max(0, ...rows.map((u) => u.range_km || 0)), 20),
    endurance: ceilTo(Math.max(0, ...rows.map((u) => u.flight_min || 0)), 100),
    payload: ceilTo(Math.max(0, ...rows.map((u) => u.payload_kg || 0)), 5),
    speed: ceilTo(Math.max(0, ...rows.map((u) => u.speed || 0)), 50),
    mtow: ceilTo(Math.max(0, ...rows.map((u) => u.mtow || 0)), 10),
  };
  const FILTERS = {
    cls: distinct(rows.map((u) => u.cls)),
    role: distinct(rows.map((u) => u.role)),
    frame: distinct(rows.map((u) => u.frame)),
    manufacturer: distinct(rows.map((u) => u.manufacturer)),
  };
  return { rows, MAX, FILTERS };
}

// ---- map Sensors (Listings) ----
function mapSensor(records) {
  const rows = records
    .filter((r) => isLive(r.fields, S.status))
    .filter((r) => !/TEST/i.test(r.fields[S.name] || ""))
    .map((r) => {
      const f = r.fields;
      const name = f[S.name] || "Unnamed";
      return {
        id: slugId(name),
        name,
        company: f[S.company] || null,
        category: f[S.category] || null,
        subtype: f[S.subtype] || null,
        country: f[S.country] || null,
        modality: f[S.modality] || null,
        formFactor: f[S.formFactor] || null,
        type: f[S.radarType] || f[S.acType] || null,
        band: f[S.band] || null,
        coverage: f[S.radarCoverage] || f[S.acCoverage] || null,
        use: f[S.use] || null,
        detection_km: num(f[S.radarDetect]) ?? num(f[S.acDetect]),
        frequency_ghz: firstNum(f[S.frequency]),
        weight_kg: num(f[S.weight]),
        architecture: f[S.architecture] || null,
        price: f[S.price] || null,
        classification: f[S.classification] || null,
        partners: f[S.partners] || null,
        confidence: f[S.confidence] || null,
        summary: f[S.summary] || "",
        website: f[S.website] || "",
        note: f[S.sourceUrls] || "",
        image: null,
        _img: pickImage(f, S.image),
      };
    });
  const FILTERS = {
    category: distinct(rows.map((s) => s.category)),
    subtype: distinct(rows.map((s) => s.subtype)),
    band: distinct(rows.map((s) => s.band)),
    coverage: distinct(rows.map((s) => s.coverage)),
    country: distinct(rows.map((s) => s.country)),
    company: distinct(rows.map((s) => s.company)),
  };
  const MAX = { detection: ceilTo(Math.max(0, ...rows.map((s) => s.detection_km || 0)), 10) };
  return { rows, FILTERS, MAX };
}

// ---- build ----
const run = async () => {
  if (!TOKEN) { console.error("Missing AIRTABLE_TOKEN env var"); process.exit(1); }
  const [uavRecs, senRecs] = await Promise.all([fetchAll(T_UAV), fetchAll(T_SENSOR)]);
  const uav = mapUAV(uavRecs);
  const sen = mapSensor(senRecs);
  await downloadImages(uav.rows);
  await downloadImages(sen.rows);

  const uavBlock =
    `// generated by build/build.mjs — do not edit by hand\n` +
    `window.UAV_DATA = ${JSON.stringify(uav.rows)};\n` +
    `window.UAV_MAX = ${JSON.stringify(uav.MAX)};\n` +
    `window.UAV_FILTERS = ${JSON.stringify(uav.FILTERS)};`;
  const senBlock =
    `// generated by build/build.mjs — do not edit by hand\n` +
    `window.SENSOR_DATA = ${JSON.stringify(sen.rows)};\n` +
    `window.SENSOR_FILTERS = ${JSON.stringify(sen.FILTERS)};\n` +
    `window.SENSOR_MAX = ${JSON.stringify(sen.MAX)};`;

  const tpl = readFileSync(join(__dir, "template.html"), "utf-8");
  const out = tpl
    .replace("/*__UAV_DATA_BLOCK__*/", uavBlock)
    .replace("/*__SENSOR_DATA_BLOCK__*/", senBlock);
  writeFileSync(join(__dir, "..", "index.html"), out);
  console.log(`Built index.html — ${uav.rows.length} UAVs, ${sen.rows.length} sensors (gate: ${PUBLISH_STATUSES ? PUBLISH_STATUSES.join("/") : "all"}).`);
};

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) run().catch((e) => { console.error(e); process.exit(1); });

export { mapUAV, mapSensor };
