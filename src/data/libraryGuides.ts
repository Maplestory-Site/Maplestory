/**
 * Original Maple Library guide catalogue.
 *
 * This data model is inspired by the way guide hubs group information, but all
 * guide copy here is original to this project.
 */

export type LibraryCategory =
  | "Content"
  | "Classes"
  | "Equipment"
  | "Events"
  | "Resources"
  | "Beginner";

export type LibraryCategoryKey =
  | "content"
  | "classes"
  | "equipment"
  | "events"
  | "resources"
  | "beginner";

export type LibraryDifficulty = "Beginner" | "Intermediate" | "Advanced";
export type LibraryRegion = "GMS" | "KMS" | "General";
export type LibraryExternalLinkType = "Official" | "Wiki" | "Community" | "Tool" | "Video";

export type LibraryExternalLink = {
  label: string;
  url: string;
  type: LibraryExternalLinkType;
};

export type LegacyLibrarySourceLink = {
  label: string;
  href: string;
  thirdParty?: boolean;
};

export type LibraryGuideSection = {
  heading: string;
  body: string;
  image?: string;
  tips?: string[];
  warnings?: string[];
};

export type LibraryVisualTheme = {
  gradient: string;
  accent: string;
};

/**
 * Required output shape after enrichment via {@link guide}. Every field listed
 * here is guaranteed to be populated on every entry in {@link libraryGuides}.
 */
export type LibraryGuide = {
  id: string;
  title: string;
  category: LibraryCategory;
  subcategory?: string;
  difficulty: LibraryDifficulty;
  region: LibraryRegion;
  description: string;
  /** Required after enrichment. Defaults to category banner. */
  cardImage: string;
  /** Required after enrichment. Defaults to category banner. */
  heroImage: string;
  /** Required after enrichment. Semantic icon key resolved from category/tags. */
  iconKey: import("./libraryAssets").LibraryIconKey;
  /** Required after enrichment. Defaults to category gradient + accent. */
  visualTheme: LibraryVisualTheme;
  /** Legacy: kept for backward-compat with existing components. */
  image?: string;
  icon?: string;
  tags: string[];
  estimatedReadTime: string;
  lastUpdated: string;
  summary: string;
  body?: string;
  keyPoints: string[];
  sections: LibraryGuideSection[];
  relatedGuideIds: string[];
  relatedIds?: string[];
  externalLinks?: LibraryExternalLink[];
  sourceLinks?: LegacyLibrarySourceLink[];
  audience?: string;
  recommendedLevel?: string;
  featured?: boolean;
};

/** Input shape accepted by {@link guide}. Visual fields are optional inputs. */
export type LibraryGuideInput = Omit<LibraryGuide, "cardImage" | "heroImage" | "iconKey" | "visualTheme"> & {
  cardImage?: string;
  heroImage?: string;
  iconKey?: import("./libraryAssets").LibraryIconKey;
  visualTheme?: LibraryVisualTheme;
};

export type LibraryCategoryDefinition = {
  key: LibraryCategory | "All";
  label: string;
  description: string;
  icon: string;
};

export const libraryCategories: LibraryCategoryDefinition[] = [
  { key: "All", label: "All Guides", description: "Every guide in the Maple Library.", icon: "ALL" },
  { key: "Beginner", label: "Beginner", description: "Fast answers for new and returning players.", icon: "NEW" },
  { key: "Content", label: "Content", description: "Progression, bosses, systems, and unlocks.", icon: "MAP" },
  { key: "Classes", label: "Classes", description: "Class identity, stats, links, Legion, and terms.", icon: "JOB" },
  { key: "Equipment", label: "Equipment", description: "Enhancement, Star Force, potential, and set effects.", icon: "EQP" },
  { key: "Events", label: "Events", description: "Burning, relays, rewards, and event planning.", icon: "EVT" },
  { key: "Resources", label: "Resources", description: "Trusted links, tools, creators, and FAQ.", icon: "RES" }
];

export const libraryDifficulties: LibraryDifficulty[] = ["Beginner", "Intermediate", "Advanced"];
export const libraryRegions: LibraryRegion[] = ["General", "GMS", "KMS"];

const LAST_UPDATED = "2026-04-28";
const GUIDE_ART = "/library/guides";

// Imported lazily through dynamic require to avoid a hypothetical circular
// import at module-init time. libraryAssets only imports types from this file.
import { getCategoryAsset, getGuideCardImage, getGuideHeroImage, getGuideIcon } from "./libraryAssets";

/**
 * Enrichment helper. Takes a {@link LibraryGuideInput} and fills in the required
 * visual fields (`cardImage`, `heroImage`, `iconKey`, `visualTheme`) from the
 * guide's category asset when the entry doesn't override them. Guarantees that
 * every guide in {@link libraryGuides} satisfies the {@link LibraryGuide} contract.
 */
function guide(input: LibraryGuideInput): LibraryGuide {
  const asset = getCategoryAsset(input.category);
  const iconKey = input.iconKey ?? getGuideIcon(input);
  const seeded = {
    ...input,
    iconKey,
    visualTheme: input.visualTheme ?? { gradient: asset.gradient, accent: asset.accent }
  };
  const keyPoints = ensureGuideKeyPoints(input);
  const sections = ensureGuideSections(input);
  return {
    ...seeded,
    iconKey,
    cardImage: input.cardImage ?? getGuideCardImage({ ...seeded, keyPoints, sections }),
    heroImage: input.heroImage ?? getGuideHeroImage({ ...seeded, keyPoints, sections }),
    keyPoints,
    sections,
    relatedIds: input.relatedIds ?? input.relatedGuideIds
  };
}

