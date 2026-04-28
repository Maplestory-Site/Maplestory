/**
 * IdleStory World — shared game types.
 *
 * This module owns every exported type that spans multiple engine files.
 * It uses `import type` exclusively so it has zero runtime side-effects and
 * cannot be the cause of circular dependency issues.
 */

import type { CraftingMaterials, EquippedItems, IdleItemInstance } from "./itemSystem";
import type { ActiveBuff } from "./skillSystem";
import type { BuildFocusId } from "./skillBuildSystem";
import type {
  AchievementState,
  ComebackRewardState,
  DailyChallengeState,
  DailyRewardState,
  GameNotification,
  MissionProgress,
  WeeklyGoalState
} from "./retentionSystem";
import type { AiState, PlayerBehaviorState } from "./aiSystem";
import type { GuildState } from "./guildSystem";
import type { LeaderboardState, WeeklyRankingState } from "./leaderboardSystem";
import type { PvpState } from "./pvpSystem";
import type { ShopState } from "./shopSystem";
import type { CollectionState } from "./collectionSystem";
import type { ReplayabilityState } from "./replayabilitySystem";
import type { TalentNodeId } from "./talentSystem";
import type { WorldEvent } from "./eventSystem";
import type { MicroMission } from "./microMissionSystem";
import type { DungeonState } from "./dungeonSystem";

// ─── Primitive ID types ───────────────────────────────────────────────────────

export type HeroId = "snailguard" | "mage" | "archer" | "ironwall" | "pyromancer" | "falconer";
export type UpgradeId = "market" | "forge" | "guild";
export type GearId = "weapon" | "armor" | "charm";
export type SkillId = "slash" | "meteor" | "blessing";

/** The three playable classes. */
export type ClassId = "warrior" | "mage" | "archer";

/** Crystal-bought global multipliers that persist through prestige (reset on rebirth). */
export type GlobalMultId = "gold_income" | "dps_amp" | "xp_boost" | "crystal_luck";

/** Permanent relic upgrades — never reset under any condition. */
export type RelicUpgradeId = "gold_mastery" | "dps_mastery" | "crystal_mastery" | "rebirth_momentum" | "relic_echo";

export type { TalentNodeId } from "./talentSystem";

/**
 * Active skill IDs — one skill tree per class (3 skills each).
 * Distinct from `SkillId` which are passive training upgrades.
 */
export type ClassSkillId =
  | "battle_cry" | "shield_wall" | "execute"    // Warrior
  | "fireball"   | "arcane_nova" | "mana_surge"  // Mage
  | "rapid_fire" | "snipe"       | "shadow_step"; // Archer

// ─── Database / zone types ────────────────────────────────────────────────────

export type DatabaseMap = {
  id: string;
  mapId?: number;
  name: string;
  streetName?: string;
  region?: string;
  image?: string;
  imageMedium?: string;
  imageLarge?: string;
};

export type DatabaseMonster = {
  id: string;
  name: string;
  image: string | null;
  portrait: string;
  level: number;
  hp: number;
  farmingScore?: number;
  isBoss?: boolean;
  drops?: Array<{ name: string; rarity: string; kind: string }>;
  dropTable?: Array<{ name: string; rarity: string; kind: string; weight?: number }>;
  dropChance?: number;
  locations?: Array<{ region: string; map: string }>;
};

export type DatabaseItem = {
  id: string;
  name: string;
  image: string | null;
  type: string;
  rarity: string;
  level: number | null;
  sourceMonsters: string[];
};

export type WorldZone = {
  id: string;
  name: string;
  region: string;
  requirement: number;
  rewardBoost: number;
  color: string;
  image?: string;
};

// ─── Engagement types ─────────────────────────────────────────────────────────

export type EngagementObjectiveType = "kills" | "crits" | "gold" | "boss";

export type EngagementObjective = {
  id: string;
  type: EngagementObjectiveType;
  label: string;
  progress: number;
  target: number;
  rewardMesos: number;
  rewardXp: number;
  rewardCrystals: number;
};

export type EngagementPulse = {
  id: number;
  critHits: number;
  momentumTier: number;
  bonusDrops: number;
  bonusGold: number;
  bonusXp: number;
  objectiveCompleted: boolean;
  objectiveRewardMesos: number;
  objectiveRewardXp: number;
  objectiveRewardCrystals: number;
};

// ─── Core state ───────────────────────────────────────────────────────────────

/**
 * Full serialisable game state.
 * All numeric values use plain numbers (no BigInt) for JSON compat.
 */
