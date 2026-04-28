/**
 * libraryGuides.ts — Maple Library guide catalogue.
 *
 * Original content authored for this project. Inspired by the information
 * architecture of community wikis (Content / Classes / Events / Resources)
 * but written from scratch — no copied text or structure.
 *
 * External references in `externalLinks` are credited inline. Third-party
 * sources are tagged so the detail view can render a disclaimer.
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

export type LibraryGuide = {
  id: string;
  title: string;
  category: LibraryCategory;
  subcategory?: string;
  difficulty: LibraryDifficulty;
  region: LibraryRegion;
  description: string;
  heroImage?: string;
  /** Backward-compatible alias for older cards/tests. Prefer heroImage. */
  image?: string;
  /** Single-character glyph used as a visual fallback when no image is set. */
  icon?: string;
  tags: string[];
  estimatedReadTime: string;
  /** ISO date string (YYYY-MM-DD). */
  lastUpdated: string;
  summary: string;
  /** Backward-compatible plain body. Prefer sections. */
  body?: string;
  keyPoints: string[];
  sections: LibraryGuideSection[];
  relatedGuideIds: string[];
  /** Backward-compatible alias. Prefer relatedGuideIds. */
  relatedIds?: string[];
  externalLinks?: LibraryExternalLink[];
  /** Backward-compatible alias. Prefer externalLinks. */
  sourceLinks?: LegacyLibrarySourceLink[];
  audience?: string;
  recommendedLevel?: string;
  featured?: boolean;
};

export type LibraryCategoryDefinition = {
  key: LibraryCategory | "All";
  label: string;
  description: string;
  icon: string;
};

export const libraryCategories: LibraryCategoryDefinition[] = [
  { key: "All",       label: "All Guides", description: "Everything in the library.",                               icon: "📚" },
  { key: "Beginner",  label: "Beginner",   description: "First-time-player essentials and quick wins.",             icon: "🌱" },
  { key: "Content",   label: "Content",    description: "Progression, dailies, and end-game pacing.",               icon: "🗺" },
  { key: "Classes",   label: "Classes",    description: "Class identity, link skills, and stat terms.",             icon: "⚔" },
  { key: "Equipment", label: "Equipment",  description: "Upgrading, Star Force, potential, and set effects.",      icon: "🛡" },
  { key: "Events",    label: "Events",     description: "Burning Worlds, relays, and event timeline tracking.",     icon: "🔥" },
  { key: "Resources", label: "Resources",  description: "Trusted external tools and reference sites.",              icon: "🌐" }
];

export const libraryDifficulties: LibraryDifficulty[] = ["Beginner", "Intermediate", "Advanced"];
export const libraryRegions: LibraryRegion[] = ["General", "GMS", "KMS"];

const LAST_UPDATED = "2026-04-26";

