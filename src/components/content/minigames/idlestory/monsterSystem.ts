/**
 * IdleStory World monster ecosystem.
 *
 * Map identity lives in monsters.json. This module enriches that content with
 * combat numbers, encounter helpers, and legacy DatabaseMonster compatibility.
 */

import type { DatabaseMonster } from "./gameEngine";
import MONSTER_MAPS_RAW from "./monsters.json";

export type MonsterType = "normal" | "elite" | "boss";
export type MonsterRarity = "common" | "rare" | "epic" | "legendary";
export type MonsterElement =
  | "neutral"
  | "nature"
  | "earth"
  | "dark"
  | "shadow"
  | "poison"
  | "stone"
  | "arcane"
  | "time"
  | "ice"
  | "water"
  | "fire"
  | "wind"
  | "lightning"
  | "metal"
  | "holy"
  | "void";

export type MonsterAbility = {
  id: string;
  name: string;
  effect: string;
  cooldown: number;
  description: string;
};

export type MonsterTraitId =
  | "steady"
  | "fast"
  | "tank"
  | "crit"
  | "swarm"
  | "ranged"
  | "poison"
  | "shielded"
  | "berserk"
  | "lifesteal"
  | "burst"
  | "summoner";

export type MonsterTrait = {
  id: MonsterTraitId;
  name: string;
  description: string;
  behaviorTag: string;
  multipliers: {
    hp?: number;
    attack?: number;
    defense?: number;
    attackSpeed?: number;
    xp?: number;
    gold?: number;
  };
};

export type BossMechanic = {
  id: string;
  name: string;
  trigger: "phase_1" | "phase_2" | "phase_3" | "timer" | "summon";
  description: string;
};

export type MonsterVariantProfile = {
  id: string;
  label: string;
  namePrefix?: string;
  nameSuffix?: string;
  traitIds: MonsterTraitId[];
  rewardBias: number;
};

export type RawMonsterSeed = {
  id: string;
  name: string;
  rarity: MonsterRarity;
  elementalType?: MonsterElement;
  specialTrait: string;
  description?: string;
  imageKey?: string;
  spriteKey?: string;
  spawnWeight?: number;
  abilities?: MonsterAbility[];
  phaseHooks?: string[];
};

export type RawMapMonsterContent = {
  mapId: string;
  name: string;
  theme: string;
  region: string;
  levelRequirement: number;
  recommendedPower: number;
  difficultyTier: "starter" | "early" | "mid" | "advanced" | "late" | "endgame";
  flavorText: string;
  normalMonsters: RawMonsterSeed[];
  eliteMonster: RawMonsterSeed;
  bossMonster: RawMonsterSeed;
};

export type MonsterDrop = {
  name: string;
  rarity: string;
  kind: string;
  weight?: number;
};

export type MapMonster = DatabaseMonster & {
  mapId: string;
  type: MonsterType;
  tier: MonsterType;
  theme: string;
  attack: number;
  defense: number;
  attackSpeed: number;
  xpReward: number;
  goldReward: number;
  rarity: MonsterRarity;
  elementalType: MonsterElement;
  specialTrait: string;
  traits: MonsterTrait[];
  behaviorTags: string[];
  archetypeId: string;
  variantId: string;
  variantLabel: string;
  roleIdentity: string;
  title?: string;
  mechanics: BossMechanic[];
  description?: string;
  imageKey?: string;
  spriteKey?: string;
  spawnWeight: number;
  abilities: MonsterAbility[];
  phaseHooks: string[];
};

export type MapMonsterContent = {
  id: string;
  mapId: string;
  name: string;
  theme: string;
  region: string;
  levelRequirement: number;
  recommendedPower: number;
  difficultyTier: RawMapMonsterContent["difficultyTier"];
  flavorText: string;
  monsterPool: MapMonster[];
  eliteMonster: MapMonster;
  bossMonster: MapMonster;
};

const RAW_MAPS = MONSTER_MAPS_RAW as RawMapMonsterContent[];
const MAP_STAGE_COUNT = 10;
const ELITE_STAGE_IN_MAP = 9;
const BOSS_STAGE_IN_MAP = 10;

