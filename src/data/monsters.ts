export type MonsterType = "Normal" | "Elite" | "Boss";
export type MonsterCategory = "Mushroom" | "Slime" | "Beast" | "Undead" | "Dragon" | "Machine" | "Spirit" | "Demon";
export type MonsterDifficultyLabel = "Low" | "Moderate" | "High" | "Extreme";
export type FarmingTier = "Low" | "Solid" | "Strong" | "Top";

export type FarmingPreset = "All" | "Best meso farming" | "Best easy farm" | "Best material drops";
export type MonsterLevelRange = "All" | "1-30" | "31-70" | "71-120" | "121-180" | "181+";
export type MonsterHpRange = "All" | "0-10K" | "10K-1M" | "1M-100M" | "100M+";
export type MonsterSort = "Alphabetical" | "Highest HP" | "Lowest HP" | "Strongest" | "Weakest" | "Best Farming";
export type MonsterBossFilter = "All" | "Bosses" | "Non-Bosses";

export type MonsterDrop = {
  name: string;
  rarity: "Common" | "Rare" | "Epic";
  kind: "Material" | "Equipment" | "Consumable" | "Quest" | "Currency";
};

export type MonsterLocation = {
  region: string;
  map: string;
  area?: string;
};

export type MonsterEntry = {
  id: string;
  name: string;
  image: string | null;
  portrait: string;
  type: MonsterType;
  category: MonsterCategory;
  level: number;
  hp: number;
  strength: number;
  difficulty: number;
  difficultyLabel: MonsterDifficultyLabel;
  description: string;
  shortDescription: string;
  weaknesses: string[];
  drops: MonsterDrop[];
  locations: MonsterLocation[];
  isBoss: boolean;
  isElite: boolean;
  farmingScore: number;
  farmingTier: FarmingTier;
  farmingTags: string[];
  farmingReason: string;
};

export type MonsterFeed = {
  items: MonsterEntry[];
  meta: {
    sourceName: string;
    sourceUrl: string;
    copyrightLabel: string;
    updatedAt: string;
    syncState: "seeded" | "synced" | "stale";
    itemCount: number;
  };
};

export const monsterTypeFilters: Array<"All" | MonsterType> = ["All", "Normal", "Elite", "Boss"];
export const monsterBossFilters: MonsterBossFilter[] = ["All", "Bosses", "Non-Bosses"];
export const monsterLevelRanges: MonsterLevelRange[] = ["All", "1-30", "31-70", "71-120", "121-180", "181+"];
export const monsterHpRanges: MonsterHpRange[] = ["All", "0-10K", "10K-1M", "1M-100M", "100M+"];
export const monsterDifficulties: Array<"All" | MonsterDifficultyLabel> = ["All", "Low", "Moderate", "High", "Extreme"];
export const monsterSortOptions: MonsterSort[] = [
  "Alphabetical",
  "Highest HP",
  "Lowest HP",
  "Strongest",
  "Weakest",
  "Best Farming"
];
export const monsterFarmingPresets: FarmingPreset[] = ["All", "Best meso farming", "Best easy farm", "Best material drops"];

