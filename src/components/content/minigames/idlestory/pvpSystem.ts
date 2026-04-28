import type { IdleGameState } from "./gameEngine";

export type ShadowSnapshot = {
  userId: string;
  username: string;
  level: number;
  power: number;
  dps: number;
  hp: number;
  defense: number;
  attackSpeed: number;
  critChance: number;
  critDamage: number;
  stage: number;
  guildName?: string | null;
  updatedAt: string;
};

export type ShadowBattleLog = {
  opponentId: string;
  opponentName: string;
  outcome: "win" | "loss";
  ratingDelta: number;
  mesosReward: number;
  crystalsReward: number;
  happenedAt: string;
};

export type PvpState = {
  rating: number;
  wins: number;
  losses: number;
  streak: number;
  lastOpponentId: string | null;
  lastResults: ShadowBattleLog[];
};

export type ShadowBattleResult = {
  outcome: "win" | "loss";
  ratingDelta: number;
  mesosReward: number;
  crystalsReward: number;
  playerTimeToKill: number;
  enemyTimeToKill: number;
};

export const DEFAULT_PVP_STATE: PvpState = {
  rating: 1000,
  wins: 0,
  losses: 0,
  streak: 0,
  lastOpponentId: null,
  lastResults: []
};

export function createShadowSnapshot(
  state: IdleGameState,
  power: number,
  dps: number,
  username = "Idle Hero",
  userId = "local-player"
): ShadowSnapshot {
  const defense = 26 + state.level * 4 + (state.gearLevels.armor ?? 0) * 10;
  const hp = 360 + state.level * 68 + (state.heroLevels.snailguard ?? 0) * 34 + defense * 9;
  const attackSpeed = 1 + Math.min(1.2, state.level * 0.012 + (state.skillLevels.slash ?? 0) * 0.01);
  const critChance = Math.min(0.55, 0.08 + state.level * 0.003 + (state.skillLevels.meteor ?? 0) * 0.01);
  const critDamage = 1.45 + Math.min(1.65, state.prestigeCount * 0.04 + (state.skillLevels.blessing ?? 0) * 0.025);

  return {
    userId,
    username,
    level: state.level,
    power,
    dps,
    hp,
    defense,
    attackSpeed,
    critChance,
    critDamage,
    stage: state.stage,
    updatedAt: new Date().toISOString()
  };
}

export function simulateShadowBattle(player: ShadowSnapshot, opponent: ShadowSnapshot): ShadowBattleResult {
  const playerDamageFactor = (1 + player.critChance * player.critDamage) * player.attackSpeed;
  const enemyDamageFactor = (1 + opponent.critChance * opponent.critDamage) * opponent.attackSpeed;
  const playerEffectiveDps = Math.max(1, player.dps * playerDamageFactor * (100 / (100 + opponent.defense)));
  const enemyEffectiveDps = Math.max(1, opponent.dps * enemyDamageFactor * (100 / (100 + player.defense)));
  const playerTimeToKill = opponent.hp / playerEffectiveDps;
  const enemyTimeToKill = player.hp / enemyEffectiveDps;
  const outcome = playerTimeToKill <= enemyTimeToKill ? "win" : "loss";
  const ratingDelta = outcome === "win" ? 18 : -12;

  return {
    outcome,
    ratingDelta,
    mesosReward: outcome === "win" ? Math.floor(opponent.power * 0.42) : Math.floor(opponent.power * 0.12),
    crystalsReward: outcome === "win" ? 3 : 1,
    playerTimeToKill,
    enemyTimeToKill
  };
}

export function applyShadowBattleResult(
  state: PvpState,
  opponent: ShadowSnapshot,
  result: ShadowBattleResult
): PvpState {
  const nextWins = state.wins + (result.outcome === "win" ? 1 : 0);
  const nextLosses = state.losses + (result.outcome === "loss" ? 1 : 0);
  const nextStreak = result.outcome === "win" ? state.streak + 1 : 0;
  const nextLog: ShadowBattleLog = {
    opponentId: opponent.userId,
    opponentName: opponent.username,
    outcome: result.outcome,
    ratingDelta: result.ratingDelta,
    mesosReward: result.mesosReward,
    crystalsReward: result.crystalsReward,
    happenedAt: new Date().toISOString()
  };

  return {
    rating: Math.max(700, state.rating + result.ratingDelta),
    wins: nextWins,
    losses: nextLosses,
    streak: nextStreak,
    lastOpponentId: opponent.userId,
    lastResults: [nextLog, ...state.lastResults].slice(0, 8)
  };
}