const TYPE_MULTIPLIER: Record<MonsterType, { hp: number; attack: number; defense: number; xp: number; gold: number }> = {
  normal: { hp: 1, attack: 1, defense: 1, xp: 1, gold: 1 },
  elite: { hp: 3.2, attack: 1.7, defense: 1.65, xp: 3, gold: 3.2 },
  boss: { hp: 8.8, attack: 2.6, defense: 2.3, xp: 10, gold: 8 }
};

const RARITY_SCORE: Record<MonsterRarity, number> = {
  common: 1,
  rare: 1.18,
  epic: 1.45,
  legendary: 1.85
};

const TRAIT_LIBRARY: Record<MonsterTraitId, MonsterTrait> = {
  steady: {
    id: "steady",
    name: "Steady",
    description: "Balanced baseline behavior with no extreme weakness.",
    behaviorTag: "baseline",
    multipliers: { hp: 1, attack: 1, defense: 1, attackSpeed: 1, xp: 1, gold: 1 }
  },
  fast: {
    id: "fast",
    name: "Fast",
    description: "Attacks quickly and pressures idle DPS checks.",
    behaviorTag: "quick_attacker",
    multipliers: { hp: 0.9, attack: 0.96, attackSpeed: 1.3, xp: 1.06 }
  },
  tank: {
    id: "tank",
    name: "Tank",
    description: "High HP and defense, slower but harder to clear.",
    behaviorTag: "durable_wall",
    multipliers: { hp: 1.45, attack: 0.9, defense: 1.45, attackSpeed: 0.86, xp: 1.12, gold: 1.12 }
  },
  crit: {
    id: "crit",
    name: "Crit",
    description: "Lower durability, but dangerous spike damage windows.",
    behaviorTag: "crit_spike",
    multipliers: { hp: 0.94, attack: 1.24, attackSpeed: 1.08, xp: 1.08 }
  },
  swarm: {
    id: "swarm",
    name: "Swarm",
    description: "Small enemies tuned for quick repeated kills.",
    behaviorTag: "multi_spawn",
    multipliers: { hp: 0.78, attack: 0.88, attackSpeed: 1.22, xp: 0.92, gold: 0.95 }
  },
  ranged: {
    id: "ranged",
    name: "Ranged",
    description: "Keeps pressure from distance with cleaner attack uptime.",
    behaviorTag: "ranged_pressure",
    multipliers: { hp: 0.98, attack: 1.14, attackSpeed: 1.12, xp: 1.05 }
  },
  poison: {
    id: "poison",
    name: "Poison",
    description: "Future-ready damage-over-time pressure.",
    behaviorTag: "damage_over_time",
    multipliers: { hp: 1.04, attack: 1.1, defense: 1.04, xp: 1.08, gold: 1.04 }
  },
  shielded: {
    id: "shielded",
    name: "Shielded",
    description: "Reduced incoming damage profile for future shield phases.",
    behaviorTag: "damage_reduction",
    multipliers: { hp: 1.18, defense: 1.7, attackSpeed: 0.95, xp: 1.12, gold: 1.1 }
  },
  berserk: {
    id: "berserk",
    name: "Berserk",
    description: "Damage increases over time if not cleared quickly.",
    behaviorTag: "ramp_damage",
    multipliers: { hp: 1.1, attack: 1.28, attackSpeed: 1.08, xp: 1.18, gold: 1.08 }
  },
  lifesteal: {
    id: "lifesteal",
    name: "Lifesteal",
    description: "Future-ready healing on hit / sustain behavior.",
    behaviorTag: "self_heal",
    multipliers: { hp: 1.16, attack: 1.05, defense: 1.12, xp: 1.16, gold: 1.1 }
  },
  burst: {
    id: "burst",
    name: "Burst",
    description: "Dangerous cooldown-based damage spike.",
    behaviorTag: "burst_window",
    multipliers: { hp: 1.02, attack: 1.38, attackSpeed: 0.94, xp: 1.15, gold: 1.08 }
  },
  summoner: {
    id: "summoner",
    name: "Summoner",
    description: "Can call adds in future encounter scripts.",
    behaviorTag: "summon_adds",
    multipliers: { hp: 1.12, attack: 1.02, defense: 1.08, xp: 1.14, gold: 1.14 }
  }
};

const BASE_VARIANT: MonsterVariantProfile = {
  id: "base",
  label: "Baseline",
  traitIds: ["steady"],
  rewardBias: 1
};