export const libraryGuides: LibraryGuide[] = [
  // ─── Beginner ────────────────────────────────────────────────────────────────
  {
    id: "beginner-essentials",
    title: "First-Time Player Essentials",
    category: "Beginner",
    subcategory: "Beginner Guide",
    difficulty: "Beginner",
    region: "General",
    description: "Your first 24 hours: what to do, what to skip, and what mistakes to avoid.",
    icon: "🌱",
    tags: ["beginner", "first-day", "essentials"],
    estimatedReadTime: "4 min",
    lastUpdated: LAST_UPDATED,
    audience: "Brand new players",
    summary:
      "MapleStory is friendly to newcomers but easy to get lost in. Stick to a short list of priorities for your first day and you will avoid 90% of new-player traps.",
    keyPoints: [
      "Don't spend mesos on permanent upgrades until level 100+.",
      "Main story line is the smoothest XP path until you know the systems.",
      "Maple Guide tasks are the highest-leverage early goals.",
      "Pick one goal at a time — bossing, training, or events — and finish it."
    ],
    sections: [
      {
        heading: "Hour 1: Pick a class and start",
        body: "Pick whatever class looks fun. You can re-make a character later — there is no need to optimise on day one. The starter island teaches movement and basic combat in about 20 minutes."
      },
      {
        heading: "Hours 2–4: Run the main story",
        body: "The main story line gives forgiving XP and walks you through every system you'll need. Resist the urge to grind side content at this stage; the story is faster and pays better.",
        tips: [
          "Tap through dialogue with the next button — full transcripts are stored in the quest log.",
          "Auto-move follows quest markers if you enable it in settings."
        ]
      },
      {
        heading: "Hours 5–10: Reach level 100",
        body: "Level 100 unlocks link skills, the Maple Guide rewards, and a tier of gear that's actually worth investing in. Ignore permanent upgrades before this point.",
        warnings: [
          "Do not scroll, flame, or cube any gear before level 100 — you will replace it shortly."
        ]
      },
      {
        heading: "Day 2 onward: Pick a single goal",
        body: "Decide whether you want to push bossing, level grinding, or event completion. Pick one and stick with it for a week. Players who try to do everything at once burn out fastest."
      }
    ],
    relatedGuideIds: ["progression-overview", "class-overview", "beginner-pitfalls"],
    featured: true
  },
  {
    id: "beginner-pitfalls",
    title: "Common Beginner Pitfalls",
    category: "Beginner",
    subcategory: "Beginner Guide",
    difficulty: "Beginner",
    region: "General",
    description: "The mistakes new players make that cost real time — and how to avoid each one.",
    icon: "⚠",
    tags: ["beginner", "pitfalls", "mistakes"],
    estimatedReadTime: "3 min",
    lastUpdated: LAST_UPDATED,
    summary:
      "A short list of the most common new-player mistakes, ranked roughly by how much time each one costs you across a season.",
    keyPoints: [
      "Don't scroll or cube temporary gear.",
      "Link skills before any other upgrade investment.",
      "Maple Guide is a free checklist — complete it.",
      "Check world reputation before settling on one."
    ],
    sections: [
      {
        heading: "Spending mesos on temporary gear",
        body: "Anything you'll replace within 30 levels isn't worth scrolling, flaming, or cubing. Save those upgrades for level-100+ gear that you actually plan to keep.",
        warnings: ["Cubing pre-100 gear is the single most expensive new-player mistake."]
      },
      {
        heading: "Ignoring link skills",
        body: "Link skills are the biggest free power gain available before level 200. If you haven't slotted any, that should be your immediate priority."
      },
      {
        heading: "Skipping the Maple Guide",
        body: "The Maple Guide is a massive checklist of free rewards: NX, mesos, equips, and unlock keys. Open it once a session and tick off everything you can."
      },
      {
        heading: "Joining the wrong world",
        body: "Some worlds have low population and stale economies. Check community reputation before committing — transferring later is painful and costs character bound items."
      }
    ],
    relatedGuideIds: ["beginner-essentials", "progression-overview"]
  },

  // ─── Content ─────────────────────────────────────────────────────────────────
  {
    id: "progression-overview",
    title: "Progression Roadmap",
    category: "Content",
    subcategory: "Progression Guide",
    difficulty: "Beginner",
    region: "General",
    description: "A milestone-by-milestone path from level 1 to your first major boss kill.",
    icon: "🗺",
    tags: ["progression", "roadmap", "milestones"],
    estimatedReadTime: "6 min",
    lastUpdated: LAST_UPDATED,
    recommendedLevel: "Levels 1+",
    audience: "Returning players and first-time mains",
    summary:
      "Progression in MapleStory rewards consistency over rushing. This roadmap groups your goals into bite-sized phases so you always know what to do next.",
    keyPoints: [
      "Avoid permanent upgrades before level 100 — your gear will be replaced.",
      "Link skills and the Maple Guide are the highest-leverage early goals.",
      "Star Force scales explosively; budget mesos before pushing past 17★.",
      "Pick one weekly goal at a time; spreading thin slows real progress."
    ],
    sections: [
      {
        heading: "Phase 1: Levels 1–100",
        body: "Focus on completing the main story line, claiming starter coupons, and learning your class identity. The XP curve is forgiving and you'll unlock gear and cosmetics along the way.",
        tips: [
          "Don't permanently upgrade anything in this phase.",
          "Maple Guide tasks pay better than side quests."
        ]
      },
      {
        heading: "Phase 2: Levels 100–200",
        body: "Slot link skills, finish remaining Maple Guide tasks, and run daily bosses you can comfortably solo. Equip a clean basic-tier set; stop here before chasing high-end items."
      },
      {
        heading: "Phase 3: Levels 200–235",
        body: "Funded characters take over here. Star Force progression, your first potential rerolls, and your first hard boss prequests all become priorities.",
        warnings: ["Star Force costs explode at 17★+. Budget your mesos before pushing past it."]
      },
      {
        heading: "Phase 4: End game",
        body: "Set effects, legion expansion, and weekly boss rotations dominate. Pick a single main goal each week and stick with it; spreading thin is the most common end-game stall."
      }
    ],
    relatedGuideIds: ["level-content-guide", "boss-prequests", "beginner-essentials"],
    externalLinks: [
      { label: "Official MapleStory News", url: "https://www.nexon.com/maplestory/news", type: "Official" }
    ],
    featured: true
  },
  {
    id: "level-content-guide",
    title: "Level-Banded Content Guide",
    category: "Content",
    subcategory: "Level Content Guide",
    difficulty: "Beginner",
    region: "General",
    description: "What to do at each level band: training maps, dailies, and unlock checkpoints.",
    icon: "📚",
    tags: ["leveling", "content", "dailies"],
    estimatedReadTime: "5 min",
    lastUpdated: LAST_UPDATED,
    recommendedLevel: "Levels 1–260",
    summary: "A quick-glance reference for the activities that pay best at each level band.",
    keyPoints: [
      "Theme dungeons are unlock-once, not grind targets.",
      "5th job advancement at 200 unlocks core kit — prioritise it.",
      "Arcane symbols and Authentic Force are weekly caps; never miss a week."
    ],
    sections: [
      {
        heading: "Levels 1–60: Main story",
        body: "Stick to the main story line. The XP curve is forgiving and you'll unlock cosmetic rewards. Side content can wait."
      },
      {
        heading: "Levels 60–140: Theme dungeons & Monster Park",
        body: "Theme dungeons unlock here. Run each one once for the unlock and the rewards — they aren't grind targets. Monster Park gives bonus XP runs once daily."
      },
      {
        heading: "Levels 140–200: Daily bosses & 5th job",
        body: "Daily bosses, Maple Tour, and 5th job advancement all become available. Most accounts spend the majority of their time in this band, so pace yourself."
      },
      {
        heading: "Levels 200+: Arcane River & Grandis",
        body: "Each region has its own progression with weekly symbol caps and authentic force gates. Complete one region fully before starting the next.",
        warnings: ["Symbols are weekly-capped — missing a week is missing a week of permanent stats."]
      }
    ],
    relatedGuideIds: ["progression-overview", "boss-prequests"]
  },
  {
    id: "boss-prequests",
    title: "Boss Pre-quest Reference",
    category: "Content",
    subcategory: "Boss Pre-quests",
    difficulty: "Intermediate",
    region: "General",
    description: "Which prequest chains unlock which bosses, and which ones to clear first.",
    icon: "🛡",
    tags: ["bosses", "quests", "endgame"],
    estimatedReadTime: "4 min",
    lastUpdated: LAST_UPDATED,
    recommendedLevel: "Level 160+",
    summary: "Most weekly bosses require a one-time prequest. Knowing which ones gate the boss saves real time on every new mule.",
    keyPoints: [
      "Gate-opening prequests must be cleared once per character.",
      "Lotus and Damien unlocks share part of the same chain — do them together.",
      "Verus Hilla is a hard gate; ensure you meet the level and item-level requirement first."
    ],
    sections: [
      {
        heading: "Gate-opening prequests",
        body: "Hard Hilla, Cygnus, Lotus, Damien, Lucid, Will, Verus Hilla, and Black Mage all require a one-time prequest before the boss is unlocked. Each takes 30–90 minutes solo."
      },
      {
        heading: "Reward-only prequests",
        body: "Pink Bean (mount), Cygnus (medal), and Lotus (familiar) have additional optional reward chains. These are worth chasing only once you can clear the boss reliably."
      },
      {
        heading: "Mule planning",
        body: "Keep a checklist. Every time you start a new mule, work through the gates in level order — the pattern is identical and gets quick once you've done it twice.",
        tips: ["Verus Hilla's gate requires a real item-level check, not just a level threshold."]
      }
    ],
    relatedGuideIds: ["progression-overview"]
  },
  {
    id: "keyboard-shortcuts",
    title: "Keyboard Shortcuts Reference",
    category: "Content",
    subcategory: "Keyboard Shortcuts",
    difficulty: "Beginner",
    region: "General",
    description: "Default keys, rebinding tips, and the shortcuts experienced players always change.",
    icon: "⌨",
    tags: ["shortcuts", "keybinds", "ui"],
    estimatedReadTime: "3 min",
    lastUpdated: LAST_UPDATED,
    summary: "MapleStory's defaults are not optimal. A handful of rebinds will save you hours over a season.",
    keyPoints: [
      "Rebind early — muscle memory locks in fast.",
      "Macros help with buffs but cost DPS on damage rotations.",
      "Use a side-mouse button for jump if you have one."
    ],
    sections: [
      {
        heading: "Defaults worth keeping",
        body: "Esc (system menu), Tab (cycle UI panels), and Enter (chat) are well-placed by default and don't need to move."
      },
      {
        heading: "Rebinds most veterans make",
        body: "Move skill keys close to the movement keys, place jump on a side-mouse button if your mouse has one, free up the function row for emote macros, and put potion keys on the home row of your off-hand.",
        tips: ["Test rebinds in a safe map before committing to muscle memory."]
      },
      {
        heading: "Macros: when to use them",
        body: "Combine buffs into a single macro for fast pre-pull setups. Avoid combining damage skills into a macro — it usually loses DPS because the macro can't chain animations as cleanly as manual presses.",
        warnings: ["Damage macros nearly always cost DPS. Use buff macros only."]
      }
    ],
    relatedGuideIds: ["abnormal-statuses"]
  },
  {
    id: "abnormal-statuses",
    title: "Abnormal Status Cheatsheet",
    category: "Content",
    subcategory: "Abnormal Statuses",
    difficulty: "Intermediate",
    region: "General",
    description: "Stuns, slows, seals, zombify, and how each class can resist or cleanse them.",
    icon: "⚠",
    tags: ["bosses", "mechanics", "cheatsheet"],
    estimatedReadTime: "4 min",
    lastUpdated: LAST_UPDATED,
    summary: "Most boss damage windows happen while you're stunned, sealed, or zombified. Knowing the icon and the cleanse saves a clear.",
    keyPoints: [
      "Heroes Will (or class equivalent) cleanses most disables on a long cooldown.",
      "Don't drink potions while zombified — it kills you.",
      "Each boss telegraphs the status with a unique icon; learn them once."
    ],
    sections: [
      {
        heading: "Stun",
        body: "Interrupts your attacks for a short window. Will's web inflicts repeated stun ticks if you stand on it. Bring Heroes Will or your class's equivalent.",
        warnings: ["Stunned during a boss's burst window can mean a one-shot."]
      },
      {
        heading: "Seal",
        body: "Blocks skill use entirely. Lucid phase 2 is the most common offender. Cleanse with Holy Symbol's reverse buff or your class's utility skill."
      },
      {
        heading: "Zombify",
        body: "Inverts your healing — pots and heals deal damage instead. Stop sipping potions until the icon clears.",
        warnings: ["Drinking potions while zombified is a common one-death-per-week mistake."]
      },
      {
        heading: "Reverse direction",
        body: "Lotus and Damien apply this; your inputs flip left/right. Push through it; the duration is short, but be careful near the edge of the platform."
      }
    ],
    relatedGuideIds: ["boss-prequests", "stat-terms"]
  },

  // ─── Classes ─────────────────────────────────────────────────────────────────
  {
    id: "class-overview",
    title: "Class Identity Overview",
    category: "Classes",
    subcategory: "Class Overview",
    difficulty: "Beginner",
    region: "General",
    description: "How to think about the five class archetypes when picking a main.",
    icon: "⚔",
    tags: ["classes", "archetypes", "main-choice"],
    estimatedReadTime: "5 min",
    lastUpdated: LAST_UPDATED,
    summary: "Pick a class for its mobility and rhythm, not its raw damage chart — DPS rankings shift every patch.",
    keyPoints: [
      "Mobility kit and animation rhythm matter more than DPS charts.",
      "Bossing and training maps reward different class strengths.",
      "Try a class for 30 levels before committing as your main."
    ],
    sections: [
      {
        heading: "The five archetypes",
        body: "MapleStory classes fall into five rough buckets: warriors (sustained melee), bowmen (ranged with pet/summon utility), magicians (burst and crowd-control), thieves (mobile DPS with positioning), and pirates (hybrid kits with strong identity)."
      },
      {
        heading: "Why DPS charts mislead",
        body: "Damage charts shift every patch. What stays fixed is each class's mobility kit, animation length, and rhythm. Watch a 10-minute boss-clear video before committing — if the rhythm feels right, you'll enjoy the grind."
      },
      {
        heading: "Bossing vs. training",
        body: "Some classes shine at bossing (high single-target burst and survivability). Others dominate training maps (large AoE and mobility). Decide what you actually want to do most before you commit."
      }
    ],
    relatedGuideIds: ["link-skills", "legion-basics"],
    featured: true
  },
  {
    id: "link-skills",
    title: "Link Skills Explained",
    category: "Classes",
    subcategory: "Link Skills",
    difficulty: "Intermediate",
    region: "General",
    description: "What link skills do, which ones to chase first, and how to plan your link mule order.",
    icon: "🔗",
    tags: ["link-skills", "legion", "mule"],
    estimatedReadTime: "5 min",
    lastUpdated: LAST_UPDATED,
    summary: "Link skills are passive bonuses shared between characters on the same world. Building a link-mule lineup is one of the highest-impact early goals.",
    keyPoints: [
      "Cygnus link skills are the fastest cumulative power gain on any account.",
      "Demon Slayer (boss damage) and Phantom (utility) are top-priority single links.",
      "You can only equip a fixed number of links — plan before you start."
    ],
    sections: [
      {
        heading: "What is a link skill?",
        body: "Each class has a unique link skill that you unlock by reaching certain levels. Once unlocked, you can attach the link to your main, where it acts as a permanent passive."
      },
      {
        heading: "Priority links to chase first",
        body: "Cygnus Knight links (every Cygnus class gives one), Demon Slayer (boss damage), Phantom (drop rate / meso), Kanna (mob density), and Hayato/Kanna burning bonus where available are the standard first targets."
      },
      {
        heading: "Cygnus order",
        body: "Each Cygnus class takes only a few hours and the cumulative %ATT is significant. Work through them in order, not all at once.",
        tips: ["Tag 'mega burning' onto a fresh Cygnus mule to get them done in a single weekend."]
      }
    ],
    relatedGuideIds: ["class-overview", "legion-basics", "mega-burning"]
  },
  {
    id: "attack-speed",
    title: "Attack Speed Tiers",
    category: "Classes",
    subcategory: "Attack Speed",
    difficulty: "Intermediate",
    region: "General",
    description: "How attack speed actually works, where the breakpoints are, and why faster isn't always better.",
    icon: "⚡",
    tags: ["attack-speed", "stats", "mechanics"],
    estimatedReadTime: "3 min",
    lastUpdated: LAST_UPDATED,
    summary: "Attack speed is bucketed into discrete tiers. Stacking past your tier cap is wasted stat.",
    keyPoints: [
      "Attack speed is tier-based — extra stat past the cap is wasted.",
      "Most classes target Faster (2) or Fast (3) at minimum.",
      "Decent Speed Infusion is one of the easiest tier gains available."
    ],
    sections: [
      {
        heading: "How tiers work",
        body: "Attack speed in MapleStory is tier-based, not linear. Each tier has a cap; reaching it requires a combination of weapon speed, decent buffs, inner ability, and class passives."
      },
      {
        heading: "Where to aim",
        body: "Most classes want to reach Faster (2) or Fast (3). Going past your effective tier provides zero benefit, so once you're capped, redirect those stats elsewhere.",
        warnings: ["Inner ability rolls for attack speed past your cap are wasted — confirm your cap before locking in."]
      },
      {
        heading: "Easiest tier gains",
        body: "Decent Speed Infusion (from Phantom legion at the right level) and Hyper Stat: Attack Speed both contribute one tier each at minimal opportunity cost."
      }
    ],
    relatedGuideIds: ["stat-terms", "link-skills"]
  },
  {
    id: "stat-terms",
    title: "Stat Terms Glossary",
    category: "Classes",
    subcategory: "Stat Terms",
    difficulty: "Intermediate",
    region: "General",
    description: "ATT, MATT, %ATT, %DMG, %BOSS, IED, crit, crit damage, and how they interact.",
    icon: "📊",
    tags: ["stats", "glossary", "terms"],
    estimatedReadTime: "5 min",
    lastUpdated: LAST_UPDATED,
    summary: "Stat acronyms in MapleStory have specific meanings. Mixing them up is the most common upgrade mistake.",
    keyPoints: [
      "%ATT and %DMG stack multiplicatively, not additively.",
      "IED is multiplicative; aim for ~90% effective on bossing builds.",
      "Crit chance caps at 100%; further investment goes into crit damage."
    ],
    sections: [
      {
        heading: "ATT vs MATT",
        body: "Physical Attack vs Magic Attack. Pick the one your class scales with; mixing them on gear is wasted."
      },
      {
        heading: "%ATT vs %DMG",
        body: "%ATT scales your weapon's base damage. %DMG is a final multiplier on outgoing damage. Both are valuable; %DMG is rarer and harder to roll."
      },
      {
        heading: "%BOSS",
        body: "Multiplier against bosses only. Every endgame build wants to push this stat high; some lines explicitly count toward 'effective %BOSS' that uncaps."
      },
      {
        heading: "IED (Ignore Enemy Defense)",
        body: "Bosses have stacked defense; IED is multiplicative against it. Cap is around 90–94% effective IED for most content. Going higher rarely pays off.",
        tips: ["Effective IED ≠ raw IED on your stat sheet. Use a community calculator to convert."]
      },
      {
        heading: "Crit and Crit Damage",
        body: "Crit chance has a hard cap at 100%. Once capped, additional investment goes into crit damage, which scales linearly past that point."
      }
    ],
    relatedGuideIds: ["attack-speed", "potential", "calculators"]
  },
  {
    id: "legion-basics",
    title: "Legion System Basics",
    category: "Classes",
    subcategory: "Legion Basics",
    difficulty: "Intermediate",
    region: "General",
    description: "How the legion grid works, which characters give the best stats, and how to plan placement.",
    icon: "♛",
    tags: ["legion", "mules", "passive"],
    estimatedReadTime: "5 min",
    lastUpdated: LAST_UPDATED,
    summary: "Legion is a passive board: each character you've levelled adds tiles and stats. Optimal placement matters.",
    keyPoints: [
      "Reach level 200 on as many characters as you can — the tiles scale dramatically.",
      "Placement on the legion board affects bonuses; don't drop tiles randomly.",
      "Legion coins are a daily income — never miss claiming them."
    ],
    sections: [
      {
        heading: "How tiles are earned",
        body: "Every character on your world that reaches level 60 / 100 / 140 / 200 / 250 contributes a legion tile. Higher levels grant larger tiles plus better aura bonuses."
      },
      {
        heading: "Placement strategy",
        body: "Place high-tier tiles around the centre, where multiplier zones live. Match attacker classes (warrior, bowman, etc.) to their bonus zone — the auras differ by class type.",
        tips: ["Rotate tiles to fit irregular shapes around multiplier squares before settling."]
      },
      {
        heading: "Legion coins",
        body: "Coins are earned per character daily. Spend them on permanent stat lines or grindstones (used for inner ability rerolls). Both options pay off long-term.",
        warnings: ["Coins do not stockpile forever — they soft-cap. Spend them weekly."]
      }
    ],
    relatedGuideIds: ["link-skills", "class-overview"]
  },

  // ─── Equipment ───────────────────────────────────────────────────────────────
  {
    id: "upgrading-equipment",
    title: "Upgrading & Enhancing Equipment",
    category: "Equipment",
    subcategory: "Upgrading & Enhancing Equipment",
    difficulty: "Intermediate",
    region: "General",
    description: "Scrolls, flames, potential, and the order to upgrade in for each tier of gear.",
    icon: "🔨",
    tags: ["equipment", "scrolls", "flames"],
    estimatedReadTime: "5 min",
    lastUpdated: LAST_UPDATED,
    summary: "Equipment progression is a stack: scroll first, flame second, potential third, Star Force last. Skipping the order wastes mesos.",
    keyPoints: [
      "Scroll → Flame → Potential → Star Force is the canonical upgrade order.",
      "Don't cube temporary gear or items you'll replace within 20 levels.",
      "Weapon, secondary, emblem, and hat are the priority Legendary slots."
    ],
    sections: [
      {
        heading: "Step 1: Scrolls",
        body: "Use whichever scrolls your gear is rated for. Don't scroll temporary gear — the boost won't transfer when you replace the item."
      },
      {
        heading: "Step 2: Flames",
        body: "Apply Powerful or Eternal Flames depending on item level. Reroll until you hit the stats your class scales with (main stat, %ATT, %BOSS).",
        tips: ["Use cheaper flames for transient gear; save Eternals for items you keep long-term."]
      },
      {
        heading: "Step 3: Potential",
        body: "Cube to Legendary on weapon, secondary, emblem, and hat first. Other slots can stay Epic until later."
      },
      {
        heading: "Step 4: Star Force",
        body: "Treated separately — see the Star Force guide. Always do scrolling and flames first; otherwise the Star Force investment carries over only partially when you swap items."
      }
    ],
    relatedGuideIds: ["star-force", "potential", "set-effects"]
  },
  {
    id: "star-force",
    title: "Star Force Guide",
    category: "Equipment",
    subcategory: "Star Force",
    difficulty: "Intermediate",
    region: "General",
    description: "Star catching, safeguard, the chance-time event, and which stars are worth pushing past.",
    icon: "⭐",
    tags: ["star-force", "enhancement", "events"],
    estimatedReadTime: "5 min",
    lastUpdated: LAST_UPDATED,
    summary: "Star Force adds flat stats per star. Costs explode at 17★; plan your budget before you start.",
    keyPoints: [
      "Star catching saves real money — practise the timing.",
      "Use Safeguard at 15★ and 16★; the cost is worth it.",
      "Reserve 17★+ pushes for major events; never blind-push at full price."
    ],
    sections: [
      {
        heading: "0★–15★: The cheap range",
        body: "0★–10★ is cheap and fast. 10★–15★ is moderate cost. Star catching reduces failures; learn the timing on a piece you don't care about first."
      },
      {
        heading: "15★–17★: The investment range",
        body: "Expensive but high impact. Use Safeguard at 15★ and 16★ to prevent destruction. The cost is worth it — replacing destroyed end-game gear is far worse.",
        warnings: ["Never push 15★ → 16★ without Safeguard. Destruction at this tier is catastrophic."]
      },
      {
        heading: "17★–22★: The end-game push",
        body: "Wait for 5/10/15 sales and the Star Catch event before pushing here. Shining Star Force and 1+1 events cut effective cost roughly in half.",
        tips: ["Stockpile mesos pre-event. The cheapest stars on the calendar are during major Maple events."]
      }
    ],
    relatedGuideIds: ["upgrading-equipment", "potential"]
  },
  {
    id: "potential",
    title: "Potential & Cubing",
    category: "Equipment",
    subcategory: "Potential",
    difficulty: "Advanced",
    region: "General",
    description: "Tiers, prime lines, bonus potential, and cubing strategies that don't bankrupt you.",
    icon: "🎲",
    tags: ["potential", "cubing", "endgame"],
    estimatedReadTime: "5 min",
    lastUpdated: LAST_UPDATED,
    summary: "Potential lines scale your gear's main stats. Reach Legendary on key slots before chasing prime triple-line rolls.",
    keyPoints: [
      "Hit Legendary tier first; chase prime triple-line later.",
      "Black Cubes only on the four core slots.",
      "Bonus Potential is a separate pool with its own line goals."
    ],
    sections: [
      {
        heading: "Tier ladder",
        body: "Potential has tiers: Rare → Epic → Unique → Legendary. Each tier unlocks better lines. Get to Legendary before optimising line rolls."
      },
      {
        heading: "Prime lines",
        body: "The 'good' lines depend on your class: %ATT or %MATT, %BOSS, IED, %crit damage, and skill-line skip. A prime triple-line drop on a core slot is worth millions of mesos."
      },
      {
        heading: "Black vs Red Cubes",
        body: "Use Black Cubes on the slots that matter most: weapon, secondary, emblem, and hat. Use Red Cubes elsewhere. The cost difference is real and matters at scale.",
        tips: ["Save Black Cubes for double-Legendary tier-up attempts on core slots."]
      },
      {
        heading: "Bonus Potential",
        body: "A separate pool from main potential. Aim for %ATT and %BOSS bonus lines first. Bonus Potential tier-ups are cheaper than main."
      }
    ],
    relatedGuideIds: ["upgrading-equipment", "star-force", "stat-terms"]
  },
  {
    id: "set-effects",
    title: "Set Effects Reference",
    category: "Equipment",
    subcategory: "Set Effects",
    difficulty: "Intermediate",
    region: "General",
    description: "How set bonuses stack, which sets are worth completing, and when to swap.",
    icon: "🛡",
    tags: ["set-effects", "armor", "endgame"],
    estimatedReadTime: "4 min",
    lastUpdated: LAST_UPDATED,
    summary: "Sets give cumulative bonuses at 2/3/4/5/7-piece. Aim for the highest tier your level allows and complete it before partial-mixing.",
    keyPoints: [
      "Completing a higher-tier set beats partial-bonus mixing.",
      "Boss accessory sets are a separate, independent stack.",
      "Don't replace pieces mid-set unless the new piece is a clear net gain."
    ],
    sections: [
      {
        heading: "End-game armor sets",
        body: "Common end-game sets: Absolab (lvl 160), Arcane Umbra (lvl 200), Eternal (lvl 250). Each unlocks at the level threshold."
      },
      {
        heading: "Mixing sets during transition",
        body: "Mixing sets is fine while transitioning, but completing a higher tier outweighs partial bonuses from a lower tier. Plan your transition so you don't sit on a half-completed set for months."
      },
      {
        heading: "Boss accessory sets",
        body: "Princess No, Lotus eye, Magnus eye, etc. are not part of armor sets but each have their own set bonuses and should be collected over time. They stack independently of your armor set.",
        tips: ["Collect boss accessories on your main first; they're hardest to replace."]
      }
    ],
    relatedGuideIds: ["upgrading-equipment", "potential"]
  },
  {
    id: "shared-cash-shop",
    title: "Shared Cash Shop Inventories",
    category: "Equipment",
    subcategory: "Shared Cash Shop Inventories",
    difficulty: "Beginner",
    region: "General",
    description: "How character / account / merchant inventories differ, and what each can hold.",
    icon: "🛍",
    tags: ["cash-shop", "inventory", "storage"],
    estimatedReadTime: "3 min",
    lastUpdated: LAST_UPDATED,
    summary: "Cash items live in three different storage pools. Knowing which is which prevents accidental losses.",
    keyPoints: [
      "Account tab transfers are usually one-way — confirm before moving.",
      "Some limited / gifted items cannot be transferred at all.",
      "Use storage for permanent cosmetics; character tab for active gear."
    ],
    sections: [
      {
        heading: "Character Tab",
        body: "Items only that character can use. Tax-free transfers within the same character. The default tab when you open the cash inventory."
      },
      {
        heading: "Account Tab",
        body: "Items shared between all characters on the same world. Most cash items can be moved here once. Useful for shared cosmetics and pets you want to swap between characters.",
        warnings: ["Account-tab moves are usually one-way — read the confirmation dialog before clicking."]
      },
      {
        heading: "Storage Tab (cash)",
        body: "Long-term holding. Use for permanent cosmetics you swap between characters. Gifted and limited items often have transfer restrictions; check the item description before moving anything important."
      }
    ],
    relatedGuideIds: ["upgrading-equipment"]
  },

  // ─── Events ──────────────────────────────────────────────────────────────────
  {
    id: "burning-world",
    title: "Burning World",
    category: "Events",
    subcategory: "Burning World",
    difficulty: "Beginner",
    region: "General",
    description: "What a Burning World is, who it's for, and which rewards to claim before the timer runs out.",
    icon: "🔥",
    tags: ["events", "burning-world", "bonus-levels"],
    estimatedReadTime: "4 min",
    lastUpdated: LAST_UPDATED,
    summary: "Burning Worlds spawn fresh — characters created on them gain bonus levels and event-only rewards.",
    keyPoints: [
      "Bonus levels stack with normal XP — you'll out-level the curve fast.",
      "World ends with a forced transfer; plan your destination world.",
      "Event-only rewards are usually the main draw, not the bonus levels."
    ],
    sections: [
      {
        heading: "What it is",
        body: "A Burning World is a brand-new server that runs for a limited time (usually 6–12 months). Characters created there gain bonus levels per level-up and earn exclusive event currency."
      },
      {
        heading: "Who it's for",
        body: "Returning players, players who want a clean slate, and anyone trying a new class without dragging legacy clutter. Brand new players also benefit because the economy starts fresh."
      },
      {
        heading: "End-of-world transfer",
        body: "When the world ends, your characters transfer to a permanent server with rewards intact. Plan your destination before transfer day — some worlds are noticeably healthier than others.",
        warnings: ["Transfer is forced. Delaying the choice doesn't help; you get assigned a world if you don't pick one."]
      }
    ],
    relatedGuideIds: ["tera-burning", "mega-burning", "event-timeline"]
  },
  {
    id: "tera-burning",
    title: "Tera Burning",
    category: "Events",
    subcategory: "Tera Burning",
    difficulty: "Beginner",
    region: "General",
    description: "How Tera Burning works, eligible classes, and the level cap on the bonus levels.",
    icon: "🔥",
    tags: ["events", "tera-burning", "bonus-levels"],
    estimatedReadTime: "3 min",
    lastUpdated: LAST_UPDATED,
    summary: "Tera Burning gives +2 bonus levels per natural level-up, capping out around level 150.",
    keyPoints: [
      "+2 bonus levels per natural level-up; ends around level 150.",
      "One Tera Burning slot per account per event in most cases.",
      "Check the eligible-class list before choosing — some classes are excluded."
    ],
    sections: [
      {
        heading: "How it works",
        body: "Each natural level-up grants +2 bonus levels, dropping you near level 150 in well under a week of casual play."
      },
      {
        heading: "Eligibility",
        body: "Usually requires you to pick one eligible class per event. Not all classes are eligible — read the announcement before committing. Mistakes here cost you the slot for the rest of the event.",
        warnings: ["Tera Burning slot decisions are permanent for the event. Confirm before clicking."]
      }
    ],
    relatedGuideIds: ["burning-world", "mega-burning"]
  },
  {
    id: "mega-burning",
    title: "Mega Burning",
    category: "Events",
    subcategory: "Mega Burning",
    difficulty: "Beginner",
    region: "General",
    description: "Mega Burning specifics: bonus rate, cap, and how it pairs with link mules.",
    icon: "🔥",
    tags: ["events", "mega-burning", "mules"],
    estimatedReadTime: "3 min",
    lastUpdated: LAST_UPDATED,
    summary: "Mega Burning is a lighter burning modifier ideal for link mules — +1 bonus level per level-up to a lower cap.",
    keyPoints: [
      "+1 bonus level per natural level-up.",
      "Best paired with link mules — you don't need them past their link-skill threshold.",
      "Multiple slots usually available; spread them across new mules."
    ],
    sections: [
      {
        heading: "How it works",
        body: "Mega Burning grants +1 bonus level per natural level-up, capping out earlier than Tera Burning. Multiple Mega Burning slots are usually available per account per event — read the patch notes."
      },
      {
        heading: "Best pairing: link mules",
        body: "You want the link skill at level 70/120/etc., not necessarily level 200, so the lighter burn is enough. Stack Mega Burning on a Cygnus mule to finish a link in a single weekend.",
        tips: ["Pair Mega Burning with the relay event of the season for compound rewards."]
      }
    ],
    relatedGuideIds: ["tera-burning", "burning-world", "link-skills"]
  },
  {
    id: "maple-relay",
    title: "Maple Relay",
    category: "Events",
    subcategory: "Maple Relay",
    difficulty: "Beginner",
    region: "General",
    description: "The recurring milestone-and-reward event format and how to plan your relay schedule.",
    icon: "🏃",
    tags: ["events", "relay", "dailies"],
    estimatedReadTime: "3 min",
    lastUpdated: LAST_UPDATED,
    summary: "Maple Relay events award milestone rewards across multiple characters — split tasks evenly, don't overload one main.",
    keyPoints: [
      "Spread completions across many characters — don't focus on one main.",
      "Some relays cap rewards at a fixed character count; check the chart first.",
      "Daily tasks reset at server reset; plan your weekly relay route."
    ],
    sections: [
      {
        heading: "How relays work",
        body: "Maple Relay events run in waves: complete a set of tasks on a character to earn a milestone tier, then 'pass the baton' to the next character. Daily tasks usually include monster kills, quest completions, and a bossing target."
      },
      {
        heading: "Reward structure",
        body: "Reward structure usually scales with how many characters reach the milestone, not how high one character climbs. Spread completions instead of pushing one main.",
        tips: ["Plan a 'relay route' — the order you'll cycle through your characters daily — before the event starts."]
      }
    ],
    relatedGuideIds: ["event-timeline", "burning-world"]
  },
  {
    id: "event-timeline",
    title: "Event Timeline Tracking",
    category: "Events",
    subcategory: "Event Timeline",
    difficulty: "Beginner",
    region: "General",
    description: "How to track event start/end times, double up overlapping events, and not miss limited rewards.",
    icon: "📅",
    tags: ["events", "timeline", "schedule"],
    estimatedReadTime: "4 min",
    lastUpdated: LAST_UPDATED,
    summary: "Most events overlap. The right calendar habit triples your effective rewards over a season.",
    keyPoints: [
      "Patch notes are the source of truth — read them once on day one.",
      "Set end-date reminders; events end at server reset, not midnight.",
      "Look for overlapping events for compound rewards."
    ],
    sections: [
      {
        heading: "Habit 1: Read the patch notes once",
        body: "Pin the patch notes at event start — they list every event, its dates, and its rewards. Skim them once and bookmark the meaty ones."
      },
      {
        heading: "Habit 2: Track end dates",
        body: "Build a checklist with end dates. Most events end on a Wednesday or Sunday with reset; missing it by an hour is the most common 'I forgot' loss.",
        warnings: ["Events end at server reset (in your region's time zone), not at midnight. Check carefully."]
      },
      {
        heading: "Habit 3: Pair overlapping events",
        body: "Burning + Maple Relay + a coupon event running simultaneously is the most efficient use of play time. Plan the overlap window the day after notes drop."
      }
    ],
    relatedGuideIds: ["maple-relay", "burning-world"]
  },

  // ─── Resources ───────────────────────────────────────────────────────────────
  {
    id: "official-site",
    title: "Official MapleStory Site",
    category: "Resources",
    subcategory: "Official MapleStory Site",
    difficulty: "Beginner",
    region: "GMS",
    description: "Patch notes, maintenance schedules, and official cash-shop announcements.",
    icon: "🌐",
    tags: ["official", "patch-notes", "reference"],
    estimatedReadTime: "2 min",
    lastUpdated: LAST_UPDATED,
    summary: "The official MapleStory site is the authoritative source for patch notes and event schedules.",
    keyPoints: [
      "Authoritative source for patch notes and dates.",
      "Cash shop schedules typically appear ahead of in-game listings.",
      "Maintenance windows are announced here first."
    ],
    sections: [
      {
        heading: "Why it's the source of truth",
        body: "Bookmark the official news page. Every patch, every event, every emergency maintenance announcement lands there first. Community sites lag by hours or days."
      },
      {
        heading: "Cash shop schedule",
        body: "The official cash shop schedule is also published here, often a week ahead of in-game listings. Useful for budgeting upcoming sales."
      }
    ],
    relatedGuideIds: ["maplestory-wiki", "event-timeline"],
    externalLinks: [
      { label: "MapleStory Official News", url: "https://www.nexon.com/maplestory/news", type: "Official" }
    ]
  },
  {
    id: "maplestory-wiki",
    title: "MapleStory Wiki",
    category: "Resources",
    subcategory: "MapleStory Wiki",
    difficulty: "Beginner",
    region: "General",
    description: "Community-maintained reference for items, monsters, maps, and class skills.",
    icon: "📖",
    tags: ["wiki", "reference", "community"],
    estimatedReadTime: "2 min",
    lastUpdated: LAST_UPDATED,
    summary: "The community wiki fills in gaps the official site doesn't — item drops, monster locations, skill data.",
    keyPoints: [
      "Strongest for drop tables, monster locations, and historical info.",
      "Cross-check recent-patch info against official notes.",
      "Skill descriptions on the wiki are usually more readable than in-game."
    ],
    sections: [
      {
        heading: "Strengths",
        body: "Thorough item drop tables, monster spawn locations, deep skill data, historical patch notes. Best community reference for content that has been live a while."
      },
      {
        heading: "Weaknesses",
        body: "Occasional outdated pages, especially around recent patches. Cross-check with official patch notes if a fact looks suspicious. The wiki is a great secondary reference; don't treat it as a primary source for current content.",
        warnings: ["Wiki edits lag patches by days. Verify current-patch claims against the official site."]
      }
    ],
    relatedGuideIds: ["official-site", "maplestory-io"],
    externalLinks: [
      { label: "MapleStory Wiki", url: "https://maplestory.fandom.com/wiki/MapleStory_Wiki", type: "Wiki" }
    ]
  },
  {
    id: "maplestory-io",
    title: "MapleStory.io",
    category: "Resources",
    subcategory: "MapleStory.io",
    difficulty: "Beginner",
    region: "General",
    description: "Sprite and item visualisation tool — render any in-game equip on any class for previews.",
    icon: "🖼",
    tags: ["tool", "visualisation", "cosmetic"],
    estimatedReadTime: "2 min",
    lastUpdated: LAST_UPDATED,
    summary: "Visualise outfits, weapons, and effects without buying or equipping anything in-game.",
    keyPoints: [
      "Render any equip on any class without spending mesos.",
      "Useful for outfit planning and screenshot composition.",
      "Recent items may lag a few patches behind real game data."
    ],
    sections: [
      {
        heading: "What it does",
        body: "MapleStory.io scrapes game assets and renders them in a browser. Great for cosmetic planning, item previews, and screenshots."
      },
      {
        heading: "Caveats",
        body: "Not affiliated with Nexon. Asset accuracy is excellent for older items; very recent additions may lag a few patches behind. Treat it as a preview, not an official source."
      }
    ],
    relatedGuideIds: ["maplestory-wiki", "calculators"],
    externalLinks: [
      { label: "MapleStory.io", url: "https://maplestory.io", type: "Tool" }
    ]
  },
  {
    id: "community-discords",
    title: "Community Discords",
    category: "Resources",
    subcategory: "Community Discords",
    difficulty: "Beginner",
    region: "General",
    description: "Where to find class-specific Discords, world-specific Discords, and bossing teams.",
    icon: "💬",
    tags: ["community", "discord", "social"],
    estimatedReadTime: "2 min",
    lastUpdated: LAST_UPDATED,
    summary: "Discord is where MapleStory's most useful real-time advice lives — every class and most worlds have a hub.",
    keyPoints: [
      "Class Discords have pinned guides — read them first.",
      "World Discords are great for bossing parties and price checks.",
      "Always check pinned channels before asking — most beginner Qs are answered there."
    ],
    sections: [
      {
        heading: "Class Discords",
        body: "Each major class has a community Discord with pinned guides, Q&A channels, and active theorycrafters. They're the fastest place to ask a real player a real question."
      },
      {
        heading: "World Discords",
        body: "Useful for finding bossing parties, market price checks, and event coordination. Usually invite-linked from your world's subreddit or community hub."
      },
      {
        heading: "Etiquette",
        body: "Read the pins before asking; most class discords have a 'first 100 hours' channel that answers most beginner questions. People are friendlier when you've shown you read first.",
        tips: ["Search the channel before posting — your question has been asked before."]
      }
    ],
    relatedGuideIds: ["calculators", "official-site"]
  },
  {
    id: "calculators",
    title: "Calculators & Planners",
    category: "Resources",
    subcategory: "Calculators",
    difficulty: "Intermediate",
    region: "General",
    description: "Star Force cost calculators, cubing simulators, legion planners, and damage calculators.",
    icon: "🧮",
    tags: ["calculators", "tools", "planning"],
    estimatedReadTime: "3 min",
    lastUpdated: LAST_UPDATED,
    summary: "A handful of community-made calculators turn 'should I cube' into a quantitative answer.",
    keyPoints: [
      "Star Force calculators turn budget questions into numbers.",
      "Cubing sims show real probability distributions, not gambler's-fallacy averages.",
      "Damage calculators are estimates, not exact — treat them as ballparks."
    ],
    sections: [
      {
        heading: "Star Force calculators",
        body: "Model expected mesos to push from N★ to M★. They factor in destruction, Safeguard, and event modifiers. Plug in your numbers before you commit a big push."
      },
      {
        heading: "Cubing simulators",
        body: "Show probability distributions for prime lines. Useful for setting realistic expectations on triple-line attempts and budgeting your cube spend.",
        warnings: ["Simulators show statistics, not your actual luck. The variance can hurt."]
      },
      {
        heading: "Damage and legion planners",
        body: "Damage calculators are helpful but rarely match in-game numbers exactly — class passives and edge cases are hard to model. Use them for relative comparisons (option A vs option B), not absolute predictions. Legion planners optimise tile placement on the legion grid; they're worth running once a season."
      }
    ],
    relatedGuideIds: ["star-force", "potential", "stat-terms"]
  }
];

export function getLibraryGuides(): LibraryGuide[] {
  return libraryGuides;
}
