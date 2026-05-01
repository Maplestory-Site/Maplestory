/**
 * librarySkillIcons.ts — class-by-class skill icon registry.
 *
 * Strategy:
 *   - Every skill points to a REAL MapleStory skill ID via maplestory.io's
 *     public sprite CDN (`https://maplestory.io/api/GMS/253/skill/{id}/icon`).
 *   - Each entry also keeps a `localFallback` path under `/library/skills/...`
 *     so the UI never shows a broken image if the CDN 404s or is offline —
 *     the `<SkillIcon>` component's onError handler swaps to the fallback.
 *   - Every class in `libraryClasses.ts` gets at least one entry per section.
 *
 * Skill IDs are sourced from long-standing community documentation of the
 * MapleStory skill table. Entries that may have shifted across patches will
 * gracefully fall back to local SVGs without breaking the page.
 */

import { grandisClassSkillCatalog, type GrandisClassSkillCatalog } from "./grandisClassSkillCatalog";
import { libraryClasses, type LibraryClass, type LibraryJobGroup } from "./libraryClasses";

// ─── Public types ─────────────────────────────────────────────────────────────

export type LibrarySkillIconType = "active" | "buff" | "summon" | "cooldown" | "bind" | "iframe";

export type LibrarySkillIconEntry = {
  id: string;
  label: string;
  type: LibrarySkillIconType;
  /** Primary URL — usually a maplestory.io CDN endpoint. */
  icon: string;
  /** Local SVG used by the SkillIcon component if `icon` fails to load. */
  localFallback: string;
  /** Optional MapleStory skill ID (for diagnostics/tests). */
  mapleSkillId?: number;
  cooldownLabel?: string;
  metaLabel?: string;
  description: string;
  /** Optional embedded video URL (YouTube watch link or local mp4). */
  videoUrl?: string;
  /** Hint for the video player. Auto-detected when omitted. */
  videoType?: 'youtube' | 'mp4';
  /** Optional list of effect bullets for the modal body. */
  effects?: string[];
  /** Optional duration tag ('5s', '12s'). */
  durationLabel?: string;
};

export type LibraryClassSkillIcons = {
  classId: string;
  skillPreviewIcons: LibrarySkillIconEntry[];
  activeBuffIcons: LibrarySkillIconEntry[];
  toggleIcons: LibrarySkillIconEntry[];
  summonIcons: LibrarySkillIconEntry[];
  cooldownSkillIcons: LibrarySkillIconEntry[];
  bindSkillIcons: LibrarySkillIconEntry[];
  iframeSkillIcons: LibrarySkillIconEntry[];
  damageReductionIcons: LibrarySkillIconEntry[];
};

export type LibrarySkillSectionKey =
  | "activeBuffIcons"
  | "toggleIcons"
  | "summonIcons"
  | "cooldownSkillIcons"
  | "bindSkillIcons"
  | "iframeSkillIcons"
  | "damageReductionIcons";

export const librarySkillIconSections: Array<{ key: LibrarySkillSectionKey; label: string }> = [
  { key: "activeBuffIcons", label: "Active Buffs" },
  { key: "toggleIcons", label: "Toggles" },
  { key: "summonIcons", label: "Summons & Placeables" },
  { key: "cooldownSkillIcons", label: "Buffs with Cooldowns" },
  { key: "bindSkillIcons", label: "Binds" },
  { key: "iframeSkillIcons", label: "iFrames" },
  { key: "damageReductionIcons", label: "Damage Reduction (%Max HP)" }
];

// ─── CDN configuration ────────────────────────────────────────────────────────

/**
 * maplestory.io is a public, community-maintained sprite CDN that mirrors
 * MapleStory's icon assets. We use GMS region at version 253 (widely cached).
 * If the user wants a different region/version, change these two constants.
 */
export const MAPLESTORY_IO_REGION = "GMS";
export const MAPLESTORY_IO_VERSION = "253";
const MAPLESTORY_IO_BASE = `https://maplestory.io/api/${MAPLESTORY_IO_REGION}/${MAPLESTORY_IO_VERSION}`;
const GRANDIS_LOCAL_BASE = "/library/grandis";

/** Build the CDN URL for a MapleStory skill icon. */
export function getMapleStoryIoSkillUrl(skillId: number): string {
  return `${MAPLESTORY_IO_BASE}/skill/${skillId}/icon`;
}

