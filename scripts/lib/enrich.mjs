// Keyword-based relevance gate + theme tagger (free, no LLM).
// Scope = ALL UAV/drone news: specialist drone outlets pass everything;
// general defense outlets must mention a UAV/drone keyword to be kept.

// --- UAV / drone relevance vocabulary (used as the gate for general outlets) ---
const UAV_TERMS = [
  "drone", "drones", "uav", "uavs", "uas", "suas", "rpas", "unmanned aerial",
  "unmanned aircraft", "unmanned system", "loitering munition", "loitering munitions",
  "kamikaze drone", "fpv", "first-person view", "first person view", "quadcopter",
  "multirotor", "multi-rotor", "ucav", "mum-t", "manned-unmanned", "vtol",
  "counter-uas", "counter uas", "c-uas", "cuas", "counter-drone", "counter drone",
  "anti-drone", "anti drone", "drone defence", "drone defense", "uav swarm",
  "drone swarm", "shahed", "bayraktar", "switchblade", "lancet", "mavic",
  "reaper", "predator drone", "global hawk", "uxs", "uxv",
];

// --- theme tags → keyword lists (mapped to the tracker's columns) ---
const THEME_KEYWORDS = {
  "counter-uas": [
    "counter-uas", "counter uas", "c-uas", "cuas", "counter-drone", "counter drone",
    "anti-drone", "anti drone", "drone defence", "drone defense", "interceptor",
    "jammer", "jamming", "rf detection", "detect-track", "defeat", "hard kill", "soft kill",
  ],
  "critical-infra": [
    "airport", "airports", "critical infrastructure", "critical-infrastructure",
    "prison", "stadium", "energy", "power plant", "border", "homeland security",
    "no-fly", "no fly zone", "perimeter",
  ],
  "eu-regulatory": [
    "european union", " eu ", "easa", "regulation", "regulatory", "directive",
    "european commission", "brussels", "nato", "procurement", "tender", "bvlos",
    "u-space", "european defence",
  ],
  "c2-sensors": [
    "command and control", " c2 ", "common operating picture", " cop ",
    "radar", "electro-optical", "eo/ir", "eo-ir", "infrared", " rf ",
    "sensor", "sensors", "battle management", "situational awareness", "fusion",
  ],
  "contract-intel": [
    "contract", "awarded", "award", "acquisition", "acquires", "merger",
    "partnership", "teaming", "unveils", "launches", "raises", "funding",
    "investment", "deal", "order", "selected", "delivery",
  ],
  "ukraine": ["ukraine", "ukrainian", "kyiv", "russia", "russian", "front line", "frontline"],
  "swarm": ["swarm", "swarming"],
  "maritime": ["usv", "unmanned surface", "naval drone", "sea drone", "maritime drone"],
};

const norm = (s) => " " + String(s || "").toLowerCase().replace(/\s+/g, " ") + " ";

// Is this item about UAVs/drones at all? Specialist outlets => always yes.
export function isRelevant(item, source) {
  if (source && source.specialist) return true;
  const hay = norm(item.title + " " + item.summary + " " + (item.categories || []).join(" "));
  return UAV_TERMS.some((t) => hay.includes(t.toLowerCase()));
}

// Assign theme tags. Always includes scope/region hints from the source.
export function tagItem(item, source) {
  const hay = norm(item.title + " " + item.summary + " " + (item.categories || []).join(" "));
  const tags = new Set();
  for (const [theme, words] of Object.entries(THEME_KEYWORDS)) {
    if (words.some((w) => hay.includes(w.toLowerCase()))) tags.add(theme);
  }
  // carry the feed's own categories (lightly normalised), capped
  for (const c of (item.categories || []).slice(0, 4)) {
    const t = String(c).toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (t && t.length <= 30) tags.add(t);
  }
  // region tag from source country (helps EU-buyer filtering)
  if (source && source.country && source.scope === "regional") {
    tags.add("region-" + String(source.country).toLowerCase().split("/")[0].trim().replace(/\s+/g, "-"));
  }
  return [...tags].slice(0, 12);
}
