import {
  type FarmingPreset,
  type MonsterBossFilter,
  type MonsterDifficultyLabel,
  type MonsterEntry,
  type MonsterFeed,
  type MonsterHpRange,
  type MonsterLevelRange,
  type MonsterSort,
  monsterFeedFallback
} from "../data/monsters";

export type MonsterFilters = {
  search: string;
  type: "All" | MonsterEntry["type"];
  boss: MonsterBossFilter;
  level: MonsterLevelRange;
  hp: MonsterHpRange;
  difficulty: "All" | MonsterDifficultyLabel;
  region: "All" | string;
  weakness: "All" | string;
  farming: FarmingPreset;
  sort: MonsterSort;
};

export type MonsterRecommendationGoal = "Farming" | "Easy hunting" | "Drops" | "Challenge";
export type MonsterFarmingGoal = "Mesos" | "Materials" | "Easy farm" | "High value drops" | "Safe farming" | "Boss farming";

export type MonsterRecommendationInput = {
  goal: MonsterRecommendationGoal;
  level: MonsterLevelRange;
  difficulty: "All" | MonsterDifficultyLabel;
  boss: MonsterBossFilter;
  weakness: "All" | string;
  region: "All" | string;
};

export type MonsterFarmingOptimizerInput = {
  level: MonsterLevelRange;
  difficulty: "All" | MonsterDifficultyLabel;
  goal: MonsterFarmingGoal;
  boss: MonsterBossFilter;
  mapConvenience: "All" | "High" | "Medium" | "Low";
  weakness: "All" | string;
};

export type MonsterRecommendation = {
  item: MonsterEntry;
  score: number;
  confidenceLabel: string;
  badge: string;
  reasons: string[];
  breakdown: {
    farm: number;
    survival: number;
    drops: number;
    convenience: number;
  };
};

export type MonsterFarmingRecommendation = {
  item: MonsterEntry;
  score: number;
  badge: string;
  reasons: string[];
  breakdown: {
    farming: number;
    dropValue: number;
    safety: number;
    convenience: number;
    bossing: number;
  };
};

export type MonsterDropDatabaseEntry = {
  id: string;
  name: string;
  rarity: MonsterEntry["drops"][number]["rarity"];
  itemType: MonsterEntry["drops"][number]["kind"];
  dropCategory: MonsterEntry["drops"][number]["kind"];
  icon: string | null;
  estimatedValue: number;
  sourceMonsters: MonsterEntry[];
};

export type MonsterScoreMetric = {
  value: number;
  reasons: string[];
};

export type MonsterScoreProfile = {
  farmingScore: MonsterScoreMetric;
  difficultyScore: MonsterScoreMetric;
  dropValueScore: MonsterScoreMetric;
  survivabilityChallengeScore: MonsterScoreMetric;
  accessibilityScore: MonsterScoreMetric;
  bossThreatScore: MonsterScoreMetric;
  beginnerFriendlinessScore: MonsterScoreMetric;
};

export const defaultMonsterFilters: MonsterFilters = {
  search: "",
  type: "All",
  boss: "All",
  level: "All",
  hp: "All",
  difficulty: "All",
  region: "All",
  weakness: "All",
  farming: "All",
  sort: "Alphabetical"
};

export const defaultMonsterRecommendationInput: MonsterRecommendationInput = {
  goal: "Farming",
  level: "All",
  difficulty: "All",
  boss: "All",
  weakness: "All",
  region: "All"
};

export const defaultMonsterFarmingOptimizerInput: MonsterFarmingOptimizerInput = {
  level: "All",
  difficulty: "All",
  goal: "Mesos",
  boss: "All",
  mapConvenience: "All",
  weakness: "All"
};

