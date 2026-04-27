/**
 * libraryGuides.ts — Maple Library guide catalogue.
 *
 * Original content authored for this project. Inspired by the information
 * architecture of community wikis (Content / Classes / Events / Resources)
 * but written from scratch — no copied text or structure.
 *
 * External references in `sourceLinks` are credited inline and shown with a
 * third-party disclaimer in the guide detail view.
 */

export type LibraryCategoryKey =
  | "content"
  | "classes"
  | "equipment"
  | "events"
  | "resources"
  | "beginner";

export type LibraryDifficulty = "Beginner" | "Intermediate" | "Advanced";
export type LibraryRegion = "GMS" | "KMS" | "General";

export type LibrarySourceLink = {
  label: string;
  href: string;
  /** Set true for non-official / community sources. Renders a disclaimer. */
  thirdParty?: boolean;
};

export type LibraryGuide = {
  id: string;
  title: string;
  category: LibraryCategoryKey;
  /** Short tag shown in the card header (e.g. "Progression", "Stat Terms"). */
  subcategory: string;
  description: string;
  /** Multi-paragraph long-form body, separated by blank lines. */
  body: string;
  /** Bulleted "key points" rendered prominently. */
  keyPoints: string[];
  /** Plain-text quick summary shown above the body. */
  summary: string;
  difficulty: LibraryDifficulty;
  region: LibraryRegion;
  tags: string[];
  /** Single-character glyph used as a fallback when no image is provided. */
  icon: string;
  image?: string;
  /** ISO date string. */
  lastUpdated: string;
  recommendedLevel?: string;
  audience?: string;
  /** IDs of related guides shown at the bottom of the detail view. */
  relatedIds?: string[];
  sourceLinks?: LibrarySourceLink[];
  featured?: boolean;
};

export type LibraryCategoryDefinition = {
  key: LibraryCategoryKey | "all";
  label: string;
  description: string;
};

export const libraryCategories: LibraryCategoryDefinition[] = [
  { key: "all", label: "All Guides", description: "Everything in the library." },
  { key: "content", label: "Content", description: "Progression, dailies, and end-game pacing." },
  { key: "classes", label: "Classes", description: "Class identity, link skills, and stat terms." },
  { key: "equipment", label: "Equipment", description: "Upgrading, Star Force, potential, and set effects." },
  { key: "events", label: "Events", description: "Burning Worlds, relays, and timeline tracking." },
  { key: "resources", label: "Resources", description: "Trusted external tools and reference sites." },
  { key: "beginner", label: "Beginner", description: "First-time-player essentials and quick wins." }
];

export const libraryDifficulties: LibraryDifficulty[] = ["Beginner", "Intermediate", "Advanced"];
export const libraryRegions: LibraryRegion[] = ["General", "GMS", "KMS"];

const LAST_UPDATED = "2026-04-26";

