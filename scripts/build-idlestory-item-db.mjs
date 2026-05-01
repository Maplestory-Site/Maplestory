/**
 * build-idlestory-item-db.mjs
 *
 * Curates a small, bundle-friendly item database for the IdleStory inventory
 * from the full `public/items-feed.json` (5k+ entries).
 *
 * Strategy:
 *   - keep only Equipment with an image URL
 *   - bucket by IdleStory item type (weapon / armor / helmet / ring / amulet)
 *     using DB category keywords
 *   - cap each (type, rarity) combination to PER_BUCKET items
 *   - alphabetical sort for stable output
 *   - write to src/data/idlestoryItemDatabase.json
 *
 * Run: `node scripts/build-idlestory-item-db.mjs`
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FEED_PATH = join(__dirname, "..", "public", "items-feed.json");
const OUT_PATH = join(__dirname, "..", "src", "data", "idlestoryItemDatabase.json");

const PER_BUCKET = 18; // per (type, rarity) — keeps total ~250 items / ~80 KB

const TYPE_CATEGORY_KEYWORDS = {
  weapon: [
    "sword", "dagger", "bow", "polearm", "claw", "wand", "staff", "crossbow",
    "spear", "blunt weapon", "knuckle", "gun", "cane", "fan", "tuner",
    "ancient bow", "katana", "shining rod", "lapis", "dual bowgun", "psy-limiter",
    "energy sword", "soul shooter", "scepter", "whip blade", "chain", "cards",
    "claw of the immortal", "desperado"
  ],
  armor: ["top", "bottom", "overall", "coat", "mail", "robe", "shoulder", "shoulders"],
  helmet: ["hat", "cap", "helmet", "headgear"],
  ring: ["ring"],
  amulet: ["pendant", "necklace", "amulet"]
};

const RARITY_MAP = {
  common: "common",
  rare: "rare",
  epic: "epic",
  unique: "epic",
  legendary: "legendary",
  uncommon: "uncommon"
};

function normalizeRarity(raw) {
  if (!raw) return "common";
  return RARITY_MAP[String(raw).toLowerCase()] ?? "common";
}

function classifyType(category) {
  if (!category) return null;
  const lower = category.toLowerCase();
  for (const [type, keywords] of Object.entries(TYPE_CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) return type;
  }
  return null;
}

function main() {
  const feed = JSON.parse(readFileSync(FEED_PATH, "utf8"));
  const equipment = feed.items.filter((i) => i.type === "Equipment" && i.image);

  // Group by (type, rarity)
  const buckets = {};
  for (const item of equipment) {
    const type = classifyType(item.category);
    if (!type) continue;
    const rarity = normalizeRarity(item.rarity);
    const bucketKey = `${type}::${rarity}`;
    if (!buckets[bucketKey]) buckets[bucketKey] = [];
    buckets[bucketKey].push({
      id: item.id,
      name: item.name,
      image: item.image,
      type: item.type,
      category: item.category,
      rarity,
      level: item.level ?? null,
      idleType: type
    });
  }

  // Sort each bucket alphabetically and cap
  const out = [];
  const counts = {};
  for (const key of Object.keys(buckets).sort()) {
    const arr = buckets[key];
    arr.sort((a, b) => a.name.localeCompare(b.name));
    const sample = arr.slice(0, PER_BUCKET);
    counts[key] = sample.length;
    out.push(...sample);
  }

  const meta = {
    generatedAt: new Date().toISOString(),
    sourceCount: equipment.length,
    bundledCount: out.length,
    perBucketCap: PER_BUCKET,
    bucketSizes: counts
  };

  writeFileSync(OUT_PATH, JSON.stringify({ meta, items: out }, null, 2), "utf8");
  console.log(`Wrote ${out.length} items to ${OUT_PATH}`);
  console.log("Bucket sizes:");
  for (const [k, v] of Object.entries(counts).sort()) console.log(`  ${k.padEnd(28)} ${v}`);
}

main();