const monsterImageMap: Partial<Record<string, string>> = {
  "orange-mushroom": "https://cdn.wikimg.net/strategywiki/images/4/40/MS_Monster_Orange_Mushroom.png",
  "blue-snail": "https://cdn.wikimg.net/strategywiki/images/f/f2/MS_Monster_Blue_Snail.png",
  "slime": "https://cdn.wikimg.net/strategywiki/images/8/83/MS_Monster_Slime.png",
  "ribbon-pig": "https://cdn.wikimg.net/strategywiki/images/b/bf/MS_Monster_Ribbon_Pig.png",
  "zombie-mushroom": "https://cdn.wikimg.net/strategywiki/images/f/f0/MS_Monster_Zombie_Mushroom.png",
  "wild-boar": "https://cdn.wikimg.net/strategywiki/images/f/f3/MS_Monster_Wild_Boar.png",
  "cold-eye": "https://cdn.wikimg.net/strategywiki/images/c/c4/MS_Monster_Cold_Eye.png",
  drake: "https://cdn.wikimg.net/strategywiki/images/1/14/MS_Monster_Drake.png",
  "dark-drake": "https://cdn.wikimg.net/strategywiki/images/d/da/MS_Monster_Dark_Drake.png",
  "dual-ghost-pirate": "https://www.mapleanime.com/Images/MapleBase/Mobs/232.gif",
  "master-robo": "https://cdn.wikimg.net/strategywiki/images/2/27/MS_Monster_Master_Robo.png",
  skelegon: "https://cdn.wikimg.net/strategywiki/images/2/2d/MS_Monster_Skelegon.png",
  mano: "https://cdn.wikimg.net/strategywiki/images/3/32/MS_Monster_Mano.png",
  stumpy: "https://cdn.wikimg.net/strategywiki/images/5/5a/MS_Monster_Stumpy.png",
  "king-slime": "https://static.wikia.nocookie.net/maplestory/images/c/c7/Mob_King_Slime.png/revision/latest?cb=20120112042109",
  "crimson-balrog": "https://cdn.wikimg.net/strategywiki/images/a/a4/MS_Monster_Crimson_Balrog.png",
  zakum: "https://cdn.wikimg.net/strategywiki/images/8/83/MS_Monster_Zakum.png",
  horntail: "https://cdn.wikimg.net/strategywiki/images/5/58/MS_Monster_Horntail%27s_Head_A.png",
  "pink-bean": "https://cdn.wikimg.net/strategywiki/images/a/a0/MS_Monster_Pink_Bean.png",
  hilla: "https://cdn.wikimg.net/strategywiki/images/c/ce/MS_Monster_Hilla.png",
  magnus: "https://cdn.wikimg.net/strategywiki/images/b/b6/MS_Monster_Magnus.png"
};

