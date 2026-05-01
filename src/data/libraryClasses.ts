import { libraryCategoryAssets, type LibraryIconKey } from "./libraryAssets";

export type LibraryClassGroup =
  | "Explorers"
  | "Cygnus Knights"
  | "Heroes"
  | "Resistance"
  | "Nova"
  | "Sengoku"
  | "Flora"
  | "Anima"
  | "Shine"
  | "Jianghu"
  | "Other";

export type LibraryJobGroup = "Warrior" | "Magician" | "Bowman" | "Thief" | "Pirate" | "Hybrid";
export type LibraryClassRating = 1 | 2 | 3 | 4 | 5;

export type LibraryClass = {
  id: string;
  name: string;
  group: LibraryClassGroup;
  classGroup: LibraryClassGroup;
  jobGroup: LibraryJobGroup;
  role: string;
  style: string;
  difficulty: "Easy" | "Medium" | "Hard";
  primaryStat: "STR" | "DEX" | "INT" | "LUK" | "HP";
  secondaryStat: string;
  weapon: string;
  secondaryWeapon: string;
  mobbing: LibraryClassRating;
  bossing: LibraryClassRating;
  mobility: LibraryClassRating;
  survivability: LibraryClassRating;
  mobbingRating: LibraryClassRating;
  bossingRating: LibraryClassRating;
  mobilityRating: LibraryClassRating;
  survivabilityRating: LibraryClassRating;
  burstProfile: string;
  linkSkill: string;
  linkSkillSummary: string;
  legionBonus: string;
  pros: string[];
  cons: string[];
  audience: string;
  iconKey: LibraryIconKey;
  cardImage: string;
  heroImage: string;
  visualTheme: { gradient: string; accent: string };
  relatedGuideIds: string[];
};

type ClassSeed = {
  id: string;
  name: string;
  group: LibraryClassGroup;
  jobGroup: LibraryJobGroup;
  primaryStat: LibraryClass["primaryStat"];
  weapon: string;
  role: string;
  style: string;
  difficulty: LibraryClass["difficulty"];
  ratings: [LibraryClassRating, LibraryClassRating, LibraryClassRating, LibraryClassRating];
  link: string;
  legion: string;
  iconKey?: LibraryIconKey;
};

const ART = libraryCategoryAssets.Classes;
const THEME = { gradient: ART.gradient, accent: ART.accent };

const classGroupVisuals: Record<
  LibraryClassGroup,
  { cardImage: string; heroImage: string; gradient: string; accent: string }
> = {
  Explorers: {
    cardImage: "/library/grandis/headers/grandis-library.png",
    heroImage: "/library/grandis/headers/grandis-library.png",
    gradient: "linear-gradient(135deg, #7bd9ff 0%, #2f72c9 100%)",
    accent: "#7bd9ff"
  },
  "Cygnus Knights": {
    cardImage: "/library/grandis/headers/ristonia-block.png",
    heroImage: "/library/grandis/headers/ristonia-block.png",
    gradient: "linear-gradient(135deg, #f7d36e 0%, #a45c21 100%)",
    accent: "#f7d36e"
  },
  Heroes: {
    cardImage: "/library/grandis/headers/verdel-block.png",
    heroImage: "/library/grandis/headers/verdel-block.png",
    gradient: "linear-gradient(135deg, #b997ff 0%, #5d39c3 100%)",
    accent: "#b997ff"
  },
  Resistance: {
    cardImage: "/library/grandis/headers/borderless-block.png",
    heroImage: "/library/grandis/headers/borderless-block.png",
    gradient: "linear-gradient(135deg, #8ea4ba 0%, #34465c 100%)",
    accent: "#9fb6cf"
  },
  Nova: {
    cardImage: "/library/grandis/headers/fox-valley-block.png",
    heroImage: "/library/grandis/headers/fox-valley-block.png",
    gradient: "linear-gradient(135deg, #ff9f6e 0%, #b94a3b 100%)",
    accent: "#ff9f6e"
  },
  Sengoku: {
    cardImage: "/library/grandis/headers/verdel-block.png",
    heroImage: "/library/grandis/headers/verdel-block.png",
    gradient: "linear-gradient(135deg, #f46f8f 0%, #75316e 100%)",
    accent: "#f46f8f"
  },
  Flora: {
    cardImage: "/library/grandis/headers/ristonia-block.png",
    heroImage: "/library/grandis/headers/ristonia-block.png",
    gradient: "linear-gradient(135deg, #92f0d6 0%, #3a7d8f 100%)",
    accent: "#92f0d6"
  },
  Anima: {
    cardImage: "/library/grandis/headers/fox-valley-block.png",
    heroImage: "/library/grandis/headers/fox-valley-block.png",
    gradient: "linear-gradient(135deg, #a4e786 0%, #50793c 100%)",
    accent: "#a4e786"
  },
  Shine: {
    cardImage: "/library/grandis/headers/grandis-library.png",
    heroImage: "/library/grandis/headers/grandis-library.png",
    gradient: "linear-gradient(135deg, #f7f0a0 0%, #4e86ff 100%)",
    accent: "#f7f0a0"
  },
  Jianghu: {
    cardImage: "/library/grandis/headers/verdel-block.png",
    heroImage: "/library/grandis/headers/verdel-block.png",
    gradient: "linear-gradient(135deg, #f4b26e 0%, #435c92 100%)",
    accent: "#f4b26e"
  },
  Other: {
    cardImage: "/library/grandis/logo.png",
    heroImage: "/library/grandis/logo.png",
    gradient: THEME.gradient,
    accent: THEME.accent
  }
};
const secondaryByStat: Record<LibraryClass["primaryStat"], string> = {
  STR: "DEX",
  DEX: "STR",
  INT: "LUK",
  LUK: "DEX",
  HP: "STR"
};