export function formatMonsterHp(hp: number) {
  if (hp >= 1_000_000_000) return `${(hp / 1_000_000_000).toFixed(1)}B`;
  if (hp >= 1_000_000) return `${(hp / 1_000_000).toFixed(1)}M`;
  if (hp >= 1_000) return `${(hp / 1_000).toFixed(1)}K`;
  return `${hp}`;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function levelRangeMatches(level: number, range: MonsterLevelRange) {
  switch (range) {
    case "1-30":
      return level <= 30;
    case "31-70":
      return level >= 31 && level <= 70;
    case "71-120":
      return level >= 71 && level <= 120;
    case "121-180":
      return level >= 121 && level <= 180;
    case "181+":
      return level >= 181;
    default:
      return true;
  }
}

function hpRangeMatches(hp: number, range: MonsterHpRange) {
  switch (range) {
    case "0-10K":
      return hp <= 10_000;
    case "10K-1M":
      return hp > 10_000 && hp <= 1_000_000;
    case "1M-100M":
      return hp > 1_000_000 && hp <= 100_000_000;
    case "100M+":
      return hp > 100_000_000;
    default:
      return true;
  }
}

function farmingPresetMatches(monster: MonsterEntry, preset: FarmingPreset) {
  switch (preset) {
    case "Best meso farming":
      return monster.farmingTags.some((tag) => /meso/i.test(tag)) || monster.farmingScore >= 72;
    case "Best easy farm":
      return monster.farmingTags.some((tag) => /easy/i.test(tag)) || (monster.farmingScore >= 50 && monster.difficulty <= 55);
    case "Best material drops":
      return monster.farmingTags.some((tag) => /material/i.test(tag));
    default:
      return true;
  }
}

function getDropValue(monster: MonsterEntry) {
  return monster.drops.reduce((score, drop) => {
    const rarityScore = drop.rarity === "Epic" ? 24 : drop.rarity === "Rare" ? 12 : 5;
    const kindScore =
      drop.kind === "Currency" ? 16 : drop.kind === "Equipment" ? 14 : drop.kind === "Material" ? 10 : 6;
    return score + rarityScore + kindScore;
  }, 0);
}

function getConvenienceScore(monster: MonsterEntry) {
  const routeBonus = Math.max(0, 18 - monster.locations.length * 2);
  const nonBossBonus = monster.isBoss ? 0 : 10;
  return routeBonus + nonBossBonus;
}

export function getMonsterScoreProfile(monster: MonsterEntry): MonsterScoreProfile {
  const dropValue = getDropValue(monster);
  const accessibilityBase = getConvenienceScore(monster);
  const hpPressure = Math.min(monster.hp / 1_000_000, 100);
  const weaknessAccess = Math.min(monster.weaknesses.length * 9, 28);
  const bossPenalty = monster.isBoss ? 18 : 0;
  const elitePenalty = monster.isElite ? 8 : 0;

  const farmingScore = clampScore(
    monster.farmingScore * 0.58 +
      dropValue * 0.22 +
      accessibilityBase * 0.65 +
      weaknessAccess * 0.32 -
      bossPenalty
  );

  const difficultyScore = clampScore(
    monster.difficulty * 0.72 + monster.strength * 0.36 + hpPressure * 0.28 + (monster.isBoss ? 16 : 0) + (monster.isElite ? 8 : 0)
  );

  const dropValueScore = clampScore(dropValue * 1.12 + monster.drops.length * 4 + (monster.isBoss ? 8 : 0));

  const survivabilityChallengeScore = clampScore(
    monster.strength * 0.64 + monster.difficulty * 0.58 + hpPressure * 0.36 + bossPenalty + elitePenalty
  );

  const accessibilityScore = clampScore(
    accessibilityBase * 2.1 + (monster.locations.length === 1 ? 10 : 0) + (monster.isBoss ? -12 : 6)
  );

  const bossThreatScore = clampScore(
    (monster.isBoss ? 46 : monster.isElite ? 22 : 8) + monster.strength * 0.46 + monster.difficulty * 0.44 + hpPressure * 0.3
  );

  const beginnerFriendlinessScore = clampScore(
    100 -
      (monster.difficulty * 0.55 + monster.strength * 0.42 + hpPressure * 0.26 + bossPenalty + elitePenalty) +
      accessibilityBase * 0.42 +
      weaknessAccess * 0.28
  );

  return {
    farmingScore: {
      value: farmingScore,
      reasons: [
        `Farm value uses route quality, drop value, and ${monster.farmingTier.toLowerCase()} route strength.`,
        accessibilityBase >= 18 ? "Accessible routes improve repeat farming." : "Route access is more limited, so loops are slower.",
        dropValue >= 50 ? "Drop table adds real value to the route." : "Loot value is more modest than top farming picks."
      ]
    },
    difficultyScore: {
      value: difficultyScore,
      reasons: [
        `Difficulty comes from HP pressure, strength ${monster.strength}, and ${monster.difficultyLabel.toLowerCase()} pacing.`,
        monster.isBoss || monster.isElite ? "Boss or elite pressure raises the danger level." : "Normal monster pacing keeps the fight more manageable.",
        hpPressure >= 35 ? "Large HP pool pushes the overall difficulty higher." : "Lower HP keeps the encounter easier to control."
      ]
    },
    dropValueScore: {
      value: dropValueScore,
      reasons: [
        `${monster.drops.length} listed drops contribute to the loot value score.`,
        dropValue >= 55 ? "Rare and high-value drops raise the score." : "Mostly common loot keeps the score more moderate.",
        monster.drops.some((drop) => drop.kind === "Currency" || drop.kind === "Equipment")
          ? "Currency or equipment drops add extra value."
          : "Drops are more material-focused than premium loot-focused."
      ]
    },
    survivabilityChallengeScore: {
      value: survivabilityChallengeScore,
      reasons: [
        "Challenge score measures how punishing the fight feels over time.",
        monster.strength >= 70 ? "High strength sharply increases punishment for mistakes." : "Moderate pressure leaves more room to recover.",
        monster.isBoss ? "Boss mechanics make the encounter more demanding." : "Non-boss pressure keeps the challenge more controlled."
      ]
    },
    accessibilityScore: {
      value: accessibilityScore,
      reasons: [
        `${monster.locations.length} route${monster.locations.length > 1 ? "s" : ""} affect travel convenience.`,
        monster.locations[0] ? `Main route starts in ${monster.locations[0].region}.` : "Location data is limited for this target.",
        monster.isBoss ? "Boss status lowers quick-access convenience." : "Non-boss access improves daily route convenience."
      ]
    },
    bossThreatScore: {
      value: bossThreatScore,
      reasons: [
        monster.isBoss ? "Boss flag gives this target a much higher threat baseline." : "Threat stays lower without boss status.",
        monster.isElite ? "Elite pressure raises the threat profile." : "No elite modifier keeps threat lower.",
        `Threat also scales with strength ${monster.strength} and difficulty ${monster.difficultyLabel.toLowerCase()}.`
      ]
    },
    beginnerFriendlinessScore: {
      value: beginnerFriendlinessScore,
      reasons: [
        "Beginner friendliness rewards low pressure, simple routes, and punishable weaknesses.",
        weaknessAccess >= 18 ? "Multiple weaknesses make the target easier to exploit." : "Fewer clear weaknesses make the fight less forgiving.",
        monster.isBoss ? "Boss mechanics lower beginner friendliness." : "Non-boss pacing keeps the learning curve softer."
      ]
    }
  };
}

function levelPreferenceMultiplier(monster: MonsterEntry, range: MonsterLevelRange) {
  return levelRangeMatches(monster.level, range) ? 18 : -12;
}

function difficultyPreferenceMultiplier(monster: MonsterEntry, difficulty: "All" | MonsterDifficultyLabel) {
  return difficulty === "All" || monsterDifficultyMatches(monster.difficultyLabel, difficulty) ? 12 : -14;
}

function monsterDifficultyMatches(value: MonsterDifficultyLabel, target: "All" | MonsterDifficultyLabel) {
  return target === "All" || value === target;
}

function mapConvenienceMatches(score: number, target: MonsterFarmingOptimizerInput["mapConvenience"]) {
  if (target === "All") return true;
  if (target === "High") return score >= 70;
  if (target === "Medium") return score >= 45 && score < 70;
  return score < 45;
}

function bossPreferenceMultiplier(monster: MonsterEntry, boss: MonsterBossFilter) {
  if (boss === "All") return 0;
  if (boss === "Bosses") return monster.isBoss ? 22 : -18;
  return monster.isBoss ? -18 : 10;
}

function weaknessPreferenceMultiplier(monster: MonsterEntry, weakness: "All" | string) {
  if (weakness === "All") return 0;
  return monster.weaknesses.includes(weakness) ? 16 : -8;
}

function regionPreferenceMultiplier(monster: MonsterEntry, region: "All" | string) {
  if (region === "All") return 0;
  return monster.locations.some((location) => location.region === region) ? 16 : -10;
}

function getRecommendationBadge(goal: MonsterRecommendationGoal, item: MonsterEntry) {
  switch (goal) {
    case "Farming":
      return item.farmingScore >= 80 ? "Best Farming Pick" : "Strong Route";
    case "Easy hunting":
      return item.difficulty <= 30 ? "Easy Clear" : "Safe Pick";
    case "Drops":
      return getDropValue(item) >= 55 ? "High Value Drops" : "Good Loot";
    case "Challenge":
      return item.isBoss ? "Boss Challenge" : "Hard Route";
    default:
      return "Best Match";
  }
}

function getFarmingBadge(goal: MonsterFarmingGoal, score: number, item: MonsterEntry) {
  if (goal === "Easy farm") return "Best Easy Farm";
  if (goal === "High value drops") return "Best Drop Value";
  if (goal === "Safe farming") return "Safe Route";
  if (goal === "Boss farming" || item.isBoss) return "Boss Route";
  if (goal === "Materials") return "Material Focus";
  if (score >= 82) return "Best Overall";
  return "High Risk / High Reward";
}

function getConfidenceLabel(score: number) {
  if (score >= 92) return "Best Match";
  if (score >= 78) return "Strong Match";
  if (score >= 62) return "Good Match";
  return "Situational";
}

function buildReasons(item: MonsterEntry, goal: MonsterRecommendationGoal, breakdown: MonsterRecommendation["breakdown"]) {
  const reasons: string[] = [];

  if (goal === "Farming") {
    reasons.push(`${item.farmingTier} farming target`);
    reasons.push(item.farmingReason);
    if (item.locations[0]) reasons.push(`Good route in ${item.locations[0].map}`);
  } else if (goal === "Easy hunting") {
    reasons.push(`${item.difficultyLabel} difficulty makes it easier to manage`);
    reasons.push(item.weaknesses[0] ? `Easy punish window: ${item.weaknesses[0]}` : "Low pressure target");
    reasons.push(`Survival score ${Math.round(breakdown.survival)}`);
  } else if (goal === "Drops") {
    reasons.push(`${item.drops.length} listed drops to farm`);
    reasons.push(item.drops[0] ? `Standout drop: ${item.drops[0].name}` : "Useful loot profile");
    reasons.push(`Drop value score ${Math.round(breakdown.drops)}`);
  } else {
    reasons.push(item.isBoss ? "Built for a boss challenge run" : "A stronger non-boss challenge");
    reasons.push(`Strength ${item.strength} with ${item.difficultyLabel.toLowerCase()} pressure`);
    reasons.push(`HP ${formatMonsterHp(item.hp)}`);
  }

  return reasons.slice(0, 3);
}

export function getMonsterRecommendations(items: MonsterEntry[], input: MonsterRecommendationInput, limit = 4) {
  const results = items
    .map((item) => {
      const profile = getMonsterScoreProfile(item);
      const farm = profile.farmingScore.value;
      const survival = 100 - profile.difficultyScore.value + Math.round(profile.beginnerFriendlinessScore.value * 0.35);
      const drops = profile.dropValueScore.value;
      const convenience = profile.accessibilityScore.value;

      let score = 0;

      if (input.goal === "Farming") {
        score += farm * 0.8 + convenience * 0.55 + drops * 0.18 + profile.beginnerFriendlinessScore.value * 0.14;
      } else if (input.goal === "Easy hunting") {
        score += profile.beginnerFriendlinessScore.value * 0.82 + convenience * 0.3 + Math.max(0, 60 - item.level * 0.15);
      } else if (input.goal === "Drops") {
        score += drops * 0.92 + farm * 0.25 + (item.isBoss ? 12 : 0);
      } else {
        score += profile.bossThreatScore.value * 0.72 + profile.survivabilityChallengeScore.value * 0.42 + (item.isBoss ? 18 : 0);
      }

      score += levelPreferenceMultiplier(item, input.level);
      score += difficultyPreferenceMultiplier(item, input.difficulty);
      score += bossPreferenceMultiplier(item, input.boss);
      score += weaknessPreferenceMultiplier(item, input.weakness);
      score += regionPreferenceMultiplier(item, input.region);

      const breakdown = {
        farm: Math.round(farm),
        survival: Math.round(survival),
        drops: Math.round(drops),
        convenience: Math.round(convenience)
      };

      return {
        item,
        score: Math.max(0, Math.round(score)),
        confidenceLabel: getConfidenceLabel(score),
        badge: getRecommendationBadge(input.goal, item),
        reasons: buildReasons(item, input.goal, breakdown),
        breakdown
      } satisfies MonsterRecommendation;
    })
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .slice(0, limit);

  return results;
}

export function getFarmingOptimizerRecommendations(
  items: MonsterEntry[],
  input: MonsterFarmingOptimizerInput,
  limit = 5
) {
  return items
    .filter((item) => levelRangeMatches(item.level, input.level))
    .filter((item) => monsterDifficultyMatches(item.difficultyLabel, input.difficulty))
    .filter((item) => (input.boss === "All" ? true : input.boss === "Bosses" ? item.isBoss : !item.isBoss))
    .map((item) => ({ item, profile: getMonsterScoreProfile(item) }))
    .filter(
      ({ item, profile }) =>
        (input.weakness === "All" || item.weaknesses.includes(input.weakness)) &&
        mapConvenienceMatches(profile.accessibilityScore.value, input.mapConvenience)
    )
    .map(({ item, profile }) => {
      const farming = profile.farmingScore.value;
      const drops = profile.dropValueScore.value;
      const safety = profile.beginnerFriendlinessScore.value;
      const convenience = profile.accessibilityScore.value;
      const bossing = profile.bossThreatScore.value;

      let score = 0;

      switch (input.goal) {
        case "Mesos":
          score = farming * 0.46 + drops * 0.22 + convenience * 0.22 + safety * 0.1;
          break;
        case "Materials":
          score = drops * 0.4 + farming * 0.28 + convenience * 0.2 + safety * 0.12;
          break;
        case "Easy farm":
          score = safety * 0.42 + convenience * 0.28 + farming * 0.2 + drops * 0.1;
          break;
        case "High value drops":
          score = drops * 0.55 + farming * 0.2 + convenience * 0.15 + bossing * 0.1;
          break;
        case "Safe farming":
          score = safety * 0.54 + convenience * 0.24 + farming * 0.16 + drops * 0.06;
          break;
        case "Boss farming":
          score = bossing * 0.46 + drops * 0.18 + farming * 0.18 + convenience * 0.08 + (item.isBoss ? 18 : -12);
          break;
      }

      const finalScore = clampScore(score);

      return {
        item,
        score: finalScore,
        badge: getFarmingBadge(input.goal, finalScore, item),
        reasons: [
          profile.farmingScore.reasons[0],
          input.goal === "High value drops" || input.goal === "Materials"
            ? profile.dropValueScore.reasons[0]
            : input.goal === "Safe farming" || input.goal === "Easy farm"
              ? profile.beginnerFriendlinessScore.reasons[0]
              : profile.accessibilityScore.reasons[0],
          item.locations[0] ? `Best route starts in ${item.locations[0].map}.` : "Location data is limited for this target."
        ],
        breakdown: {
          farming,
          dropValue: drops,
          safety,
          convenience,
          bossing
        }
      } satisfies MonsterFarmingRecommendation;
    })
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .slice(0, limit);
}

export function matchesMonsterFilters(monster: MonsterEntry, filters: MonsterFilters) {
  const query = filters.search.trim().toLowerCase();
  const matchesSearch =
    query.length === 0 ||
    monster.name.toLowerCase().includes(query) ||
    monster.farmingTags.some((tag) => tag.toLowerCase().includes(query)) ||
    monster.locations.some((location) => `${location.region} ${location.map}`.toLowerCase().includes(query));

  const matchesType = filters.type === "All" || monster.type === filters.type;
  const matchesBoss =
    filters.boss === "All" ||
    (filters.boss === "Bosses" ? monster.isBoss : !monster.isBoss);
  const matchesLevel = levelRangeMatches(monster.level, filters.level);
  const matchesHp = hpRangeMatches(monster.hp, filters.hp);
  const matchesDifficulty = filters.difficulty === "All" || monster.difficultyLabel === filters.difficulty;
  const matchesRegion = filters.region === "All" || monster.locations.some((location) => location.region === filters.region);
  const matchesWeakness = filters.weakness === "All" || monster.weaknesses.includes(filters.weakness);
  const matchesFarming = farmingPresetMatches(monster, filters.farming);

  return (
    matchesSearch &&
    matchesType &&
    matchesBoss &&
    matchesLevel &&
    matchesHp &&
    matchesDifficulty &&
    matchesRegion &&
    matchesWeakness &&
    matchesFarming
  );
}

export function sortMonsters(items: MonsterEntry[], sort: MonsterSort) {
  const list = [...items];

  switch (sort) {
    case "Highest HP":
      return list.sort((a, b) => b.hp - a.hp);
    case "Lowest HP":
      return list.sort((a, b) => a.hp - b.hp);
    case "Strongest":
      return list.sort((a, b) => b.strength - a.strength);
    case "Weakest":
      return list.sort((a, b) => a.strength - b.strength);
    case "Best Farming":
      return list.sort((a, b) => b.farmingScore - a.farmingScore);
    default:
      return list.sort((a, b) => a.name.localeCompare(b.name));
  }
}

export function getMonsterRegions(items: MonsterEntry[]) {
  return Array.from(new Set(items.flatMap((item) => item.locations.map((location) => location.region)))).sort((a, b) =>
    a.localeCompare(b)
  );
}

export function getMonsterWeaknesses(items: MonsterEntry[]) {
  return Array.from(new Set(items.flatMap((item) => item.weaknesses))).sort((a, b) => a.localeCompare(b));
}

export function getTopFarmingMonsters(items: MonsterEntry[]) {
  return [...items]
    .filter((item) => !item.isBoss)
    .sort((a, b) => b.farmingScore - a.farmingScore)
    .slice(0, 6);
}

export function getFeaturedBosses(items: MonsterEntry[]) {
  return [...items]
    .filter((item) => item.isBoss)
    .sort((a, b) => b.hp - a.hp)
    .slice(0, 4);
}

export function getMonsterFeedFallback(): MonsterFeed {
  return monsterFeedFallback;
}

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase();
}