export const monsters: MonsterEntry[] = ([
  {
    id: "orange-mushroom",
    name: "Orange Mushroom",
    image: null,
    portrait: "OM",
    type: "Normal",
    category: "Mushroom",
    level: 8,
    hp: 80,
    strength: 8,
    difficulty: 10,
    difficultyLabel: "Low",
    description: "The classic Victoria Island mushroom. Easy to clear, easy to route, and familiar to every MapleStory player.",
    shortDescription: "Starter route classic.",
    weaknesses: ["Low mobility", "Vulnerable to burst"],
    drops: [
      { name: "Mushroom Cap", rarity: "Common", kind: "Material" },
      { name: "Red Potion", rarity: "Common", kind: "Consumable" },
      { name: "Mushroom Spore", rarity: "Rare", kind: "Quest" }
    ],
    locations: [{ region: "Victoria Island", map: "Mushroom Garden", area: "Field lanes" }],
    isBoss: false,
    isElite: false,
    farmingScore: 22,
    farmingTier: "Low",
    farmingTags: ["Starter route"],
    farmingReason: "Fast clears for early quests, but low long-term value."
  },
  {
    id: "blue-snail",
    name: "Blue Snail",
    image: null,
    portrait: "BS",
    type: "Normal",
    category: "Beast",
    level: 5,
    hp: 50,
    strength: 5,
    difficulty: 6,
    difficultyLabel: "Low",
    description: "A low-pressure early monster that appears in beginner routes and low-level fields.",
    shortDescription: "Early beginner clear.",
    weaknesses: ["Low mobility", "Short range"],
    drops: [
      { name: "Snail Shell", rarity: "Common", kind: "Material" },
      { name: "Blue Snail Shell", rarity: "Common", kind: "Quest" }
    ],
    locations: [{ region: "Maple Island", map: "Southperry", area: "Low-level routes" }],
    isBoss: false,
    isElite: false,
    farmingScore: 14,
    farmingTier: "Low",
    farmingTags: ["Beginner"],
    farmingReason: "Purely for opening progression and beginner quests."
  },
  {
    id: "slime",
    name: "Slime",
    image: null,
    portrait: "SL",
    type: "Normal",
    category: "Slime",
    level: 12,
    hp: 180,
    strength: 10,
    difficulty: 14,
    difficultyLabel: "Low",
    description: "One of the smoothest low-level farming targets thanks to density and easy movement patterns.",
    shortDescription: "Dense and easy to clear.",
    weaknesses: ["Low defense", "Weak to clean burst"],
    drops: [
      { name: "Slime Bubble", rarity: "Common", kind: "Material" },
      { name: "White Potion", rarity: "Common", kind: "Consumable" },
      { name: "Slime Gel", rarity: "Rare", kind: "Quest" }
    ],
    locations: [{ region: "Victoria Island", map: "The Forest East of Henesys", area: "Flat clear route" }],
    isBoss: false,
    isElite: false,
    farmingScore: 33,
    farmingTier: "Solid",
    farmingTags: ["Easy farm", "Dense spawn"],
    farmingReason: "Good density and forgiving map flow make it an easy clean route."
  },
  {
    id: "ribbon-pig",
    name: "Ribbon Pig",
    image: null,
    portrait: "RP",
    type: "Normal",
    category: "Beast",
    level: 18,
    hp: 260,
    strength: 16,
    difficulty: 18,
    difficultyLabel: "Low",
    description: "A fast, common route monster with reliable spawn density and easy map presence.",
    shortDescription: "Fast low-level route.",
    weaknesses: ["Weak to burst", "Low durability"],
    drops: [
      { name: "Pig Ribbon", rarity: "Common", kind: "Material" },
      { name: "Orange Potion", rarity: "Common", kind: "Consumable" }
    ],
    locations: [{ region: "Victoria Island", map: "Pig Farm", area: "Mid lane" }],
    isBoss: false,
    isElite: false,
    farmingScore: 36,
    farmingTier: "Solid",
    farmingTags: ["Easy farm"],
    farmingReason: "Clean route for leveling with little friction."
  },
  {
    id: "zombie-mushroom",
    name: "Zombie Mushroom",
    image: null,
    portrait: "ZM",
    type: "Elite",
    category: "Undead",
    level: 24,
    hp: 740,
    strength: 24,
    difficulty: 28,
    difficultyLabel: "Moderate",
    description: "Undead field monster with stronger hits and useful route value for players pushing through early-mid zones.",
    shortDescription: "Undead pressure route.",
    weaknesses: ["Holy Weak", "Low mobility"],
    drops: [
      { name: "Zombie Mushroom Cap", rarity: "Common", kind: "Material" },
      { name: "Mana Elixir", rarity: "Rare", kind: "Consumable" }
    ],
    locations: [{ region: "Ant Tunnel", map: "Zombie Mushroom Hill", area: "Packed lanes" }],
    isBoss: false,
    isElite: true,
    farmingScore: 42,
    farmingTier: "Solid",
    farmingTags: ["Material drops", "Packed map"],
    farmingReason: "Better material drops and solid lane density."
  },
  {
    id: "wild-boar",
    name: "Wild Boar",
    image: null,
    portrait: "WB",
    type: "Elite",
    category: "Beast",
    level: 35,
    hp: 1800,
    strength: 32,
    difficulty: 35,
    difficultyLabel: "Moderate",
    description: "A classic power spike monster with straight-line maps and fast farming rhythm.",
    shortDescription: "Strong classic farm route.",
    weaknesses: ["Low reach", "Vulnerable to multi-hit"],
    drops: [
      { name: "Boar Tooth", rarity: "Common", kind: "Material" },
      { name: "Steel Plate", rarity: "Rare", kind: "Material" }
    ],
    locations: [{ region: "Perion", map: "Wild Boar Land", area: "Center field" }],
    isBoss: false,
    isElite: true,
    farmingScore: 58,
    farmingTier: "Strong",
    farmingTags: ["Best easy farm", "Fast clear"],
    farmingReason: "Strong XP pace and simple movement patterns."
  },
  {
    id: "cold-eye",
    name: "Cold Eye",
    image: null,
    portrait: "CE",
    type: "Elite",
    category: "Spirit",
    level: 42,
    hp: 4800,
    strength: 39,
    difficulty: 44,
    difficultyLabel: "Moderate",
    description: "Floating eye monster with stable maps and reliable mid-level route value.",
    shortDescription: "Stable mid-level route.",
    weaknesses: ["Holy Weak", "Low burst resistance"],
    drops: [
      { name: "Cold Eye Tail", rarity: "Common", kind: "Material" },
      { name: "Power Crystal", rarity: "Rare", kind: "Currency" }
    ],
    locations: [{ region: "El Nath", map: "Sharp Cliff", area: "Frozen route" }],
    isBoss: false,
    isElite: true,
    farmingScore: 54,
    farmingTier: "Strong",
    farmingTags: ["Material drops"],
    farmingReason: "Reliable mob layout and steady material value."
  },
  {
    id: "drake",
    name: "Drake",
    image: null,
    portrait: "DR",
    type: "Elite",
    category: "Dragon",
    level: 50,
    hp: 12000,
    strength: 52,
    difficulty: 50,
    difficultyLabel: "Moderate",
    description: "A classic mid-game dragon with strong physical pressure and a clean map identity.",
    shortDescription: "Mid-game dragon route.",
    weaknesses: ["Ice Weak", "Vulnerable to long burst"],
    drops: [
      { name: "Drake Skull", rarity: "Common", kind: "Material" },
      { name: "Dragon Scale Fragment", rarity: "Rare", kind: "Material" }
    ],
    locations: [{ region: "Sleepywood", map: "Drake Hunting Ground", area: "Deep lanes" }],
    isBoss: false,
    isElite: true,
    farmingScore: 57,
    farmingTier: "Strong",
    farmingTags: ["Material drops", "Solid grind"],
    farmingReason: "Good route for pushing levels and stocking useful materials."
  },
  {
    id: "dark-drake",
    name: "Dark Drake",
    image: null,
    portrait: "DD",
    type: "Elite",
    category: "Dragon",
    level: 63,
    hp: 24000,
    strength: 64,
    difficulty: 60,
    difficultyLabel: "High",
    description: "A stronger drake variant that punishes weak clears but rewards efficient routing.",
    shortDescription: "Higher pressure dragon farm.",
    weaknesses: ["Ice Weak", "Low mobility"],
    drops: [
      { name: "Dark Drake Skull", rarity: "Common", kind: "Material" },
      { name: "Dark Crystal Ore", rarity: "Rare", kind: "Material" }
    ],
    locations: [{ region: "Sleepywood", map: "Dangerous Valley II", area: "Deep lane rotation" }],
    isBoss: false,
    isElite: true,
    farmingScore: 62,
    farmingTier: "Strong",
    farmingTags: ["Best material drops"],
    farmingReason: "More pressure, but better reward for clean clears."
  },
  {
    id: "dual-ghost-pirate",
    name: "Dual Ghost Pirate",
    image: null,
    portrait: "DG",
    type: "Elite",
    category: "Machine",
    level: 74,
    hp: 55000,
    strength: 70,
    difficulty: 66,
    difficultyLabel: "High",
    description: "A compact Ludibrium grind target known for efficient mobbing routes and memorable value.",
    shortDescription: "Famous efficient grind target.",
    weaknesses: ["Holy Weak", "Burst windows"],
    drops: [
      { name: "Broken Machine Part", rarity: "Common", kind: "Material" },
      { name: "Ludi Battery", rarity: "Rare", kind: "Quest" }
    ],
    locations: [{ region: "Ludibrium", map: "Ghost Ship 2", area: "Tight platform loop" }],
    isBoss: false,
    isElite: true,
    farmingScore: 76,
    farmingTier: "Top",
    farmingTags: ["Best easy farm", "Dense spawn", "Classic grind"],
    farmingReason: "Top-tier density and route speed for efficient clears."
  },
  {
    id: "master-robo",
    name: "Master Robo",
    image: null,
    portrait: "MR",
    type: "Elite",
    category: "Machine",
    level: 83,
    hp: 98000,
    strength: 79,
    difficulty: 71,
    difficultyLabel: "High",
    description: "A stronger machine target with higher pressure and stable farming maps.",
    shortDescription: "High-pressure machine farm.",
    weaknesses: ["Lightning Weak", "Armor breaks under burst"],
    drops: [
      { name: "Robo Gear", rarity: "Common", kind: "Material" },
      { name: "Power Core", rarity: "Rare", kind: "Material" }
    ],
    locations: [{ region: "Ludibrium", map: "Eos Tower 101", area: "Robo route" }],
    isBoss: false,
    isElite: true,
    farmingScore: 68,
    farmingTier: "Strong",
    farmingTags: ["Best material drops"],
    farmingReason: "Strong mid-late grind choice when damage is online."
  },
  {
    id: "skelegon",
    name: "Skelegon",
    image: null,
    portrait: "SK",
    type: "Elite",
    category: "Undead",
    level: 147,
    hp: 8500000,
    strength: 95,
    difficulty: 84,
    difficultyLabel: "High",
    description: "Heavy undead dragon farming target with strong XP value and familiar late-game route logic.",
    shortDescription: "Late-game classic grind.",
    weaknesses: ["Holy Weak", "Low mobility"],
    drops: [
      { name: "Dragon Bone", rarity: "Common", kind: "Material" },
      { name: "Power Elixir", rarity: "Common", kind: "Consumable" },
      { name: "Advanced Crystal", rarity: "Rare", kind: "Material" }
    ],
    locations: [{ region: "Leafre", map: "Dragon Nest Left Behind", area: "Flat lane control" }],
    isBoss: false,
    isElite: true,
    farmingScore: 74,
    farmingTier: "Top",
    farmingTags: ["Best meso farming", "Late-game grind"],
    farmingReason: "High HP but excellent long-session grind value."
  },
  {
    id: "mano",
    name: "Mano",
    image: null,
    portrait: "MN",
    type: "Boss",
    category: "Slime",
    level: 20,
    hp: 2450,
    strength: 24,
    difficulty: 25,
    difficultyLabel: "Moderate",
    description: "The iconic early boss slime that teaches movement, patience, and simple burst windows.",
    shortDescription: "Iconic early boss.",
    weaknesses: ["Low mobility", "Burst vulnerable"],
    drops: [
      { name: "Snail Shell", rarity: "Common", kind: "Material" },
      { name: "Blue Potion", rarity: "Common", kind: "Consumable" },
      { name: "Mano Shell", rarity: "Rare", kind: "Quest" }
    ],
    locations: [{ region: "Victoria Island", map: "Snail Hunting Ground", area: "Field boss spawn" }],
    isBoss: true,
    isElite: false,
    farmingScore: 20,
    farmingTier: "Low",
    farmingTags: ["Boss route"],
    farmingReason: "Good for boss familiarity, not for farming value."
  },
  {
    id: "stumpy",
    name: "Stumpy",
    image: null,
    portrait: "ST",
    type: "Boss",
    category: "Beast",
    level: 35,
    hp: 22000,
    strength: 40,
    difficulty: 40,
    difficultyLabel: "Moderate",
    description: "A desert field boss with stronger pressure and very clear pattern windows.",
    shortDescription: "Field boss with clear punish windows.",
    weaknesses: ["Ice Weak", "Low burst resistance"],
    drops: [
      { name: "Stumpy Root", rarity: "Rare", kind: "Quest" },
      { name: "Power Crystal", rarity: "Common", kind: "Currency" }
    ],
    locations: [{ region: "Victoria Island", map: "Rocky Mask", area: "Field boss lane" }],
    isBoss: true,
    isElite: false,
    farmingScore: 18,
    farmingTier: "Low",
    farmingTags: ["Boss route"],
    farmingReason: "Useful for boss checks, not a real farm route."
  },
  {
    id: "king-slime",
    name: "King Slime",
    image: null,
    portrait: "KS",
    type: "Boss",
    category: "Slime",
    level: 40,
    hp: 400000,
    strength: 56,
    difficulty: 48,
    difficultyLabel: "Moderate",
    description: "A friendly-entry boss with clean patterns and a well-known early progression place.",
    shortDescription: "Entry boss for clean runs.",
    weaknesses: ["Low mobility", "Vulnerable to sustained burst"],
    drops: [
      { name: "King Slime Crown", rarity: "Epic", kind: "Equipment" },
      { name: "Slime Crystal", rarity: "Rare", kind: "Material" }
    ],
    locations: [{ region: "Victoria Island", map: "King Slime's Castle", area: "Boss room" }],
    isBoss: true,
    isElite: false,
    farmingScore: 24,
    farmingTier: "Low",
    farmingTags: ["Boss route", "Entry boss"],
    farmingReason: "Important progression boss, not a farm target."
  },
  {
    id: "crimson-balrog",
    name: "Crimson Balrog",
    image: null,
    portrait: "CB",
    type: "Boss",
    category: "Demon",
    level: 100,
    hp: 5800000,
    strength: 88,
    difficulty: 79,
    difficultyLabel: "High",
    description: "A dramatic demon boss with punishing hits and old-school MapleStory presence.",
    shortDescription: "Demonic pressure boss.",
    weaknesses: ["Holy Weak", "Burst windows after pattern lock"],
    drops: [
      { name: "Balrog Leather", rarity: "Rare", kind: "Material" },
      { name: "Power Crystal", rarity: "Common", kind: "Currency" }
    ],
    locations: [{ region: "Crimsonwood", map: "Balrog Chamber", area: "Boss room" }],
    isBoss: true,
    isElite: false,
    farmingScore: 16,
    farmingTier: "Low",
    farmingTags: ["Boss route"],
    farmingReason: "A challenge target, not an efficient farming target."
  },
  {
    id: "zakum",
    name: "Zakum",
    image: null,
    portrait: "ZA",
    type: "Boss",
    category: "Demon",
    level: 110,
    hp: 660000000,
    strength: 92,
    difficulty: 88,
    difficultyLabel: "Extreme",
    description: "The classic arm-phase boss that defines clean pattern handling and progression checks.",
    shortDescription: "Classic arm-phase boss.",
    weaknesses: ["Holy Weak", "Pattern punishable after arm break"],
    drops: [
      { name: "Zakum Helmet", rarity: "Epic", kind: "Equipment" },
      { name: "Confusion Fragment", rarity: "Rare", kind: "Material" }
    ],
    locations: [{ region: "El Nath", map: "Altar of Zakum", area: "Boss arena" }],
    isBoss: true,
    isElite: false,
    farmingScore: 28,
    farmingTier: "Low",
    farmingTags: ["Boss route", "Gear drop"],
    farmingReason: "Great progression value, but not used as a farming target."
  },
  {
    id: "horntail",
    name: "Horntail",
    image: null,
    portrait: "HT",
    type: "Boss",
    category: "Dragon",
    level: 160,
    hp: 2700000000,
    strength: 95,
    difficulty: 91,
    difficultyLabel: "Extreme",
    description: "A multi-part dragon fight that rewards pattern control and strong sustained damage.",
    shortDescription: "Multi-part dragon raid.",
    weaknesses: ["Ice Weak", "Exposed during phase transitions"],
    drops: [
      { name: "Horntail Necklace", rarity: "Epic", kind: "Equipment" },
      { name: "Dragon Essence", rarity: "Rare", kind: "Material" }
    ],
    locations: [{ region: "Leafre", map: "Cave of Life", area: "Raid chamber" }],
    isBoss: true,
    isElite: false,
    farmingScore: 26,
    farmingTier: "Low",
    farmingTags: ["Boss route"],
    farmingReason: "Raid-style boss with good rewards, not a farming monster."
  },
  {
    id: "pink-bean",
    name: "Pink Bean",
    image: null,
    portrait: "PB",
    type: "Boss",
    category: "Spirit",
    level: 180,
    hp: 14000000000,
    strength: 97,
    difficulty: 94,
    difficultyLabel: "Extreme",
    description: "A famous endgame spirit boss with multiple statue checks and a huge final HP wall.",
    shortDescription: "Endgame spirit boss.",
    weaknesses: ["Low mobility windows", "Burst punish after mechanic break"],
    drops: [
      { name: "Pink Holy Cup", rarity: "Epic", kind: "Equipment" },
      { name: "Pink Bean Fragment", rarity: "Rare", kind: "Material" }
    ],
    locations: [{ region: "Temple of Time", map: "Temple of Time Core", area: "Boss arena" }],
    isBoss: true,
    isElite: false,
    farmingScore: 24,
    farmingTier: "Low",
    farmingTags: ["Boss route", "Endgame"],
    farmingReason: "Strong progression boss, not a farming pick."
  },
  {
    id: "hilla",
    name: "Hilla",
    image: null,
    portrait: "HL",
    type: "Boss",
    category: "Demon",
    level: 120,
    hp: 800000000,
    strength: 84,
    difficulty: 78,
    difficultyLabel: "High",
    description: "A dark magic boss with pressure patterns and repeat-clear progression value.",
    shortDescription: "Repeat-clear progression boss.",
    weaknesses: ["Holy Weak", "Burst vulnerable between mechanics"],
    drops: [
      { name: "Necromancer Gear", rarity: "Rare", kind: "Equipment" },
      { name: "Blackheart Box", rarity: "Epic", kind: "Quest" }
    ],
    locations: [{ region: "Azwan", map: "Hilla's Hall", area: "Boss room" }],
    isBoss: true,
    isElite: false,
    farmingScore: 30,
    farmingTier: "Low",
    farmingTags: ["Boss route", "Daily clear"],
    farmingReason: "Good repeated clear value, but not a farm loop."
  },
  {
    id: "magnus",
    name: "Magnus",
    image: null,
    portrait: "MG",
    type: "Boss",
    category: "Demon",
    level: 190,
    hp: 12000000000,
    strength: 99,
    difficulty: 96,
    difficultyLabel: "Extreme",
    description: "A high-pressure mobility check boss with lethal zones and punishing mistakes.",
    shortDescription: "Mobility check boss.",
    weaknesses: ["Burst vulnerable after pattern reset", "Low resistance during windows"],
    drops: [
      { name: "Tyrant Cape", rarity: "Epic", kind: "Equipment" },
      { name: "Magnus Soul Shard", rarity: "Rare", kind: "Material" }
    ],
    locations: [{ region: "Heliseum", map: "Tyrant's Castle", area: "Boss arena" }],
    isBoss: true,
    isElite: false,
    farmingScore: 18,
    farmingTier: "Low",
    farmingTags: ["Boss route", "High pressure"],
    farmingReason: "Strong gear target, but never a farming monster."
  }
] as MonsterEntry[]).map((monster): MonsterEntry => ({
  ...monster,
  image: monsterImageMap[monster.id] ?? monster.image
}));

export const monsterFeedFallback: MonsterFeed = {
  items: monsters,
  meta: {
    sourceName: "Officially curated from MapleStory references",
    sourceUrl: "https://strategywiki.org/wiki/MapleStory/Monsters",
    copyrightLabel: "Source: StrategyWiki MapleStory / curated preview",
    updatedAt: "2026-04-10T12:00:00.000Z",
    syncState: "seeded",
    itemCount: monsters.length
  }
};
