import type { IdleItemCategory, IdleItemInstance, IdleItemRarity, IdleItemType } from "./itemSystem";
import { getItemSetDefinition } from "./setSystem";
// Curated MapleStory item database (148 entries) bundled from public/items-feed.json
// via scripts/build-idlestory-item-db.mjs. Used as a built-in fallback so every
// IdleStory item resolves to a real image without callers passing a database.
import bundleJson from "../../../../data/idlestoryItemDatabase.json";

export type ItemDatabaseEntry = {
  id: string;
  name: string;
  image?: string | null;
  type?: string;
  category?: string;
  rarity?: string;
  description?: string;
  level?: number | null;
  idleType?: IdleItemType;
  mapleId?: string | number;
  imageFile?: string;
  wikiUrl?: string;
  effect?: string;
  sourceMonsters?: string[];
  rewardSources?: string[];
  npcSources?: string[];
  craftSources?: string[];
  sourceCount?: number;
};

export type ItemRarityStyle = {
  color: string;
  glow: string;
  border: string;
  label: string;
};

export type ResolvedItemVisuals = {
  icon: string;
  image: string;
  fallbackIcon: string;
  metadata: ItemDatabaseEntry | null;
  rarityStyle: ItemRarityStyle;
  rarityLabel: string;
  typeLabel: string;
  categoryLabel: string;
  description: string;
  sourceLabel: string;
  dropSourceLabel: string;
  databaseUrl?: string;
  tags: string[];
};


type RawBundle = { items: Array<Partial<ItemDatabaseEntry> & { id: string; name: string; image: string }> };
const bundle = bundleJson as RawBundle;
export const BUNDLED_ITEM_DATABASE: readonly ItemDatabaseEntry[] = bundle.items.map((entry) => ({
  id: entry.id,
  name: entry.name,
  image: entry.image,
  type: entry.type,
  category: entry.category,
  rarity: entry.rarity,
  level: entry.level ?? null,
  idleType: entry.idleType
}));

const FALLBACK_ICON: Record<IdleItemType, string> = {
  weapon: "/idlestory/items/weapon.svg",
  armor: "/idlestory/items/armor.svg",
  helmet: "/idlestory/items/helmet.svg",
  ring: "/idlestory/items/ring.svg",
  amulet: "/idlestory/items/amulet.svg"
};

const TYPE_LABEL: Record<IdleItemType, string> = {
  weapon: "Weapon",
  armor: "Armor",
  helmet: "Helmet",
  ring: "Ring",
  amulet: "Amulet"
};

const CATEGORY_LABEL: Record<IdleItemCategory, string> = {
  weapon: "Weapon",
  armor: "Armor",
  accessory: "Accessory"
};

const RARITY_STYLE: Record<IdleItemRarity, ItemRarityStyle> = {
  common: { color: "#cdd1d6", glow: "0 0 0 1px rgba(205,209,214,0.45)", border: "rgba(205,209,214,0.4)", label: "Common" },
  uncommon: { color: "#7ee2a4", glow: "0 0 12px rgba(126,226,164,0.35)", border: "rgba(126,226,164,0.6)", label: "Uncommon" },
  rare: { color: "#7bd9ff", glow: "0 0 16px rgba(123,217,255,0.45)", border: "rgba(123,217,255,0.7)", label: "Rare" },
  epic: { color: "#b997ff", glow: "0 0 22px rgba(185,151,255,0.55)", border: "rgba(185,151,255,0.8)", label: "Epic" },
  legendary: { color: "#f6c66a", glow: "0 0 28px rgba(246,198,106,0.65)", border: "rgba(246,198,106,0.92)", label: "Legendary" }
};

const TYPE_DATABASE_CATEGORIES: Record<IdleItemType, string[]> = {
  weapon: ["one-handed sword", "two-handed sword", "polearm", "spear", "wand", "staff", "bow", "dagger", "claw", "knuckle", "gun", "weapon"],
  armor: ["overall", "top", "bottom", "armor", "coat", "robe", "suit"],
  helmet: ["hat", "cap", "helmet", "headgear"],
  ring: ["ring"],
  amulet: ["pendant", "necklace", "amulet"]
};