const secondaryWeaponByJob: Record<LibraryJobGroup, string> = {
  Warrior: "Shield / Medal",
  Magician: "Magic Book",
  Bowman: "Arrowhead",
  Thief: "Charm",
  Pirate: "Wrist Band",
  Hybrid: "Class Relic"
};

const jobIcon: Record<LibraryJobGroup, LibraryIconKey> = {
  Warrior: "sword",
  Magician: "sparkles",
  Bowman: "trending-up",
  Thief: "zap",
  Pirate: "compass",
  Hybrid: "star"
};

const seeds: ClassSeed[] = [
  { id: "hero", name: "Hero", group: "Explorers", jobGroup: "Warrior", primaryStat: "STR", weapon: "Sword / Axe", role: "Combo warrior", style: "durable melee carry", difficulty: "Easy", ratings: [4, 4, 3, 5], link: "Warrior Spirit: steady damage while fighting bosses.", legion: "STR and attack board value" },
  { id: "paladin", name: "Paladin", group: "Explorers", jobGroup: "Warrior", primaryStat: "STR", weapon: "Sword / Blunt Weapon", role: "Holy tank", style: "safe bossing and party defense", difficulty: "Easy", ratings: [3, 4, 3, 5], link: "Guardian Oath: defensive uptime for hard fights.", legion: "STR and survivability board value", iconKey: "shield" },
  { id: "dark-knight", name: "Dark Knight", group: "Explorers", jobGroup: "Warrior", primaryStat: "STR", weapon: "Spear / Polearm", role: "Drain bruiser", style: "HP-based sustained combat", difficulty: "Medium", ratings: [4, 4, 3, 5], link: "Dark Endurance: keeps pressure through dangerous windows.", legion: "HP and STR board value" },
  { id: "bishop", name: "Bishop", group: "Explorers", jobGroup: "Magician", primaryStat: "INT", weapon: "Wand / Staff", role: "Holy support", style: "party utility and safe grinding", difficulty: "Easy", ratings: [3, 3, 3, 4], link: "Holy Symbol: improves account training efficiency.", legion: "INT and magic attack board value" },
  { id: "fire-poison-mage", name: "Fire/Poison Mage", group: "Explorers", jobGroup: "Magician", primaryStat: "INT", weapon: "Wand / Staff", role: "Damage-over-time mage", style: "setup-heavy burst and poison fields", difficulty: "Hard", ratings: [4, 5, 3, 3], link: "Arcane Contagion: improves damage over extended fights.", legion: "INT board value", iconKey: "fire" },
  { id: "ice-lightning-mage", name: "Ice/Lightning Mage", group: "Explorers", jobGroup: "Magician", primaryStat: "INT", weapon: "Wand / Staff", role: "Chain caster", style: "wide mobbing and control", difficulty: "Medium", ratings: [5, 3, 3, 3], link: "Storm Casting: boosts area clear consistency.", legion: "INT board value", iconKey: "zap" },
  { id: "bowmaster", name: "Bowmaster", group: "Explorers", jobGroup: "Bowman", primaryStat: "DEX", weapon: "Bow", role: "Rapid archer", style: "long-range sustained bossing", difficulty: "Medium", ratings: [4, 5, 3, 3], link: "Precision Aim: supports crit-focused accounts.", legion: "DEX and attack board value" },
  { id: "marksman", name: "Marksman", group: "Explorers", jobGroup: "Bowman", primaryStat: "DEX", weapon: "Crossbow", role: "Sniper archer", style: "long-range precision and steady bossing", difficulty: "Medium", ratings: [4, 4, 3, 3], link: "Adventurer's Curiosity: crit and collection utility.", legion: "Critical rate board value" },
  { id: "pathfinder", name: "Pathfinder", group: "Explorers", jobGroup: "Bowman", primaryStat: "DEX", weapon: "Ancient Bow", role: "Relic explorer", style: "smooth mobbing and flexible range", difficulty: "Easy", ratings: [5, 4, 4, 3], link: "Relic Flow: improves consistent map clearing.", legion: "DEX board value", iconKey: "compass" },
  { id: "night-lord", name: "Night Lord", group: "Explorers", jobGroup: "Thief", primaryStat: "LUK", weapon: "Claw", role: "Crit thrower", style: "high mobility burst windows", difficulty: "Medium", ratings: [4, 4, 5, 3], link: "Shadow Focus: strengthens crit pressure.", legion: "Critical rate board value", iconKey: "zap" },
  { id: "shadower", name: "Shadower", group: "Explorers", jobGroup: "Thief", primaryStat: "LUK", weapon: "Dagger", role: "Close-range assassin", style: "meso weaving and evasive bossing", difficulty: "Hard", ratings: [4, 4, 4, 4], link: "Assassin's Mark: improves burst windows.", legion: "LUK board value" },
  { id: "dual-blade", name: "Dual Blade", group: "Explorers", jobGroup: "Thief", primaryStat: "LUK", weapon: "Dagger / Katara", role: "Blade assassin", style: "fast close-range burst and evasive cuts", difficulty: "Hard", ratings: [4, 5, 5, 3], link: "Thief's Cunning: damage after debuffing enemies.", legion: "LUK board value", iconKey: "zap" },
  { id: "buccaneer", name: "Buccaneer", group: "Explorers", jobGroup: "Pirate", primaryStat: "STR", weapon: "Knuckle", role: "Energy brawler", style: "fast melee with great movement", difficulty: "Easy", ratings: [5, 4, 5, 4], link: "Oceanic Drive: supports active grinding.", legion: "STR board value", iconKey: "compass" },
  { id: "cannoneer", name: "Cannoneer", group: "Explorers", jobGroup: "Pirate", primaryStat: "STR", weapon: "Hand Cannon", role: "Heavy artillery pirate", style: "wide cannon blasts and explosive setup", difficulty: "Medium", ratings: [4, 4, 2, 4], link: "Pirate's Blessing: all-stat and survivability utility.", legion: "STR board value", iconKey: "fire" },
  { id: "corsair", name: "Corsair", group: "Explorers", jobGroup: "Pirate", primaryStat: "DEX", weapon: "Gun", role: "Summon gunner", style: "ship crew and ranged pressure", difficulty: "Medium", ratings: [4, 4, 3, 3], link: "Crew Orders: improves summon uptime.", legion: "Summon duration board value" },

  { id: "dawn-warrior", name: "Dawn Warrior", group: "Cygnus Knights", jobGroup: "Warrior", primaryStat: "STR", weapon: "One-Handed / Two-Handed Sword", role: "Solar lunar knight", style: "clean stance cycling", difficulty: "Easy", ratings: [5, 4, 4, 4], link: "Cygnus Blessing: reliable account damage.", legion: "STR board value", iconKey: "star" },
  { id: "mihile", name: "Mihile", group: "Cygnus Knights", jobGroup: "Warrior", primaryStat: "STR", weapon: "One-Handed Sword", role: "Royal guard", style: "shield timing and safety", difficulty: "Easy", ratings: [3, 3, 3, 5], link: "Royal Guard: famous defensive link for bossing.", legion: "HP and STR board value", iconKey: "shield" },
  { id: "blaze-wizard", name: "Blaze Wizard", group: "Cygnus Knights", jobGroup: "Magician", primaryStat: "INT", weapon: "Wand / Staff", role: "Fire orb caster", style: "mobile spell loops", difficulty: "Medium", ratings: [4, 3, 4, 3], link: "Flame Charge: fire-themed damage support.", legion: "INT board value", iconKey: "fire" },
  { id: "wind-archer", name: "Wind Archer", group: "Cygnus Knights", jobGroup: "Bowman", primaryStat: "DEX", weapon: "Bow", role: "Wind projectile archer", style: "safe ranged uptime", difficulty: "Easy", ratings: [4, 4, 4, 4], link: "Wind's Shelter: boosts ranged consistency.", legion: "DEX board value" },
  { id: "night-walker", name: "Night Walker", group: "Cygnus Knights", jobGroup: "Thief", primaryStat: "LUK", weapon: "Claw", role: "Bat shadow thief", style: "jump attacking and burst prep", difficulty: "Hard", ratings: [4, 5, 5, 3], link: "Dark Servant: crit-oriented damage support.", legion: "Critical rate board value" },
  { id: "thunder-breaker", name: "Thunder Breaker", group: "Cygnus Knights", jobGroup: "Pirate", primaryStat: "STR", weapon: "Knuckle", role: "Combo surfer", style: "chain attacks and movement", difficulty: "Medium", ratings: [5, 3, 5, 3], link: "Lightning Flow: improves combo damage.", legion: "STR board value", iconKey: "zap" },

  { id: "aran", name: "Aran", group: "Heroes", jobGroup: "Warrior", primaryStat: "STR", weapon: "Polearm", role: "Combo polearm hero", style: "rhythm combat and map flow", difficulty: "Medium", ratings: [5, 4, 4, 4], link: "Combo Blessing: strong early account utility.", legion: "STR board value" },
  { id: "evan", name: "Evan", group: "Heroes", jobGroup: "Magician", primaryStat: "INT", weapon: "Wand / Staff", role: "Dragon mage", style: "fusion spells with Mir", difficulty: "Hard", ratings: [4, 4, 3, 3], link: "Rune Persistence: valuable training link.", legion: "INT board value" },
  { id: "mercedes", name: "Mercedes", group: "Heroes", jobGroup: "Bowman", primaryStat: "DEX", weapon: "Dual Bowguns", role: "Aerial combo archer", style: "fast movement and chaining", difficulty: "Hard", ratings: [4, 3, 5, 3], link: "Elven Blessing: core EXP link skill.", legion: "Cooldown reduction board value" },
  { id: "phantom", name: "Phantom", group: "Heroes", jobGroup: "Thief", primaryStat: "LUK", weapon: "Cane", role: "Skill-stealing thief", style: "flexible utility and cards", difficulty: "Hard", ratings: [4, 4, 5, 3], link: "Phantom Instinct: crit rate support.", legion: "Mesos obtained board value", iconKey: "sparkles" },
  { id: "luminous", name: "Luminous", group: "Heroes", jobGroup: "Magician", primaryStat: "INT", weapon: "Shining Rod", role: "Light and dark caster", style: "equilibrium burst cycles", difficulty: "Medium", ratings: [4, 4, 3, 3], link: "Light Wash: ignore-defense support.", legion: "INT board value" },
  { id: "shade", name: "Shade", group: "Heroes", jobGroup: "Pirate", primaryStat: "STR", weapon: "Knuckle", role: "Spirit brawler", style: "durable control and bind utility", difficulty: "Easy", ratings: [4, 4, 4, 5], link: "Close Call: survival safety net.", legion: "Critical damage board value" },

  { id: "battle-mage", name: "Battle Mage", group: "Resistance", jobGroup: "Magician", primaryStat: "INT", weapon: "Staff", role: "Aura battlemage", style: "party auras and close spellcasting", difficulty: "Medium", ratings: [4, 4, 3, 4], link: "Spirit Contract: party-friendly damage utility.", legion: "INT board value" },
  { id: "wild-hunter", name: "Wild Hunter", group: "Resistance", jobGroup: "Bowman", primaryStat: "DEX", weapon: "Crossbow", role: "Mounted hunter", style: "jaguar mobility and burst", difficulty: "Medium", ratings: [4, 4, 5, 3], link: "Wild Instinct: damage support while attacking.", legion: "Attack chance board value" },
  { id: "mechanic", name: "Mechanic", group: "Resistance", jobGroup: "Pirate", primaryStat: "DEX", weapon: "Gun", role: "Mech engineer", style: "summons, robots, and map control", difficulty: "Medium", ratings: [5, 3, 3, 4], link: "Mechanic Mastery: summon-oriented utility.", legion: "Buff duration board value", iconKey: "tool" },
  { id: "demon-slayer", name: "Demon Slayer", group: "Resistance", jobGroup: "Warrior", primaryStat: "STR", weapon: "One-Handed Axe", role: "Demon force warrior", style: "bossing and sustain", difficulty: "Medium", ratings: [3, 5, 3, 5], link: "Demon Fury: boss damage link.", legion: "Status resistance board value" },
  { id: "demon-avenger", name: "Demon Avenger", group: "Resistance", jobGroup: "Warrior", primaryStat: "HP", weapon: "Desperado", role: "HP scaling bruiser", style: "high survival and simple setup", difficulty: "Easy", ratings: [4, 3, 3, 5], link: "Wild Rage: flat damage link for alts.", legion: "Boss damage board value" },
  { id: "xenon", name: "Xenon", group: "Resistance", jobGroup: "Hybrid", primaryStat: "STR", weapon: "Energy Sword", role: "Triple-stat hybrid", style: "systems-heavy stat scaling", difficulty: "Hard", ratings: [4, 4, 4, 3], link: "Hybrid Logic: all-stat support.", legion: "STR/DEX/LUK board value", iconKey: "star" },
  { id: "blaster", name: "Blaster", group: "Resistance", jobGroup: "Warrior", primaryStat: "STR", weapon: "Arm Cannon", role: "Manual combo fighter", style: "high execution and cancels", difficulty: "Hard", ratings: [4, 5, 4, 4], link: "Explosion Expert: damage during active combat.", legion: "Ignore-defense board value", iconKey: "fire" },

  { id: "kaiser", name: "Kaiser", group: "Nova", jobGroup: "Warrior", primaryStat: "STR", weapon: "Two-Handed Sword", role: "Dragon warrior", style: "transformation burst", difficulty: "Medium", ratings: [4, 4, 4, 4], link: "Iron Will: max HP support.", legion: "STR board value" },
  { id: "angelic-buster", name: "Angelic Buster", group: "Nova", jobGroup: "Pirate", primaryStat: "DEX", weapon: "Soul Shooter", role: "Idol blaster", style: "huge burst and flashy skills", difficulty: "Medium", ratings: [4, 5, 4, 3], link: "Terms and Conditions: major burst link.", legion: "DEX board value", iconKey: "sparkles" },
  { id: "cadena", name: "Cadena", group: "Nova", jobGroup: "Thief", primaryStat: "LUK", weapon: "Chain", role: "Weapon-chain rogue", style: "combo-heavy aggression", difficulty: "Hard", ratings: [4, 5, 5, 3], link: "Intensive Insult: stronger damage into debuffed targets.", legion: "LUK board value" },
  { id: "kain", name: "Kain", group: "Nova", jobGroup: "Bowman", primaryStat: "DEX", weapon: "Whispershot", role: "Possession archer", style: "setup burst and mobility", difficulty: "Hard", ratings: [4, 5, 5, 3], link: "Judgment: burst damage support.", legion: "DEX board value" },

  { id: "hayato", name: "Hayato", group: "Sengoku", jobGroup: "Warrior", primaryStat: "STR", weapon: "Katana", role: "Quick-draw samurai", style: "stance movement and sword waves", difficulty: "Hard", ratings: [4, 4, 4, 3], link: "Keen Edge: attack support.", legion: "Critical damage board value" },
  { id: "kanna", name: "Kanna", group: "Sengoku", jobGroup: "Magician", primaryStat: "INT", weapon: "Fan", role: "Spirit shaman", style: "summons and field control", difficulty: "Medium", ratings: [4, 3, 3, 4], link: "Elementalism: damage support.", legion: "Boss damage board value", iconKey: "sparkles" },

  { id: "adele", name: "Adele", group: "Flora", jobGroup: "Warrior", primaryStat: "STR", weapon: "Tuner", role: "Ether blade warrior", style: "floating swords and smooth clear", difficulty: "Easy", ratings: [5, 4, 4, 4], link: "Noble Fire: damage support when party conditions are met.", legion: "STR board value", iconKey: "sparkles" },
  { id: "illium", name: "Illium", group: "Flora", jobGroup: "Magician", primaryStat: "INT", weapon: "Lucent Gauntlet", role: "Crystal mage", style: "orb positioning and flight burst", difficulty: "Hard", ratings: [4, 4, 5, 3], link: "Tide of Battle: movement-based damage.", legion: "INT board value" },
  { id: "ark", name: "Ark", group: "Flora", jobGroup: "Pirate", primaryStat: "STR", weapon: "Knuckle", role: "Specter brawler", style: "form swapping and aggression", difficulty: "Medium", ratings: [5, 4, 5, 3], link: "Solus: damage after staying in combat.", legion: "STR board value" },
  { id: "khali", name: "Khali", group: "Flora", jobGroup: "Thief", primaryStat: "LUK", weapon: "Chakram", role: "Void dash assassin", style: "dash loops and fast burst", difficulty: "Hard", ratings: [5, 4, 5, 3], link: "Inborn Gift: mobility-damage support.", legion: "LUK board value" },

  { id: "hoyoung", name: "Hoyoung", group: "Anima", jobGroup: "Thief", primaryStat: "LUK", weapon: "Fan", role: "Sage trickster", style: "scroll skills and talisman flow", difficulty: "Medium", ratings: [5, 3, 5, 3], link: "Confidence: damage against full-health enemies.", legion: "LUK board value", iconKey: "compass" },
  { id: "lara", name: "Lara", group: "Anima", jobGroup: "Magician", primaryStat: "INT", weapon: "Wand", role: "Nature conduit", style: "vein summons and cheerful mobbing", difficulty: "Easy", ratings: [5, 3, 4, 3], link: "Nature Friend: damage support after hitting enemies.", legion: "INT board value", iconKey: "sparkles" },
  { id: "ren", name: "Ren", group: "Anima", jobGroup: "Warrior", primaryStat: "STR", weapon: "Sword", role: "Imugi sword guardian", style: "fluid melee pressure and grounded defense", difficulty: "Medium", ratings: [4, 4, 4, 4], link: "Grounded Body: safer damage intake during dangerous hits.", legion: "Speed and max speed board value", iconKey: "sword" },

  { id: "sia-astelle", name: "Sia Astelle", group: "Shine", jobGroup: "Magician", primaryStat: "INT", weapon: "Celestial Light", role: "Star astrologer", style: "constellation casting and support windows", difficulty: "Medium", ratings: [4, 3, 4, 3], link: "Tree of Stars: buff duration and critical damage utility.", legion: "Abnormal status damage board value", iconKey: "sparkles" },
  { id: "mo-xuan", name: "Mo Xuan", group: "Jianghu", jobGroup: "Pirate", primaryStat: "DEX", weapon: "Martial Brace", role: "Martial arts striker", style: "flowing martial combos and boss pressure", difficulty: "Medium", ratings: [4, 4, 4, 4], link: "Qi Cultivation: stacking boss damage through repeated hits.", legion: "Critical damage board value", iconKey: "compass" },

  { id: "zero", name: "Zero", group: "Other", jobGroup: "Warrior", primaryStat: "STR", weapon: "Long Sword / Heavy Sword", role: "Tag-team warrior", style: "dual-character swaps and utility", difficulty: "Hard", ratings: [4, 4, 4, 4], link: "Rhinne's Blessing: useful account-wide defense utility.", legion: "EXP and grid utility", iconKey: "star" },
  { id: "kinesis", name: "Kinesis", group: "Other", jobGroup: "Magician", primaryStat: "INT", weapon: "ESP Limiter", role: "Psychic mage", style: "object throws and resource management", difficulty: "Medium", ratings: [4, 4, 3, 3], link: "Judgment: critical damage support.", legion: "INT board value" },
  { id: "lynn", name: "Lynn", group: "Other", jobGroup: "Magician", primaryStat: "INT", weapon: "Memorial Staff", role: "Spirit guardian", style: "summons, healing, and support", difficulty: "Easy", ratings: [4, 3, 3, 4], link: "Forest Blessing: team-friendly utility.", legion: "INT board value", iconKey: "users" }
];