const THEME_VARIANT_TRAITS: Record<string, MonsterTraitId[]> = {
  meadow: ["fast", "swarm", "tank"],
  forest: ["ranged", "poison", "fast"],
  sewer: ["poison", "fast", "swarm"],
  wasteland: ["tank", "berserk", "crit"],
  dungeon: ["lifesteal", "burst", "shielded"],
  clocktower: ["fast", "shielded", "ranged"],
  "sci-fi": ["ranged", "burst", "shielded"],
  frozen: ["shielded", "tank", "ranged"],
  ice_cave: ["burst", "shielded", "lifesteal"],
  underwater: ["shielded", "swarm", "poison"],
  dragon_forest: ["berserk", "crit", "ranged"],
  cliff: ["crit", "berserk", "fast"],
  desert: ["poison", "ranged", "tank"],
  temple: ["shielded", "summoner", "burst"],
  ruins: ["summoner", "lifesteal", "shielded"],
  swamp: ["poison", "lifesteal", "swarm"],
  sky: ["fast", "ranged", "crit"],
  lava: ["berserk", "burst", "tank"],
  void: ["burst", "lifesteal", "summoner"]
};

const TRAIT_NAME_PREFIX: Record<MonsterTraitId, string> = {
  steady: "Wild",
  fast: "Swift",
  tank: "Armored",
  crit: "Sharp",
  swarm: "Tiny",
  ranged: "Watchful",
  poison: "Toxic",
  shielded: "Guarded",
  berserk: "Frenzied",
  lifesteal: "Draining",
  burst: "Charged",
  summoner: "Caller"
};

const ELITE_TRAITS_BY_THEME: Record<string, MonsterTraitId[]> = {
  meadow: ["shielded", "burst"],
  forest: ["poison", "ranged"],
  sewer: ["poison", "lifesteal"],
  wasteland: ["shielded", "berserk"],
  dungeon: ["lifesteal", "burst"],
  clocktower: ["shielded", "fast"],
  "sci-fi": ["shielded", "summoner"],
  frozen: ["shielded", "burst"],
  ice_cave: ["burst", "lifesteal"],
  underwater: ["lifesteal", "shielded"],
  dragon_forest: ["berserk", "crit"],
  cliff: ["crit", "burst"],
  desert: ["poison", "ranged"],
  temple: ["shielded", "summoner"],
  ruins: ["summoner", "lifesteal"],
  swamp: ["poison", "lifesteal"],
  sky: ["fast", "ranged"],
  lava: ["berserk", "burst"],
  void: ["burst", "summoner"]
};

const BOSS_IDENTITY_BY_THEME: Record<string, string> = {
  meadow: "Field Matriarch",
  forest: "Cursed Guardian",
  sewer: "Drain Tyrant",
  wasteland: "Canyon Colossus",
  dungeon: "Royal Aberration",
  clocktower: "Time Core",
  "sci-fi": "Alien Commander",
  frozen: "Mountain Alpha",
  ice_cave: "Sealed Demon",
  underwater: "Abyss Sovereign",
  dragon_forest: "Dragon Regent",
  cliff: "Nest Warlord",
  desert: "Sand Emperor",
  temple: "Ancient Keeper",
  ruins: "Relic Warden",
  swamp: "Toxic Ancient",
  sky: "Storm Herald",
  lava: "Magma King",
  void: "Dimensional Horror"
};

// ─── Sprite → Emoji portrait map ─────────────────────────────────────────────
// Maps each monster's spriteKey to a single emoji used as the portrait
// when no CDN image is available (all local monsters fall into this path).

