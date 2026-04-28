import type { DatabaseMonster, WorldZone } from "./gameEngine";
import { getStageMonsterByMap } from "./monsterSystem";

export type DungeonType = "gold" | "xp" | "boss";

export type DungeonDefinition = {
  id: DungeonType;
  name: string;
  icon: string;
  description: string;
  unlockLevel: number;
  runsPerDay: number;
  totalWaves: number;
  rewardLabel: string;
  rewardFocus: "mesos" | "xp" | "boss";
};

export type DungeonRunState = {
  type: DungeonType;
  zoneId: string;
  wave: number;
  totalWaves: number;
  enemyHp: number;
  enemyMaxHp: number;
  isBossWave: boolean;
  startedAt: number;
};

export type DungeonDailyUsage = Record<DungeonType, number>;

export type DungeonState = {
  dayKey: string;
  dailyRunsUsed: DungeonDailyUsage;
  activeRun: DungeonRunState | null;
  lastRewardSummary: string | null;
};

export type DungeonTickResult = {
  run: DungeonRunState | null;
  kills: number;
  bossesKilled: number;
  completed: boolean;
  rewards: {
    mesos: number;
    xp: number;
    crystals: number;
    relics: number;
    fame: number;
  };
  summary: string | null;
};

export const DUNGEON_DEFINITIONS: Record<DungeonType, DungeonDefinition> = {
  gold: {
    id: "gold",
    name: "Gold Dungeon",
    icon: "💰",
    description: "Fast farming run with rich mobs and a treasure boss.",
    unlockLevel: 4,
    runsPerDay: 3,
    totalWaves: 6,
    rewardLabel: "High mesos rewards",
    rewardFocus: "mesos"
  },
  xp: {
    id: "xp",
    name: "XP Dungeon",
    icon: "📘",
    description: "Training route with dense waves built for progression.",
    unlockLevel: 6,
    runsPerDay: 2,
    totalWaves: 7,
    rewardLabel: "Heavy XP rewards",
    rewardFocus: "xp"
  },
  boss: {
    id: "boss",
    name: "Boss Dungeon",
    icon: "👑",
    description: "Short gauntlet ending in a brutal boss with rare prizes.",
    unlockLevel: 10,
    runsPerDay: 1,
    totalWaves: 5,
    rewardLabel: "Boss loot rewards",
    rewardFocus: "boss"
  }
};

export const DEFAULT_DUNGEON_STATE: DungeonState = {
  dayKey: "",
  dailyRunsUsed: { gold: 0, xp: 0, boss: 0 },
  activeRun: null,
  lastRewardSummary: null
};

