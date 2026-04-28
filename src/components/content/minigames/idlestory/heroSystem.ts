/**
 * IdleStory World hero system.
 * Owns hero definitions, per-hero scaling, rarity, and party DPS math.
 */

import type { ClassId, HeroId } from "./gameEngine";

export type HeroRarity = "common" | "rare" | "epic" | "legendary";

export type HeroBaseStats = {
  attack: number;
  defense: number;
  hp: number;
  attackSpeed: number;
};

export type HeroDefinition = {
  id: HeroId;
  name: string;
  classType: ClassId;
  rarity: HeroRarity;
  role: string;
  baseCost: number;
  baseDps: number;
  baseStats: HeroBaseStats;
  passiveBonus: string;
  skillUnlockLevels: number[];
};

export type HeroRuntime = HeroDefinition & {
  level: number;
  xp: number;
  stats: HeroBaseStats;
};

const RARITY_MULT: Record<HeroRarity, number> = {
  common: 1,
  rare: 1.18,
  epic: 1.42,
  legendary: 1.85
};

export const HEROES: Record<HeroId, HeroDefinition> = {
  snailguard: {
    id: "snailguard",
    name: "Snailguard",
    classType: "warrior",
    rarity: "common",
    role: "Frontline explorer",
    baseCost: 120,
    baseDps: 4,
    baseStats: { attack: 7, defense: 8, hp: 140, attackSpeed: 0.75 },
    passiveBonus: "+8% team defense while active",
    skillUnlockLevels: [1, 5, 10]
  },
  mage: {
    id: "mage",
    name: "Lumi Mage",
    classType: "mage",
    rarity: "rare",
    role: "Arcane idle burst",
    baseCost: 180,
    baseDps: 7,
    baseStats: { attack: 14, defense: 3, hp: 80, attackSpeed: 0.62 },
    passiveBonus: "+10% burst skill damage",
    skillUnlockLevels: [1, 5, 10]
  },
  archer: {
    id: "archer",
    name: "Ribbon Archer",
    classType: "archer",
    rarity: "rare",
    role: "Critical hunt shots",
    baseCost: 230,
    baseDps: 10,
    baseStats: { attack: 11, defense: 4, hp: 95, attackSpeed: 1.18 },
    passiveBonus: "+6% team attack speed",
    skillUnlockLevels: [1, 5, 10]
  },
  ironwall: {
    id: "ironwall",
    name: "Ironwall Knight",
    classType: "warrior",
    rarity: "epic",
    role: "Boss tank and shield breaker",
    baseCost: 720,
    baseDps: 18,
    baseStats: { attack: 18, defense: 18, hp: 260, attackSpeed: 0.68 },
    passiveBonus: "+12% boss damage reduction",
    skillUnlockLevels: [1, 8, 16]
  },
  pyromancer: {
    id: "pyromancer",
    name: "Ember Pyromancer",
    classType: "mage",
    rarity: "epic",
    role: "High burst wave clearer",
    baseCost: 860,
    baseDps: 24,
    baseStats: { attack: 28, defense: 5, hp: 115, attackSpeed: 0.58 },
    passiveBonus: "+15% elite damage",
    skillUnlockLevels: [1, 8, 16]
  },
  falconer: {
    id: "falconer",
    name: "Sky Falconer",
    classType: "archer",
    rarity: "legendary",
    role: "Fast crit carry",
    baseCost: 1200,
    baseDps: 34,
    baseStats: { attack: 24, defense: 7, hp: 150, attackSpeed: 1.42 },
    passiveBonus: "+8% crit chance aura",
    skillUnlockLevels: [1, 10, 20]
  }
};

export function getHeroCost(id: HeroId, currentLevel: number): number {
  const hero = HEROES[id];
  const rarityCost = RARITY_MULT[hero.rarity];
  return Math.round(hero.baseCost * rarityCost * Math.pow(1.42, currentLevel));
}

export function getHeroRequiredXp(level: number): number {
  return Math.floor(60 * Math.pow(Math.max(1, level), 1.65));
}