const SPRITE_PORTRAIT_MAP: Record<string, string> = {
  // Henesys — meadow
  snail_blue: "🐌", snail_red: "🐌", orange_mushroom: "🍄",
  ribbon_piglet: "🐷", green_spore: "🌿",
  angry_mushroom_guard: "🍄", mushmom: "👑",

  // Ellinia — forest
  forest_slime: "🟢", tree_sprite: "🌳", faerie_wisp: "✨",
  horned_mushroom: "🍄", green_eye: "👁️",
  curse_eye_stalker: "👁️", elder_curse_eye: "👁️",

  // Kerning — sewer
  sewer_rat: "🐀", bubbling: "💧", jr_ligator: "🐊",
  pipe_specter: "👻", toxic_slime: "🟢",
  croco_enforcer: "🐊", king_ligator: "🐊",

  // Perion — wasteland
  axe_stump: "🪵", fire_boar: "🐗", rock_lizard: "🦎",
  copper_drake: "🐉", dust_golem: "🗿",
  dark_stone_golem: "🗿", stone_golem_prime: "🗿",

  // Sleepywood — dungeon
  cave_slime: "🟤", dungeon_bat: "🦇", jr_boogie: "👿",
  dark_drake: "🐲", stone_worm: "🪱",
  tauromacis_sentinel: "🐂", king_slime: "👑",

  // Ludibrium — clocktower
  block_golem: "🧱", toy_trojan: "🐴", tick_tockling: "⏰",
  doll_mender: "🪆", gear_rat: "⚙️",
  master_chronos: "🕰️", tick_tock: "🕰️",

  // Omega Sector — sci-fi
  barnard_gray: "👽", mega_gray: "👾", security_bot: "🤖",
  space_drone: "🛸", ultra_gray: "👽",
  chief_gray: "👽", platoon_chronos: "🛸",

  // El Nath — frozen
  pepe: "🐧", hector: "🐺", coolie_zombie: "🧟",
  ice_sprite: "❄️", snow_boar: "🐗",
  ice_sentinel: "🛡️", yeti: "🦣",

  // Ice Valley — ice_cave
  frost_bat: "🦇", ice_golem: "🧊", blue_wyvern: "🐉",
  dark_imp: "😈", cold_shark: "🦈",
  ancient_blue_wyvern: "🐉", jr_balrog: "😈",

  // Aqua Road — underwater
  bubble_fish: "🐠", flower_fish: "🐡", bone_fish: "🐟",
  sea_slime: "💧", ruin_crab: "🦀",
  shark_guardian: "🦈", pianus: "🐟",

  // Minar Forest — dragon_forest
  beetle_drake: "🐛", blood_harp: "🦅", red_kentaurus: "🐎",
  blue_kentaurus: "🐎", forest_wyvern: "🐉",
  white_kentaurus_captain: "🐎", manon: "🐉",

  // Dragon Nest — cliff
  red_wyvern: "🐉", dark_wyvern: "🐲", skeleon: "💀",
  bone_dragon: "💀", cliff_harp: "🦅",
  dark_wyvern_lord: "🐲", griffey: "🦅",

  // Mu Lung — oriental
  bamboo_dummy: "🎋", grass_monk: "🥋", ghost_panda: "🐼",
  crane_wisp: "🕊️", peach_imp: "🍑",
  dojo_master_panda: "🐼", gatekeeper: "⛩️",

  // Nihal Desert — desert
  jr_cactus: "🌵", bellamoa: "🐍", sand_rat: "🐀",
  sand_scorpion: "🦂", dune_spirit: "💨",
  ancient_sand_worm: "🪱", deo: "🌪️",

  // Magatia — alchemy
  homun: "🧪", neo_huroid: "🤖", zenumist_flask: "⚗️",
  alcadno_core: "⚡", mutant_slime: "🧫",
  frankenroid_prototype: "🤖", homunculus: "⚗️",

  // Singapore — urban
  dark_leatty: "🌆", neon_bubbling: "💡", veetron: "⚡",
  gang_shadow: "🌑", traffic_imp: "🚗",
  neon_enforcer: "🚔", krexel: "🌳",

  // Masteria — shadow_city
  shadow_lurker: "🌑", ghost_soldier: "👻", nightmare: "🐴",
  crimson_guard: "🔴", void_bat: "🦇",
  crimson_guardian: "🔴", crimson_balrog: "😈",

  // Crimsonwood — fortress
  phantom_watch: "👁️", dual_ghost_pirate: "🏴‍☠️", crimson_sabre: "⚔️",
  dark_watcher: "👁️", keep_golem: "🏰",
  crimson_keep_captain: "⚔️", headless_horseman: "🐎",

  // Zipangu — shrine
  fox_fire: "🦊", oni: "👺", shrine_ghost: "👻",
  spirit_of_rock: "🪨", lantern_imp: "🏮",
  kitsune_spirit: "🦊", tengu: "👺",

  // Leafre Sky — sky
  cloud_fox: "🦊", wind_drake: "🐉", storm_harp: "🦅",
  sky_whale: "🐋", cloud_imp: "☁️",
  thunder_drake: "⚡", zeno: "⚡",

  // Temple of Time — time
  memory_keeper: "📿", regret_guard: "🛡️", oblivion_monk: "⚫",
  time_soldier: "⚔️", paradox_wisp: "✨",
  paradox_monk: "⏳", time_controller: "⏳",

  // Black Mage's Lair — abyss
  dark_servant: "🌑", void_golem: "⬛", shadow_archon: "🌌",
  black_knight: "⚫", seal_wraith: "💀",
  void_archon: "🌑", black_mage: "🌑",
};