export const libraryGuides: LibraryGuide[] = [
  // ─── Content ─────────────────────────────────────────────────────────────────
  {
    id: "progression-overview",
    title: "Progression Roadmap",
    category: "content",
    subcategory: "Progression Guide",
    description: "A milestone-by-milestone path from level 1 to your first major boss kill.",
    summary:
      "Progression in MapleStory rewards consistency over rushing. This roadmap groups your goals into bite-sized phases so you always know what to do next.",
    body:
      "Phase 1 — Levels 1 to 100. Focus on completing the main story line, claiming starter coupons, and learning your class identity. Don't spend mesos on permanent upgrades yet.\n\nPhase 2 — Levels 100 to 200. Slot link skills, finish the Maple Guide tasks, and begin daily bosses you can comfortably solo. Equip a clean set of basic gear and stop here before chasing high-end items.\n\nPhase 3 — Levels 200 to 235. Funded characters take over here. Star Force progression, potential rerolls, and your first hard boss prequests all become priorities.\n\nPhase 4 — End game. Set effects, legion expansion, and weekly boss rotations. Pick a main goal each week and stick with it.",
    keyPoints: [
      "Avoid permanent upgrades before level 100 — your gear will be replaced.",
      "Link skills and the Maple Guide are the highest-leverage early goals.",
      "Star Force scales explosively; budget mesos before pushing past 17★.",
      "Pick one weekly goal at a time; spreading thin slows real progress."
    ],
    difficulty: "Beginner",
    region: "General",
    tags: ["progression", "roadmap", "milestones"],
    icon: "🗺",
    lastUpdated: LAST_UPDATED,
    recommendedLevel: "Levels 1+",
    audience: "Returning players and first-time mains",
    relatedIds: ["level-content-guide", "boss-prequests", "beginner-essentials"],
    featured: true
  },
  {
    id: "level-content-guide",
    title: "Level-Banded Content Guide",
    category: "content",
    subcategory: "Level Content Guide",
    description: "What to do at each level band: training maps, dailies, and unlock checkpoints.",
    summary: "A quick-glance reference for the activities that pay best at each level band.",
    body:
      "Level 1–60 — Stick to the main story line. The XP curve is forgiving and you'll unlock cosmetic rewards along the way.\n\nLevel 60–140 — Theme dungeons and Monster Park become available. Run them once for unlocks; don't grind.\n\nLevel 140–200 — Daily bosses, Maple Tour, and 5th job advancement. This is where most accounts spend the majority of their time.\n\nLevel 200+ — Arcane River and Grandis content unlock. Each region has its own progression; complete one region fully before starting the next.",
    keyPoints: [
      "Theme dungeons are unlock-once, not grind targets.",
      "5th job advancement at 200 unlocks core kit — prioritise it.",
      "Arcane symbols and Authentic Force are weekly caps; never miss a week."
    ],
    difficulty: "Beginner",
    region: "General",
    tags: ["leveling", "content", "dailies"],
    icon: "📚",
    lastUpdated: LAST_UPDATED,
    recommendedLevel: "Levels 1–260",
    relatedIds: ["progression-overview", "boss-prequests"]
  },
  {
    id: "boss-prequests",
    title: "Boss Pre-quest Reference",
    category: "content",
    subcategory: "Boss Pre-quests",
    description: "Which prequest chains unlock which bosses, and which ones are worth doing first.",
    summary: "Most weekly bosses require a one-time prequest. Know which ones to clear and in what order.",
    body:
      "Some prequests gate the boss entirely; others unlock useful rewards. Always do the gate-opening ones first.\n\nGate-opening prequests: Hard Hilla, Cygnus, Lotus, Damien, Lucid, Will, Verus Hilla, Black Mage. Each takes 30–90 minutes solo.\n\nReward-only prequests: Pink Bean (mount), Cygnus (medal), Lotus (familiar). Only chase these once you can clear the boss reliably.\n\nKeep a checklist. Every time you start a new mule, work through the gates in level order.",
    keyPoints: [
      "Gate-opening prequests must be cleared once per character.",
      "Lotus and Damien unlocks share part of the same chain — do them together.",
      "Verus Hilla is a hard gate; ensure you meet the level and item-level requirement first."
    ],
    difficulty: "Intermediate",
    region: "General",
    tags: ["bosses", "quests", "endgame"],
    icon: "🛡",
    lastUpdated: LAST_UPDATED,
    recommendedLevel: "Level 160+",
    relatedIds: ["progression-overview"]
  },
  {
    id: "keyboard-shortcuts",
    title: "Keyboard Shortcuts Reference",
    category: "content",
    subcategory: "Keyboard Shortcuts",
    description: "Default keys, rebinding tips, and the shortcuts experienced players always change.",
    summary: "MapleStory's defaults are not optimal. A handful of rebinds will save you hours over a season.",
    body:
      "Defaults worth keeping: Esc (system menu), Tab (cycle UI), Enter (chat).\n\nRebinds most veterans make: move skill keys close to the movement keys, place jump on a side-mouse button if available, free up the function row for emote macros, and put potion keys on the home row of your off-hand.\n\nMacros: avoid combining damage skills into a macro — it usually loses DPS. Do combine buffs into a single macro for fast pre-pull setups.",
    keyPoints: [
      "Rebind early — muscle memory locks in fast.",
      "Macros help with buffs but cost DPS on damage rotations.",
      "Use a side-mouse button for jump if you have one."
    ],
    difficulty: "Beginner",
    region: "General",
    tags: ["shortcuts", "keybinds", "ui"],
    icon: "⌨",
    lastUpdated: LAST_UPDATED
  },
  {
    id: "abnormal-statuses",
    title: "Abnormal Status Cheatsheet",
    category: "content",
    subcategory: "Abnormal Statuses",
    description: "Stuns, slows, seals, zombify, and how each class can resist or cleanse them.",
    summary: "Most boss damage windows happen while you're stunned or sealed. Knowing the icon saves a clear.",
    body:
      "Common abnormal statuses you'll meet at end-game bosses:\n\nStun — interrupts attacks. Stand on Will's web and you eat several stun ticks; bring a Heroes Will or class equivalent.\n\nSeal — blocks skill use. Lucid phase 2 applies it; cleanse with Holy Symbol's reverse or class utility.\n\nZombify — reverses heals into damage. Don't sip pots while zombified.\n\nReverse direction — flips your inputs. Lotus and Damien apply this; muscle through it; it's short.",
    keyPoints: [
      "Heroes Will (or class equivalent) cleanses most disables on a long cooldown.",
      "Don't drink potions while zombified — it kills you.",
      "Each boss telegraphs the status with a unique icon; learn them once."
    ],
    difficulty: "Intermediate",
    region: "General",
    tags: ["bosses", "mechanics", "cheatsheet"],
    icon: "⚠",
    lastUpdated: LAST_UPDATED
  },

  // ─── Classes ─────────────────────────────────────────────────────────────────
  {
    id: "class-overview",
    title: "Class Identity Overview",
    category: "classes",
    subcategory: "Class Overview",
    description: "How to think about the five class archetypes when picking a main.",
    summary: "Pick a class for its mobility and rhythm, not its raw damage chart — DPS rankings shift every patch.",
    body:
      "MapleStory classes fall into five rough buckets: warriors (sustained melee), bowmen (ranged with pet/summon utility), magicians (burst and crowd-control), thieves (mobile DPS with positioning), and pirates (hybrid kits with strong identity).\n\nDamage charts shift every patch. What stays fixed is each class's mobility kit, animation length, and rhythm. Watch a 10-minute boss-clear video before committing — if the rhythm feels right, you'll enjoy the grind.",
    keyPoints: [
      "Mobility kit and animation rhythm matter more than DPS charts.",
      "Bossing and training maps reward different class strengths.",
      "Try a class for 30 levels before committing as your main."
    ],
    difficulty: "Beginner",
    region: "General",
    tags: ["classes", "archetypes", "main-choice"],
    icon: "⚔",
    lastUpdated: LAST_UPDATED,
    relatedIds: ["link-skills", "legion-basics"],
    featured: true
  },
  {
    id: "link-skills",
    title: "Link Skills Explained",
    category: "classes",
    subcategory: "Link Skills",
    description: "What link skills do, which ones to chase first, and how to plan your link mule order.",
    summary: "Link skills are passive bonuses shared between characters on the same world. Building a 'link mule' lineup is one of the highest-impact early goals.",
    body:
      "Each class has a unique link skill that you unlock by reaching certain levels. Once unlocked, you can attach the link to your main.\n\nPriority links to chase first: Cygnus Knight links (every Cygnus class gives one), Demon Slayer (boss damage), Phantom (drop rate / meso), Kanna (mob density), Hayato/Kanna burning bonus where available.\n\nWork through the Cygnus order: each takes only a few hours and the cumulative %ATT is significant.",
    keyPoints: [
      "Cygnus link skills are the fastest cumulative power gain on any account.",
      "Demon Slayer (boss damage) and Phantom (utility) are top-priority single links.",
      "You can only equip a fixed number of links — plan before you start."
    ],
    difficulty: "Intermediate",
    region: "General",
    tags: ["link-skills", "legion", "mule"],
    icon: "🔗",
    lastUpdated: LAST_UPDATED,
    relatedIds: ["class-overview", "legion-basics"]
  },
  {
    id: "attack-speed",
    title: "Attack Speed Tiers",
    category: "classes",
    subcategory: "Attack Speed",
    description: "How attack speed actually works, where the breakpoints are, and why faster isn't always better.",
    summary: "Attack speed is bucketed into discrete tiers. Stacking past your tier cap is wasted stat.",
    body:
      "Attack speed in MapleStory is tier-based, not linear. Each tier has a cap; reaching it requires a combination of weapon speed, decent buffs, inner ability, and class passives.\n\nMost classes want to reach Faster (2) or Fast (3). Going past your effective tier provides zero benefit, so once you're capped, redirect those stats elsewhere.\n\nDecent Speed Infusion (from Phantom legion) and Hyper Stat: Attack Speed both contribute one tier each.",
    keyPoints: [
      "Attack speed is tier-based — extra stat past the cap is wasted.",
      "Most classes target Faster (2) or Fast (3) at minimum.",
      "Decent Speed Infusion is one of the easiest tier gains available."
    ],
    difficulty: "Intermediate",
    region: "General",
    tags: ["attack-speed", "stats", "mechanics"],
    icon: "⚡",
    lastUpdated: LAST_UPDATED
  },
  {
    id: "stat-terms",
    title: "Stat Terms Glossary",
    category: "classes",
    subcategory: "Stat Terms",
    description: "ATT, MATT, %ATT, %DMG, %BOSS, IED, crit, crit damage, and how they interact.",
    summary: "Stat acronyms in MapleStory have very specific meanings. Mixing them up is the most common upgrade mistake.",
    body:
      "ATT vs MATT — Physical Attack vs Magic Attack. Choose the one your class scales with; mixing them on gear is wasted.\n\n%ATT vs %DMG — %ATT scales your weapon's base damage; %DMG is a final multiplier. Both are valuable; %DMG is rarer.\n\n%BOSS — Multiplier against bosses only. Every endgame build wants to push this high.\n\nIED — Ignore Enemy Defense. Bosses have stacked defense; IED is multiplicative against it. Cap is around 90–94% effective IED for most content.\n\nCrit and Crit Damage — Crit chance has a hard cap at 100%; Crit Damage scales linearly past that.",
    keyPoints: [
      "%ATT and %DMG stack multiplicatively, not additively.",
      "IED is multiplicative; aim for ~90% effective on bossing builds.",
      "Crit chance caps at 100%; further investment goes into crit damage."
    ],
    difficulty: "Intermediate",
    region: "General",
    tags: ["stats", "glossary", "terms"],
    icon: "📊",
    lastUpdated: LAST_UPDATED
  },
  {
    id: "legion-basics",
    title: "Legion System Basics",
    category: "classes",
    subcategory: "Legion Basics",
    description: "How the legion grid works, which characters give the best stats, and how to plan placement.",
    summary: "Legion is a passive board: each character you've levelled adds tiles and stats. Optimal placement matters.",
    body:
      "Every character on your world that reaches level 60 / 100 / 140 / 200 / 250 contributes a legion tile. Higher levels = larger tiles + better aura.\n\nPlacement strategy: place high-tier tiles around the centre, where multiplier zones live. Match attacker classes (warrior, bowman, etc.) to their bonus zone.\n\nLegion coins are earned per character, daily; spend them on permanent stats or grindstones (used for inner ability).",
    keyPoints: [
      "Reach level 200 on as many characters as you can — the tiles scale dramatically.",
      "Placement on the legion board affects bonuses; don't drop tiles randomly.",
      "Legion coins are a daily income — never miss claiming them."
    ],
    difficulty: "Intermediate",
    region: "General",
    tags: ["legion", "mules", "passive"],
    icon: "♛",
    lastUpdated: LAST_UPDATED,
    relatedIds: ["link-skills", "class-overview"]
  },

  // ─── Equipment ───────────────────────────────────────────────────────────────
  {
    id: "upgrading-equipment",
    title: "Upgrading & Enhancing Equipment",
    category: "equipment",
    subcategory: "Upgrading & Enhancing Equipment",
    description: "Scrolls, flames, potential, and the order to upgrade in for each tier of gear.",
    summary: "Equipment progression is a stack: scroll first, flame second, potential last. Skipping the order wastes mesos.",
    body:
      "Step 1 — Scrolls. Use whichever scrolls your gear is rated for. Don't scroll temporary gear.\n\nStep 2 — Flames. Apply Powerful or Eternal Flames depending on item level. Reroll until you hit the stats your class scales with.\n\nStep 3 — Potential. Cube to Legendary on weapon, secondary, emblem, and hat first. Other slots can stay Epic until later.\n\nStep 4 — Star Force. Treated separately; see the Star Force guide. Always do scrolling/flames first.",
    keyPoints: [
      "Scroll → Flame → Potential → Star Force is the canonical upgrade order.",
      "Don't cube temporary gear or items you'll replace within 20 levels.",
      "Weapon, secondary, emblem, and hat are the priority Legendary slots."
    ],
    difficulty: "Intermediate",
    region: "General",
    tags: ["equipment", "scrolls", "flames"],
    icon: "🔨",
    lastUpdated: LAST_UPDATED,
    relatedIds: ["star-force", "potential", "set-effects"]
  },
  {
    id: "star-force",
    title: "Star Force Guide",
    category: "equipment",
    subcategory: "Star Force",
    description: "Star catching, safeguard, the chance-time event, and which stars are worth pushing past.",
    summary: "Star Force adds flat stats per star. Costs explode at 17★; plan your budget before you start.",
    body:
      "0★–10★ — Cheap; do these immediately on any equipment you'll keep more than a few weeks.\n\n10★–15★ — Moderate cost. Star catching reduces failures; learn the timing.\n\n15★–17★ — Expensive but high impact. Use Safeguard at 15★ and 16★ to prevent destruction.\n\n17★–22★ — End-game tier. Wait for 5/10/15 sales and the Star Catch event before pushing here.\n\nNever pass up Shining Star Force or 1+1 events. They cut effective cost roughly in half.",
    keyPoints: [
      "Star catching saves real money — practise the timing.",
      "Use Safeguard at 15★ and 16★; the cost is worth it.",
      "Reserve 17★+ pushes for major events; never blind-push at full price."
    ],
    difficulty: "Intermediate",
    region: "General",
    tags: ["star-force", "enhancement", "events"],
    icon: "⭐",
    lastUpdated: LAST_UPDATED,
    relatedIds: ["upgrading-equipment", "potential"]
  },
  {
    id: "potential",
    title: "Potential & Cubing",
    category: "equipment",
    subcategory: "Potential",
    description: "Tiers, prime lines, bonus potential, and cubing strategies that don't bankrupt you.",
    summary: "Potential lines scale your gear's main stats. Reach Legendary on key slots before chasing prime triple-line rolls.",
    body:
      "Potential has tiers: Rare → Epic → Unique → Legendary. Each tier unlocks better lines.\n\nPrime lines (the 'good' lines) are class-dependent: %ATT or %MATT, %BOSS, IED, %crit damage, line skip.\n\nUse Black Cubes on the slots that matter most: weapon, secondary, emblem, hat. Use Red Cubes elsewhere.\n\nBonus Potential is a separate pool. Aim for %ATT and %BOSS bonus lines first.",
    keyPoints: [
      "Hit Legendary tier first; chase prime triple-line later.",
      "Black Cubes only on the four core slots.",
      "Bonus Potential is a separate pool with its own line goals."
    ],
    difficulty: "Advanced",
    region: "General",
    tags: ["potential", "cubing", "endgame"],
    icon: "🎲",
    lastUpdated: LAST_UPDATED,
    relatedIds: ["upgrading-equipment", "star-force"]
  },
  {
    id: "set-effects",
    title: "Set Effects Reference",
    category: "equipment",
    subcategory: "Set Effects",
    description: "How set bonuses stack, which sets are worth completing, and when to swap.",
    summary: "Sets give cumulative bonuses at 2/3/4/5/7-piece. Aim for the highest tier your level allows.",
    body:
      "Common end-game sets: Absolab (lvl 160), Arcane Umbra (lvl 200), Eternal (lvl 250). Each unlocks at the level threshold.\n\nMixing sets is fine while transitioning, but completing a higher tier outweighs partial bonuses from a lower tier.\n\nBoss accessories (Princess No, Lotus eye, etc.) are not part of armor sets but each have their own set bonuses and should be collected over time.",
    keyPoints: [
      "Completing a higher-tier set beats partial-bonus mixing.",
      "Boss accessory sets are a separate, independent stack.",
      "Don't replace pieces mid-set unless the new piece is a clear net gain."
    ],
    difficulty: "Intermediate",
    region: "General",
    tags: ["set-effects", "armor", "endgame"],
    icon: "🛡",
    lastUpdated: LAST_UPDATED
  },
  {
    id: "shared-cash-shop",
    title: "Shared Cash Shop Inventories",
    category: "equipment",
    subcategory: "Shared Cash Shop Inventories",
    description: "How character / account / merchant inventories differ, and what each can hold.",
    summary: "Cash items live in three different storage pools. Knowing which is which prevents accidental losses.",
    body:
      "Character Tab — items only that character can use. Sales tax-free transfers within the same character.\n\nAccount Tab — items shared between all characters on the same world. Most cash items can be moved here once.\n\nStorage Tab (cash) — long-term holding. Use for permanent cosmetics you swap between characters.\n\nGifts and limited cash items often have transfer restrictions. Check the item description before moving.",
    keyPoints: [
      "Account tab transfers are usually one-way — confirm before moving.",
      "Some limited / gifted items cannot be transferred at all.",
      "Use storage for permanent cosmetics; character tab for active gear."
    ],
    difficulty: "Beginner",
    region: "General",
    tags: ["cash-shop", "inventory", "storage"],
    icon: "🛍",
    lastUpdated: LAST_UPDATED
  },

  // ─── Events ──────────────────────────────────────────────────────────────────
  {
    id: "burning-world",
    title: "Burning World",
    category: "events",
    subcategory: "Burning World",
    description: "What a Burning World is, who it's for, and which rewards to claim before the timer runs out.",
    summary: "Burning Worlds spawn fresh — characters created on them gain bonus levels and event-only rewards.",
    body:
      "A Burning World is a brand-new server that runs for a limited time (usually 6–12 months). Characters created there gain bonus levels per level-up and earn exclusive event currency.\n\nWho should join: returning players, players who want a clean slate, anyone trying a new class without dragging legacy clutter.\n\nWhen the world ends, your characters are usually transferred to a permanent server with rewards intact.",
    keyPoints: [
      "Bonus levels stack with normal XP — you'll out-level the curve fast.",
      "World ends with a forced transfer; plan your destination world.",
      "Event-only rewards are usually the main draw, not the bonus levels."
    ],
    difficulty: "Beginner",
    region: "General",
    tags: ["events", "burning-world", "bonus-levels"],
    icon: "🔥",
    lastUpdated: LAST_UPDATED,
    relatedIds: ["tera-burning", "mega-burning", "event-timeline"]
  },
  {
    id: "tera-burning",
    title: "Tera Burning",
    category: "events",
    subcategory: "Tera Burning",
    description: "How Tera Burning works, eligible classes, and the level cap on the bonus levels.",
    summary: "Tera Burning gives +2 bonus levels per natural level-up, capping out around level 150.",
    body:
      "Tera Burning is the strongest 'burning' modifier on a non-Burning-World character. Each natural level-up grants +2 bonus levels, dropping you near level 150 in well under a week of casual play.\n\nUsually requires you to pick one eligible class per event. Not all classes are eligible — read the announcement before committing.",
    keyPoints: [
      "+2 bonus levels per natural level-up; ends around level 150.",
      "One Tera Burning slot per account per event in most cases.",
      "Check the eligible-class list before choosing — some classes are excluded."
    ],
    difficulty: "Beginner",
    region: "General",
    tags: ["events", "tera-burning", "bonus-levels"],
    icon: "🔥",
    lastUpdated: LAST_UPDATED,
    relatedIds: ["burning-world", "mega-burning"]
  },
  {
    id: "mega-burning",
    title: "Mega Burning",
    category: "events",
    subcategory: "Mega Burning",
    description: "Mega Burning specifics: bonus rate, cap, and how it pairs with link mules.",
    summary: "Mega Burning is a lighter burning modifier ideal for link mules — +1 bonus level per level-up to a lower cap.",
    body:
      "Mega Burning grants +1 bonus level per natural level-up, capping out earlier than Tera Burning.\n\nIdeal use case: link skill mules. You want the link skill at level 70/120/etc., not necessarily level 200, so the lighter burn is enough.\n\nUsually multiple Mega Burning slots are available per account per event — check the patch notes.",
    keyPoints: [
      "+1 bonus level per natural level-up.",
      "Best paired with link mules — you don't need them past their link-skill threshold.",
      "Multiple slots usually available; spread them across new mules."
    ],
    difficulty: "Beginner",
    region: "General",
    tags: ["events", "mega-burning", "mules"],
    icon: "🔥",
    lastUpdated: LAST_UPDATED,
    relatedIds: ["tera-burning", "burning-world", "link-skills"]
  },
  {
    id: "maple-relay",
    title: "Maple Relay",
    category: "events",
    subcategory: "Maple Relay",
    description: "The recurring milestone-and-reward event format and how to plan your relay schedule.",
    summary: "Maple Relay events award milestone rewards across multiple characters — split tasks evenly, don't overload one main.",
    body:
      "Maple Relay events run in waves: complete a set of tasks on a character to earn a milestone tier, then 'pass the baton' to the next character.\n\nReward structure usually scales with how many characters reach the milestone, not how high one character climbs. Spread completions instead of pushing one main.\n\nDailies usually include monster kills, quest completions, and a bossing target.",
    keyPoints: [
      "Spread completions across many characters — don't focus on one main.",
      "Some relays cap rewards at a fixed character count; check the chart first.",
      "Daily tasks reset at server reset; plan your weekly relay route."
    ],
    difficulty: "Beginner",
    region: "General",
    tags: ["events", "relay", "dailies"],
    icon: "🏃",
    lastUpdated: LAST_UPDATED,
    relatedIds: ["event-timeline"]
  },
  {
    id: "event-timeline",
    title: "Event Timeline Tracking",
    category: "events",
    subcategory: "Event Timeline",
    description: "How to track event start/end times, double up overlapping events, and not miss limited rewards.",
    summary: "Most events overlap. The right calendar habit triples your effective rewards over a season.",
    body:
      "Three habits separate efficient players:\n\n1. Pin the patch notes at event start — they list every event, its dates, and its rewards. Skim them once and bookmark the meaty ones.\n\n2. Build a checklist with end dates. Most events end on a Wednesday or Sunday with reset; missing it by an hour is a common mistake.\n\n3. Pair overlapping events. Burning + Maple Relay + a coupon event running simultaneously is the most efficient use of play time.",
    keyPoints: [
      "Patch notes are the source of truth — read them once on day one.",
      "Set end-date reminders; events end at server reset, not midnight.",
      "Look for overlapping events for compound rewards."
    ],
    difficulty: "Beginner",
    region: "General",
    tags: ["events", "timeline", "schedule"],
    icon: "📅",
    lastUpdated: LAST_UPDATED,
    relatedIds: ["maple-relay", "burning-world"]
  },

  // ─── Resources ───────────────────────────────────────────────────────────────
  {
    id: "official-site",
    title: "Official MapleStory Site",
    category: "resources",
    subcategory: "Official MapleStory Site",
    description: "Patch notes, maintenance schedules, and official cash-shop announcements.",
    summary: "The official MapleStory site is the authoritative source for patch notes and event schedules.",
    body:
      "Bookmark the official news page. Every patch, every event, every emergency maintenance announcement lands there first.\n\nThe official cash shop schedule is also published here, often a week ahead of in-game listings.",
    keyPoints: [
      "Authoritative source for patch notes and dates.",
      "Cash shop schedules typically appear ahead of in-game listings.",
      "Maintenance windows are announced here first."
    ],
    difficulty: "Beginner",
    region: "GMS",
    tags: ["official", "patch-notes", "reference"],
    icon: "🌐",
    lastUpdated: LAST_UPDATED,
    sourceLinks: [
      { label: "MapleStory Official News", href: "https://www.nexon.com/maplestory/news" }
    ]
  },
  {
    id: "maplestory-wiki",
    title: "MapleStory Wiki",
    category: "resources",
    subcategory: "MapleStory Wiki",
    description: "Community-maintained reference for items, monsters, maps, and class skills.",
    summary: "The community wiki fills in the gaps the official site doesn't — item drops, monster locations, skill data.",
    body:
      "Strengths: thorough item drop tables, monster spawn locations, deep skill data, historical patch notes.\n\nWeaknesses: occasional outdated pages, especially around recent patches. Cross-check with patch notes if a fact looks suspicious.\n\nGreat secondary reference; not a primary source for current content.",
    keyPoints: [
      "Strongest for drop tables, monster locations, and historical info.",
      "Cross-check recent-patch info against official notes.",
      "Skill descriptions on the wiki are usually more readable than in-game."
    ],
    difficulty: "Beginner",
    region: "General",
    tags: ["wiki", "reference", "community"],
    icon: "📖",
    lastUpdated: LAST_UPDATED,
    sourceLinks: [
      { label: "MapleStory Wiki", href: "https://maplestory.fandom.com/wiki/MapleStory_Wiki", thirdParty: true }
    ]
  },
  {
    id: "maplestory-io",
    title: "MapleStory.io",
    category: "resources",
    subcategory: "MapleStory.io",
    description: "Sprite and item visualisation tool — render any in-game equip on any class for previews.",
    summary: "Visualise outfits, weapons, and effects without buying or equipping anything in-game.",
    body:
      "MapleStory.io scrapes game assets and renders them in a browser. Great for cosmetic planning, item previews, and screenshots.\n\nNot affiliated with Nexon. Asset accuracy is excellent for older items; very recent additions may lag a few patches behind.",
    keyPoints: [
      "Render any equip on any class without spending mesos.",
      "Useful for outfit planning and screenshot composition.",
      "Recent items may lag a few patches behind real game data."
    ],
    difficulty: "Beginner",
    region: "General",
    tags: ["tool", "visualisation", "cosmetic"],
    icon: "🖼",
    lastUpdated: LAST_UPDATED,
    sourceLinks: [
      { label: "MapleStory.io", href: "https://maplestory.io", thirdParty: true }
    ]
  },
  {
    id: "community-discords",
    title: "Community Discords",
    category: "resources",
    subcategory: "Community Discords",
    description: "Where to find class-specific Discords, world-specific Discords, and bossing teams.",
    summary: "Discord is where MapleStory's most useful real-time advice lives — every class and most worlds have a hub.",
    body:
      "Class Discords: each major class has a community Discord with pinned guides, Q&A channels, and active theorycrafters.\n\nWorld Discords: useful for finding bossing parties, market price checks, and event coordination.\n\nFriendly etiquette: read the pins before asking; most class discords have a 'first 100 hours' channel that answers most beginner questions.",
    keyPoints: [
      "Class Discords have pinned guides — read them first.",
      "World Discords are great for bossing parties and price checks.",
      "Always check pinned channels before asking — most beginner Qs are answered there."
    ],
    difficulty: "Beginner",
    region: "General",
    tags: ["community", "discord", "social"],
    icon: "💬",
    lastUpdated: LAST_UPDATED
  },
  {
    id: "calculators",
    title: "Calculators & Planners",
    category: "resources",
    subcategory: "Calculators",
    description: "Star Force cost calculators, cubing simulators, legion planners, and damage calculators.",
    summary: "A handful of community-made calculators turn 'should I cube' into a quantitative answer.",
    body:
      "Star Force cost calculators model expected mesos to push from N★ to M★. Cubing simulators show probability distributions for prime lines. Legion planners optimise tile placement.\n\nDamage calculators are helpful but rarely match in-game numbers exactly — class passives and edge cases are hard to model.",
    keyPoints: [
      "Star Force calculators turn budget questions into numbers.",
      "Cubing sims show real probability distributions, not gambler's-fallacy averages.",
      "Damage calculators are estimates, not exact — treat them as ballparks."
    ],
    difficulty: "Intermediate",
    region: "General",
    tags: ["calculators", "tools", "planning"],
    icon: "🧮",
    lastUpdated: LAST_UPDATED
  },

  // ─── Beginner ────────────────────────────────────────────────────────────────
  {
    id: "beginner-essentials",
    title: "First-Time Player Essentials",
    category: "beginner",
    subcategory: "Beginner Guide",
    description: "Your first 24 hours: what to do, what to skip, and what mistakes to avoid.",
    summary: "MapleStory is friendly to newcomers but easy to get lost in. Stick to a short list of priorities for your first day.",
    body:
      "Hour 1 — Pick a class that looks fun. You can re-make later; no need to optimise.\n\nHours 2–4 — Run the main story. The XP is forgiving and you'll learn the controls.\n\nHours 5–10 — Reach level 100, slot your first link skills, and visit the Maple Guide. Don't spend mesos on permanent upgrades yet.\n\nDay 2+ — Pick a goal: bossing, training, or events. Stick to one until you finish it.",
    keyPoints: [
      "Don't spend mesos on permanent upgrades until level 100+.",
      "Main story line is the smoothest XP path until you know the systems.",
      "Maple Guide tasks are the highest-leverage early goals."
    ],
    difficulty: "Beginner",
    region: "General",
    tags: ["beginner", "first-day", "essentials"],
    icon: "🌱",
    lastUpdated: LAST_UPDATED,
    audience: "Brand new players",
    relatedIds: ["progression-overview", "class-overview"],
    featured: true
  },
  {
    id: "beginner-pitfalls",
    title: "Common Beginner Pitfalls",
    category: "beginner",
    subcategory: "Beginner Guide",
    description: "The mistakes new players make that cost real time — and how to avoid each one.",
    summary: "A short list of the most common new-player mistakes, ranked by how much time each one costs.",
    body:
      "Mistake 1 — Spending mesos on temporary gear. Anything you'll replace in 30 levels isn't worth scrolling.\n\nMistake 2 — Ignoring link skills. They're the single biggest power gain available before level 200.\n\nMistake 3 — Cubing too early. Potential rerolls are expensive; do them on gear you'll keep.\n\nMistake 4 — Skipping the Maple Guide. It's a massive checklist of free rewards and unlocks.\n\nMistake 5 — Joining the wrong world. Some worlds have low population and stale economies; check world reputation before committing.",
    keyPoints: [
      "Don't scroll or cube temporary gear.",
      "Link skills before any other upgrade investment.",
      "Maple Guide is a free checklist — complete it.",
      "Check world reputation before settling on one."
    ],
    difficulty: "Beginner",
    region: "General",
    tags: ["beginner", "pitfalls", "mistakes"],
    icon: "⚠",
    lastUpdated: LAST_UPDATED,
    relatedIds: ["beginner-essentials", "progression-overview"]
  }
];

export function getLibraryGuides(): LibraryGuide[] {
  return libraryGuides;
}