export function getHeroStats(id: HeroId, level: number): HeroBaseStats {
  const hero = HEROES[id];
  const rarityMult = RARITY_MULT[hero.rarity];
  const classMult = hero.classType === "warrior" ? 1.14 : hero.classType === "mage" ? 1.22 : 1.18;
  // Balance: reduced exponent so each level-up gives ~42% DPS gain instead of ~71%.
  // warrior/archer: 1.1 → 0.80; mage: 1.16 → 0.85
  const levelScale = Math.pow(Math.max(1, level), hero.classType === "mage" ? 0.85 : 0.80);

  return {
    attack: Math.floor(hero.baseStats.attack * rarityMult * classMult * levelScale),
    defense: Math.floor(hero.baseStats.defense * rarityMult * (hero.classType === "warrior" ? 1.25 : 1) * Math.pow(Math.max(1, level), 0.95)),
    hp: Math.floor(hero.baseStats.hp * rarityMult * (hero.classType === "warrior" ? 1.35 : 1) * Math.pow(Math.max(1, level), 1.08)),
    attackSpeed: Number((hero.baseStats.attackSpeed * (1 + Math.min(0.6, level * 0.006))).toFixed(3))
  };
}

export function getHeroRuntime(id: HeroId, level: number, xp = 0): HeroRuntime {
  return {
    ...HEROES[id],
    level,
    xp,
    stats: getHeroStats(id, level)
  };
}

export function getHeroDps(id: HeroId, level: number): number {
  if (level <= 0) return 0;
  const hero = HEROES[id];
  const stats = getHeroStats(id, level);
  const classIdentity = hero.classType === "warrior" ? 0.92 : hero.classType === "mage" ? 1.12 : 1.06;
  return (hero.baseDps + stats.attack * stats.attackSpeed) * classIdentity;
}

export function getPartySynergyMult(heroLevels: Record<HeroId, number>): number {
  const activeClasses = new Set<ClassId>();
  for (const [id, level] of Object.entries(heroLevels) as [HeroId, number][]) {
    if (level > 0) activeClasses.add(HEROES[id].classType);
  }

  if (activeClasses.size >= 3) return 1.18;
  if (activeClasses.size >= 2) return 1.08;
  return 1;
}

export function calculateHeroTeamDps(heroLevels: Record<HeroId, number>): number {
  const base = (Object.entries(heroLevels) as [HeroId, number][]).reduce(
    (sum, [id, level]) => sum + getHeroDps(id, level),
    0
  );
  return base * getPartySynergyMult(heroLevels);
}

export function getUnlockedHeroSkills(id: HeroId, level: number): number[] {
  return HEROES[id].skillUnlockLevels.filter((unlockLevel) => level >= unlockLevel);
}

export function applyHeroXp(level: number, xp: number, xpGain: number): { level: number; xp: number } {
  let nextLevel = Math.max(0, level);
  let nextXp = Math.max(0, xp + xpGain);

  while (nextLevel > 0 && nextLevel < 100) {
    const requiredXp = getHeroRequiredXp(nextLevel);
    if (nextXp < requiredXp) break;
    nextXp -= requiredXp;
    nextLevel += 1;
  }

  return { level: nextLevel, xp: nextLevel >= 100 ? 0 : nextXp };
}

export function applyPartyHeroXp(
  heroLevels: Record<HeroId, number>,
  heroXp: Record<HeroId, number>,
  xpGain: number
): { heroLevels: Record<HeroId, number>; heroXp: Record<HeroId, number> } {
  const activeHeroes = (Object.keys(HEROES) as HeroId[]).filter((id) => heroLevels[id] > 0);
  if (!activeHeroes.length || xpGain <= 0) return { heroLevels, heroXp };

  const nextLevels = { ...heroLevels };
  const nextXp = { ...heroXp };
  const xpPerHero = xpGain / activeHeroes.length;

  for (const id of activeHeroes) {
    const result = applyHeroXp(nextLevels[id], nextXp[id] ?? 0, xpPerHero);
    nextLevels[id] = result.level;
    nextXp[id] = result.xp;
  }

  return { heroLevels: nextLevels, heroXp: nextXp };
}