/** Fallback emoji for when spriteKey has no entry in the portrait map. */
const THEME_FALLBACK_PORTRAIT: Record<string, string> = {
  meadow: "🍄", forest: "🌳", sewer: "🐊", wasteland: "🗿",
  dungeon: "🦇", clocktower: "🕰️", "sci-fi": "👽", frozen: "❄️",
  ice_cave: "😈", underwater: "🐟", dragon_forest: "🐉", cliff: "🦅",
  oriental: "🐼", desert: "🌵", alchemy: "⚗️", urban: "🌆",
  shadow_city: "👻", fortress: "⚔️", shrine: "🦊", sky: "☁️",
  time: "⏳", abyss: "🌑",
};

function getMonsterPortrait(seed: RawMonsterSeed, map: RawMapMonsterContent, type: MonsterType): string {
  if (seed.spriteKey) {
    const mapped = SPRITE_PORTRAIT_MAP[seed.spriteKey];
    if (mapped) return mapped;
  }
  if (type === "boss") return THEME_FALLBACK_PORTRAIT[map.theme] ?? "👾";
  if (type === "elite") return "⚡";
  return THEME_FALLBACK_PORTRAIT[map.theme] ?? "👊";
}

function getRawMapIndex(mapId: string): number {
  return Math.max(0, RAW_MAPS.findIndex((entry) => entry.mapId === mapId));
}

function getStageInMap(stage: number): number {
  return ((Math.max(1, stage) - 1) % MAP_STAGE_COUNT) + 1;
}

function getEncounterTypeForStage(stage: number): MonsterType {
  const stageInMap = getStageInMap(stage);
  if (stageInMap === BOSS_STAGE_IN_MAP) return "boss";
  if (stageInMap === ELITE_STAGE_IN_MAP) return "elite";
  return "normal";
}

function buildDropTable(seed: RawMonsterSeed, type: MonsterType): MonsterDrop[] {
  const clean = seed.name.replace(/[^a-zA-Z0-9 ]/g, "").trim();
  const rareWeight = type === "boss" ? 22 : type === "elite" ? 18 : 12;
  const epicWeight = type === "boss" ? 16 : type === "elite" ? 10 : 5;
  return [
    { name: `${clean} Fang`, rarity: "common", kind: "weapon", weight: 28 },
    { name: `${clean} Hide`, rarity: "common", kind: "armor", weight: 24 },
    { name: `${clean} Crest`, rarity: "rare", kind: "helmet", weight: rareWeight },
    { name: `${clean} Band`, rarity: "rare", kind: "ring", weight: 12 },
    { name: `${clean} Heart`, rarity: "epic", kind: "amulet", weight: epicWeight }
  ];
}

function getDropChance(type: MonsterType): number {
  if (type === "boss") return 1;
  if (type === "elite") return 0.32;
  return 0.075;
}

function getTraits(ids: MonsterTraitId[]): MonsterTrait[] {
  const uniqueIds = Array.from(new Set(ids));
  return uniqueIds
    .map((id) => TRAIT_LIBRARY[id])
    .filter((trait): trait is MonsterTrait => Boolean(trait));
}

function combineTraitMultipliers(traits: MonsterTrait[]): Required<MonsterTrait["multipliers"]> {
  return traits.reduce(
    (mult, trait) => ({
      hp: mult.hp * (trait.multipliers.hp ?? 1),
      attack: mult.attack * (trait.multipliers.attack ?? 1),
      defense: mult.defense * (trait.multipliers.defense ?? 1),
      attackSpeed: mult.attackSpeed * (trait.multipliers.attackSpeed ?? 1),
      xp: mult.xp * (trait.multipliers.xp ?? 1),
      gold: mult.gold * (trait.multipliers.gold ?? 1)
    }),
    { hp: 1, attack: 1, defense: 1, attackSpeed: 1, xp: 1, gold: 1 }
  );
}