function entry(seed: ClassSeed): LibraryClass {
  const [mobbing, bossing, mobility, survivability] = seed.ratings;
  const art = classGroupVisuals[seed.group] ?? classGroupVisuals.Explorers;
  const cardImage = art.cardImage;
  const heroImage = art.heroImage;
  const strengths = [
    `${seed.name} has a clear ${seed.style} identity.`,
    bossing >= 4 ? "Reliable bossing value once core cooldowns are learned." : "Simple training value for account building.",
    mobbing >= 5 ? "Excellent map coverage and farming comfort." : "Readable combat loop that is easy to evaluate."
  ];
  const weaknesses = [
    seed.difficulty === "Hard" ? "Requires practice to unlock its full ceiling." : "Still needs correct gear and links to feel complete.",
    survivability <= 3 ? "Punishes sloppy positioning in harder bosses." : "Damage may depend on cooldown timing."
  ];

  return {
    ...seed,
    classGroup: seed.group,
    secondaryStat: secondaryByStat[seed.primaryStat],
    secondaryWeapon: secondaryWeaponByJob[seed.jobGroup],
    mobbing,
    bossing,
    mobility,
    survivability,
    mobbingRating: mobbing,
    bossingRating: bossing,
    mobilityRating: mobility,
    survivabilityRating: survivability,
    burstProfile:
      bossing >= 5
        ? `${seed.name} has a major burst identity and rewards clean cooldown preparation.`
        : `${seed.name} leans on steady pressure with clear windows for stronger skills.`,
    linkSkill: seed.link,
    linkSkillSummary: seed.link,
    legionBonus: seed.legion,
    pros: strengths,
    cons: weaknesses,
    audience:
      seed.difficulty === "Easy"
        ? `Good for players who want a readable ${seed.jobGroup.toLowerCase()} with low friction.`
        : `Best for players who enjoy practicing a ${seed.jobGroup.toLowerCase()} kit and improving execution over time.`,
    iconKey: seed.iconKey ?? jobIcon[seed.jobGroup],
    cardImage,
    heroImage,
    visualTheme: { gradient: art.gradient, accent: art.accent },
    relatedGuideIds: ["class-overview", "link-skills", "legion-basics", "attack-speed"]
  };
}