function normalizeText(text: unknown): string {
  return String(text ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizeLoose(text: unknown): string {
  return String(text ?? "").toLowerCase();
}

function stableIndex(seed: string, length: number): number {
  if (length <= 0) return 0;
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % length;
}

function isUsableImage(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && (/^(https?:)?\/\//.test(value) || value.startsWith("/"));
}

function firstUsableImage(...values: unknown[]): string | undefined {
  return values.find(isUsableImage);
}

function getEntryId(entry: ItemDatabaseEntry): string {
  return normalizeText(entry.id || entry.mapleId || entry.name);
}

function getDatabaseImage(entry: ItemDatabaseEntry | null): string | undefined {
  return entry ? firstUsableImage(entry.image, entry.imageFile) : undefined;
}

function getItemExplicitImage(item: Partial<IdleItemInstance>): string | undefined {
  return firstUsableImage(item.icon, item.image);
}

function matchesType(item: Pick<IdleItemInstance, "type">, entry: ItemDatabaseEntry): boolean {
  if (entry.idleType === item.type) return true;
  const candidates = TYPE_DATABASE_CATEGORIES[item.type] ?? [];
  const haystack = `${normalizeLoose(entry.category)} ${normalizeLoose(entry.type)}`;
  return candidates.some((candidate) => haystack.includes(candidate));
}

export function getItemFallbackIcon(item: Pick<IdleItemInstance, "type"> & Partial<Pick<IdleItemInstance, "fallbackIcon">>): string {
  return isUsableImage(item.fallbackIcon) ? item.fallbackIcon : FALLBACK_ICON[item.type] ?? FALLBACK_ICON.weapon;
}

export function getItemTypeLabel(type: IdleItemType): string {
  return TYPE_LABEL[type] ?? "Item";
}

export function getItemRarityStyle(rarity: IdleItemRarity): ItemRarityStyle {
  return RARITY_STYLE[rarity] ?? RARITY_STYLE.common;
}

export function getItemRarityColor(rarity: IdleItemRarity): string {
  return getItemRarityStyle(rarity).color;
}

export function getItemRarityGlow(rarity: IdleItemRarity): string {
  return getItemRarityStyle(rarity).glow;
}

export function getItemDatabaseMatch(
  item: Pick<IdleItemInstance, "name" | "type"> & Partial<Pick<IdleItemInstance, "id" | "zoneIndex" | "databaseId" | "mapleId">>,
  database: readonly ItemDatabaseEntry[] = []
): ItemDatabaseEntry | null {
  // Try the caller-supplied database first, then the always-available bundled
  // database. This way every IdleStory item resolves to a real MapleStory
  // sprite even when the runtime UI does not pass an explicit list.
  const sources = database.length ? [database, BUNDLED_ITEM_DATABASE] : [BUNDLED_ITEM_DATABASE];
  for (const list of sources) {
    const directIds = [item.databaseId, item.mapleId, item.id].map(normalizeText).filter(Boolean);
    const directMatch = list.find((entry) => directIds.includes(getEntryId(entry)));
    if (directMatch) return directMatch;
    const normalizedName = normalizeText(item.name);
    if (normalizedName) {
      const exact = list.find((entry) => normalizeText(entry.name) === normalizedName);
      if (exact) return exact;
    }
    const candidates = list.filter((entry) => matchesType(item, entry) && isUsableImage(entry.image));
    if (candidates.length) {
      return candidates[stableIndex(`${item.id ?? ""}-${item.name}-${item.zoneIndex ?? 0}`, candidates.length)] ?? null;
    }
  }
  return null;
}


export function getItemIcon(
  item: Pick<IdleItemInstance, "name" | "type"> & Partial<Pick<IdleItemInstance, "id" | "zoneIndex" | "fallbackIcon" | "databaseId" | "mapleId" | "icon" | "image">>,
  database: readonly ItemDatabaseEntry[] = []
): string {
  return getItemExplicitImage(item) ?? getDatabaseImage(getItemDatabaseMatch(item, database)) ?? getItemFallbackIcon(item);
}

export function getItemImage(
  item: Pick<IdleItemInstance, "name" | "type"> & Partial<Pick<IdleItemInstance, "id" | "zoneIndex" | "fallbackIcon" | "databaseId" | "mapleId" | "icon" | "image">>,
  database: readonly ItemDatabaseEntry[] = []
): string {
  return firstUsableImage(item.image, getDatabaseImage(getItemDatabaseMatch(item, database)), item.icon) ?? getItemFallbackIcon(item);
}

export function getItemDatabaseMetadata(
  item: Pick<IdleItemInstance, "name" | "type"> & Partial<Pick<IdleItemInstance, "id" | "zoneIndex" | "databaseId" | "mapleId">>,
  database: readonly ItemDatabaseEntry[] = []
): ItemDatabaseEntry | null {
  return getItemDatabaseMatch(item, database);
}

function joinSources(values: Array<string[] | string | undefined>): string {
  const flat = values.flatMap((value) => Array.isArray(value) ? value : value ? [value] : []);
  return flat.filter(Boolean).slice(0, 3).join(", ");
}

export function resolveItemVisuals(
  item: IdleItemInstance,
  database: readonly ItemDatabaseEntry[] = []
): ResolvedItemVisuals {
  const metadata = getItemDatabaseMatch(item, database);
  const fallbackIcon = getItemFallbackIcon(item);
  const setDefinition = getItemSetDefinition(item.setId);
  const rarityStyle = getItemRarityStyle(item.rarity);
  const sourceLabel = joinSources([
    item.source,
    metadata?.sourceMonsters,
    metadata?.rewardSources,
    metadata?.npcSources,
    metadata?.craftSources
  ]) || "IdleStory drop";
  const databaseUrl = item.databaseUrl ?? metadata?.wikiUrl;
  const tags = Array.from(new Set([
    ...(item.tags ?? []),
    item.type,
    item.category,
    item.rarity,
    setDefinition ? "set" : "",
    item.isUnique ? "unique" : "",
    item.isRareDrop ? "rare-drop" : ""
  ].filter(Boolean)));

  return {
    icon: getItemIcon(item, database),
    image: getItemImage(item, database),
    fallbackIcon,
    metadata,
    rarityStyle,
    rarityLabel: rarityStyle.label,
    typeLabel: getItemTypeLabel(item.type),
    categoryLabel: CATEGORY_LABEL[item.category] ?? "Item",
    description: item.description ?? metadata?.description ?? metadata?.effect ?? `${rarityStyle.label} ${getItemTypeLabel(item.type)} for IdleStory progression.`,
    sourceLabel,
    dropSourceLabel: item.dropSource ?? item.droppedFrom ?? sourceLabel,
    databaseUrl,
    tags
  };
}

export function getItemPower(item: Pick<IdleItemInstance, "stats">): number {
  const s = item.stats;
  return Math.max(
    0,
    Math.round(
      Math.max(0, s.attack) * 1.0 +
      Math.max(0, s.defense) * 0.4 +
      Math.max(0, s.hp) * 0.05 +
      Math.max(0, s.critChance) * 50 +
      Math.max(0, s.critDamage) * 30 +
      Math.max(0, s.attackSpeed) * 40 +
      Math.max(0, s.damageMultiplier) * 60 +
      Math.max(0, s.goldMultiplier) * 10 +
      Math.max(0, s.xpMultiplier) * 10
    )
  );
}

export type StatDelta = {
  key: keyof IdleItemInstance["stats"];
  current: number;
  candidate: number;
  delta: number;
  better: boolean;
};

export function compareItemStats(
  current: Pick<IdleItemInstance, "stats"> | null,
  candidate: Pick<IdleItemInstance, "stats">
): StatDelta[] {
  const deltas: StatDelta[] = [];
  const candidateStats = candidate.stats;
  const currentStats = current?.stats;
  for (const key of Object.keys(candidateStats) as Array<keyof IdleItemInstance["stats"]>) {
    const cand = Number(candidateStats[key]) || 0;
    const cur = currentStats ? Number(currentStats[key]) || 0 : 0;
    if (cand === cur) continue;
    deltas.push({ key, current: cur, candidate: cand, delta: cand - cur, better: cand > cur });
  }
  deltas.sort((a, b) => Number(b.better) - Number(a.better) || Math.abs(b.delta) - Math.abs(a.delta));
  return deltas;
}

export function isItemUpgrade(
  current: Pick<IdleItemInstance, "stats"> | null,
  candidate: Pick<IdleItemInstance, "stats">
): boolean {
  if (!current) return true;
  return getItemPower(candidate) > getItemPower(current);
}