function getThemeTrait(theme: string, slotIndex: number): MonsterTraitId {
  const themeTraits = THEME_VARIANT_TRAITS[theme] ?? ["fast", "tank", "crit", "ranged"];
  return themeTraits[slotIndex % themeTraits.length] ?? "fast";
}

function buildNormalVariants(_seed: RawMonsterSeed, map: RawMapMonsterContent, slotIndex: number): MonsterVariantProfile[] {
  const themeTrait = getThemeTrait(map.theme, slotIndex);
  return [
    BASE_VARIANT,
    {
      id: themeTrait,
      label: TRAIT_LIBRARY[themeTrait].name,
      namePrefix: TRAIT_NAME_PREFIX[themeTrait],
      traitIds: [themeTrait],
      rewardBias: 1.05 + slotIndex * 0.01
    }
  ];
}

function getEliteTraitIds(map: RawMapMonsterContent, seed: RawMonsterSeed): MonsterTraitId[] {
  const themeTraits = ELITE_TRAITS_BY_THEME[map.theme] ?? ["berserk", "shielded"];
  if (/guard|sentinel|golem|armor|stone|shield/i.test(seed.name + seed.specialTrait)) {
    return ["shielded", themeTraits[0] ?? "berserk"];
  }
  if (/vamp|absorb|drain|leech|slime/i.test(seed.name + seed.specialTrait)) {
    return ["lifesteal", themeTraits[0] ?? "burst"];
  }
  return [themeTraits[0] ?? "berserk", themeTraits[1] ?? "burst"];
}

function getBossTraitIds(_map: RawMapMonsterContent, seed: RawMonsterSeed): MonsterTraitId[] {
  const text = `${seed.name} ${seed.specialTrait} ${seed.description ?? ""}`.toLowerCase();
  const traits: MonsterTraitId[] = ["berserk"];
  if (/shield|guard|stone|armor|shell|scale/.test(text)) traits.push("shielded");
  if (/summon|call|twin|minion/.test(text)) traits.push("summoner");
  if (/poison|toxic|venom|swamp/.test(text)) traits.push("poison");
  if (/absorb|drain|vamp|life/.test(text)) traits.push("lifesteal");
  if (/blast|slam|burst|cleave|storm|rage|breath/.test(text)) traits.push("burst");
  return traits.slice(0, 3);
}

function buildBossMechanics(seed: RawMonsterSeed, map: RawMapMonsterContent): BossMechanic[] {
  const abilityMechanics = (seed.abilities ?? []).slice(0, 2).map((ability, index) => ({
    id: ability.id,
    name: ability.name,
    trigger: index === 0 ? "phase_2" as const : "phase_3" as const,
    description: ability.description
  }));
  const traitMechanics = getBossTraitIds(map, seed).map((traitId, index) => {
    const trait = TRAIT_LIBRARY[traitId];
    return {
      id: `${seed.id}_${traitId}`,
      name: trait.name,
      trigger: index === 0 ? "phase_1" as const : index === 1 ? "phase_2" as const : "phase_3" as const,
      description: trait.description
    };
  });

  return [...abilityMechanics, ...traitMechanics].slice(0, 4);
}

function formatVariantName(seed: RawMonsterSeed, variant: MonsterVariantProfile): string {
  if (variant.id === "base") return seed.name;
  const prefix = variant.namePrefix ? `${variant.namePrefix} ` : "";
  const suffix = variant.nameSuffix ? ` ${variant.nameSuffix}` : "";
  return `${prefix}${seed.name}${suffix}`;
}

