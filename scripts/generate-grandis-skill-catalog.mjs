import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const GRANDIS_ORIGIN = "https://grandislibrary.com";
const PUBLIC_ROOT = path.join(process.cwd(), "public", "library", "grandis");
const OUTPUT_FILE = path.join(process.cwd(), "src", "data", "grandisClassSkillCatalog.ts");

const URL_ID_OVERRIDES = new Map([
  ["arch-mage-fire-poison", "fire-poison-mage"],
  ["arch-mage-ice-lightning", "ice-lightning-mage"]
]);

const SECTION_TYPES = {
  active: "buff",
  toggles: "buff",
  summons: "summon",
  buffCd: "cooldown",
  binds: "bind",
  iFrame: "iframe",
  damageReduce: "cooldown"
};

const SECTION_KEYS = {
  active: "activeBuffIcons",
  toggles: "toggleIcons",
  summons: "summonIcons",
  buffCd: "cooldownSkillIcons",
  binds: "bindSkillIcons",
  iFrame: "iframeSkillIcons",
  damageReduce: "damageReductionIcons"
};

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "SNAILSLAYER library asset sync" }
  });
  if (!response.ok) {
    throw new Error(`Failed ${url}: ${response.status}`);
  }
  return response.text();
}

async function downloadAsset(sourcePath) {
  if (!sourcePath || !sourcePath.startsWith("/")) return "";
  const localPath = path.join(PUBLIC_ROOT, sourcePath.replace(/^\//, ""));
  if (!existsSync(localPath)) {
    await mkdir(path.dirname(localPath), { recursive: true });
    const response = await fetch(`${GRANDIS_ORIGIN}${sourcePath}`, {
      headers: { "user-agent": "SNAILSLAYER library asset sync" }
    });
    if (!response.ok) {
      console.warn(`Skipping missing Grandis asset ${sourcePath}: ${response.status}`);
      return "";
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(localPath, buffer);
  }
  return `/library/grandis${sourcePath}`;
}

function htmlDecode(value = "") {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function classIdFromUrl(url) {
  const slug = url.split("/").filter(Boolean).pop() ?? "";
  return URL_ID_OVERRIDES.get(slug) ?? slug;
}

function cleanLabel(label = "Skill") {
  return htmlDecode(label)
    .replace(/\s*\([^)]*Job\)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanCooldown(label = "") {
  return htmlDecode(label)
    .replace(/[{}[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTtAttr(attrs, name) {
  const match = attrs.match(new RegExp(`${name}=\\{([^}]*)\\}`));
  return match?.[1]?.trim() ?? "";
}

function normalizeType(label, fallback) {
  const value = `${label} ${fallback}`.toLowerCase();
  if (value.includes("bind")) return "bind";
  if (value.includes("iframe") || value.includes("invincible") || value.includes("death block")) return "iframe";
  if (value.includes("summon") || value.includes("placeable")) return "summon";
  if (value.includes("buff") || value.includes("toggle") || value.includes("mode switch")) return "buff";
  if (fallback === "cooldown") return "cooldown";
  return fallback;
}

async function normalizeSkillSeed(classId, seed, fallbackType) {
  const sourcePath = seed?.icons?.[0] ?? "";
  const icon = await downloadAsset(sourcePath);
  if (!icon) return null;
  const label = cleanLabel(seed.name ?? "Skill");
  const type = normalizeType(label, fallbackType);
  return {
    id: `${classId}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
    label,
    type,
    icon,
    localFallback: icon,
    cooldownLabel: "",
    metaLabel: "",
    description: `${label} appears in the Grandis Library skill data for this class.`
  };
}

async function parseBuffInfoSection(classId, rawSection = "", fallbackType) {
  const matches = [...String(rawSection).matchAll(/<tt\s+([^>]+)>/g)];
  const parsed = [];
  for (const [index, match] of matches.entries()) {
    const attrs = match[1] ?? "";
    const sourcePath = extractTtAttr(attrs, "src");
    const icon = await downloadAsset(sourcePath);
    if (!icon) continue;
    const rawTip = extractTtAttr(attrs, "tip") || `Skill ${index + 1}`;
    const label = cleanLabel(rawTip);
    const type = normalizeType(`${label} ${rawTip}`, fallbackType);
    parsed.push({
      id: `${classId}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${index}`,
      label,
      type,
      icon,
      localFallback: icon,
      cooldownLabel: cleanCooldown(extractTtAttr(attrs, "dur")),
      metaLabel: "",
      description: `${label} appears in the Grandis Library ${fallbackType} section for this class.`
    });
  }
  return parsed;
}

async function extractPreviewSkills(classId, post) {
  const notable = Array.isArray(post.skill?.notable) ? post.skill.notable : [];
  const preview = [];
  const addSkill = async (seed, fallbackType) => {
    const skill = await normalizeSkillSeed(classId, seed, fallbackType);
    if (skill && !preview.some((item) => item.icon === skill.icon)) preview.push(skill);
  };

  for (const seed of notable.slice(0, 24)) {
    await addSkill(seed, "active");
  }

  for (const sectionKey of ["primary", "hyper", "fifth", "sixth"]) {
    const section = post.skill?.[sectionKey];
    if (!section || typeof section !== "object") continue;
    for (const bucket of Object.values(section)) {
      if (!Array.isArray(bucket)) continue;
      for (const seed of bucket) {
        await addSkill(seed, sectionKey === "primary" ? "active" : "cooldown");
        if (preview.length >= 40) return preview;
      }
    }
  }

  for (const seed of notable.slice(24, 40)) {
    const skill = await normalizeSkillSeed(classId, seed, "active");
    if (skill && !preview.some((item) => item.icon === skill.icon)) preview.push(skill);
    if (preview.length >= 40) return preview;
  }
  return preview;
}

async function extractClassCatalog(url) {
  const html = await fetchText(url);
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error(`Missing NEXT_DATA for ${url}`);
  const data = JSON.parse(match[1]);
  const post = data.props?.pageProps?.post;
  if (!post) throw new Error(`Missing post data for ${url}`);
  const classId = classIdFromUrl(url);
  const buffInfo = post.content?.buffInfo ?? {};
  const catalog = {
    classId,
    sourceUrl: url,
    skillPreviewIcons: await extractPreviewSkills(classId, post),
    activeBuffIcons: [],
    toggleIcons: [],
    summonIcons: [],
    cooldownSkillIcons: [],
    bindSkillIcons: [],
    iframeSkillIcons: [],
    damageReductionIcons: []
  };

  for (const [sourceKey, targetKey] of Object.entries(SECTION_KEYS)) {
    catalog[targetKey] = await parseBuffInfoSection(classId, buffInfo[sourceKey], SECTION_TYPES[sourceKey]);
  }

  return catalog;
}

async function getClassUrls() {
  const sitemap = await fetchText(`${GRANDIS_ORIGIN}/sitemap.xml`);
  const nested = [...sitemap.matchAll(/<loc>(https:\/\/grandislibrary\.com\/sitemap-[^<]+)<\/loc>/g)].map((m) => m[1]);
  const xmlDocs = nested.length ? await Promise.all(nested.map(fetchText)) : [sitemap];
  const urls = [];
  for (const xml of xmlDocs) {
    for (const match of xml.matchAll(/<loc>(https:\/\/grandislibrary\.com\/(?:explorers|cygnus-knights|heroes|resistance|nova|sengoku|flora|anima|other|shine|jianghu)\/[^<]+)<\/loc>/g)) {
      urls.push(match[1]);
    }
  }
  return [...new Set(urls)].sort();
}

function toSource(catalog) {
  return `/* Generated by scripts/generate-grandis-skill-catalog.mjs.
 * Source: Grandis Library class pages.
 * Do not edit by hand; rerun the generator when syncing skill icons.
 */

import type { LibrarySkillIconEntry } from "./librarySkillIcons";

export type GrandisClassSkillCatalog = {
  classId: string;
  sourceUrl: string;
  skillPreviewIcons: LibrarySkillIconEntry[];
  activeBuffIcons: LibrarySkillIconEntry[];
  toggleIcons: LibrarySkillIconEntry[];
  summonIcons: LibrarySkillIconEntry[];
  cooldownSkillIcons: LibrarySkillIconEntry[];
  bindSkillIcons: LibrarySkillIconEntry[];
  iframeSkillIcons: LibrarySkillIconEntry[];
  damageReductionIcons: LibrarySkillIconEntry[];
};

export const grandisClassSkillCatalog = ${JSON.stringify(catalog, null, 2)} as const satisfies Record<string, GrandisClassSkillCatalog>;
`;
}

const urls = await getClassUrls();
const catalog = {};
for (const [index, url] of urls.entries()) {
  console.log(`[${index + 1}/${urls.length}] ${url}`);
  const entry = await extractClassCatalog(url);
  catalog[entry.classId] = entry;
}

await writeFile(OUTPUT_FILE, toSource(catalog), "utf8");
console.log(`Wrote ${OUTPUT_FILE}`);