export type IdleGameState = {
  // Resources
  mesos: number;
  crystals: number;
  fame: number;
  materials: CraftingMaterials;

  // Progression
  level: number;
  xp: number;
  prestigeCount: number;

  // Heroes & upgrades
  heroLevels: Record<HeroId, number>;
  heroXp: Record<HeroId, number>;
  upgrades: Record<UpgradeId, number>;
  gearLevels: Record<GearId, number>;
  skillLevels: Record<SkillId, number>;
  inventory: IdleItemInstance[];
  equipment: EquippedItems;
  lastLootDrops: IdleItemInstance[];

  // World
  zone: string;
  stage: number; // 1-based; boss every 10th stage

  // Combat — current enemy
  enemyHp: number;
  enemyMaxHp: number;

  // Class system
  classId: ClassId | null;
  /** Mana (Mage) or Rage (Warrior / Archer). */
  resource: number;
  /** Remaining cooldown per active skill (seconds). Key = ClassSkillId string. */
  skillCooldowns: Record<string, number>;
  /** Currently active temporary buffs. */
  activeBuffs: ActiveBuff[];
  buildFocus: BuildFocusId;
  skillBranches: Partial<Record<ClassSkillId, import("./skillBuildSystem").SkillBranchId>>;

  // Economy: third currency
  relics: number;
  /** Lifetime gold earned — used for relic calculation; never resets. */
  totalGoldEarned: number;

  // Rebirth system
  rebirthCount: number;
  /** Crystal-tier multipliers — persist through prestige, reset on rebirth. */
  globalMults: Record<GlobalMultId, number>;
  /** Permanent relic upgrades — never reset under any condition. */
  relicUpgrades: Record<RelicUpgradeId, number>;

  // Persistence
  lastSavedAt: number;
  totalPlayTime: number;

  // Retention
  dailyReward: DailyRewardState;
  dailyChallenges: DailyChallengeState;
  weeklyGoal: WeeklyGoalState;
  comebackReward: ComebackRewardState;
  achievements: AchievementState;
  missions: MissionProgress;
  notifications: GameNotification[];
  lifetimeKills: number;
  lifetimeBossKills: number;
  collection: CollectionState;
  replayability: ReplayabilityState;

  // Monetization / live-ops
  shop: ShopState;

  // AI systems
  ai: AiState;
  behavior: PlayerBehaviorState;

  // Social / competitive systems
  guildState: GuildState;
  leaderboardState: LeaderboardState;
  weeklyRankingState: WeeklyRankingState;
  pvpState: PvpState;

  // Power spike system
  /**
   * Seconds remaining on the boss-kill DPS surge (counts down in gameTick).
   * While > 0, calculateDPS applies BOSS_SURGE_DPS_MULT.
   */
  bossSurgeSecondsLeft: number;

  // Meta progression — talent tree (NEVER reset under any condition)
  /** Unspent talent points available to spend in the talent tree. */
  talentPoints: number;
  /** Set of unlocked talent node IDs. Persists through prestige AND rebirth. */
  talentNodes: Partial<Record<TalentNodeId, boolean>>;

  // Events & micro missions (addiction loop)
  /** Currently active world events (max 1 at a time). */
  activeEvents: WorldEvent[];
  /** Total play-seconds at which the next event eligibility check fires. */
  nextEventAt: number;
  /** Rolling pool of 3 short-term micro missions. Refreshes on claim. */
  microMissions: MicroMission[];
  /** Daily limited dungeon runs. */
  dungeonState: DungeonState;

  // Engagement layer (fun + habit loop)
  killStreak: number;
  bestKillStreak: number;
  streakWindowLeft: number;
  activeObjective: EngagementObjective;
  objectiveCompletions: number;
  engagementPulse: EngagementPulse | null;
  engagementPulseSeq: number;
};

/**
 * Runtime context supplied by the React layer (API data).
 * Engine functions accept this so they stay pure / testable.
 */
export type GameContext = {
  zone: WorldZone;
  monster: DatabaseMonster | null;
  lootCount: number;
  /** DPS multiplier applied during boss fights (0–1). Default 1.0 = no reduction. */
  bossDpsMultiplier?: number;
  /**
   * Progression gate multiplier (0.01–1.0) — reduces effective DPS when player
   * is underpowered for the current zone. Computed from getProgressionMultiplier().
   * Default 1.0 = no reduction.
   */
  progressionMultiplier?: number;
};

export type ActionResult = {
  state: IdleGameState;
  message: string;
  success: boolean;
};