export function getDungeonDayKey(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function syncDungeonState(state: DungeonState, now = Date.now()): DungeonState {
  const dayKey = getDungeonDayKey(now);
  if (state.dayKey === dayKey) return state;
  return {
    ...state,
    dayKey,
    dailyRunsUsed: { gold: 0, xp: 0, boss: 0 },
    activeRun: null
  };
}

export function getDungeonDefinition(type: DungeonType): DungeonDefinition {
  return DUNGEON_DEFINITIONS[type];
}

export function getDungeonRunsLeft(state: DungeonState, type: DungeonType): number {
  const synced = syncDungeonState(state);
  const def = getDungeonDefinition(type);
  return Math.max(0, def.runsPerDay - (synced.dailyRunsUsed[type] ?? 0));
}

export function canStartDungeon(state: DungeonState, type: DungeonType, playerLevel: number) {
  const synced = syncDungeonState(state);
  const def = getDungeonDefinition(type);
  if (synced.activeRun) {
    return { allowed: false, reason: "Finish the current dungeon first." };
  }
  if (playerLevel < def.unlockLevel) {
    return { allowed: false, reason: `Reach level ${def.unlockLevel}.` };
  }
  if (getDungeonRunsLeft(synced, type) <= 0) {
    return { allowed: false, reason: "No runs left today." };
  }
  return { allowed: true, reason: "" };
}

function getDungeonEnemyMaxHp(type: DungeonType, zone: WorldZone, wave: number, totalWaves: number): number {
  const zonePower = Math.max(1, zone.requirement);
  const base = 110 * Math.pow(zonePower + wave, 1.35);
  const typeMult = type === "gold" ? 0.92 : type === "xp" ? 1.08 : 1.18;
  const waveMult = wave === totalWaves ? 4.5 : wave >= totalWaves - 1 ? 2.15 : 1 + wave * 0.14;
  return Math.max(120, Math.floor(base * typeMult * waveMult));
}

export function getDungeonDisplayMonster(
  zone: WorldZone,
  run: DungeonRunState | null
): DatabaseMonster | null {
  if (!run) return null;
  const mappedStage = run.isBossWave ? 10 : run.wave === run.totalWaves - 1 ? 9 : ((run.wave - 1) % 8) + 1;
  return getStageMonsterByMap(zone.id, mappedStage) ?? null;
}

export function startDungeonRun(
  state: DungeonState,
  type: DungeonType,
  zone: WorldZone,
  now = Date.now()
): DungeonState {
  const synced = syncDungeonState(state, now);
  const def = getDungeonDefinition(type);
  return {
    ...synced,
    dayKey: getDungeonDayKey(now),
    dailyRunsUsed: {
      ...synced.dailyRunsUsed,
      [type]: (synced.dailyRunsUsed[type] ?? 0) + 1
    },
    lastRewardSummary: null,
    activeRun: {
      type,
      zoneId: zone.id,
      wave: 1,
      totalWaves: def.totalWaves,
      enemyHp: getDungeonEnemyMaxHp(type, zone, 1, def.totalWaves),
      enemyMaxHp: getDungeonEnemyMaxHp(type, zone, 1, def.totalWaves),
      isBossWave: false,
      startedAt: now
    }
  };
}

function getDungeonRewards(type: DungeonType, zone: WorldZone, totalWaves: number, playerLevel: number) {
  const scale = Math.max(1, zone.requirement + playerLevel * 0.4);
  if (type === "gold") {
    return {
      mesos: Math.floor(1800 * scale * totalWaves),
      xp: Math.floor(45 * scale),
      crystals: 0,
      relics: 0,
      fame: Math.floor(3 + zone.requirement / 2)
    };
  }
  if (type === "xp") {
    return {
      mesos: Math.floor(420 * scale),
      xp: Math.floor(210 * scale * totalWaves),
      crystals: Math.max(0, Math.floor(zone.requirement / 6)),
      relics: 0,
      fame: Math.floor(5 + zone.requirement * 0.7)
    };
  }
  return {
    mesos: Math.floor(950 * scale),
    xp: Math.floor(130 * scale),
    crystals: Math.max(2, Math.floor(zone.requirement / 3) + 2),
    relics: Math.max(1, Math.floor(zone.requirement / 8) + 1),
    fame: Math.floor(12 + zone.requirement)
  };
}

export function tickDungeonRun(
  run: DungeonRunState,
  zone: WorldZone,
  deltaSeconds: number,
  dps: number,
  playerLevel: number
): DungeonTickResult {
  let damage = Math.max(0, dps) * deltaSeconds;
  let current = { ...run };
  let kills = 0;
  let bossesKilled = 0;

  const MAX_KILLS_PER_TICK = Math.min(250, Math.max(20, Math.ceil(deltaSeconds * 12)));
  while (damage > 0 && current && kills < MAX_KILLS_PER_TICK) {
    if (damage >= current.enemyHp) {
      damage -= current.enemyHp;
      kills += 1;
      if (current.isBossWave) {
        bossesKilled += 1;
        const rewards = getDungeonRewards(current.type, zone, current.totalWaves, playerLevel);
        return {
          run: null,
          kills,
          bossesKilled,
          completed: true,
          rewards,
          summary:
            current.type === "gold"
              ? `Gold Dungeon cleared · +${Math.floor(rewards.mesos)} mesos`
              : current.type === "xp"
                ? `XP Dungeon cleared · +${Math.floor(rewards.xp)} XP`
                : `Boss Dungeon cleared · +${Math.floor(rewards.crystals)} crystals`
        };
      }

      const nextWave = current.wave + 1;
      const isBossWave = nextWave >= current.totalWaves;
      const enemyMaxHp = getDungeonEnemyMaxHp(current.type, zone, nextWave, current.totalWaves);
      current = {
        ...current,
        wave: nextWave,
        isBossWave,
        enemyHp: enemyMaxHp,
        enemyMaxHp
      };
    } else {
      current.enemyHp -= damage;
      damage = 0;
    }
  }

  return {
    run: current,
    kills,
    bossesKilled,
    completed: false,
    rewards: { mesos: 0, xp: 0, crystals: 0, relics: 0, fame: 0 },
    summary: null
  };
}