function getDropEstimatedValue(rarity: MonsterEntry["drops"][number]["rarity"], kind: MonsterEntry["drops"][number]["kind"]) {
  const rarityValue = rarity === "Epic" ? 78 : rarity === "Rare" ? 52 : 24;
  const kindValue = kind === "Currency" ? 18 : kind === "Equipment" ? 16 : kind === "Material" ? 12 : 8;
  return clampScore(rarityValue + kindValue);
}

export function buildMonsterDropsDatabase(items: MonsterEntry[]): MonsterDropDatabaseEntry[] {
  const map = new Map<string, MonsterDropDatabaseEntry>();

  for (const monster of items) {
    for (const drop of monster.drops) {
      const key = drop.name.toLowerCase();
      const current = map.get(key);

      if (current) {
        current.sourceMonsters.push(monster);
        current.estimatedValue = Math.max(current.estimatedValue, getDropEstimatedValue(drop.rarity, drop.kind));
      } else {
        map.set(key, {
          id: key.replace(/[^a-z0-9]+/g, "-"),
          name: drop.name,
          rarity: drop.rarity,
          itemType: drop.kind,
          dropCategory: drop.kind,
          icon: null,
          estimatedValue: getDropEstimatedValue(drop.rarity, drop.kind),
          sourceMonsters: [monster]
        });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function getMonsterSearchSuggestions(items: MonsterEntry[], query: string, limit = 8) {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];

  const monsterSuggestions = items
    .filter((item) => item.name.toLowerCase().includes(normalized))
    .map((item) => ({ id: `monster-${item.id}`, label: item.name, type: "Monster" as const }))
    .slice(0, limit);

  const dropSuggestions = buildMonsterDropsDatabase(items)
    .filter((drop) => drop.name.toLowerCase().includes(normalized))
    .map((drop) => ({ id: `drop-${drop.id}`, label: drop.name, type: "Drop" as const }))
    .slice(0, limit);

  const locationSuggestions = Array.from(
    new Set(
      items.flatMap((item) =>
        item.locations.map((location) => `${location.region} - ${location.map}`)
      )
    )
  )
    .filter((location) => location.toLowerCase().includes(normalized))
    .map((location) => ({ id: `location-${location}`, label: location, type: "Location" as const }))
    .slice(0, limit);

  return [...monsterSuggestions, ...dropSuggestions, ...locationSuggestions].slice(0, limit);
}