export const libraryClasses: LibraryClass[] = seeds.map(entry);

export const libraryClassGroups: LibraryClassGroup[] = [
  "Explorers",
  "Cygnus Knights",
  "Heroes",
  "Resistance",
  "Nova",
  "Sengoku",
  "Flora",
  "Anima",
  "Shine",
  "Jianghu",
  "Other"
];

export function getClassesByGroup(group: LibraryClassGroup): LibraryClass[] {
  return libraryClasses.filter((c) => c.group === group);
}

export function getClassById(id: string): LibraryClass | null {
  return libraryClasses.find((c) => c.id === id) ?? null;
}

export function filterClasses(opts: {
  group?: LibraryClassGroup | null;
  query?: string;
  difficulty?: LibraryClass["difficulty"] | null;
}): LibraryClass[] {
  const query = opts.query?.trim().toLowerCase() ?? "";
  return libraryClasses.filter((c) => {
    if (opts.group && c.group !== opts.group) return false;
    if (opts.difficulty && c.difficulty !== opts.difficulty) return false;
    if (!query) return true;
    const haystack = [
      c.name,
      c.role,
      c.style,
      c.group,
      c.jobGroup,
      c.audience,
      c.pros.join(" "),
      c.cons.join(" "),
      c.linkSkill,
      c.legionBonus
    ]
      .join(" ")
      .toLowerCase();
    return query.split(/\s+/).every((term) => haystack.includes(term));
  });
}