function normalizeMonster(
  seed: RawMonsterSeed,
  map: RawMapMonsterContent,
  type: MonsterType,
  slotIndex: number,
  variant: MonsterVariantProfile = BASE_VARIANT
): MapMonster {
  const mapIndex = getRawMapIndex(map.mapId) + 1;
  const rarityMult = RARITY_SCORE[seed.rarity] ?? 1;
  const typeMult = TYPE_MULTIPLIER[type];
  const traitIds =
    type === "boss"
      ? getBossTraitIds(map, seed)
      : type === "elite"
        ? getEliteTraitIds(map, seed)
        : variant.traitIds;
  const traits = getTraits(traitIds);
  const traitMult = combineTraitMultipliers(traits);
  const level =
    type === "boss"
      ? map.levelRequirement + 9
      : type === "elite"
        ? map.levelRequirement + 7
        : map.levelRequirement + Math.floor(slotIndex);
  const baseHp = 38 * Math.pow(Math.max(1, map.levelRequirement), 1.34) + 75 * Math.pow(mapIndex, 1.48);
  const baseAttack = 5 * Math.pow(Math.max(1, map.levelRequirement), 1.1) + mapIndex * 3.5;
  const baseDefense = 2 * Math.pow(Math.max(1, map.levelRequirement), 1.03) + mapIndex * 2;
  const slotBump = 1 + slotIndex * 0.055;
  const rewardBase = 2.8 + Math.pow(mapIndex, 1.22) * 2.35 + map.levelRequirement * 0.16;
  const variantReward = variant.rewardBias ?? 1;
  const monsterName = formatVariantName(seed, variant);
  const mechanics = type === "boss" ? buildBossMechanics(seed, map) : [];
  const roleIdentity =
    type === "boss"
      ? (BOSS_IDENTITY_BY_THEME[map.theme] ?? "Zone Boss")
      : type === "elite"
        ? `${traits.map((trait) => trait.name).join(" / ")} Elite`
        : `${variant.label} ${map.theme} encounter`;

  return {
    id: variant.id === "base" ? seed.id : `${seed.id}_${variant.id}`,
    name: monsterName,
    mapId: map.mapId,
    type,
    tier: type,
    theme: map.theme,
    level,
    hp: Math.max(25, Math.floor(baseHp * typeMult.hp * rarityMult * traitMult.hp * slotBump)),
    attack: Math.max(1, Math.floor(baseAttack * typeMult.attack * rarityMult * traitMult.attack * slotBump)),
    defense: Math.max(0, Math.floor(baseDefense * typeMult.defense * rarityMult * traitMult.defense * slotBump)),
    attackSpeed: Number(((0.82 + mapIndex * 0.014 + (type === "boss" ? 0.08 : type === "elite" ? 0.05 : 0)) * traitMult.attackSpeed).toFixed(2)),
    xpReward: Math.max(1, Math.floor(rewardBase * typeMult.xp * rarityMult * traitMult.xp * slotBump * variantReward)),
    goldReward: Math.max(3, Math.floor((rewardBase * 3.2 + mapIndex * 7) * typeMult.gold * rarityMult * traitMult.gold * slotBump * variantReward)),
    rarity: seed.rarity,
    elementalType: seed.elementalType ?? "neutral",
    specialTrait: seed.specialTrait,
    traits,
    behaviorTags: traits.map((trait) => trait.behaviorTag),
    archetypeId: seed.id,
    variantId: variant.id,
    variantLabel: variant.label,
    roleIdentity,
    title: type === "boss" ? `${monsterName}, ${roleIdentity}` : undefined,
    mechanics,
    description: seed.description
      ? `${seed.description} Trait: ${traits.map((trait) => trait.name).join(", ")}.`
      : `A ${roleIdentity.toLowerCase()} with ${traits.map((trait) => trait.name).join(", ")} behavior.`,
    imageKey: seed.imageKey,
    spriteKey: seed.spriteKey,
    spawnWeight: Math.max(1, Math.floor((seed.spawnWeight ?? (type === "normal" ? 20 : 1)) * (variant.id === "base" ? 1 : 0.7))),
    abilities: seed.abilities ?? [],
    phaseHooks: seed.phaseHooks ?? [],
    image: null,
    portrait: getMonsterPortrait(seed, map, type),
    farmingScore: Math.floor(level * rarityMult * (type === "boss" ? 4 : type === "elite" ? 2.2 : 1)),
    isBoss: type === "boss",
    drops: buildDropTable(seed, type),
    dropTable: buildDropTable(seed, type),
    dropChance: getDropChance(type),
    locations: [{ region: map.region, map: map.name }]
  };
}