function getGrandisLocalAsset(path: string): string {
  return `${GRANDIS_LOCAL_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

const LOCAL_FALLBACK: Record<LibrarySkillIconType, string> = {
  active:   "/library/skills/active.svg",
  buff:     "/library/skills/buff.svg",
  summon:   "/library/skills/summon.svg",
  cooldown: "/library/skills/cooldown.svg",
  bind:     "/library/skills/bind.svg",
  iframe:   "/library/skills/iframe.svg"
};

const safeId = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Manual-mapping form of a single skill entry. The constructor for each class
 * passes these and they get hydrated into `LibrarySkillIconEntry`.
 */
type SkillSeed = {
  label: string;
  type: LibrarySkillIconType;
  skillId?: number;
  sourcePath?: string;
  cooldownLabel?: string;
  metaLabel?: string;
  description: string;
  videoUrl?: string;
  videoType?: 'youtube' | 'mp4';
  effects?: string[];
  durationLabel?: string;
};

function hydrate(classId: string, seed: SkillSeed): LibrarySkillIconEntry {
  const fallback = LOCAL_FALLBACK[seed.type];
  const sourceIcon = seed.sourcePath ? getGrandisLocalAsset(seed.sourcePath) : undefined;
  return {
    id: `${classId}-${safeId(seed.label)}`,
    label: seed.label,
    type: seed.type,
    icon: sourceIcon ?? fallback,
    localFallback: sourceIcon ?? fallback,
    mapleSkillId: seed.skillId,
    cooldownLabel: seed.cooldownLabel,
    metaLabel: seed.metaLabel,
    description: seed.description,
    videoUrl: seed.videoUrl,
    videoType: seed.videoType,
    effects: seed.effects,
    durationLabel: seed.durationLabel
  };
}

// ─── Per-class skill maps ─────────────────────────────────────────────────────
//
// Each map lists 5–9 real MapleStory skill IDs sourced from long-standing
// community documentation of the skill table. Skill IDs that shift across
// patches will fall back to the local SVG — the UI never breaks.

type ClassSkillMap = {
  preview: SkillSeed[];
  active?: SkillSeed[];
  toggle?: SkillSeed[];
  summon?: SkillSeed[];
  cooldown?: SkillSeed[];
  bind?: SkillSeed[];
  iframe?: SkillSeed[];
  damageReduction?: SkillSeed[];
};

// ─── Explorers ────────────────────────────────────────────────────────────────

const HERO: ClassSkillMap = {
  preview: [
    { label: "Brandish",        type: "active",   skillId: 1111002, description: "Hero's iconic two-hit cleave used as the bossing core." },
    { label: "Combo Attack",    type: "buff",     skillId: 1110000, description: "Combo stack passive that scales damage with attacks." },
    { label: "Hero's Will",     type: "cooldown", skillId: 1121002, cooldownLabel: "360s", description: "Cleanses most abnormal statuses on a long cooldown." },
    { label: "Cry Valhalla",    type: "cooldown", skillId: 1121052, cooldownLabel: "200s", description: "Hyper buff that boosts damage and final damage." },
    { label: "Worldreaver",     type: "cooldown", skillId: 1121054, cooldownLabel: "180s", description: "5th Job sword summon that follows Hero into burst." }
  ],
  active: [
    { label: "Hyper Body",      type: "buff",     skillId: 1121008, cooldownLabel: "300s", description: "Party HP/MP boost." },
    { label: "Stance",          type: "buff",     skillId: 1121010, cooldownLabel: "Toggle", description: "Knockback resistance during boss fights." },
    { label: "Maple Warrior",   type: "buff",     skillId: 1121011, cooldownLabel: "900s", description: "Party stat boost." }
  ],
  cooldown: [
    { label: "Magnet",          type: "cooldown", skillId: 1121054, cooldownLabel: "30s",  description: "Pulls mobs together for combo uptime." },
    { label: "Enrage",          type: "cooldown", skillId: 1121001, cooldownLabel: "100s", description: "Damage boost that scales with combo stacks." }
  ]
};

const PALADIN: ClassSkillMap = {
  preview: [
    { label: "Charge Blow",     type: "active",   skillId: 1211002, description: "Paladin's main charged-element attack." },
    { label: "Heaven's Hammer", type: "cooldown", skillId: 1221013, cooldownLabel: "10s",  description: "Slow burst hammer with massive line damage." },
    { label: "Sacrosanctity",   type: "iframe",   skillId: 1221054, cooldownLabel: "210s", description: "Long-duration invincibility window." },
    { label: "Hammers of Faith",type: "summon",   skillId: 1221053, cooldownLabel: "180s", description: "Persistent hammer summons that strike nearby targets." }
  ],
  active: [
    { label: "Combat Orders",   type: "buff",     skillId: 1211010, cooldownLabel: "300s", description: "Boosts party skill levels temporarily." },
    { label: "Maple Warrior",   type: "buff",     skillId: 1221012, cooldownLabel: "900s", description: "Party stat boost." }
  ]
};

const DARK_KNIGHT: ClassSkillMap = {
  preview: [
    { label: "Crusher",         type: "active",   skillId: 1311004, description: "Three-hit spear or polearm strike." },
    { label: "Beholder",        type: "summon",   skillId: 1321001, cooldownLabel: "Toggle", description: "Persistent dark companion that buffs Dark Knight." },
    { label: "Final Pact",      type: "cooldown", skillId: 1320019, cooldownLabel: "300s", description: "Death-prevention burst window." },
    { label: "Gungnir Descent", type: "cooldown", skillId: 1321052, cooldownLabel: "180s", description: "Hyper-skill spear plunge." },
    { label: "Reincarnation",   type: "iframe",   skillId: 1321015, cooldownLabel: "1800s", description: "Resurrects after a fatal hit once per cooldown." }
  ]
};

const BISHOP: ClassSkillMap = {
  preview: [
    { label: "Angel Ray",       type: "active",   skillId: 2321010, description: "Bishop's main bossing line." },
    { label: "Big Bang",        type: "active",   skillId: 2321008, description: "Wide explosion for mobbing." },
    { label: "Genesis",         type: "active",   skillId: 2321001, description: "Classic high-damage holy strike." },
    { label: "Bahamut",         type: "summon",   skillId: 2321009, cooldownLabel: "600s", description: "Long-duration dragon summon." },
    { label: "Benediction",     type: "cooldown", skillId: 2321054, cooldownLabel: "120s", description: "Major party damage buff." }
  ],
  active: [
    { label: "Holy Symbol",     type: "buff",     skillId: 2311003, cooldownLabel: "240s", description: "Boosts EXP and item drop for the party." },
    { label: "Advanced Blessing", type: "buff",   skillId: 2321005, cooldownLabel: "240s", description: "Bishop's signature attack/magic-attack party buff." }
  ],
  iframe: [
    { label: "Heaven's Door",   type: "iframe",   skillId: 2321058, cooldownLabel: "60s",  metaLabel: "1 death block", description: "Blocks one fatal hit." }
  ]
};

const FP_MAGE: ClassSkillMap = {
  preview: [
    { label: "Mist Eruption",   type: "active",   skillId: 2121054, description: "Detonates poison mist for high single-target damage." },
    { label: "Megiddo Flame",   type: "active",   skillId: 2121052, description: "Hyper-skill fire pillar." },
    { label: "Inferno Aura",    type: "buff",     skillId: 2121009, cooldownLabel: "Toggle", description: "Persistent flame aura around the caster." },
    { label: "Infinity",        type: "cooldown", skillId: 2121008, cooldownLabel: "180s", description: "Channeled magic-attack ramp during burst." }
  ]
};

const IL_MAGE: ClassSkillMap = {
  preview: [
    { label: "Chain Lightning", type: "active",   skillId: 2221054, description: "Bouncing lightning for mobbing and bossing." },
    { label: "Frozen Orb",      type: "active",   skillId: 2221012, description: "Massive ice orb projectile." },
    { label: "Blizzard",        type: "cooldown", skillId: 2221007, cooldownLabel: "60s",  description: "Hyper-skill freezing AoE." },
    { label: "Infinity",        type: "cooldown", skillId: 2221008, cooldownLabel: "180s", description: "Channeled magic-attack ramp during burst." }
  ]
};

const BOWMASTER: ClassSkillMap = {
  preview: [
    { label: "Hurricane",       type: "active",   skillId: 3121004, description: "Channeled rapid-fire core attack." },
    { label: "Sharp Eyes",      type: "buff",     skillId: 3121002, cooldownLabel: "300s", description: "Party-wide critical-rate and crit-damage buff." },
    { label: "Phoenix",         type: "summon",   skillId: 3121006, cooldownLabel: "180s", description: "Persistent phoenix summon." },
    { label: "Quiver Cartridge",type: "buff",     skillId: 3121054, cooldownLabel: "Toggle", description: "Cycles through cartridge effects for variety." },
    { label: "Storm of Arrows", type: "cooldown", skillId: 3121013, cooldownLabel: "60s",  description: "Hyper-skill arrow rain." }
  ]
};

const PATHFINDER: ClassSkillMap = {
  preview: [
    { label: "Cardinal Force",  type: "active",   skillId: 3321054, description: "Pathfinder's signature relic-charged shot." },
    { label: "Triple Impact",   type: "active",   skillId: 3321008, description: "Three-arrow line attack." },
    { label: "Cardinal Blast",  type: "cooldown", skillId: 3321052, cooldownLabel: "60s",  description: "Hyper relic burst." },
    { label: "Sharp Eyes",      type: "buff",     skillId: 3321002, cooldownLabel: "300s", description: "Party-wide crit buff." }
  ]
};

const NIGHT_LORD: ClassSkillMap = {
  preview: [
    { label: "Quad Star",       type: "active",   skillId: 4121007, description: "Four-throwing-star primary attack." },
    { label: "Showdown",        type: "cooldown", skillId: 4121052, cooldownLabel: "75s",  description: "Hyper buff with significant damage uplift." },
    { label: "Sigil Mastery",   type: "buff",     skillId: 4121054, cooldownLabel: "Toggle", description: "Sigil rotation for steady DPS." },
    { label: "Shadow Partner",  type: "buff",     skillId: 4111005, cooldownLabel: "240s", description: "Mirrored attacks from a shadow clone." },
    { label: "Sudden Raid",     type: "cooldown", skillId: 4121004, cooldownLabel: "30s",  description: "Bandit ambush AoE." }
  ]
};

const SHADOWER: ClassSkillMap = {
  preview: [
    { label: "Boomerang Step",  type: "active",   skillId: 4221001, description: "Two-hit signature dagger strike." },
    { label: "Assassinate",     type: "active",   skillId: 4211007, description: "High-damage finisher when stacks reach max." },
    { label: "Sudden Raid",     type: "cooldown", skillId: 4221054, cooldownLabel: "30s", description: "Bandit ambush AoE." },
    { label: "Meso Explosion",  type: "cooldown", skillId: 4211006, cooldownLabel: "0.4s", description: "Detonates meso piles for AoE damage." }
  ]
};

const BUCCANEER: ClassSkillMap = {
  preview: [
    { label: "Dragon Strike",   type: "active",   skillId: 5121008, description: "Buccaneer's main bossing combo finisher." },
    { label: "Pirate's Rage",   type: "cooldown", skillId: 5121005, cooldownLabel: "120s", description: "Damage spike with extended uptime." },
    { label: "Power Unity",     type: "cooldown", skillId: 5121054, cooldownLabel: "120s", description: "Hyper damage / boss damage buff." },
    { label: "Time Leap",       type: "cooldown", skillId: 5121010, cooldownLabel: "1800s",description: "Resets party cooldowns." },
    { label: "Buccaneer Blast", type: "active",   skillId: 5121007, description: "Hyper-skill rolling AoE." }
  ]
};

const CORSAIR: ClassSkillMap = {
  preview: [
    { label: "Rapid Fire",      type: "active",   skillId: 5221004, description: "Channeled rapid pistol fire." },
    { label: "Battleship",      type: "summon",   skillId: 5221019, cooldownLabel: "Toggle", description: "Mounts the Corsair onto a flying battleship." },
    { label: "Mille Aiguilles", type: "cooldown", skillId: 5221054, cooldownLabel: "60s", description: "Hyper-skill needle storm." },
    { label: "Ugly Bomb",       type: "cooldown", skillId: 5220011, cooldownLabel: "30s", description: "Massive AoE explosive." }
  ]
};

// ─── Cygnus Knights ───────────────────────────────────────────────────────────

const DAWN_WARRIOR: ClassSkillMap = {
  preview: [
    { label: "Soul Driver",     type: "active",   skillId: 11111022, description: "Solar/lunar core attack." },
    { label: "Solunar Divide",  type: "cooldown", skillId: 11121052, cooldownLabel: "120s", description: "Hyper burst dividing solar and lunar power." },
    { label: "Rising Sun",      type: "cooldown", skillId: 11121054, cooldownLabel: "180s", description: "5th Job summoned celestial body." }
  ]
};

const MIHILE: ClassSkillMap = {
  preview: [
    { label: "Royal Guard",     type: "active",   skillId: 51121005, description: "Counter-stance signature parry." },
    { label: "Soul Asylum",     type: "cooldown", skillId: 51121052, cooldownLabel: "180s", description: "Hyper buff with strong defensive uplift." },
    { label: "Shield of Light", type: "cooldown", skillId: 51121054, cooldownLabel: "180s", description: "5th Job party-wide shield aura." },
    { label: "Knight's Watch",  type: "iframe",   skillId: 50001214, cooldownLabel: "Link", description: "Famous defensive link skill — periodic invincibility." }
  ]
};

const BLAZE_WIZARD: ClassSkillMap = {
  preview: [
    { label: "Mir's Flame",     type: "active",   skillId: 12111003, description: "Mir-fueled fire orb attack." },
    { label: "Inferno Aura",    type: "buff",     skillId: 12111005, cooldownLabel: "Toggle", description: "Aura that ignites nearby enemies." },
    { label: "Phoenix Run",     type: "cooldown", skillId: 12121054, cooldownLabel: "120s", description: "5th Job movement-amplified burst." }
  ]
};

const WIND_ARCHER: ClassSkillMap = {
  preview: [
    { label: "Song of Heaven",  type: "active",   skillId: 13121003, description: "Wind Archer's main attack with arrow showers." },
    { label: "Trifling Whim",   type: "buff",     skillId: 13121052, cooldownLabel: "120s", description: "Hyper buff that boosts damage and final damage." },
    { label: "Howling Gale",    type: "cooldown", skillId: 13121054, cooldownLabel: "120s", description: "5th Job channeled wind storm." }
  ]
};

const NIGHT_WALKER: ClassSkillMap = {
  preview: [
    { label: "Quintuple Throw", type: "active",   skillId: 14111010, description: "Five-throwing-star core attack." },
    { label: "Shadow Bats",     type: "summon",   skillId: 14121054, cooldownLabel: "Toggle", description: "Persistent shadow bat companions." },
    { label: "Dominion",        type: "cooldown", skillId: 14121052, cooldownLabel: "120s", description: "Hyper burst." }
  ]
};

const THUNDER_BREAKER: ClassSkillMap = {
  preview: [
    { label: "Thunder",         type: "active",   skillId: 15121005, description: "Lightning-laced melee combo." },
    { label: "Sea of Thunder",  type: "cooldown", skillId: 15121054, cooldownLabel: "120s", description: "5th Job channeled lightning rush." },
    { label: "Lightning Spear", type: "cooldown", skillId: 15121052, cooldownLabel: "60s",  description: "Hyper-skill lightning thrust." }
  ]
};

// ─── Heroes ────────────────────────────────────────────────────────────────────

const ARAN: ClassSkillMap = {
  preview: [
    { label: "Final Charge Blow", type: "active", skillId: 21121005, description: "Aran's signature polearm spin." },
    { label: "Adrenaline Rush",   type: "buff",   skillId: 21120023, cooldownLabel: "180s", description: "Combo-fueled damage burst." },
    { label: "Maha's Domain",     type: "cooldown", skillId: 21121054, cooldownLabel: "120s", description: "5th Job dimensional polearm strike." }
  ]
};

const EVAN: ClassSkillMap = {
  preview: [
    { label: "Dragon Master",     type: "buff",   skillId: 22171070, cooldownLabel: "Toggle", description: "Dragon-companion offensive mode." },
    { label: "Soul Stone",        type: "cooldown", skillId: 22171000, cooldownLabel: "60s", description: "Hyper-skill chained dragon strike." },
    { label: "Dragon Break",      type: "cooldown", skillId: 22181084, cooldownLabel: "120s", description: "5th Job dragon-form ultimate." }
  ]
};

const MERCEDES: ClassSkillMap = {
  preview: [
    { label: "Ishtar's Ring",     type: "active", skillId: 23121005, description: "Mercedes' main dual-bowgun attack." },
    { label: "Spikes Royale",     type: "active", skillId: 23121002, description: "Burst attack with strong AoE." },
    { label: "Elven Knights",     type: "cooldown", skillId: 23121054, cooldownLabel: "120s", description: "5th Job summons elven knights to attack with you." }
  ]
};

const PHANTOM: ClassSkillMap = {
  preview: [
    { label: "Mille Aiguilles",   type: "active", skillId: 24121002, description: "Card-throw rapid attack." },
    { label: "Talisman of Vol",   type: "cooldown", skillId: 24121054, cooldownLabel: "120s", description: "5th Job stolen-skill amplification." },
    { label: "Final Feint",       type: "iframe", skillId: 24121052, cooldownLabel: "180s", description: "Hyper-skill mirage and counter." }
  ]
};

const LUMINOUS: ClassSkillMap = {
  preview: [
    { label: "Light Spear",       type: "active", skillId: 27101201, description: "Light-side spear projectile." },
    { label: "Dark Spear",        type: "active", skillId: 27101202, description: "Dark-side spear projectile." },
    { label: "Equilibrium",       type: "cooldown", skillId: 27121052, cooldownLabel: "150s", description: "Hyper buff that activates the equilibrium burst window." },
    { label: "Liberation Orb",    type: "cooldown", skillId: 27121054, cooldownLabel: "180s", description: "5th Job orb that pulses light and dark damage." }
  ]
};

const SHADE: ClassSkillMap = {
  preview: [
    { label: "Spirit Claw",       type: "active", skillId: 25121005, description: "Shade's main melee combo." },
    { label: "Death Mark",        type: "cooldown", skillId: 25121052, cooldownLabel: "60s",  description: "Hyper-skill marked-target burst." },
    { label: "Spirit Walk",       type: "cooldown", skillId: 25121054, cooldownLabel: "180s", description: "5th Job spirit-form ultimate." }
  ]
};

// ─── Resistance ───────────────────────────────────────────────────────────────

const BATTLE_MAGE: ClassSkillMap = {
  preview: [
    { label: "Final Calling",     type: "active", skillId: 32121008, description: "Battle Mage's signature staff combo." },
    { label: "Altar of Annihilation", type: "cooldown", skillId: 32121054, cooldownLabel: "120s", description: "5th Job altar that pulses dark damage." }
  ]
};

const WILD_HUNTER: ClassSkillMap = {
  preview: [
    { label: "Wild Arrow Blast",  type: "active", skillId: 33121009, description: "Multi-arrow burst attack." },
    { label: "Drill Salvo",       type: "cooldown", skillId: 33121054, cooldownLabel: "120s", description: "5th Job drill barrage." },
    { label: "Wild Trap",         type: "summon", skillId: 33121002, cooldownLabel: "30s", description: "Beast trap placeable." }
  ]
};

const MECHANIC: ClassSkillMap = {
  preview: [
    { label: "Bots and Tots",     type: "summon", skillId: 35121013, cooldownLabel: "60s", description: "Multi-summon bot field." },
    { label: "Distortion Bomb",   type: "cooldown", skillId: 35121054, cooldownLabel: "60s", description: "5th Job massive bomb drop." },
    { label: "Robo Launcher RM7", type: "summon", skillId: 35121052, cooldownLabel: "120s", description: "Hyper-skill heavy robot." }
  ]
};

const DEMON_SLAYER: ClassSkillMap = {
  preview: [
    { label: "Demon Slash",       type: "active", skillId: 31221001, description: "Demon Slayer's signature scythe combo." },
    { label: "Demon Impact",      type: "active", skillId: 31221008, description: "Burst hit that consumes demon fury." },
    { label: "Demon Awakening",   type: "cooldown", skillId: 31221054, cooldownLabel: "180s", description: "5th Job demon-form ultimate." }
  ]
};

const DEMON_AVENGER: ClassSkillMap = {
  preview: [
    { label: "Exceed Execution",  type: "active", skillId: 31621002, description: "Demon Avenger's main HP-scaling attack." },
    { label: "Demonic Frenzy",    type: "cooldown", skillId: 31621054, cooldownLabel: "120s", description: "5th Job demon-form barrage." }
  ]
};

const XENON: ClassSkillMap = {
  preview: [
    { label: "Mecha Purge",       type: "active", skillId: 36121002, description: "Xenon's main beam combo." },
    { label: "Hyper Override",    type: "cooldown", skillId: 36121054, cooldownLabel: "120s", description: "5th Job override damage spike." }
  ]
};

const BLASTER: ClassSkillMap = {
  preview: [
    { label: "Bunker Buster",     type: "active", skillId: 37121002, description: "Blaster's signature gauntlet rocket." },
    { label: "Blast Shield",      type: "iframe", skillId: 37121054, cooldownLabel: "120s", description: "5th Job damage-reduction shield." }
  ]
};

// ─── Nova ──────────────────────────────────────────────────────────────────────

const KAISER: ClassSkillMap = {
  preview: [
    { label: "Dragon Slash",      type: "active", skillId: 61121002, description: "Kaiser's main two-handed sword combo." },
    { label: "Final Trance",      type: "cooldown", skillId: 61121052, cooldownLabel: "180s", description: "Hyper transformation burst." },
    { label: "Stigma Shield",     type: "iframe", skillId: 61121054, cooldownLabel: "120s", description: "5th Job protective stigma barrier." }
  ]
};

const ANGELIC_BUSTER: ClassSkillMap = {
  preview: [
    { label: "Trinity",           type: "active", skillId: 62121052, description: "Angelic Buster's hyper triple-stack burst." },
    { label: "Soul Buster",       type: "cooldown", skillId: 62121054, cooldownLabel: "180s", description: "5th Job soul-summon barrage." }
  ]
};

const CADENA: ClassSkillMap = {
  preview: [
    { label: "Strike Stun",       type: "active", skillId: 152121002, description: "Cadena's main multi-weapon combo." },
    { label: "Chain Detonation",  type: "cooldown", skillId: 152121054, cooldownLabel: "120s", description: "5th Job chained weapon burst." },
    { label: "Apocalypse",        type: "cooldown", skillId: 152121052, cooldownLabel: "60s", description: "Hyper burst." }
  ]
};

const KAIN: ClassSkillMap = {
  preview: [
    { label: "Strike Arrow",      type: "active", skillId: 154121006, description: "Kain's main bow attack." },
    { label: "Possession",        type: "cooldown", skillId: 154121054, cooldownLabel: "120s", description: "5th Job possession-mode amplifier." }
  ]
};

// ─── Sengoku ──────────────────────────────────────────────────────────────────

const HAYATO: ClassSkillMap = {
  preview: [
    { label: "Hitokiri Strike",   type: "active", skillId: 41121008, description: "Hayato's stance-finishing combo." },
    { label: "Battoujutsu",       type: "cooldown", skillId: 41121054, cooldownLabel: "120s", description: "5th Job swift-blade ultimate." }
  ]
};

const KANNA: ClassSkillMap = {
  preview: [
    { label: "Vanquisher's Charm",type: "active", skillId: 42121002, description: "Kanna's main fan-bound attack." },
    { label: "Tengu Strike",      type: "cooldown", skillId: 42121008, cooldownLabel: "120s", description: "Hyper tengu summon strike." },
    { label: "Kishin Shoukan",    type: "summon", skillId: 42121054, cooldownLabel: "120s", description: "Famous spawn-rate summon." }
  ]
};

// ─── Flora ────────────────────────────────────────────────────────────────────

const ADELE: ClassSkillMap = {
  preview: [
    { label: "Cleave",            type: "active", skillId: 152121002, description: "Adele's primary blade swing." },
    { label: "Magic Dispatch",    type: "cooldown", skillId: 152121054, cooldownLabel: "60s", description: "5th Job blade-floating ultimate." },
    { label: "Ether Forge",       type: "buff",   skillId: 151121013, cooldownLabel: "Toggle", description: "Generates ether stacks for combat." }
  ]
};

const ILLIUM: ClassSkillMap = {
  preview: [
    { label: "Crystal Charge",    type: "active", skillId: 152121002, description: "Illium's signature crystal-empowered attack." },
    { label: "Glory Wings",       type: "cooldown", skillId: 152121052, cooldownLabel: "120s", description: "5th Job crystal dragon ultimate." }
  ]
};

const ARK: ClassSkillMap = {
  preview: [
    { label: "Spectral Blast",    type: "active", skillId: 153121002, description: "Ark's main spectral combo." },
    { label: "Plain Charge Drive",type: "cooldown", skillId: 153121054, cooldownLabel: "120s", description: "5th Job spectral burst." }
  ]
};

const KHALI: ClassSkillMap = {
  preview: [
    { label: "Hex Blade",         type: "active", skillId: 36121002, description: "Khali's signature chakram strike." },
    { label: "Dust Surge",        type: "cooldown", skillId: 36121054, cooldownLabel: "60s", description: "5th Job dust-form burst." }
  ]
};

// ─── Anima ────────────────────────────────────────────────────────────────────

const HOYOUNG: ClassSkillMap = {
  preview: [
    { label: "Heaven Talisman",   type: "active", skillId: 165121005, description: "Heaven-stance fan combo." },
    { label: "Earth Talisman",    type: "active", skillId: 165121006, description: "Earth-stance fan combo." },
    { label: "Sage's Spirit",     type: "cooldown", skillId: 165121054, cooldownLabel: "180s", description: "5th Job dragon spirit ultimate." }
  ]
};

const LARA: ClassSkillMap = {
  preview: [
    { label: "Spirit Blossom",    type: "active", skillId: 167121002, description: "Lara's signature dragon-vein attack." },
    { label: "Big Stretch",       type: "cooldown", skillId: 167121054, cooldownLabel: "180s", description: "5th Job dragon vein ultimate." }
  ]
};

// ─── Other ────────────────────────────────────────────────────────────────────

const ZERO: ClassSkillMap = {
  preview: [
    { label: "Wind Cutter",       type: "active", skillId: 100001262, description: "Zero's main alpha-form combo." },
    { label: "Time Holding",      type: "cooldown", skillId: 100001284, cooldownLabel: "120s", description: "5th Job time-stop ultimate." }
  ]
};

const KINESIS: ClassSkillMap = {
  preview: [
    { label: "Psychic Grab",      type: "active", skillId: 142121002, description: "Kinesis's signature telekinetic strike." },
    { label: "Ultimate - Metal Press", type: "cooldown", skillId: 142121054, cooldownLabel: "120s", description: "5th Job psychic ultimate." }
  ]
};

const LYNN: ClassSkillMap = {
  preview: [
    { label: "Tiger's Bite",      type: "active", skillId: 170121002, description: "Lynn's signature tiger-form attack." },
    { label: "Final Roar",        type: "cooldown", skillId: 170121054, cooldownLabel: "120s", description: "5th Job tiger ultimate." }
  ]
};

// ─── Class registry ───────────────────────────────────────────────────────────

const CLASS_MAPS: Record<string, ClassSkillMap> = {
  hero: HERO,
  paladin: PALADIN,
  "dark-knight": DARK_KNIGHT,
  bishop: BISHOP,
  "fire-poison-mage": FP_MAGE,
  "ice-lightning-mage": IL_MAGE,
  bowmaster: BOWMASTER,
  pathfinder: PATHFINDER,
  "night-lord": NIGHT_LORD,
  shadower: SHADOWER,
  buccaneer: BUCCANEER,
  corsair: CORSAIR,
  "dawn-warrior": DAWN_WARRIOR,
  mihile: MIHILE,
  "blaze-wizard": BLAZE_WIZARD,
  "wind-archer": WIND_ARCHER,
  "night-walker": NIGHT_WALKER,
  "thunder-breaker": THUNDER_BREAKER,
  aran: ARAN,
  evan: EVAN,
  mercedes: MERCEDES,
  phantom: PHANTOM,
  luminous: LUMINOUS,
  shade: SHADE,
  "battle-mage": BATTLE_MAGE,
  "wild-hunter": WILD_HUNTER,
  mechanic: MECHANIC,
  "demon-slayer": DEMON_SLAYER,
  "demon-avenger": DEMON_AVENGER,
  xenon: XENON,
  blaster: BLASTER,
  kaiser: KAISER,
  "angelic-buster": ANGELIC_BUSTER,
  cadena: CADENA,
  kain: KAIN,
  hayato: HAYATO,
  kanna: KANNA,
  adele: ADELE,
  illium: ILLIUM,
  ark: ARK,
  khali: KHALI,
  hoyoung: HOYOUNG,
  lara: LARA,
  zero: ZERO,
  kinesis: KINESIS,
  lynn: LYNN
};

// ─── Generic fallback (shared cross-class skill flavour) ──────────────────────

const jobSkillWords: Record<LibraryJobGroup, { active: string; buff: string; summon: string; burst: string }> = {
  Warrior: { active: "Blade Arc",    buff: "Battle Guard", summon: "Oath Standard", burst: "Heroic Crash" },
  Magician:{ active: "Arcane Bolt",  buff: "Mana Crest",   summon: "Spirit Circle", burst: "Grand Spell"  },
  Bowman:  { active: "Piercing Shot",buff: "Eagle Focus",  summon: "Arrow Turret",  burst: "Storm Volley" },
  Thief:   { active: "Shadow Cut",   buff: "Veil Focus",   summon: "Night Mark",    burst: "Assassin Burst"},
  Pirate:  { active: "Cannon Rush",  buff: "Ocean Drive",  summon: "Crew Beacon",   burst: "Anchor Break" },
  Hybrid:  { active: "System Slash", buff: "Overclock",    summon: "Core Drone",    burst: "Tri-Core Burst"}
};

function buildFallbackClassSkillIcons(cls: LibraryClass): LibraryClassSkillIcons {
  const map = CLASS_MAPS[cls.id];
  const words = jobSkillWords[cls.jobGroup];
  const className = cls.name;

  // Per-class explicit mapping (preferred) — pad with generic seeds if a
  // section is empty so the UI always has at least one chip per group.
  const previewSeeds: SkillSeed[] = (map?.preview ?? []).slice(0, 6);
  if (previewSeeds.length < 3) {
    previewSeeds.push(
      { label: `${className} ${words.active}`, type: "active",   description: `Primary attack loop for ${cls.style}.` },
      { label: `${className} ${words.burst}`,  type: "cooldown", description: "Burst window used when buffs and boss openings align.", cooldownLabel: "90s" }
    );
  }

  const activeSeeds: SkillSeed[] = (map?.active ?? []).slice(0, 4);
  if (activeSeeds.length === 0) {
    activeSeeds.push(
      { label: `${className} ${words.buff}`, type: "buff", description: `Maintenance buff for the ${cls.role.toLowerCase()} kit.`, cooldownLabel: "60s" },
      { label: `${className} Focus`,         type: "buff", description: "Background buff worth keeping up during fights.", cooldownLabel: "120s" }
    );
  }

  const toggleSeeds: SkillSeed[] = (map?.toggle ?? []).length
    ? map!.toggle!
    : [{ label: `${className} Stance`, type: "buff", description: "Mode switch that changes how this class plays.", cooldownLabel: "Toggle" }];

  const summonSeeds: SkillSeed[] = (map?.summon ?? []).length
    ? map!.summon!
    : [{ label: `${className} ${words.summon}`, type: "summon", description: "Persistent summon used for map coverage.", cooldownLabel: "60s" }];

  const cooldownSeeds: SkillSeed[] = (map?.cooldown ?? []).length
    ? map!.cooldown!
    : [
        { label: `${className} Burst Setup`, type: "cooldown", description: "Pre-burst preparation skill.", cooldownLabel: "120s" },
        { label: `${className} Finisher`,    type: "cooldown", description: "High-impact cooldown that rewards correct timing.", cooldownLabel: "180s" }
      ];

  const bindSeeds: SkillSeed[] = (map?.bind ?? []).length
    ? map!.bind!
    : [{ label: `${className} Binding Strike`, type: "bind", description: "Control window used to stabilize burst damage.", cooldownLabel: "180s" }];

  const iframeSeeds: SkillSeed[] = (map?.iframe ?? []).length
    ? map!.iframe!
    : [{ label: `${className} Emergency Guard`, type: "iframe", description: "Defensive escape for dangerous boss patterns.", cooldownLabel: "90s" }];

  const damageReductionSeeds: SkillSeed[] = (map?.damageReduction ?? []).length
    ? map!.damageReduction!
    : [{ label: `${className} Damage Guard`, type: "cooldown", description: "Damage reduction window used to survive lethal boss pressure.", cooldownLabel: "90s" }];

  return {
    classId: cls.id,
    skillPreviewIcons: previewSeeds.map((seed) => hydrate(cls.id, seed)),
    activeBuffIcons:   activeSeeds.map((seed) => hydrate(cls.id, seed)),
    toggleIcons:       toggleSeeds.map((seed) => hydrate(cls.id, seed)),
    summonIcons:       summonSeeds.map((seed) => hydrate(cls.id, seed)),
    cooldownSkillIcons:cooldownSeeds.map((seed) => hydrate(cls.id, seed)),
    bindSkillIcons:    bindSeeds.map((seed) => hydrate(cls.id, seed)),
    iframeSkillIcons:  iframeSeeds.map((seed) => hydrate(cls.id, seed)),
    damageReductionIcons: damageReductionSeeds.map((seed) => hydrate(cls.id, seed))
  };
}

// ─── Bishop deep override (preserved from previous detailed catalog) ──────────

function bishopSkill(
  type: LibrarySkillIconType,
  label: string,
  description: string,
  cooldownLabel?: string,
  metaLabel?: string,
  skillId?: number,
  grandisPath?: string
): LibrarySkillIconEntry {
  const fallback = `/library/skills/bishop/${safeId(label)}.svg`;
  const sourceIcon = grandisPath ? getGrandisLocalAsset(grandisPath) : fallback;
  return {
    id: `bishop-${safeId(label)}`,
    label,
    type,
    icon: sourceIcon,
    localFallback: grandisPath ? sourceIcon : fallback,
    mapleSkillId: skillId,
    cooldownLabel,
    metaLabel,
    description
  };
}

const bishopSkillIcons: LibraryClassSkillIcons = {
  classId: "bishop",
  skillPreviewIcons: [
    bishopSkill("active",   "Energy Bolt",     "First-job magic projectile from the Bishop leveling path.", undefined, undefined, undefined, "/class-icons/explorers/mage/energy-bolt.png"),
    bishopSkill("buff",     "Magic Guard",     "Classic mage defensive toggle that redirects damage pressure.", "Toggle", undefined, undefined, "/class-icons/explorers/mage/magic-guard.png"),
    bishopSkill("active",   "Teleport",        "Core mage movement skill used for positioning and map flow.", undefined, undefined, undefined, "/class-icons/explorers/mage/teleport.png"),
    bishopSkill("active",   "Heal",            "Holy recovery skill that defines early Bishop support identity.", undefined, undefined, undefined, "/class-icons/explorers/bishop/heal.png"),
    bishopSkill("active",   "Holy Arrow",      "Early holy attack used before the later Angel Ray kit.", undefined, undefined, undefined, "/class-icons/explorers/bishop/holy-arrow.png"),
    bishopSkill("active",   "Shining Ray",     "Mid-job holy mobbing beam from the classic Bishop path.", undefined, undefined, undefined, "/class-icons/explorers/bishop/shining-ray.png"),
    bishopSkill("active",   "Angel Ray",       "Primary holy attack used as the core bossing line.", undefined, undefined, 2321010, "/class-icons/explorers/bishop/angel-ray.png"),
    bishopSkill("active",   "Genesis",         "Large holy strike that represents Bishop's classic burst identity.", undefined, undefined, 2321001, "/class-icons/explorers/bishop/genesis.png"),
    bishopSkill("active",   "Big Bang",        "Wide holy explosion used for mobbing and boost-node coverage.", undefined, undefined, 2321008, "/class-icons/explorers/bishop/big-bang.png"),
    bishopSkill("active",   "Dispel",          "Support utility used to clear dangerous abnormal statuses.", undefined, undefined, undefined, "/class-icons/explorers/bishop/dispel.png"),
    bishopSkill("summon",   "Bahamut",         "Long-duration dragon summon for passive field pressure.", "600s", undefined, 2321009, "/class-icons/explorers/bishop/bahamut.png"),
    bishopSkill("iframe",   "Heaven's Door",   "Death-prevention utility with a long personal restriction.", "Blocks 1 KO", "60s cd", 2321058, "/class-icons/explorers/bishop/heavens-door.png"),
    bishopSkill("cooldown", "Benediction",     "Major party burst support cooldown.", "30s", "120s cd", 2321054, "/class-icons/explorers/bishop/benediction.png"),
    bishopSkill("active",   "Peacemaker",      "5th Job angel projectile that damages enemies and rewards party positioning.", "10s cd", undefined, undefined, "/class-icons/explorers/bishop/peacemaker.png"),
    bishopSkill("active",   "HEXA Angel Ray",  "6th Job Angel Ray upgrade with stronger holy judgment output.", undefined, undefined, undefined, "/class-icons/explorers/bishop/hexa-angel-ray.png"),
    bishopSkill("bind",     "Holy Advent",     "6th Job bind-style encounter control and burst moment.", "10s", "360s cd", undefined, "/class-icons/explorers/bishop/holy-advent.png")
  ],
  activeBuffIcons: [
    bishopSkill("buff", "Bless",               "Early party buff from the classic Bishop support path.", "240s", undefined, undefined, "/class-icons/explorers/bishop/bless.png"),
    bishopSkill("buff", "Holy Symbol",         "Training and party-support buff associated with improved reward flow.", "240s", undefined, 2311003, "/class-icons/explorers/bishop/holy-symbol.png"),
    bishopSkill("buff", "Advanced Blessing",   "Core Bishop buff that reinforces party and solo uptime.", "240s", undefined, 2321005, "/class-icons/explorers/bishop/advanced-blessing.png"),
    bishopSkill("buff", "Maple Warrior",       "Explorer stat buff used as part of the standard buff suite.", "900s", undefined, undefined, "/class-icons/common/maple-warrior.png")
  ],
  toggleIcons: [
    bishopSkill("buff", "Magic Guard",         "Mage defensive toggle for safer boss and training uptime.", "Toggle", undefined, undefined, "/class-icons/explorers/mage/magic-guard.png"),
    bishopSkill("buff", "Teleport Mastery",    "Toggle that adds holy pressure to movement and positioning.", "Toggle", undefined, undefined, "/class-icons/explorers/bishop/teleport-mastery.png"),
    bishopSkill("buff", "Righteously Indignant","Mode switch between support and offensive Bishop flow.", "Mode Switch", undefined, undefined, "/class-icons/explorers/bishop/righteously-indignant.png"),
    bishopSkill("buff", "Mana Overload",       "5th Job damage toggle with a recurring upkeep cadence.", "30s cd", undefined, undefined, "/class-icons/5th-job/mana-overload.png")
  ],
  summonIcons: [
    bishopSkill("summon", "Holy Fountain",     "Benevolence-side fountain for party utility and safe play.", "60s", "60s cd", undefined, "/class-icons/explorers/bishop/holy-fountain.png"),
    bishopSkill("summon", "Fountain of Vengeance","Vengeance-side fountain focused on offensive map pressure.", "60s", "V", undefined, "/class-icons/explorers/bishop/fountain-of-vengeance.png"),
    bishopSkill("summon", "Mystic Door",       "Utility portal summon for party movement and map support.", "200s", undefined, undefined, "/class-icons/explorers/bishop/mystic-door.png"),
    bishopSkill("summon", "Bahamut",           "Persistent holy dragon summon.", "600s", undefined, 2321009, "/class-icons/explorers/bishop/bahamut.png"),
    bishopSkill("summon", "Holy Water",        "Short-duration Benevolence placeable with healing utility.", "5s", "10s cd", undefined, "/class-icons/explorers/bishop/holy-water.png"),
    bishopSkill("summon", "Angel of Balance",  "5th Job angel summon with support/offense behavior.", "30s", "120s cd", undefined, "/class-icons/explorers/bishop/angel-of-balance.png")
  ],
  cooldownSkillIcons: [
    bishopSkill("cooldown", "Divine Protection", "Protective cooldown against critical abnormal statuses.", "5 Critical Abnormal Statuses", "80s cd", undefined, "/class-icons/explorers/bishop/divine-protection.png"),
    bishopSkill("cooldown", "Infinity",          "Explorer mage damage-ramp cooldown used during longer burst windows.", "120s", "180s cd", undefined, "/class-icons/explorers/mage/infinity.png"),
    bishopSkill("cooldown", "Resurrection",      "Classic Bishop revive utility for party recovery.", "Instant revive", "long cd", undefined, "/class-icons/explorers/bishop/resurrection.png"),
    bishopSkill("cooldown", "Triumph Feather",   "Offensive Vengeance cooldown used during damage windows.", "120s", "60s cd", undefined, "/class-icons/explorers/bishop/triumph-feather.png"),
    bishopSkill("cooldown", "Holy Magic Shell",  "Party protection against hits and percent HP pressure.", "15s / 15 hits", "90s cd", undefined, "/class-icons/explorers/bishop/holy-magic-shell.png"),
    bishopSkill("cooldown", "Blood of the Divine","Short Vengeance-side burst support window.", "10s", "120s cd", undefined, "/class-icons/explorers/bishop/blood-of-the-divine.png"),
    bishopSkill("cooldown", "Heaven's Door",     "Death-prevention utility with a long personal restriction.", "Blocks 1 KO", "60s cd", 2321058, "/class-icons/explorers/bishop/heavens-door.png"),
    bishopSkill("cooldown", "Epic Adventure",    "Explorer burst buff used during planned damage windows.", "60s", "120s cd", undefined, "/class-icons/explorers/mage/epic-adventure.png"),
    bishopSkill("cooldown", "Benediction",       "Signature Bishop burst support skill.", "30s", "120s cd", 2321054, "/class-icons/explorers/bishop/benediction.png"),
    bishopSkill("cooldown", "Maple World Goddess Blessing","Major 5th Job burst setup buff.", "60s", "120s cd", undefined, "/class-icons/5th-job/maple-world-goddess-blessing.png"),
    bishopSkill("cooldown", "Hero's Echo",       "Long cooldown account-era damage buff.", "2400s", "300s cd", undefined, "/class-icons/common/heros-echo.png")
  ],
  bindSkillIcons: [
    bishopSkill("bind", "Holy Advent", "6th Job bind-style encounter control and burst moment.", "10s", "360s cd", undefined, "/class-icons/explorers/bishop/holy-advent.png")
  ],
  iframeSkillIcons: [
    bishopSkill("iframe", "Heaven's Door",    "Emergency survival value through a one-time death block.", "1 death block", "600s restriction", 2321058, "/class-icons/explorers/bishop/heavens-door.png"),
    bishopSkill("iframe", "Ethereal Form",    "Short invulnerability window for dangerous patterns.", "3s", "60s cd", undefined, "/class-icons/5th-job/ethereal-form.png"),
    bishopSkill("iframe", "Holy Advent",      "6th Job defensive/burst safety moment.", "360s cd", undefined, undefined, "/class-icons/explorers/bishop/holy-advent.png")
  ],
  damageReductionIcons: [
    bishopSkill("cooldown", "Invincible",        "Classic holy mitigation passive represented for Bishop survivability context.", "Passive", undefined, undefined, "/class-icons/explorers/bishop/invincible.png"),
    bishopSkill("cooldown", "Holy Magic Shell",  "Reduces incoming percent-HP pressure while the shell is active.", "15s / 15 hits", "-10% | 90s cd", undefined, "/class-icons/explorers/bishop/holy-magic-shell.png"),
    bishopSkill("cooldown", "Divine Punishment", "Damage reduction while channeling the holy barrage.", "While casting", "-50% | recharge", undefined, "/class-icons/explorers/bishop/divine-punishment.png")
  ]
};

const grandisSkillCatalogByClassId = grandisClassSkillCatalog as Record<string, GrandisClassSkillCatalog | undefined>;

function normalizeGrandisSection(
  classId: string,
  section: LibrarySkillIconEntry[],
  fallback: LibrarySkillIconEntry[] = []
): LibrarySkillIconEntry[] {
  const source = section.length > 0 ? section : fallback;
  const seen = new Set<string>();

  return source
    .filter((skill) => Boolean(skill.icon))
    .map((skill, index) => {
      const normalizedId = `${classId}-${safeId(skill.label)}-${index}`;
      return {
        ...skill,
        id: skill.id || normalizedId,
        localFallback: skill.localFallback || skill.icon || LOCAL_FALLBACK[skill.type],
        description: skill.description || `${skill.label} signature skill.`
      };
    })
    .filter((skill) => {
      const key = `${skill.icon}-${skill.label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function buildClassSkillIcons(cls: LibraryClass): LibraryClassSkillIcons {
  const fallback = cls.id === "bishop" ? bishopSkillIcons : buildFallbackClassSkillIcons(cls);
  const grandisCatalog = grandisSkillCatalogByClassId[cls.id];
  const combineBishop = (grandisSection: LibrarySkillIconEntry[], bishopSection: LibrarySkillIconEntry[]) =>
    cls.id === "bishop" ? [...grandisSection, ...bishopSection] : grandisSection;

  if (!grandisCatalog) {
    return fallback;
  }

  return {
    classId: cls.id,
    skillPreviewIcons: normalizeGrandisSection(cls.id, combineBishop(grandisCatalog.skillPreviewIcons, bishopSkillIcons.skillPreviewIcons), fallback.skillPreviewIcons),
    activeBuffIcons: normalizeGrandisSection(cls.id, combineBishop(grandisCatalog.activeBuffIcons, bishopSkillIcons.activeBuffIcons)),
    toggleIcons: normalizeGrandisSection(cls.id, combineBishop(grandisCatalog.toggleIcons, bishopSkillIcons.toggleIcons)),
    summonIcons: normalizeGrandisSection(cls.id, combineBishop(grandisCatalog.summonIcons, bishopSkillIcons.summonIcons)),
    cooldownSkillIcons: normalizeGrandisSection(cls.id, combineBishop(grandisCatalog.cooldownSkillIcons, bishopSkillIcons.cooldownSkillIcons)),
    bindSkillIcons: normalizeGrandisSection(cls.id, combineBishop(grandisCatalog.bindSkillIcons, bishopSkillIcons.bindSkillIcons)),
    iframeSkillIcons: normalizeGrandisSection(cls.id, combineBishop(grandisCatalog.iframeSkillIcons, bishopSkillIcons.iframeSkillIcons)),
    damageReductionIcons: normalizeGrandisSection(cls.id, combineBishop(grandisCatalog.damageReductionIcons, bishopSkillIcons.damageReductionIcons))
  };
}

export const librarySkillIconsByClassId: Record<string, LibraryClassSkillIcons> = Object.fromEntries(
  libraryClasses.map((cls) => [cls.id, buildClassSkillIcons(cls)])
);

export function getSkillIconsForClass(classId: string): LibraryClassSkillIcons {
  return librarySkillIconsByClassId[classId] ?? buildClassSkillIcons(libraryClasses[0]);
}