function ensureGuideKeyPoints(input: LibraryGuideInput): string[] {
  const seen = new Set<string>();
  const points = [...input.keyPoints];
  const additions = [
    `Use this guide when you need a clear ${input.category.toLowerCase()} decision path.`,
    `Check the related guides before spending permanent account resources.`,
    `Revisit this topic after major progression milestones or seasonal events.`,
    `Prioritize simple, repeatable habits over perfect optimization.`,
    `Keep notes on what changed for your class, world, or region.`
  ];

  const merged = [...points, ...additions]
    .map((point) => point.trim())
    .filter((point) => {
      const key = point.toLowerCase();
      if (!point || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return merged.slice(0, Math.max(5, Math.min(8, merged.length)));
}

function ensureGuideSections(input: LibraryGuideInput): LibraryGuideSection[] {
  const sections = [...input.sections];
  const topic = input.title.toLowerCase();
  const defaultTips = [
    "Turn the guide into one small action you can complete this session.",
    "If a system feels expensive, wait until your gear or event rewards make it efficient."
  ];
  const additions: LibraryGuideSection[] = [
    {
      heading: "How to use this guide",
      body:
        `${input.title} is meant to give you a practical route, not a rigid script. Start with the summary, choose the next action that matches your account, and ignore advanced optimizations until the basics feel comfortable.`,
      tips: defaultTips
    },
    {
      heading: "Common decision points",
      body:
        `The important question for ${topic} is usually timing: when to start, when to pause, and when the next upgrade or unlock is worth the cost. Compare the benefit with your current level, account resources, and event schedule.`,
      warnings: ["Do not copy another player's route without checking whether their account stage matches yours."]
    },
    {
      heading: "What to check next",
      body:
        `After applying this guide, review your related systems: class setup, gear quality, event rewards, and weekly goals. MapleStory progress feels best when several small systems move together instead of one system carrying everything.`
    },
    {
      heading: "Quick practice checklist",
      body:
        `Before you leave this topic, confirm one short-term goal, one account-wide goal, and one resource you should protect. This keeps ${topic} useful without turning the game into homework.`,
      tips: ["Use bookmarks for guides you expect to revisit weekly."]
    }
  ];

  for (const section of additions) {
    if (sections.length >= 4) break;
    if (!sections.some((existing) => existing.heading === section.heading)) {
      sections.push(section);
    }
  }

  return sections;
}

export const libraryGuides: LibraryGuide[] = [
  guide({
    id: "beginner-essentials",
    title: "First Day Checklist",
    category: "Beginner",
    subcategory: "New Player Start",
    difficulty: "Beginner",
    region: "General",
    description: "A clear first-session route so new players know what matters and what can wait.",
    icon: "NEW",
    tags: ["beginner", "first-day", "checklist", "progression"],
    estimatedReadTime: "4 min",
    lastUpdated: LAST_UPDATED,
    audience: "Brand new players and returning players starting fresh",
    recommendedLevel: "Level 1+",
    summary:
      "Your first day should be simple: pick a class you enjoy, follow clean unlock goals, avoid wasting resources, and build a foundation for future bossing.",
    keyPoints: [
      "Pick fun first; optimization matters later.",
      "Use early quests and guide prompts to unlock systems.",
      "Save upgrade resources until gear begins lasting longer.",
      "Set one short goal per session so the game stays readable."
    ],
    sections: [
      {
        heading: "The first session goal",
        body:
          "Focus on learning movement, core attacks, and the menu flow. Do not judge a class only by the first few minutes because most classes gain their rhythm after several skill unlocks.",
        tips: ["Keep one main character for learning, even if you test alts later."]
      },
      {
        heading: "What to avoid early",
        body:
          "Early gear is temporary, so permanent investment should wait. Spend only what helps you continue smoothly, then save major resources for equipment that remains useful longer.",
        warnings: ["Do not burn premium upgrade resources on gear you will replace quickly."]
      },
      {
        heading: "Where to go next",
        body:
          "Once basic controls feel comfortable, move into progression goals: link skills, starter gear, early bosses, and event rewards. Those systems create most of your early account power."
      }
    ],
    relatedGuideIds: ["progression-overview", "class-overview", "beginner-pitfalls"],
    featured: true
  }),
  guide({
    id: "beginner-pitfalls",
    title: "Beginner Mistakes to Avoid",
    category: "Beginner",
    subcategory: "Account Safety",
    difficulty: "Beginner",
    region: "General",
    description: "The common decisions that slow accounts down and how to avoid them.",
    icon: "SAFE",
    tags: ["beginner", "mistakes", "resources"],
    estimatedReadTime: "3 min",
    lastUpdated: LAST_UPDATED,
    summary:
      "Most beginner problems come from spending too early, spreading goals too thin, or ignoring account-wide power systems.",
    keyPoints: [
      "Do not over-upgrade throwaway gear.",
      "Do not ignore link skills and Legion basics.",
      "Do not chase every event reward if time is limited.",
      "Keep important items locked before experimenting."
    ],
    sections: [
      {
        heading: "Resource spending",
        body:
          "Early spending should solve immediate friction, not chase perfect stats. If the item is temporary, treat upgrades as temporary too."
      },
      {
        heading: "Account-wide power",
        body:
          "Link skills, Legion, event rings, and basic set effects often give more value than another small upgrade on one piece of gear."
      }
    ],
    relatedGuideIds: ["beginner-essentials", "legion-basics", "link-skills"]
  }),
  guide({
    id: "progression-overview",
    title: "Progression Roadmap",
    category: "Content",
    subcategory: "Progression Guide",
    difficulty: "Beginner",
    region: "General",
    description: "A milestone-based path from first character to early boss readiness.",
    cardImage: `${GUIDE_ART}/progression-roadmap.svg`,
    heroImage: `${GUIDE_ART}/progression-roadmap.svg`,
    icon: "ROAD",
    tags: ["progression", "roadmap", "milestones"],
    estimatedReadTime: "7 min",
    lastUpdated: LAST_UPDATED,
    audience: "Players who want a simple next-step plan",
    recommendedLevel: "Level 1+",
    summary:
      "Good progression is a sequence of small unlocks: level, unlock systems, stabilize gear, learn bosses, then repeat at a higher tier.",
    keyPoints: [
      "Early game is about unlocking systems, not perfecting gear.",
      "Mid game is about reliable weekly clears and efficient upgrades.",
      "Late game requires resource planning and consistent boss practice.",
      "The best next upgrade is the one blocking your current goal."
    ],
    sections: [
      {
        heading: "Levels 1 to 100",
        body:
          "Use this phase to learn your class and open core systems. Keep upgrades light and prioritize anything that helps movement, survivability, or basic damage.",
        tips: ["If you feel lost, return to the Beginner guides before pushing gear."]
      },
      {
        heading: "Levels 100 to 200",
        body:
          "Start building account power. Link skills, basic equipment sets, and event rewards matter more than perfect min-maxing."
      },
      {
        heading: "After 200",
        body:
          "Progress becomes more weekly and resource-driven. Boss clears, symbols, nodes, meso planning, and event shops become the core loop."
      }
    ],
    relatedGuideIds: ["level-content-guide", "boss-prequests", "upgrading-equipment"],
    featured: true
  }),
  guide({
    id: "level-content-guide",
    title: "Level Content Guide",
    category: "Content",
    subcategory: "Leveling",
    difficulty: "Advanced",
    region: "General",
    description: "Which content types matter at different level bands and why.",
    cardImage: `${GUIDE_ART}/level-content-guide.svg`,
    heroImage: `${GUIDE_ART}/level-content-guide.svg`,
    icon: "LVL",
    tags: ["leveling", "progression", "content"],
    estimatedReadTime: "6 min",
    lastUpdated: LAST_UPDATED,
    recommendedLevel: "Level 100+",
    summary:
      "Leveling content should be chosen by unlock value, not only raw XP. The best route is usually the one that unlocks future power while keeping training comfortable.",
    keyPoints: [
      "Use low-level content to unlock systems quickly.",
      "Use mid-level content to stabilize gear and account bonuses.",
      "Use late-level content to support symbols, nodes, and weekly boss goals."
    ],
    sections: [
      {
        heading: "Early levels",
        body:
          "Early content should be fast, linear, and low friction. Follow the route that keeps you moving and avoids long detours."
      },
      {
        heading: "Mid levels",
        body:
          "Mid-game content starts asking for better damage and survivability. This is where basic gear, links, and account bonuses become noticeable."
      },
      {
        heading: "High levels",
        body:
          "High-level progression is less about rushing and more about repeatable power gains. Plan daily content around the rewards your current goal needs most."
      }
    ],
    relatedGuideIds: ["progression-overview", "keyboard-shortcuts", "abnormal-statuses"]
  }),
  guide({
    id: "boss-prequests",
    title: "Boss Pre-quests Planner",
    category: "Content",
    subcategory: "Bossing",
    difficulty: "Intermediate",
    region: "General",
    description: "How to prioritize boss unlock quests without drowning in side tasks.",
    cardImage: `${GUIDE_ART}/boss-prequests.svg`,
    heroImage: `${GUIDE_ART}/boss-prequests.svg`,
    icon: "BOSS",
    tags: ["bossing", "prequests", "weekly"],
    estimatedReadTime: "5 min",
    lastUpdated: LAST_UPDATED,
    recommendedLevel: "Level 120+",
    summary:
      "Boss pre-quests are best handled as account milestones. Unlock the bosses you can realistically practice, then expand as your damage grows.",
    keyPoints: [
      "Unlock bosses in the order you can actually clear.",
      "Group questlines by region to reduce travel time.",
      "Track weekly reset goals separately from one-time unlocks."
    ],
    sections: [
      {
        heading: "Priority logic",
        body:
          "Do not unlock every boss at once. Start with bosses that provide weekly value for your current power level, then add harder unlocks when your gear and mechanics improve."
      },
      {
        heading: "Practice value",
        body:
          "A boss you can practice every week is more valuable than a harder boss you cannot meaningfully damage yet."
      }
    ],
    relatedGuideIds: ["progression-overview", "abnormal-statuses", "event-timeline"],
    featured: true
  }),
  guide({
    id: "keyboard-shortcuts",
    title: "Keyboard Shortcuts Setup",
    category: "Content",
    subcategory: "Controls",
    difficulty: "Beginner",
    region: "General",
    description: "A practical keyboard layout approach for comfort, bossing, and low-friction menus.",
    cardImage: `${GUIDE_ART}/keyboard-shortcuts.svg`,
    heroImage: `${GUIDE_ART}/keyboard-shortcuts.svg`,
    icon: "KEY",
    tags: ["controls", "keyboard", "quality-of-life"],
    estimatedReadTime: "4 min",
    lastUpdated: LAST_UPDATED,
    summary:
      "A good key layout reduces mistakes. Put movement-adjacent combat keys near your hand, keep panic buttons consistent, and avoid menu clutter.",
    keyPoints: [
      "Group burst skills together.",
      "Keep defensive buttons easy to reach.",
      "Separate menu keys from combat keys.",
      "Use the same layout logic across alts."
    ],
    sections: [
      {
        heading: "Combat keys",
        body:
          "Place your most frequent attacks and movement skills where your hand naturally rests. Defensive skills should be reachable without looking down."
      },
      {
        heading: "Menu keys",
        body:
          "Put inventory, stats, quests, and guide windows away from burst buttons. Accidental menu presses during bosses are avoidable."
      }
    ],
    relatedGuideIds: ["beginner-essentials", "abnormal-statuses"]
  }),
  guide({
    id: "abnormal-statuses",
    title: "Abnormal Statuses Explained",
    category: "Content",
    subcategory: "Combat Systems",
    difficulty: "Intermediate",
    region: "General",
    description: "A readable breakdown of common debuffs and why they matter in bosses.",
    cardImage: `${GUIDE_ART}/abnormal-statuses.svg`,
    heroImage: `${GUIDE_ART}/abnormal-statuses.svg`,
    icon: "STAT",
    tags: ["bossing", "status", "combat"],
    estimatedReadTime: "5 min",
    lastUpdated: LAST_UPDATED,
    summary:
      "Status effects are boss mechanics, not background noise. Understanding them helps you survive longer and plan cleaner clears.",
    keyPoints: [
      "Status resistance helps but does not replace mechanics.",
      "Some effects punish panic movement more than low damage.",
      "Clean positioning prevents many status chains."
    ],
    sections: [
      {
        heading: "Why statuses matter",
        body:
          "A strong account can still lose time to stuns, binds, curses, and damage-over-time effects. Treat each status as part of the boss pattern."
      },
      {
        heading: "How to learn them",
        body:
          "During practice runs, identify which status causes your deaths. Fix one pattern at a time instead of trying to play perfectly all at once."
      }
    ],
    relatedGuideIds: ["boss-prequests", "keyboard-shortcuts"]
  }),
  guide({
    id: "class-overview",
    title: "Class Overview",
    category: "Classes",
    subcategory: "Class Guide",
    difficulty: "Beginner",
    region: "General",
    description: "How to evaluate a class by playstyle, not only damage charts.",
    cardImage: `${GUIDE_ART}/class-overview.svg`,
    heroImage: `${GUIDE_ART}/class-overview.svg`,
    icon: "JOB",
    tags: ["classes", "playstyle", "beginner"],
    estimatedReadTime: "5 min",
    lastUpdated: LAST_UPDATED,
    summary:
      "A good main is a class you can enjoy for hundreds of hours. Damage matters, but comfort, mobility, burst timing, and survivability matter just as much.",
    keyPoints: [
      "Choose by feel before chasing rankings.",
      "Check burst window complexity.",
      "Mobility and survivability affect real boss performance.",
      "Try classes long enough to unlock their main rotation."
    ],
    sections: [
      {
        heading: "Role identity",
        body:
          "Every class has a rhythm: burst-heavy, sustained damage, summon-based, mobile, defensive, or setup-focused. Pick the rhythm you enjoy repeating."
      },
      {
        heading: "Main versus mule",
        body:
          "A class can be excellent as a boss mule but tiring as a main. Consider how often you want to play it and how much setup it requires."
      }
    ],
    relatedGuideIds: ["link-skills", "attack-speed", "stat-terms"],
    featured: true
  }),
  guide({
    id: "link-skills",
    title: "Link Skills Priority",
    category: "Classes",
    subcategory: "Account Power",
    difficulty: "Beginner",
    region: "General",
    description: "How to approach link skills without turning your account into a spreadsheet.",
    cardImage: `${GUIDE_ART}/link-skills.svg`,
    heroImage: `${GUIDE_ART}/link-skills.svg`,
    icon: "LINK",
    tags: ["link-skills", "classes", "account-power"],
    estimatedReadTime: "5 min",
    lastUpdated: LAST_UPDATED,
    summary:
      "Link skills are one of the fastest account-wide power gains. Build the most universal links first, then specialize for bossing or training.",
    keyPoints: [
      "Start with broadly useful damage and survival links.",
      "Training links and bossing links can be different loadouts.",
      "Do not delay your main forever just to finish every link."
    ],
    sections: [
      {
        heading: "Priority mindset",
        body:
          "Build enough links to make your main feel good, then return to alts when progress slows. The goal is momentum, not perfect completion on day one."
      },
      {
        heading: "Loadouts",
        body:
          "Training favors speed, XP, and consistent damage. Bossing favors burst, crit, survivability, and damage uptime."
      }
    ],
    relatedGuideIds: ["class-overview", "legion-basics", "stat-terms"]
  }),
  guide({
    id: "attack-speed",
    title: "Attack Speed Basics",
    category: "Classes",
    subcategory: "Combat Terms",
    difficulty: "Intermediate",
    region: "General",
    description: "What attack speed means and why it changes class feel.",
    cardImage: `${GUIDE_ART}/attack-speed.svg`,
    heroImage: `${GUIDE_ART}/attack-speed.svg`,
    icon: "SPD",
    tags: ["attack-speed", "classes", "combat"],
    estimatedReadTime: "4 min",
    lastUpdated: LAST_UPDATED,
    summary:
      "Attack speed affects how responsive a class feels. It can improve damage uptime, but only if the class can actually benefit from faster actions.",
    keyPoints: [
      "Faster does not always mean better if cooldowns are the limiter.",
      "Some classes care more about animation lock than raw speed.",
      "Check class-specific recommendations before investing."
    ],
    sections: [
      {
        heading: "Feel and uptime",
        body:
          "Higher speed can make attacks easier to weave between boss patterns. It also reduces the feeling of being stuck in an animation."
      },
      {
        heading: "When it matters less",
        body:
          "If most of your damage comes from summons, long cooldowns, or fixed animations, attack speed may not be your biggest upgrade."
      }
    ],
    relatedGuideIds: ["class-overview", "stat-terms"]
  }),
  guide({
    id: "fifth-job-skills",
    title: "5th Job Skills Priority",
    category: "Classes",
    subcategory: "Skill Progression",
    difficulty: "Intermediate",
    region: "General",
    description: "How to approach 5th Job skill unlocks, boost nodes, and early damage upgrades.",
    cardImage: `${GUIDE_ART}/fifth-job-skills.svg`,
    heroImage: `${GUIDE_ART}/fifth-job-skills.svg`,
    iconKey: "sparkles",
    tags: ["skills", "5th-job", "nodes", "progression"],
    estimatedReadTime: "6 min",
    lastUpdated: LAST_UPDATED,
    recommendedLevel: "Level 200+",
    summary:
      "5th Job is where many classes become complete. Prioritize the skills that improve your main rotation first, then build utility and burst depth.",
    keyPoints: [
      "Unlock the class-defining 5th Job skill before chasing minor upgrades.",
      "Boost nodes matter most when they support the skills you actually use.",
      "Damage, uptime, and safety skills should be judged by your current goal."
    ],
    sections: [
      {
        heading: "First priority",
        body:
          "Start with the skill that changes your rotation or solves your biggest weakness. For some classes that is burst damage; for others it is mobbing reach, uptime, or survivability."
      },
      {
        heading: "Node discipline",
        body:
          "Avoid upgrading every node evenly. Push the small group of skills that carry your training and bossing first, then fill utility after your core feels stable.",
        tips: ["Keep notes on which skills are used in training versus bossing loadouts."]
      }
    ],
    relatedGuideIds: ["v-matrix", "class-skill-rotation", "progression-overview"],
    featured: true
  }),
  guide({
    id: "v-matrix",
    title: "V Matrix and Boost Nodes",
    category: "Classes",
    subcategory: "Skill Systems",
    difficulty: "Advanced",
    region: "General",
    description: "A clean way to think about skill slots, boost trios, and node investment.",
    cardImage: `${GUIDE_ART}/v-matrix.svg`,
    heroImage: `${GUIDE_ART}/v-matrix.svg`,
    iconKey: "star",
    tags: ["skills", "v-matrix", "boost-nodes", "5th-job"],
    estimatedReadTime: "7 min",
    lastUpdated: LAST_UPDATED,
    recommendedLevel: "Level 200+",
    summary:
      "The V Matrix is a build board. Slot pressure forces choices, so your setup should match your current activity instead of trying to do everything at once.",
    keyPoints: [
      "Separate training nodes from bossing nodes when slot pressure is high.",
      "Boost trios are valuable only when they cover high-use skills.",
      "Utility nodes can be stronger than raw damage in harder bosses."
    ],
    sections: [
      {
        heading: "Slot pressure",
        body:
          "At low Arcane levels, slots are limited. Treat every equipped node as a decision: damage, mobility, survivability, or quality-of-life."
      },
      {
        heading: "Boost node planning",
        body:
          "Look for repeated core skills across boost nodes and avoid investing heavily in combinations that do not support your real rotation."
      }
    ],
    relatedGuideIds: ["fifth-job-skills", "class-skill-rotation", "stat-terms"]
  }),
  guide({
    id: "hexa-skills",
    title: "HEXA Skill Planning",
    category: "Classes",
    subcategory: "6th Job",
    difficulty: "Advanced",
    region: "General",
    description: "How to plan 6th Job upgrades without wasting high-value fragments.",
    cardImage: `${GUIDE_ART}/hexa-skills.svg`,
    heroImage: `${GUIDE_ART}/hexa-skills.svg`,
    iconKey: "zap",
    tags: ["skills", "hexa", "6th-job", "fragments"],
    estimatedReadTime: "6 min",
    lastUpdated: LAST_UPDATED,
    recommendedLevel: "Level 260+",
    summary:
      "HEXA upgrades should feel intentional. The strongest path is usually the one that improves your highest-impact skills while preserving future flexibility.",
    keyPoints: [
      "Do not spend fragments randomly just because an upgrade is available.",
      "Prioritize upgrades that improve your main bossing or farming loop.",
      "Class-specific breakpoints can change which skill is best next."
    ],
    sections: [
      {
        heading: "Upgrade intent",
        body:
          "Before spending fragments, decide whether the goal is boss damage, farming comfort, burst alignment, or long-term account value."
      },
      {
        heading: "Avoiding regret",
        body:
          "HEXA resources are slow enough that a bad habit compounds. Keep upgrades focused and revisit priorities after major class or event changes.",
        warnings: ["Avoid treating every class as if it has the same HEXA priority order."]
      }
    ],
    relatedGuideIds: ["fifth-job-skills", "v-matrix", "stat-terms"]
  }),
  guide({
    id: "class-skill-rotation",
    title: "Skill Rotation Basics",
    category: "Classes",
    subcategory: "Combat Flow",
    difficulty: "Beginner",
    region: "General",
    description: "How to read a class rotation and make combat feel cleaner.",
    cardImage: `${GUIDE_ART}/skill-rotation.svg`,
    heroImage: `${GUIDE_ART}/skill-rotation.svg`,
    iconKey: "compass",
    tags: ["skills", "rotation", "bossing", "training"],
    estimatedReadTime: "5 min",
    lastUpdated: LAST_UPDATED,
    recommendedLevel: "Any level",
    summary:
      "Rotations are easier when you separate filler attacks, cooldown skills, burst setup, and emergency buttons.",
    keyPoints: [
      "Know which skill is filler and which skill is a cooldown commitment.",
      "Boss rotations should leave room for movement and survival.",
      "Training rotations should minimize unnecessary key presses."
    ],
    sections: [
      {
        heading: "Four skill groups",
        body:
          "Most classes can be organized into filler, cooldown, burst, and defensive skills. Once those groups are clear, keybinds and practice become much easier."
      },
      {
        heading: "Practice loop",
        body:
          "Practice one part at a time: movement, filler uptime, burst setup, then full fight execution. Clean repetition beats memorizing a long script."
      }
    ],
    relatedGuideIds: ["keyboard-shortcuts", "attack-speed", "fifth-job-skills"]
  }),
  guide({
    id: "burst-and-bind-windows",
    title: "Burst and Bind Windows",
    category: "Classes",
    subcategory: "Bossing Skills",
    difficulty: "Intermediate",
    region: "General",
    description: "How to line up burst skills, binds, and boss openings for cleaner clears.",
    cardImage: `${GUIDE_ART}/burst-and-bind.svg`,
    heroImage: `${GUIDE_ART}/burst-and-bind.svg`,
    iconKey: "fire",
    tags: ["skills", "burst", "bind", "bossing"],
    estimatedReadTime: "5 min",
    lastUpdated: LAST_UPDATED,
    recommendedLevel: "Bossing-ready characters",
    summary:
      "Burst windows are about timing, not panic. A clean setup often beats stronger gear used at the wrong moment.",
    keyPoints: [
      "Pre-buff before the boss becomes vulnerable.",
      "Use bind windows when your strongest skills are ready.",
      "Save defensive tools if the boss punishes long animations."
    ],
    sections: [
      {
        heading: "Setup order",
        body:
          "Create a short personal checklist: long buffs, short buffs, position, bind, then burst. Keep it short enough to repeat under pressure."
      },
      {
        heading: "When not to burst",
        body:
          "If the boss is about to become invulnerable or force movement, delay burst. Losing a few seconds is better than wasting the full window."
      }
    ],
    relatedGuideIds: ["boss-prequests", "class-skill-rotation", "abnormal-statuses"]
  }),
  guide({
    id: "stat-terms",
    title: "Stat Terms Glossary",
    category: "Classes",
    subcategory: "Reference",
    difficulty: "Beginner",
    region: "General",
    description: "A plain-English guide to damage, boss damage, IED, crit, and final damage.",
    icon: "ABC",
    tags: ["stats", "classes", "reference"],
    estimatedReadTime: "6 min",
    lastUpdated: LAST_UPDATED,
    summary:
      "Stats are easier to understand when you group them by job: damage output, boss penetration, consistency, and survivability.",
    keyPoints: [
      "Final damage usually scales differently from regular damage.",
      "IED matters more as boss defense rises.",
      "Crit rate is only valuable until reliable; crit damage scales after that.",
      "Main stat is important but rarely the whole answer."
    ],
    sections: [
      {
        heading: "Damage stats",
        body:
          "Damage, boss damage, final damage, attack, and main stat all increase output, but they do not all scale the same way. Balance matters."
      },
      {
        heading: "Boss stats",
        body:
          "IED and boss damage become more important as you move into serious bossing. If a boss feels impossible despite good sheet damage, check these first."
      }
    ],
    relatedGuideIds: ["attack-speed", "potential", "class-overview"]
  }),
  guide({
    id: "legion-basics",
    title: "Legion Basics",
    category: "Classes",
    subcategory: "Account Power",
    difficulty: "Intermediate",
    region: "General",
    description: "How Legion turns alternate characters into permanent account value.",
    icon: "LEG",
    tags: ["legion", "classes", "account-power"],
    estimatedReadTime: "6 min",
    lastUpdated: LAST_UPDATED,
    summary:
      "Legion rewards long-term account building. Treat it as a background project that supports your main instead of a wall you must finish immediately.",
    keyPoints: [
      "Legion is a marathon system.",
      "Class choice matters because each character adds board value.",
      "Plan blocks around your current weakness: damage, crit, IED, or survivability."
    ],
    sections: [
      {
        heading: "When to start",
        body:
          "Start Legion once your main has enough momentum to benefit from account-wide bonuses. Build it gradually during events and downtime."
      },
      {
        heading: "How to prioritize",
        body:
          "Use Legion to solve current bottlenecks. If bosses feel tanky, plan offensive tiles. If training feels weak, prioritize comfort and consistency."
      }
    ],
    relatedGuideIds: ["link-skills", "progression-overview"]
  }),
  guide({
    id: "upgrading-equipment",
    title: "Upgrading and Enhancing Equipment",
    category: "Equipment",
    subcategory: "Gear Systems",
    difficulty: "Beginner",
    region: "General",
    description: "A safe upgrade order that keeps gear progression understandable.",
    icon: "EQP",
    tags: ["equipment", "upgrades", "progression"],
    estimatedReadTime: "7 min",
    lastUpdated: LAST_UPDATED,
    summary:
      "Equipment progression works best when each upgrade has a purpose. Improve slots that last, avoid over-investing temporary gear, and upgrade evenly.",
    keyPoints: [
      "Upgrade long-term pieces first.",
      "Do not chase perfect stats before basic foundations are done.",
      "Balance Star Force, potential, set effects, and accessories.",
      "Leave expensive steps until they unlock a real boss goal."
    ],
    sections: [
      {
        heading: "Upgrade order",
        body:
          "Start with items that will stay equipped for a while. Accessories, weapons, and set pieces usually deserve attention before temporary filler gear."
      },
      {
        heading: "Avoid tunnel vision",
        body:
          "One overbuilt item rarely fixes the whole account. Spread upgrades until every major slot contributes."
      }
    ],
    relatedGuideIds: ["star-force", "potential", "set-effects"],
    featured: true
  }),
  guide({
    id: "star-force",
    title: "Star Force Planning",
    category: "Equipment",
    subcategory: "Enhancement",
    difficulty: "Intermediate",
    region: "General",
    description: "How to plan Star Force upgrades without draining your entire meso supply.",
    icon: "STAR",
    tags: ["star-force", "equipment", "mesos"],
    estimatedReadTime: "6 min",
    lastUpdated: LAST_UPDATED,
    summary:
      "Star Force is powerful but volatile. Plan stopping points, use events carefully, and never start a session without a budget.",
    keyPoints: [
      "Set a budget before enhancing.",
      "Use event windows for expensive pushes.",
      "Do not star one item so hard that the rest of your gear falls behind."
    ],
    sections: [
      {
        heading: "Safe stopping points",
        body:
          "Choose a target before starting. If you reach it early, stop. This keeps progression predictable and prevents emotional overspending."
      },
      {
        heading: "Event timing",
        body:
          "Star Force events can make big pushes more efficient. Save larger attempts for windows where cost or risk is reduced."
      }
    ],
    relatedGuideIds: ["upgrading-equipment", "potential", "set-effects"]
  }),
  guide({
    id: "potential",
    title: "Potential and Bonus Potential",
    category: "Equipment",
    subcategory: "Stats",
    difficulty: "Intermediate",
    region: "General",
    description: "How to read potential lines and know when to stop rolling.",
    icon: "POT",
    tags: ["potential", "equipment", "stats"],
    estimatedReadTime: "6 min",
    lastUpdated: LAST_UPDATED,
    summary:
      "Potential is a long-term stat system. The goal is not perfect lines immediately; it is reaching useful lines at the right cost.",
    keyPoints: [
      "Useful lines beat perfect lines early.",
      "Stop rolling when the item meets its current purpose.",
      "Prioritize weapon, secondary, and emblem style slots for damage impact."
    ],
    sections: [
      {
        heading: "Good enough matters",
        body:
          "A good line that helps you clear the next boss is often better than chasing a perfect result that empties your resources."
      },
      {
        heading: "Damage slots",
        body:
          "Some slots affect damage more directly than others. Upgrade high-impact slots before spending heavily on small gains."
      }
    ],
    relatedGuideIds: ["stat-terms", "upgrading-equipment", "star-force"]
  }),
  guide({
    id: "set-effects",
    title: "Set Effects and Gear Identity",
    category: "Equipment",
    subcategory: "Sets",
    difficulty: "Intermediate",
    region: "General",
    description: "Why full equipment sets can beat random high-stat pieces.",
    icon: "SET",
    tags: ["set-effects", "equipment", "gear"],
    estimatedReadTime: "5 min",
    lastUpdated: LAST_UPDATED,
    summary:
      "Set effects create hidden power by rewarding matching pieces. A slightly weaker item can be better if it completes a strong set threshold.",
    keyPoints: [
      "Check 2-piece, 3-piece, and higher thresholds before replacing gear.",
      "Do not break a useful set for a tiny stat increase.",
      "Set transitions are major progression moments."
    ],
    sections: [
      {
        heading: "Threshold thinking",
        body:
          "Always compare the whole setup, not one item in isolation. The item with more visible stats may still reduce total power if it breaks a set."
      },
      {
        heading: "Transition planning",
        body:
          "Move between sets when you have enough replacement pieces to keep bonuses stable. Partial transitions can feel weaker for a while."
      }
    ],
    relatedGuideIds: ["upgrading-equipment", "star-force"]
  }),
  guide({
    id: "shared-cash-shop-inventories",
    title: "Shared Cash Shop Inventories",
    category: "Equipment",
    subcategory: "Account Utility",
    difficulty: "Beginner",
    region: "GMS",
    description: "How shared Cash Shop storage helps move cosmetic and utility items safely.",
    icon: "CS",
    tags: ["cash-shop", "inventory", "account"],
    estimatedReadTime: "4 min",
    lastUpdated: LAST_UPDATED,
    summary:
      "Shared storage rules can save money and prevent confusion. Know which characters share inventory before moving cosmetics or utility items.",
    keyPoints: [
      "Shared storage depends on character grouping.",
      "Check whether an item is transferable before buying.",
      "Treat limited-time cosmetics as account-planning decisions."
    ],
    sections: [
      {
        heading: "Before buying",
        body:
          "Confirm where the item can be moved. Some items are flexible, while others become tied to one character or group after purchase."
      },
      {
        heading: "Planning cosmetics",
        body:
          "If you play multiple characters, buy cosmetics with transfer rules in mind. It is easier to plan before purchasing than to fix later."
      }
    ],
    relatedGuideIds: ["upgrading-equipment", "resources-official-sites"]
  }),
  guide({
    id: "burning-world",
    title: "Burning World Strategy",
    category: "Events",
    subcategory: "Growth Events",
    difficulty: "Intermediate",
    region: "GMS",
    description: "How to use Burning World for real account progress instead of temporary chaos.",
    icon: "BURN",
    tags: ["events", "burning", "progression"],
    estimatedReadTime: "5 min",
    lastUpdated: LAST_UPDATED,
    summary:
      "Burning events are strongest when attached to a clear goal: a new main, a link skill, a Legion push, or a boss mule.",
    keyPoints: [
      "Choose the character before the event starts.",
      "Plan transfer rules and final destination.",
      "Use event rewards on gear that survives the event."
    ],
    sections: [
      {
        heading: "Pick the purpose",
        body:
          "A Burning character should have a job: main candidate, link skill, Legion block, or future mule. Without that purpose, rewards can scatter."
      },
      {
        heading: "Event ending plan",
        body:
          "Before the event ends, decide what gear, rewards, and character progress need to move to your long-term world."
      }
    ],
    relatedGuideIds: ["tera-burning", "mega-burning", "event-timeline"],
    featured: true
  }),
  guide({
    id: "tera-burning",
    title: "Tera Burning Planner",
    category: "Events",
    subcategory: "Leveling Events",
    difficulty: "Beginner",
    region: "GMS",
    description: "How to choose a Tera Burning character and avoid wasting the boost.",
    icon: "TERA",
    tags: ["events", "tera-burning", "leveling"],
    estimatedReadTime: "4 min",
    lastUpdated: LAST_UPDATED,
    summary:
      "Tera Burning is best for characters that would otherwise be slow or valuable to finish quickly. Pick based on account benefit and enjoyment.",
    keyPoints: [
      "Use Burning on a character with long-term value.",
      "Prepare inventory and basic links before starting.",
      "Do not pick a class only because it is trendy."
    ],
    sections: [
      {
        heading: "Character choice",
        body:
          "The best Burning target is one you either want to keep playing or one that gives strong account value after the event."
      },
      {
        heading: "During the event",
        body:
          "Claim rewards intentionally and keep a list of what must be finished before the event expires."
      }
    ],
    relatedGuideIds: ["burning-world", "mega-burning", "class-overview"]
  }),
  guide({
    id: "mega-burning",
    title: "Mega Burning Uses",
    category: "Events",
    subcategory: "Leveling Events",
    difficulty: "Beginner",
    region: "GMS",
    description: "A simple way to turn smaller Burning events into useful account gains.",
    icon: "MEGA",
    tags: ["events", "mega-burning", "legion"],
    estimatedReadTime: "3 min",
    lastUpdated: LAST_UPDATED,
    summary:
      "Mega Burning is excellent for low-friction account projects: link skills, Legion blocks, and classes you want to test.",
    keyPoints: [
      "Use it on useful alts.",
      "Do not over-invest temporary gear.",
      "Finish the core milestone before the event ends."
    ],
    sections: [
      {
        heading: "Best use cases",
        body:
          "Mega Burning works well when you need a fast alt for account-wide value. It is less ideal for a main unless the event reward package supports long-term play."
      }
    ],
    relatedGuideIds: ["link-skills", "legion-basics", "tera-burning"]
  }),
  guide({
    id: "maple-relay",
    title: "Maple Relay Routine",
    category: "Events",
    subcategory: "Daily Events",
    difficulty: "Beginner",
    region: "GMS",
    description: "How to complete relay-style events without turning them into a chore.",
    icon: "RELAY",
    tags: ["events", "daily", "rewards"],
    estimatedReadTime: "3 min",
    lastUpdated: LAST_UPDATED,
    summary:
      "Relay events reward consistency. Build a small daily routine and stop once the reward requirement is complete.",
    keyPoints: [
      "Check the daily objective first.",
      "Stack relay tasks with normal progression.",
      "Do not grind past the reward cap unless you enjoy it."
    ],
    sections: [
      {
        heading: "Daily routine",
        body:
          "Run the relay while doing content you already planned. The best event tasks are the ones that fit naturally into your existing loop."
      }
    ],
    relatedGuideIds: ["event-timeline", "resources-official-sites"]
  }),
  guide({
    id: "event-timeline",
    title: "Event Timeline Planning",
    category: "Events",
    subcategory: "Planning",
    difficulty: "Intermediate",
    region: "General",
    description: "How to decide which events deserve your time before they expire.",
    icon: "TIME",
    tags: ["events", "timeline", "planning"],
    estimatedReadTime: "5 min",
    lastUpdated: LAST_UPDATED,
    summary:
      "Event planning is about matching limited time to high-value rewards. Prioritize expiration dates, account-wide rewards, and upgrade materials.",
    keyPoints: [
      "Sort rewards by expiration and account value.",
      "Do daily caps first.",
      "Skip low-value tasks when your time is limited."
    ],
    sections: [
      {
        heading: "Reward priority",
        body:
          "Account-wide rewards and upgrade materials usually deserve attention first. Cosmetic rewards are great, but they should not block power goals unless you value them most."
      },
      {
        heading: "Avoid burnout",
        body:
          "Events are meant to add momentum, not create homework. Pick a realistic daily checklist and keep it short."
      }
    ],
    relatedGuideIds: ["burning-world", "maple-relay", "beginner-essentials"]
  }),
  guide({
    id: "resources-official-sites",
    title: "Official MapleStory Links",
    category: "Resources",
    subcategory: "Useful Links",
    difficulty: "Beginner",
    region: "General",
    description: "A clean list of official sources players should check before relying on rumors.",
    icon: "LINK",
    tags: ["resources", "official", "links"],
    estimatedReadTime: "2 min",
    lastUpdated: LAST_UPDATED,
    summary:
      "Official sources are best for announcements, maintenance, terms, and event rules. Use community tools for interpretation, but verify dates from official pages.",
    keyPoints: [
      "Check official posts for event dates.",
      "Use official pages for rules and account safety.",
      "Use community resources as helpers, not final authority."
    ],
    sections: [
      {
        heading: "When to use official links",
        body:
          "Use official sources when dates, restrictions, maintenance, or reward eligibility matter. Those details can change between regions."
      }
    ],
    relatedGuideIds: ["event-timeline", "resources-tools"],
    externalLinks: [
      { label: "MapleStory Official Site", url: "https://www.nexon.com/maplestory/", type: "Official" }
    ],
    featured: true
  }),
  guide({
    id: "resources-wiki",
    title: "Wiki and Reference Sites",
    category: "Resources",
    subcategory: "Reference",
    difficulty: "Beginner",
    region: "General",
    description: "How to use wiki-style references without getting misled by outdated details.",
    icon: "WIKI",
    tags: ["resources", "wiki", "reference"],
    estimatedReadTime: "3 min",
    lastUpdated: LAST_UPDATED,
    summary:
      "Wiki references are useful for item names, quest chains, and historical context, but you should always check region and update date.",
    keyPoints: [
      "Confirm region before following a guide.",
      "Check the update date.",
      "Use multiple sources for important decisions."
    ],
    sections: [
      {
        heading: "How to verify",
        body:
          "If a page mentions old systems or removed rewards, treat it as historical. Cross-check with current patch notes and official event pages."
      }
    ],
    relatedGuideIds: ["resources-official-sites", "resources-tools"],
    externalLinks: [
      { label: "MapleWiki", url: "https://maplestorywiki.net/", type: "Wiki" },
      { label: "MapleStory.io", url: "https://maplestory.io/", type: "Tool" }
    ]
  }),
  guide({
    id: "resources-tools",
    title: "Calculators and Planning Tools",
    category: "Resources",
    subcategory: "Tools",
    difficulty: "Intermediate",
    region: "General",
    description: "When calculators help and when they make progression feel harder than it is.",
    icon: "TOOL",
    tags: ["resources", "tools", "calculators"],
    estimatedReadTime: "4 min",
    lastUpdated: LAST_UPDATED,
    summary:
      "Calculators are best for budgets, upgrade odds, and comparing routes. They should guide decisions, not replace playing the game.",
    keyPoints: [
      "Use tools before expensive upgrades.",
      "Do not optimize every small decision.",
      "Record assumptions so you understand the result."
    ],
    sections: [
      {
        heading: "Best use cases",
        body:
          "Use calculators before Star Force pushes, cubing sessions, or long-term goal planning. For small upgrades, simple rules are usually enough."
      }
    ],
    relatedGuideIds: ["star-force", "potential", "resources-wiki"],
    externalLinks: [
      { label: "MapleStory.io", url: "https://maplestory.io/", type: "Tool" }
    ]
  }),
  guide({
    id: "content-creators",
    title: "Maple Content Creators",
    category: "Resources",
    subcategory: "Community",
    difficulty: "Beginner",
    region: "General",
    description: "How to use videos and creator guides without copying someone else's account plan.",
    icon: "VID",
    tags: ["resources", "creators", "video"],
    estimatedReadTime: "3 min",
    lastUpdated: LAST_UPDATED,
    summary:
      "Creators are great for seeing real gameplay, but every account has different resources. Use videos as examples, then adapt the advice.",
    keyPoints: [
      "Watch current patch content when possible.",
      "Separate entertainment from account advice.",
      "Adapt recommendations to your world, gear, and budget."
    ],
    sections: [
      {
        heading: "How to evaluate advice",
        body:
          "Ask what assumptions the creator has: funding, server, class, event timing, and account age. Advice that works for one account may be too expensive for another."
      }
    ],
    relatedGuideIds: ["resources-official-sites", "class-overview"],
    externalLinks: [
      { label: "SNAILSLAYER YouTube", url: "https://www.youtube.com/@snailslayermain", type: "Video" }
    ]
  }),
  guide({
    id: "faq",
    title: "Maple Library FAQ",
    category: "Resources",
    subcategory: "FAQ",
    difficulty: "Beginner",
    region: "General",
    description: "Quick answers to common guide, resource, and progression questions.",
    icon: "FAQ",
    tags: ["faq", "resources", "beginner"],
    estimatedReadTime: "4 min",
    lastUpdated: LAST_UPDATED,
    summary:
      "This FAQ helps players decide which guide to open next and how to use the Library without overthinking every system.",
    keyPoints: [
      "Beginners should start with First Day Checklist.",
      "Gear questions belong in Equipment guides.",
      "Boss questions usually start with pre-quests and status effects.",
      "External links are credited and marked by type."
    ],
    sections: [
      {
        heading: "Where should I start?",
        body:
          "If you are new or returning, start with First Day Checklist, then Progression Roadmap, then Class Overview."
      },
      {
        heading: "Is this official information?",
        body:
          "The guide explanations are original. Official links are marked as official, while wiki, tool, community, and video links are third-party references."
      }
    ],
    relatedGuideIds: ["beginner-essentials", "progression-overview", "resources-official-sites"]
  })
];