function normalizeMap(map: RawMapMonsterContent): MapMonsterContent {
  const monsterPool = map.normalMonsters.flatMap((monster, index) =>
    buildNormalVariants(monster, map, index).map((variant, variantIndex) =>
      normalizeMonster(monster, map, "normal", index + variantIndex * 0.5, variant)
    )
  );
  const eliteMonster = normalizeMonster(map.eliteMonster, map, "elite", monsterPool.length);
  const bossMonster = normalizeMonster(map.bossMonster, map, "boss", monsterPool.length + 1);

  return {
    id: map.mapId,
    mapId: map.mapId,
    name: map.name,
    theme: map.theme,
    region: map.region,
    levelRequirement: map.levelRequirement,
    recommendedPower: map.recommendedPower,
    difficultyTier: map.difficultyTier,
    flavorText: map.flavorText,
    monsterPool,
    eliteMonster,
    bossMonster
  };
}

export const MAP_MONSTER_CONTENT: MapMonsterContent[] = RAW_MAPS.map(normalizeMap);

const MAP_MONSTER_CONTENT_BY_ID = new Map(MAP_MONSTER_CONTENT.map((entry) => [entry.mapId, entry]));

export function getMapMonsterContent(mapId: string): MapMonsterContent | null {
  return MAP_MONSTER_CONTENT_BY_ID.get(mapId) ?? null;
}

export function getMonstersByMap(mapId: string): MapMonster[] {
  return getMapMonsterContent(mapId)?.monsterPool ?? [];
}

export function getEliteByMap(mapId: string): MapMonster | null {
  return getMapMonsterContent(mapId)?.eliteMonster ?? null;
}

export function getBossByMap(mapId: string): MapMonster | null {
  return getMapMonsterContent(mapId)?.bossMonster ?? null;
}

export function getAllMonstersByMap(mapId: string): MapMonster[] {
  const content = getMapMonsterContent(mapId);
  return content ? [...content.monsterPool, content.eliteMonster, content.bossMonster] : [];
}

export function getStageMonsterByMap(mapId: string, stage: number): MapMonster | null {
  const content = getMapMonsterContent(mapId);
  if (!content) return null;

  const encounterType = getEncounterTypeForStage(stage);
  if (encounterType === "boss") return content.bossMonster;
  if (encounterType === "elite") return content.eliteMonster;

  const normalStageIndex = getStageInMap(stage) - 1;
  const mapCycle = Math.floor((Math.max(1, stage) - 1) / MAP_STAGE_COUNT);
  return content.monsterPool[(normalStageIndex + mapCycle) % content.monsterPool.length] ?? content.monsterPool[0] ?? null;
}

export function getRecommendedMapForLevel(level: number): MapMonsterContent {
  const safeLevel = Math.max(1, level);
  return [...MAP_MONSTER_CONTENT]
    .reverse()
    .find((entry) => safeLevel >= entry.levelRequirement) ?? MAP_MONSTER_CONTENT[0]!;
}

export function getRecommendedMapForPower(power: number): MapMonsterContent {
  const safePower = Math.max(0, power);
  return [...MAP_MONSTER_CONTENT]
    .reverse()
    .find((entry) => safePower >= entry.recommendedPower) ?? MAP_MONSTER_CONTENT[0]!;
}

export function getTotalMapMonsterCount(): number {
  return MAP_MONSTER_CONTENT.reduce((sum, map) => sum + map.monsterPool.length + 2, 0);
}

export function getMapMonsterArchetypeCount(mapId: string): number {
  return getMapMonsterContent(mapId)?.monsterPool.reduce((ids, monster) => ids.add(monster.archetypeId), new Set<string>()).size ?? 0;
}

export function getMapEncounterProfile(mapId: string): {
  normalArchetypes: number;
  normalVariants: number;
  elite: MapMonster | null;
  boss: MapMonster | null;
} {
  const content = getMapMonsterContent(mapId);
  return {
    normalArchetypes: content ? getMapMonsterArchetypeCount(mapId) : 0,
    normalVariants: content?.monsterPool.length ?? 0,
    elite: content?.eliteMonster ?? null,
    boss: content?.bossMonster ?? null
  };
}

export function toDatabaseMonster(monster: MapMonster): DatabaseMonster {
  return monster;
}
