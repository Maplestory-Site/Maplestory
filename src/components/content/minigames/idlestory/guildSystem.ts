export type GuildRole = "none" | "leader" | "member";

export type GuildBuffId = "battle-standard" | "scholar-sigil" | "golden-contract";

export type GuildState = {
  guildId: string | null;
  guildName: string | null;
  guildIcon: string;
  role: GuildRole;
  guildXp: number;
  guildLevel: number;
  totalContribution: number;
  raidContribution: number;
  memberCount: number;
  passiveBuffs: GuildBuffId[];
};

export type GuildPassiveBonuses = {
  damageMult: number;
  xpMult: number;
  goldMult: number;
};

export const DEFAULT_GUILD_STATE: GuildState = {
  guildId: null,
  guildName: null,
  guildIcon: "🛡️",
  role: "none",
  guildXp: 0,
  guildLevel: 0,
  totalContribution: 0,
  raidContribution: 0,
  memberCount: 0,
  passiveBuffs: []
};

export function getGuildLevelFromXp(xp: number): number {
  let level = 0;
  let threshold = 120;
  let remaining = Math.max(0, xp);

  while (remaining >= threshold) {
    remaining -= threshold;
    level += 1;
    threshold = Math.floor(threshold * 1.35);
  }

  return level;
}

export function getGuildPassiveBonuses(state: GuildState): GuildPassiveBonuses {
  if (!state.guildId) {
    return { damageMult: 1, xpMult: 1, goldMult: 1 };
  }

  const level = Math.max(0, state.guildLevel);
  const hasDamageBuff = state.passiveBuffs.includes("battle-standard");
  const hasXpBuff = state.passiveBuffs.includes("scholar-sigil");
  const hasGoldBuff = state.passiveBuffs.includes("golden-contract");

  return {
    damageMult: 1 + level * 0.012 + (hasDamageBuff ? 0.03 : 0),
    xpMult: 1 + level * 0.008 + (hasXpBuff ? 0.025 : 0),
    goldMult: 1 + level * 0.01 + (hasGoldBuff ? 0.03 : 0)
  };
}

export function syncGuildState(
  current: GuildState,
  incoming?: Partial<GuildState> | null
): GuildState {
  if (!incoming?.guildId) {
    return {
      ...DEFAULT_GUILD_STATE,
      totalContribution: current.totalContribution,
      raidContribution: current.raidContribution
    };
  }

  return {
    ...current,
    ...incoming,
    guildLevel: incoming.guildLevel ?? getGuildLevelFromXp(incoming.guildXp ?? current.guildXp)
  };
}

export function applyGuildContribution(
  state: GuildState,
  payload: { kills: number; eliteKills: number; bossKills: number; mesosGained: number }
): GuildState {
  if (!state.guildId) return state;

  const contribution =
    payload.kills * 1 +
    payload.eliteKills * 5 +
    payload.bossKills * 16 +
    Math.floor(payload.mesosGained / 5000);

  const nextXp = state.guildXp + contribution;

  return {
    ...state,
    guildXp: nextXp,
    guildLevel: getGuildLevelFromXp(nextXp),
    totalContribution: state.totalContribution + contribution,
    raidContribution: state.raidContribution + payload.bossKills * 24 + payload.eliteKills * 8
  };
}
