/**
 * bossSystem.ts — AAA boss definitions for IdleStory World.
 *
 * Every zone has a fully-realised boss with:
 *   • 3 progressive phases (100–70% / 70–30% / 30–0%)
 *   • 2–4 unique abilities per boss
 *   • Scaling HP / ATK / DEF per zone tier
 *   • Voice lines and dramatic transitions
 *   • Guaranteed loot with rarity boosted per boss tier
 *
 * Pure data — no React, no side effects.
 */

// ─── Core types ───────────────────────────────────────────────────────────────

/** What a triggered ability actually does to combat. */
export type BossAbilityEffect =
  | "rage"      // Multiplies boss ATK; visual fury state
  | "shield"    // Reduces incoming player DPS by effectStrength (0–1)
  | "summon"    // Spawns minion wave; player DPS drops temporarily
  | "aoe"       // Area burst — all heroes take visual damage
  | "poison"    // Damage-over-time; gentle DPS reduction
  | "freeze"    // Full DPS lockout for duration
  | "lifesteal" // Boss partial HP restore (visual)
  | "enrage"    // Short berserker window; massive ATK spike
  | "seal"      // Cuts player DPS by effectStrength percentage
  | "reflect"   // Partial damage returned (player takes caution)
  | "regen";    // Boss regenerates HP each second

export type BossAbility = {
  id: string;
  name: string;
  icon: string;
  description: string;
  /** Which phases this ability can fire in. */
  phases: (1 | 2 | 3)[];
  /** Minimum seconds between uses (measured from last trigger). */
  triggerEvery: number;
  effect: BossAbilityEffect;
  /**
   * Meaning depends on effect:
   *   shield / seal / reflect → 0–1 = fraction blocked (0.4 = 40% block)
   *   rage / enrage           → multiplier on boss ATK (1.5 = +50%)
   *   poison / freeze         → damage-per-second or full block (1.0)
   *   regen                   → HP% restored per second (0.02 = 2%/s)
   */
  effectStrength: number;
  /** Seconds the effect is active. 0 = instant visual. */
  duration: number;
  /** Additional seconds before the ability can fire again after duration ends. */
  cooldown: number;
};

export type BossPhaseConfig = {
  phase: 1 | 2 | 3;
  /** [min%, max%] HP bracket for this phase. */
  hpRange: [number, number];
  label: string;
  description: string;
  /** Multiplier on boss outgoing damage. */
  damageMultiplier: number;
  /** Multiplier on damage the boss can absorb (1 = normal, 0.6 = 40% shield). */
  defenseMultiplier: number;
  /** Quote shown on phase entry. */
  transitionLine: string;
  animTrigger: "shield_pulse" | "enrage_flash" | "summon_burst" | "seal_wave" | "time_rewind" | "none";
};

export type BossRewards = {
  xpMultiplier: number;
  mesosMultiplier: number;
  crystalBonus: number;
  fameBonus: number;
  guaranteedRarity: "uncommon" | "rare" | "epic" | "legendary";
};

export type BossScaledStats = {
  hp: number;
  attack: number;
  defense: number;
};

export type BossRewardProfile = BossRewards & {
  guaranteedLoot: true;
  rarityBonus: number;
  bonusXpMultiplier: number;
};

export type BossDefinition = {
  id: string;         // Matches zones.json "id"
  name: string;
  title: string;      // Subtitle / flavor role
  icon: string;
  lore: string;
  /** Base HP before zone + prestige scaling. */
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  phases: [BossPhaseConfig, BossPhaseConfig, BossPhaseConfig];
  abilities: BossAbility[];
  rewards: BossRewards;
  /** Seconds until permanent enrage. 0 = no timer. */
  enrageTimer: number;
  voiceLines: {
    intro: string;
    phase2: string;
    phase3: string;
    enrage: string;
    death: string;
  };
};

// ─── Boss definitions ─────────────────────────────────────────────────────────

export const BOSS_DEFINITIONS: BossDefinition[] = [

  // ── Zone: henesys ────────────────────────────────────────────────────────
  {
    id: "henesys",
    name: "Mushmom",
    title: "Mother of Mushrooms",
    icon: "🍄",
    lore: "A colossal fungal matriarch that has grown for centuries in the meadows of Henesys.",
    baseHp: 2000,
    baseAttack: 12,
    baseDefense: 5,
    phases: [
      {
        phase: 1, hpRange: [70, 100], label: "Rooted",
        description: "Mushmom calls her children from the soil.",
        damageMultiplier: 1.0, defenseMultiplier: 1.0,
        transitionLine: "More mushrooms are coming!",
        animTrigger: "summon_burst"
      },
      {
        phase: 2, hpRange: [30, 70], label: "Spore Storm",
        description: "Toxic spores fill the air, sapping warrior strength.",
        damageMultiplier: 1.3, defenseMultiplier: 0.9,
        transitionLine: "You dare wound me? FEAST ON MY SPORES!",
        animTrigger: "none"
      },
      {
        phase: 3, hpRange: [0, 30], label: "Final Bloom",
        description: "Mushmom channels everything into one last burst.",
        damageMultiplier: 1.8, defenseMultiplier: 0.75,
        transitionLine: "I will bloom one last time… and take you with me!",
        animTrigger: "enrage_flash"
      }
    ],
    abilities: [
      { id: "mushmom_spawn", name: "Minion Spawn", icon: "🍄", description: "Summons mushroom minions that distract your party.",
        phases: [1, 2], triggerEvery: 14, effect: "summon", effectStrength: 0.25, duration: 5, cooldown: 10 },
      { id: "mushmom_spore", name: "Toxic Spore Cloud", icon: "☁️", description: "Releases a cloud of poisonous spores.",
        phases: [2, 3], triggerEvery: 18, effect: "poison", effectStrength: 0.15, duration: 6, cooldown: 8 },
      { id: "mushmom_bloom", name: "Final Bloom", icon: "💥", description: "Explosive mushroom burst hitting all heroes.",
        phases: [3], triggerEvery: 20, effect: "aoe", effectStrength: 0, duration: 2, cooldown: 15 }
    ],
    rewards: { xpMultiplier: 2.5, mesosMultiplier: 3.0, crystalBonus: 1, fameBonus: 8, guaranteedRarity: "uncommon" },
    enrageTimer: 90,
    voiceLines: {
      intro: "🍄 Mushmom awakens! Her children are everywhere!",
      phase2: "🍄 The spores are spreading. Your DPS is weakening!",
      phase3: "🍄 FINAL BLOOM! Finish her NOW!",
      enrage: "🍄 ENRAGED — she's summoning endlessly!",
      death: "🍄 …my children will remember…"
    }
  },

  // ── Zone: ellinia ────────────────────────────────────────────────────────
  {
    id: "ellinia",
    name: "Curse Eye",
    title: "The Hex Warden",
    icon: "👁️",
    lore: "An ancient sentinel bound to the treetops of Ellinia. Its gaze alone has felled adventurers.",
    baseHp: 2800,
    baseAttack: 18,
    baseDefense: 8,
    phases: [
      {
        phase: 1, hpRange: [70, 100], label: "Watchful",
        description: "The eye observes, cataloguing your weaknesses.",
        damageMultiplier: 1.0, defenseMultiplier: 1.0,
        transitionLine: "I have seen your soul. Now suffer.",
        animTrigger: "none"
      },
      {
        phase: 2, hpRange: [30, 70], label: "Hex Active",
        description: "Curse debuffs chain through the party.",
        damageMultiplier: 1.4, defenseMultiplier: 0.85,
        transitionLine: "CURSE — feel your power drain away!",
        animTrigger: "seal_wave"
      },
      {
        phase: 3, hpRange: [0, 30], label: "Blind Rage",
        description: "The eye seals its iris — chaos spells flood out.",
        damageMultiplier: 2.0, defenseMultiplier: 0.7,
        transitionLine: "ALL SHALL BE BLIND!",
        animTrigger: "enrage_flash"
      }
    ],
    abilities: [
      { id: "curse_seal", name: "Hex Curse", icon: "🔮", description: "Seals your attack power with an ancient curse.",
        phases: [1, 2, 3], triggerEvery: 12, effect: "seal", effectStrength: 0.40, duration: 4, cooldown: 8 },
      { id: "curse_beam", name: "Eye Beam", icon: "👁️", description: "Focused magic beam strikes the frontline.",
        phases: [2, 3], triggerEvery: 15, effect: "aoe", effectStrength: 0, duration: 1, cooldown: 10 },
      { id: "curse_enrage", name: "Blind Fury", icon: "😤", description: "The eye loses control, entering a manic state.",
        phases: [3], triggerEvery: 22, effect: "enrage", effectStrength: 1.9, duration: 5, cooldown: 18 }
    ],
    rewards: { xpMultiplier: 3.0, mesosMultiplier: 3.5, crystalBonus: 1, fameBonus: 12, guaranteedRarity: "uncommon" },
    enrageTimer: 75,
    voiceLines: {
      intro: "👁️ The Curse Eye opens…",
      phase2: "👁️ Your attacks are being HEXED!",
      phase3: "👁️ BLIND RAGE — all control is gone!",
      enrage: "👁️ THE EYE SEES ALL. THE EYE ENDS ALL.",
      death: "👁️ …darkness…"
    }
  },

  // ── Zone: kerning ────────────────────────────────────────────────────────
  {
    id: "kerning",
    name: "Ligator",
    title: "King of the Sewers",
    icon: "🐊",
    lore: "A mutated alligator that has ruled Kerning's underground for decades, bloated on stolen gold.",
    baseHp: 4200,
    baseAttack: 25,
    baseDefense: 12,
    phases: [
      {
        phase: 1, hpRange: [70, 100], label: "Lurking",
        description: "Ligator circles from the shadows, testing your defences.",
        damageMultiplier: 1.0, defenseMultiplier: 1.0,
        transitionLine: "You found my lair. Big mistake.",
        animTrigger: "none"
      },
      {
        phase: 2, hpRange: [30, 70], label: "Theft Aura",
        description: "Gold starts draining from your pockets every second.",
        damageMultiplier: 1.35, defenseMultiplier: 0.9,
        transitionLine: "Your gold is MINE now!",
        animTrigger: "none"
      },
      {
        phase: 3, hpRange: [0, 30], label: "Death Roll",
        description: "Ligator grabs the party and drags them under.",
        damageMultiplier: 1.7, defenseMultiplier: 0.8,
        transitionLine: "I'll take your gold — AND your lives!",
        animTrigger: "enrage_flash"
      }
    ],
    abilities: [
      { id: "ligator_drain", name: "Gold Drain", icon: "💰", description: "Steals meso rewards directly from kills.",
        phases: [2, 3], triggerEvery: 10, effect: "poison", effectStrength: 0.15, duration: 8, cooldown: 6 },
      { id: "ligator_chomp", name: "Sewer Chomp", icon: "🦷", description: "Massive bite wounds the whole party.",
        phases: [1, 2, 3], triggerEvery: 16, effect: "aoe", effectStrength: 0, duration: 1, cooldown: 12 },
      { id: "ligator_roll", name: "Death Roll", icon: "🌀", description: "Grabs and pins the party, halting all DPS.",
        phases: [3], triggerEvery: 20, effect: "freeze", effectStrength: 1.0, duration: 3, cooldown: 20 }
    ],
    rewards: { xpMultiplier: 3.2, mesosMultiplier: 4.0, crystalBonus: 1, fameBonus: 15, guaranteedRarity: "rare" },
    enrageTimer: 80,
    voiceLines: {
      intro: "🐊 Ligator rises from the murk!",
      phase2: "🐊 Your gold is LEAKING into the sewers!",
      phase3: "🐊 DEATH ROLL — nobody escapes!",
      enrage: "🐊 I am the KING of these sewers!",
      death: "🐊 …glug glug glug…"
    }
  },

  // ── Zone: perion ─────────────────────────────────────────────────────────
  {
    id: "perion",
    name: "Stone Golem",
    title: "Iron Guardian of the Wasteland",
    icon: "🗿",
    lore: "Forged in the furnaces of Perion ages ago to guard its gates, now animated by forgotten magic.",
    baseHp: 6500,
    baseAttack: 32,
    baseDefense: 22,
    phases: [
      {
        phase: 1, hpRange: [70, 100], label: "Armoured",
        description: "Full stone armour absorbs incoming attacks.",
        damageMultiplier: 1.0, defenseMultiplier: 0.4,
        transitionLine: "Your blows cannot pierce my shell.",
        animTrigger: "shield_pulse"
      },
      {
        phase: 2, hpRange: [30, 70], label: "Staggered",
        description: "Cracks appear. The golem hits harder in desperation.",
        damageMultiplier: 1.5, defenseMultiplier: 0.85,
        transitionLine: "Impressive. But I am NOT FINISHED!",
        animTrigger: "none"
      },
      {
        phase: 3, hpRange: [0, 30], label: "Core Exposed",
        description: "The stone collapses — the core is exposed. Full damage.",
        damageMultiplier: 2.2, defenseMultiplier: 1.0,
        transitionLine: "…MY CORE… EXPOSED… DANGER…",
        animTrigger: "enrage_flash"
      }
    ],
    abilities: [
      { id: "golem_shell", name: "Stone Shell", icon: "🛡️", description: "Reinforces armour, greatly reducing incoming damage.",
        phases: [1, 2], triggerEvery: 16, effect: "shield", effectStrength: 0.55, duration: 6, cooldown: 10 },
      { id: "golem_quake", name: "Ground Quake", icon: "💥", description: "Slams the earth, knocking heroes off balance.",
        phases: [1, 2, 3], triggerEvery: 14, effect: "aoe", effectStrength: 0, duration: 1, cooldown: 10 },
      { id: "golem_berserker", name: "Core Burst", icon: "⚡", description: "Exposed core releases a devastating energy burst.",
        phases: [3], triggerEvery: 18, effect: "enrage", effectStrength: 2.2, duration: 4, cooldown: 15 }
    ],
    rewards: { xpMultiplier: 3.5, mesosMultiplier: 4.5, crystalBonus: 2, fameBonus: 20, guaranteedRarity: "rare" },
    enrageTimer: 70,
    voiceLines: {
      intro: "🗿 The Stone Golem rises! Phase 1: armour is UNBREAKABLE!",
      phase2: "🗿 Cracks form — deal everything you have!",
      phase3: "🗿 CORE EXPOSED — full damage window! FINISH IT!",
      enrage: "🗿 ETERNAL GUARDIAN PROTOCOL ACTIVATED",
      death: "🗿 …stone to dust…"
    }
  },

  // ── Zone: sleepywood ─────────────────────────────────────────────────────
  {
    id: "sleepywood",
    name: "King Slime",
    title: "Sovereign of the Ooze",
    icon: "👑",
    lore: "Every slime in the Sleepywood dungeon has been consumed and merged into this bloated nightmare.",
    baseHp: 9000,
    baseAttack: 38,
    baseDefense: 15,
    phases: [
      {
        phase: 1, hpRange: [70, 100], label: "Absorbing",
        description: "Constantly absorbing nearby slimes to restore HP.",
        damageMultiplier: 1.0, defenseMultiplier: 1.0,
        transitionLine: "More… GIVE ME MORE…",
        animTrigger: "summon_burst"
      },
      {
        phase: 2, hpRange: [30, 70], label: "Spreading",
        description: "Splits pieces of itself — sub-slimes attack independently.",
        damageMultiplier: 1.4, defenseMultiplier: 0.85,
        transitionLine: "I am EVERYWHERE! You cannot kill what divides!",
        animTrigger: "summon_burst"
      },
      {
        phase: 3, hpRange: [0, 30], label: "Royal Jelly",
        description: "Secretes royal jelly — heals 2% HP/second. BURST IT DOWN.",
        damageMultiplier: 1.9, defenseMultiplier: 0.75,
        transitionLine: "ROYAL JELLY — I will outlive you all!",
        animTrigger: "none"
      }
    ],
    abilities: [
      { id: "slime_absorb", name: "Absorb Slimes", icon: "🫁", description: "Consumes floor slimes to recover HP.",
        phases: [1, 2], triggerEvery: 12, effect: "lifesteal", effectStrength: 0.06, duration: 3, cooldown: 9 },
      { id: "slime_divide", name: "Divide", icon: "✂️", description: "Splits into slime clones that attack the party.",
        phases: [2], triggerEvery: 18, effect: "summon", effectStrength: 0.30, duration: 6, cooldown: 12 },
      { id: "slime_jelly", name: "Royal Jelly", icon: "🍯", description: "Excretes royal jelly — ongoing HP regeneration.",
        phases: [3], triggerEvery: 8, effect: "regen", effectStrength: 0.02, duration: 8, cooldown: 4 }
    ],
    rewards: { xpMultiplier: 3.8, mesosMultiplier: 5.0, crystalBonus: 2, fameBonus: 25, guaranteedRarity: "rare" },
    enrageTimer: 85,
    voiceLines: {
      intro: "👑 KING SLIME descends. He is absorbing everything!",
      phase2: "👑 He's DIVIDING — sub-slimes are attacking!",
      phase3: "👑 ROYAL JELLY — he regenerates! Burst NOW!",
      enrage: "👑 THE CROWN DEMANDS TRIBUTE IN BLOOD",
      death: "👑 …the ooze recedes…"
    }
  },

  // ── Zone: ludibrium ──────────────────────────────────────────────────────
  {
    id: "ludibrium",
    name: "Tick-Tock",
    title: "The Time Devourer",
    icon: "🕰️",
    lore: "A clockwork horror that has been winding since the Clocktower was built. It hungers for more time.",
    baseHp: 13000,
    baseAttack: 46,
    baseDefense: 18,
    phases: [
      {
        phase: 1, hpRange: [70, 100], label: "Ticking",
        description: "Tick-Tock counts down — time reversal incoming.",
        damageMultiplier: 1.0, defenseMultiplier: 1.0,
        transitionLine: "Tick… tock… your time is ticking away.",
        animTrigger: "none"
      },
      {
        phase: 2, hpRange: [30, 70], label: "Rewind",
        description: "Rewinds its own HP by 25% every 8 seconds.",
        damageMultiplier: 1.5, defenseMultiplier: 0.9,
        transitionLine: "TIME REVERSAL INITIATED.",
        animTrigger: "time_rewind"
      },
      {
        phase: 3, hpRange: [0, 30], label: "Time Stop",
        description: "Freezes all heroes for 4 seconds at a time.",
        damageMultiplier: 2.0, defenseMultiplier: 0.8,
        transitionLine: "TICK TOCK — TIME STOPS FOR YOU!",
        animTrigger: "enrage_flash"
      }
    ],
    abilities: [
      { id: "ticktock_rewind", name: "Time Rewind", icon: "⏪", description: "Reverses 8 seconds of damage dealt to it.",
        phases: [2, 3], triggerEvery: 8, effect: "lifesteal", effectStrength: 0.25, duration: 2, cooldown: 8 },
      { id: "ticktock_stop", name: "Time Stop", icon: "⏸️", description: "Stops all player attacks for several seconds.",
        phases: [2, 3], triggerEvery: 15, effect: "freeze", effectStrength: 1.0, duration: 4, cooldown: 14 },
      { id: "ticktock_bomb", name: "Time Bomb", icon: "💣", description: "Detonates accumulated time energy across the party.",
        phases: [1, 2, 3], triggerEvery: 20, effect: "aoe", effectStrength: 0, duration: 1, cooldown: 16 }
    ],
    rewards: { xpMultiplier: 4.2, mesosMultiplier: 6.0, crystalBonus: 2, fameBonus: 32, guaranteedRarity: "rare" },
    enrageTimer: 60,
    voiceLines: {
      intro: "🕰️ TICK-TOCK — kill it before the clock runs out!",
      phase2: "🕰️ TIME REWIND! He's restoring HP — burst harder!",
      phase3: "🕰️ TIME STOP active — DPS locked!",
      enrage: "🕰️ ALL TIME BELONGS TO ME!",
      death: "🕰️ …tick… tock… …"
    }
  },

  // ── Zone: omega_sector ───────────────────────────────────────────────────
  {
    id: "omega_sector",
    name: "Platoon Chronos",
    title: "Extra-Terrestrial War Machine",
    icon: "🛸",
    lore: "An alien battle platform that infiltrated Omega Sector. Its energy shield was designed to survive re-entry.",
    baseHp: 18000,
    baseAttack: 55,
    baseDefense: 24,
    phases: [
      {
        phase: 1, hpRange: [70, 100], label: "Shielded",
        description: "Energy shield absorbs 40% of all incoming damage.",
        damageMultiplier: 1.0, defenseMultiplier: 0.6,
        transitionLine: "Shield integrity nominal. Engaging threat.",
        animTrigger: "shield_pulse"
      },
      {
        phase: 2, hpRange: [30, 70], label: "Shield Down",
        description: "AOE overloaded the shield — full damage window!",
        damageMultiplier: 1.6, defenseMultiplier: 1.0,
        transitionLine: "SHIELD OFFLINE. Switching to weapons mode.",
        animTrigger: "none"
      },
      {
        phase: 3, hpRange: [0, 30], label: "Self-Destruct",
        description: "Chronos initiates self-destruct sequence.",
        damageMultiplier: 2.4, defenseMultiplier: 0.85,
        transitionLine: "SELF-DESTRUCT IN T-MINUS 30.",
        animTrigger: "enrage_flash"
      }
    ],
    abilities: [
      { id: "chronos_shield", name: "Energy Shield", icon: "🔋", description: "Activates energy barrier. Absorbs 40% incoming DPS.",
        phases: [1], triggerEvery: 8, effect: "shield", effectStrength: 0.40, duration: 7, cooldown: 5 },
      { id: "chronos_laser", name: "Photon Laser", icon: "🔴", description: "Precision laser sweeps across all heroes.",
        phases: [2, 3], triggerEvery: 12, effect: "aoe", effectStrength: 0, duration: 1, cooldown: 10 },
      { id: "chronos_destruct", name: "Detonation Wave", icon: "💥", description: "Catastrophic self-destruct shockwave. Freezes party.",
        phases: [3], triggerEvery: 18, effect: "freeze", effectStrength: 1.0, duration: 5, cooldown: 20 }
    ],
    rewards: { xpMultiplier: 4.6, mesosMultiplier: 7.0, crystalBonus: 3, fameBonus: 40, guaranteedRarity: "rare" },
    enrageTimer: 55,
    voiceLines: {
      intro: "🛸 PLATOON CHRONOS descends. Energy shield is ONLINE!",
      phase2: "🛸 Shield is DOWN — deal maximum damage NOW!",
      phase3: "🛸 SELF-DESTRUCT — kill it in 30 seconds or we all die!",
      enrage: "🛸 ALL WEAPONS SYSTEMS ENGAGED. OBLITERATE.",
      death: "🛸 …unit decommissioned…"
    }
  },

  // ── Zone: elnath ─────────────────────────────────────────────────────────
  {
    id: "elnath",
    name: "Yeti",
    title: "Blizzard Lord of El Nath",
    icon: "🦣",
    lore: "An ancient yeti that has lived atop El Nath since the ice age. His roar alone brings avalanches.",
    baseHp: 25000,
    baseAttack: 66,
    baseDefense: 28,
    phases: [
      {
        phase: 1, hpRange: [70, 100], label: "Patrolling",
        description: "Yeti circles the arena, throwing ice shards.",
        damageMultiplier: 1.0, defenseMultiplier: 1.0,
        transitionLine: "You dare enter my domain?",
        animTrigger: "none"
      },
      {
        phase: 2, hpRange: [30, 70], label: "Blizzard",
        description: "Blizzard freezes heroes every 15 seconds.",
        damageMultiplier: 1.5, defenseMultiplier: 0.85,
        transitionLine: "BLIZZARD! Feel the eternal cold!",
        animTrigger: "none"
      },
      {
        phase: 3, hpRange: [0, 30], label: "Avalanche",
        description: "Summons an avalanche. Continuous AoE.",
        damageMultiplier: 2.0, defenseMultiplier: 0.75,
        transitionLine: "THE MOUNTAIN ITSELF FALLS!",
        animTrigger: "enrage_flash"
      }
    ],
    abilities: [
      { id: "yeti_blizzard", name: "Blizzard", icon: "❄️", description: "Summons a blizzard that freezes all heroes.",
        phases: [2, 3], triggerEvery: 15, effect: "freeze", effectStrength: 1.0, duration: 3, cooldown: 12 },
      { id: "yeti_shards", name: "Ice Shards", icon: "🧊", description: "Hurls shards of ice, slowing hero actions.",
        phases: [1, 2], triggerEvery: 10, effect: "poison", effectStrength: 0.2, duration: 5, cooldown: 8 },
      { id: "yeti_avalanche", name: "Avalanche", icon: "⛰️", description: "Catastrophic slide — massive AoE burst.",
        phases: [3], triggerEvery: 18, effect: "aoe", effectStrength: 0, duration: 2, cooldown: 15 }
    ],
    rewards: { xpMultiplier: 5.0, mesosMultiplier: 8.0, crystalBonus: 3, fameBonus: 48, guaranteedRarity: "rare" },
    enrageTimer: 65,
    voiceLines: {
      intro: "🦣 YETI emerges! Blizzard will freeze you solid!",
      phase2: "🦣 BLIZZARD activating — time your attacks around the freeze!",
      phase3: "🦣 AVALANCHE — constant AoE damage!",
      enrage: "🦣 EL NATH IS MINE. YOU WILL FREEZE HERE.",
      death: "🦣 …the cold… recedes…"
    }
  },

  // ── Zone: ice_valley ─────────────────────────────────────────────────────
  {
    id: "ice_valley",
    name: "Jr. Balrog",
    title: "Demon Child of the Ice Abyss",
    icon: "😈",
    lore: "Sealed inside the ice caverns eons ago. The seal weakens. His dark aura corrupts all who approach.",
    baseHp: 34000,
    baseAttack: 80,
    baseDefense: 32,
    phases: [
      {
        phase: 1, hpRange: [70, 100], label: "Sealed",
        description: "Partially bound — deals moderate damage.",
        damageMultiplier: 1.0, defenseMultiplier: 1.0,
        transitionLine: "You… dare face ME? Very well.",
        animTrigger: "none"
      },
      {
        phase: 2, hpRange: [30, 70], label: "Dark Aura",
        description: "Dark aura halves all healing. Sustain strategies fail.",
        damageMultiplier: 1.6, defenseMultiplier: 0.85,
        transitionLine: "DARK AURA UNLEASHED — your heals are worthless!",
        animTrigger: "seal_wave"
      },
      {
        phase: 3, hpRange: [0, 30], label: "Unsealed",
        description: "Fully unsealed. Must burst kill — dark rage incoming.",
        damageMultiplier: 2.5, defenseMultiplier: 0.65,
        transitionLine: "THE SEAL IS BROKEN. I AM FREE.",
        animTrigger: "enrage_flash"
      }
    ],
    abilities: [
      { id: "balrog_aura", name: "Dark Aura", icon: "🌑", description: "Dark aura weakens all party attacks significantly.",
        phases: [2, 3], triggerEvery: 10, effect: "seal", effectStrength: 0.45, duration: 5, cooldown: 8 },
      { id: "balrog_flame", name: "Dark Flame", icon: "🔥", description: "Channels hellfire through the party.",
        phases: [1, 2, 3], triggerEvery: 14, effect: "aoe", effectStrength: 0, duration: 1, cooldown: 11 },
      { id: "balrog_rage", name: "Demonic Fury", icon: "😡", description: "Full demonic release — ATK triples briefly.",
        phases: [3], triggerEvery: 20, effect: "enrage", effectStrength: 3.0, duration: 4, cooldown: 18 }
    ],
    rewards: { xpMultiplier: 5.5, mesosMultiplier: 9.5, crystalBonus: 3, fameBonus: 58, guaranteedRarity: "epic" },
    enrageTimer: 50,
    voiceLines: {
      intro: "😈 JR. BALROG! The dark aura will seal your power!",
      phase2: "😈 DARK AURA — attacks are weakened!",
      phase3: "😈 UNSEALED — burst kill before Demonic Fury fires!",
      enrage: "😈 THE ABYSS CONSUMES ALL.",
      death: "😈 …the seal… holds once more…"
    }
  },

  // ── Zone: aqua_road ──────────────────────────────────────────────────────
  {
    id: "aqua_road",
    name: "Pianus",
    title: "The Twin Terror of the Deep",
    icon: "🐟",
    lore: "Two abyssal leviathans that share a single mind. Kill one without the other and they merge even stronger.",
    baseHp: 46000,
    baseAttack: 96,
    baseDefense: 38,
    phases: [
      {
        phase: 1, hpRange: [70, 100], label: "Circling",
        description: "Both forms circle the arena, striking alternately.",
        damageMultiplier: 1.0, defenseMultiplier: 1.0,
        transitionLine: "There are two of us. Can you handle both?",
        animTrigger: "none"
      },
      {
        phase: 2, hpRange: [30, 70], label: "Twin Surge",
        description: "Left form begins regenerating if right form is alive.",
        damageMultiplier: 1.5, defenseMultiplier: 0.9,
        transitionLine: "WE SHARE BLOOD — you cannot divide us!",
        animTrigger: "summon_burst"
      },
      {
        phase: 3, hpRange: [0, 30], label: "Merged Form",
        description: "They merge — shielded and twice as dangerous.",
        damageMultiplier: 2.2, defenseMultiplier: 0.7,
        transitionLine: "WE ARE ONE NOW. THERE IS NO ESCAPE.",
        animTrigger: "shield_pulse"
      }
    ],
    abilities: [
      { id: "pianus_regen", name: "Twin Regen", icon: "🔄", description: "Left form heals while right form is alive.",
        phases: [2], triggerEvery: 10, effect: "regen", effectStrength: 0.015, duration: 8, cooldown: 5 },
      { id: "pianus_torrent", name: "Abyss Torrent", icon: "🌊", description: "Surges of pressurised water knock heroes back.",
        phases: [1, 2, 3], triggerEvery: 12, effect: "aoe", effectStrength: 0, duration: 1, cooldown: 10 },
      { id: "pianus_shield", name: "Merged Shell", icon: "🛡️", description: "Merged form encases itself in deep-sea shell.",
        phases: [3], triggerEvery: 14, effect: "shield", effectStrength: 0.5, duration: 6, cooldown: 10 }
    ],
    rewards: { xpMultiplier: 6.0, mesosMultiplier: 11.0, crystalBonus: 4, fameBonus: 68, guaranteedRarity: "epic" },
    enrageTimer: 55,
    voiceLines: {
      intro: "🐟 PIANUS — the twin form. Beware the regen loop!",
      phase2: "🐟 TWIN REGEN — deal enough DPS to prevent healing!",
      phase3: "🐟 MERGED FORM — fully shielded and dangerous!",
      enrage: "🐟 THE DEEP HAS NO MERCY.",
      death: "🐟 …the abyss claims us…"
    }
  },

  // ── Zone: minar_forest ───────────────────────────────────────────────────
  {
    id: "minar_forest",
    name: "Manon",
    title: "Ancient Dragon of Leafre",
    icon: "🐉",
    lore: "One of the last true dragons in Maple World. Her rage has been stoked for centuries by Maple World's decline.",
    baseHp: 62000,
    baseAttack: 115,
    baseDefense: 45,
    phases: [
      {
        phase: 1, hpRange: [70, 100], label: "Grounded",
        description: "Manon fights on the ground — normal combat.",
        damageMultiplier: 1.0, defenseMultiplier: 1.0,
        transitionLine: "You are bold to face me here.",
        animTrigger: "none"
      },
      {
        phase: 2, hpRange: [30, 70], label: "Aerial",
        description: "Takes flight — grounded attacks deal 50% less.",
        damageMultiplier: 1.6, defenseMultiplier: 0.8,
        transitionLine: "TAKE FLIGHT! I fight best from the sky!",
        animTrigger: "none"
      },
      {
        phase: 3, hpRange: [0, 30], label: "Dragon Breath",
        description: "Dragon Breath fires once — triple damage hit.",
        damageMultiplier: 3.0, defenseMultiplier: 0.65,
        transitionLine: "DRAGON BREATH — the killing blow!",
        animTrigger: "enrage_flash"
      }
    ],
    abilities: [
      { id: "manon_aerial", name: "Aerial Evasion", icon: "🦅", description: "Takes flight — melee attacks halved.",
        phases: [2, 3], triggerEvery: 12, effect: "shield", effectStrength: 0.45, duration: 8, cooldown: 8 },
      { id: "manon_claw", name: "Dragon Claw", icon: "🐾", description: "Swooping claw strike hits the party.",
        phases: [1, 2, 3], triggerEvery: 10, effect: "aoe", effectStrength: 0, duration: 1, cooldown: 8 },
      { id: "manon_breath", name: "Dragon Breath", icon: "🔥", description: "Fires a column of dragonfire — devastating.",
        phases: [3], triggerEvery: 24, effect: "enrage", effectStrength: 3.0, duration: 3, cooldown: 25 }
    ],
    rewards: { xpMultiplier: 7.0, mesosMultiplier: 13.0, crystalBonus: 4, fameBonus: 80, guaranteedRarity: "epic" },
    enrageTimer: 45,
    voiceLines: {
      intro: "🐉 MANON descends! She will take flight — use ranged skills!",
      phase2: "🐉 AERIAL — melee damage halved! Snipe and ranged attacks only!",
      phase3: "🐉 DRAGON BREATH CHARGING — dodge or burst her down!",
      enrage: "🐉 THE ANCIENT DRAGON ACCEPTS NO DEFEAT.",
      death: "🐉 …the last dragon… falls…"
    }
  },

  // ── Zone: dragon_nest ────────────────────────────────────────────────────
  {
    id: "dragon_nest",
    name: "Griffey",
    title: "Apex Predator of the Skies",
    icon: "🦅",
    lore: "Griffey nests in the highest peaks of Leafre's cliffs. No creature has ever matched its speed.",
    baseHp: 82000,
    baseAttack: 138,
    baseDefense: 50,
    phases: [
      {
        phase: 1, hpRange: [70, 100], label: "Perched",
        description: "Griffey scouts from above, dive-bombing occasionally.",
        damageMultiplier: 1.0, defenseMultiplier: 1.0,
        transitionLine: "I have chosen you as prey.",
        animTrigger: "none"
      },
      {
        phase: 2, hpRange: [30, 70], label: "Dive Mode",
        description: "Rapid successive dives — hard to target.",
        damageMultiplier: 1.7, defenseMultiplier: 0.75,
        transitionLine: "TEN DIVES — CAN YOU TRACK ME?",
        animTrigger: "none"
      },
      {
        phase: 3, hpRange: [0, 30], label: "Death Dive",
        description: "Final kamikaze dive sequence.",
        damageMultiplier: 2.8, defenseMultiplier: 0.6,
        transitionLine: "I. WILL. NOT. FALL!",
        animTrigger: "enrage_flash"
      }
    ],
    abilities: [
      { id: "griffey_gale", name: "Gale Force", icon: "💨", description: "Whirlwind of feathers — distracts and weakens heroes.",
        phases: [1, 2, 3], triggerEvery: 10, effect: "poison", effectStrength: 0.2, duration: 5, cooldown: 8 },
      { id: "griffey_dive", name: "Precision Dive", icon: "⬇️", description: "Targeted dive that stuns a hero.",
        phases: [2, 3], triggerEvery: 12, effect: "freeze", effectStrength: 1.0, duration: 2, cooldown: 12 },
      { id: "griffey_kamikaze", name: "Kamikaze Dive", icon: "💥", description: "Sacrificial full-speed dive. Devastating AoE.",
        phases: [3], triggerEvery: 20, effect: "aoe", effectStrength: 0, duration: 2, cooldown: 18 }
    ],
    rewards: { xpMultiplier: 7.5, mesosMultiplier: 15.0, crystalBonus: 5, fameBonus: 95, guaranteedRarity: "epic" },
    enrageTimer: 40,
    voiceLines: {
      intro: "🦅 GRIFFEY dives! Ground attacks are at 50% effectiveness!",
      phase2: "🦅 DIVE MODE — he's too fast to track properly!",
      phase3: "🦅 KAMIKAZE — final assault! All-out attack!",
      enrage: "🦅 THE APEX PREDATOR NEVER RETREATS.",
      death: "🦅 …the sky belongs to no one…"
    }
  },

  // ── Zone: mu_lung ────────────────────────────────────────────────────────
  {
    id: "mu_lung",
    name: "Gatekeeper",
    title: "Master of the Forbidden Arts",
    icon: "🐼",
    lore: "The silent guardian of Mu Lung's inner sanctum. He has trained for 400 years without a single defeat.",
    baseHp: 108000,
    baseAttack: 165,
    baseDefense: 58,
    phases: [
      {
        phase: 1, hpRange: [70, 100], label: "Physical Stance",
        description: "Physical stance — magic attacks deal 50% less.",
        damageMultiplier: 1.0, defenseMultiplier: 0.5,
        transitionLine: "Physical mastery — none may match it.",
        animTrigger: "shield_pulse"
      },
      {
        phase: 2, hpRange: [30, 70], label: "Magic Stance",
        description: "Switches to magic — physical attacks deal 50% less.",
        damageMultiplier: 1.6, defenseMultiplier: 0.5,
        transitionLine: "Now witness true arcane power!",
        animTrigger: "shield_pulse"
      },
      {
        phase: 3, hpRange: [0, 30], label: "Forbidden Art",
        description: "Unleashes the forbidden art — all attacks weakened.",
        damageMultiplier: 2.5, defenseMultiplier: 0.8,
        transitionLine: "THE FORBIDDEN ART HAS NO COUNTER!",
        animTrigger: "seal_wave"
      }
    ],
    abilities: [
      { id: "gk_stance", name: "Stance Change", icon: "🔄", description: "Switches martial stance — random attack type blocked.",
        phases: [1, 2], triggerEvery: 15, effect: "shield", effectStrength: 0.50, duration: 8, cooldown: 7 },
      { id: "gk_palm", name: "Iron Palm", icon: "👋", description: "Perfect strike channelling Ki energy into party.",
        phases: [1, 2, 3], triggerEvery: 12, effect: "aoe", effectStrength: 0, duration: 1, cooldown: 10 },
      { id: "gk_forbidden", name: "Forbidden Art", icon: "🀄", description: "Ancient sealing art — all attacks reduced.",
        phases: [3], triggerEvery: 16, effect: "seal", effectStrength: 0.55, duration: 7, cooldown: 12 }
    ],
    rewards: { xpMultiplier: 8.0, mesosMultiplier: 17.0, crystalBonus: 5, fameBonus: 110, guaranteedRarity: "epic" },
    enrageTimer: 42,
    voiceLines: {
      intro: "🐼 GATEKEEPER! He alternates physical and magic stances!",
      phase2: "🐼 STANCE CHANGE — your damage type is halved!",
      phase3: "🐼 FORBIDDEN ART — massive DPS reduction! Fight through it!",
      enrage: "🐼 400 YEARS. I HAVE NEVER BEEN BESTED.",
      death: "🐼 …the gate opens…"
    }
  },

  // ── Zone: nihal_desert ───────────────────────────────────────────────────
  {
    id: "nihal_desert",
    name: "Deo",
    title: "Lord of the Sandstorm",
    icon: "🏜️",
    lore: "An ancient dune worm that rises from beneath the desert floor. It has swallowed entire caravans.",
    baseHp: 140000,
    baseAttack: 196,
    baseDefense: 66,
    phases: [
      {
        phase: 1, hpRange: [70, 100], label: "Burrowing",
        description: "Attacks from below — timing skills is critical.",
        damageMultiplier: 1.0, defenseMultiplier: 1.0,
        transitionLine: "The desert is MY domain.",
        animTrigger: "none"
      },
      {
        phase: 2, hpRange: [30, 70], label: "Sandstorm",
        description: "Sandstorm blocks all active skills for 6 seconds.",
        damageMultiplier: 1.6, defenseMultiplier: 0.85,
        transitionLine: "SANDSTORM! YOUR SKILLS ARE BLIND!",
        animTrigger: "seal_wave"
      },
      {
        phase: 3, hpRange: [0, 30], label: "Desert Maw",
        description: "Opens desert maw — lifesteal + AoE. Pure DPS race.",
        damageMultiplier: 2.6, defenseMultiplier: 0.7,
        transitionLine: "THE DESERT SWALLOWS ALL!",
        animTrigger: "enrage_flash"
      }
    ],
    abilities: [
      { id: "deo_storm", name: "Sandstorm", icon: "🌪️", description: "Blinding sandstorm seals all skill activations.",
        phases: [2, 3], triggerEvery: 14, effect: "seal", effectStrength: 0.6, duration: 6, cooldown: 10 },
      { id: "deo_burrow", name: "Burrow Strike", icon: "⬆️", description: "Erupts from below — hits party from unexpected angle.",
        phases: [1, 2, 3], triggerEvery: 10, effect: "aoe", effectStrength: 0, duration: 1, cooldown: 8 },
      { id: "deo_maw", name: "Desert Maw", icon: "🕳️", description: "Lifesteal + area damage. Sustains across multiple heroes.",
        phases: [3], triggerEvery: 16, effect: "lifesteal", effectStrength: 0.10, duration: 5, cooldown: 12 }
    ],
    rewards: { xpMultiplier: 8.5, mesosMultiplier: 19.5, crystalBonus: 5, fameBonus: 125, guaranteedRarity: "epic" },
    enrageTimer: 38,
    voiceLines: {
      intro: "🏜️ DEO surfaces — Sandstorm will blind your skills!",
      phase2: "🏜️ SANDSTORM — passive DPS only while it lasts!",
      phase3: "🏜️ DESERT MAW — he's leeching HP! All-out attack!",
      enrage: "🏜️ THE DESERT HAS INFINITE PATIENCE.",
      death: "🏜️ …the dunes settle…"
    }
  },

  // ── Zone: magatia ────────────────────────────────────────────────────────
  {
    id: "magatia",
    name: "Homunculus",
    title: "Immortal Alchemical Creation",
    icon: "⚗️",
    lore: "The Zenumist faction's final experiment — a homunculus that truly cannot die unless destroyed within 60 seconds.",
    baseHp: 180000,
    baseAttack: 230,
    baseDefense: 74,
    phases: [
      {
        phase: 1, hpRange: [70, 100], label: "Observing",
        description: "Cataloguing your attacks before responding.",
        damageMultiplier: 1.0, defenseMultiplier: 1.0,
        transitionLine: "Subject observed. Countermeasures initializing.",
        animTrigger: "none"
      },
      {
        phase: 2, hpRange: [30, 70], label: "Regenerating",
        description: "3% HP regeneration per second. Kill within 60s or reset.",
        damageMultiplier: 1.7, defenseMultiplier: 0.9,
        transitionLine: "REGENERATION ONLINE. CAN YOU OUTRACE IT?",
        animTrigger: "none"
      },
      {
        phase: 3, hpRange: [0, 30], label: "Acceleration",
        description: "Regen doubles. Absolute DPS race.",
        damageMultiplier: 2.8, defenseMultiplier: 0.75,
        transitionLine: "ACCELERATED REGENERATION. HURRY.",
        animTrigger: "enrage_flash"
      }
    ],
    abilities: [
      { id: "homun_regen", name: "Alchemical Regen", icon: "💉", description: "Regenerates 3% HP per second continuously.",
        phases: [2, 3], triggerEvery: 1, effect: "regen", effectStrength: 0.03, duration: 1, cooldown: 1 },
      { id: "homun_acid", name: "Acid Spray", icon: "🧪", description: "Corrosive spray weakens party armour.",
        phases: [1, 2, 3], triggerEvery: 12, effect: "poison", effectStrength: 0.2, duration: 5, cooldown: 9 },
      { id: "homun_omega", name: "Omega Serum", icon: "🔬", description: "Injects ultimate formula — all defences fold.",
        phases: [3], triggerEvery: 18, effect: "seal", effectStrength: 0.45, duration: 6, cooldown: 14 }
    ],
    rewards: { xpMultiplier: 9.0, mesosMultiplier: 22.0, crystalBonus: 6, fameBonus: 140, guaranteedRarity: "legendary" },
    enrageTimer: 60,
    voiceLines: {
      intro: "⚗️ HOMUNCULUS — 3% HP/s regen. Kill within 60 seconds!",
      phase2: "⚗️ REGENERATION IS ACTIVE — your DPS must outpace it!",
      phase3: "⚗️ ACCELERATED REGEN — push every multiplier you have!",
      enrage: "⚗️ THE FORMULA FOR IMMORTALITY IS COMPLETE.",
      death: "⚗️ …the flask shatters…"
    }
  },

  // ── Zone: singapore ──────────────────────────────────────────────────────
  {
    id: "singapore",
    name: "Krexel",
    title: "Two-Eyed Terror of Singapore",
    icon: "🌆",
    lore: "An enormous arboreal monster lurking in the outskirts of Singapore. Each eye is a separate organ of destruction.",
    baseHp: 240000,
    baseAttack: 275,
    baseDefense: 82,
    phases: [
      {
        phase: 1, hpRange: [70, 100], label: "Both Eyes",
        description: "Left eye heals if right eye is alive.",
        damageMultiplier: 1.0, defenseMultiplier: 1.0,
        transitionLine: "Both eyes watch. Both eyes judge.",
        animTrigger: "none"
      },
      {
        phase: 2, hpRange: [30, 70], label: "Enraged Eye",
        description: "One eye destroyed — the other enters rage mode.",
        damageMultiplier: 2.0, defenseMultiplier: 0.8,
        transitionLine: "MY EYE! NOW I WILL DESTROY EVERYTHING!",
        animTrigger: "enrage_flash"
      },
      {
        phase: 3, hpRange: [0, 30], label: "Blind Rage",
        description: "Both eyes sealing up — random stagger attacks.",
        damageMultiplier: 3.0, defenseMultiplier: 0.6,
        transitionLine: "I CANNOT SEE! EVERYTHING DIES!",
        animTrigger: "enrage_flash"
      }
    ],
    abilities: [
      { id: "krexel_regen", name: "Eye Regen", icon: "👁️", description: "Left eye continuously heals while right is intact.",
        phases: [1], triggerEvery: 3, effect: "regen", effectStrength: 0.02, duration: 2, cooldown: 2 },
      { id: "krexel_gaze", name: "Hypnotic Gaze", icon: "🌀", description: "Gaze effect — halts all party actions.",
        phases: [2, 3], triggerEvery: 14, effect: "freeze", effectStrength: 1.0, duration: 3, cooldown: 12 },
      { id: "krexel_tantrum", name: "Blind Tantrum", icon: "💢", description: "Wild thrashing — massive AoE damage.",
        phases: [3], triggerEvery: 15, effect: "aoe", effectStrength: 0, duration: 2, cooldown: 12 }
    ],
    rewards: { xpMultiplier: 9.5, mesosMultiplier: 26.0, crystalBonus: 6, fameBonus: 160, guaranteedRarity: "legendary" },
    enrageTimer: 35,
    voiceLines: {
      intro: "🌆 KREXEL — the left eye regens while the right survives!",
      phase2: "🌆 ONE EYE DOWN — but now he's ENRAGED!",
      phase3: "🌆 BLIND RAGE — finish it before Tantrum fires!",
      enrage: "🌆 BOTH EYES ARE CLOSED. THE PAIN IS ABSOLUTE.",
      death: "🌆 …the neon lights flicker…"
    }
  },

  // ── Zone: masteria ───────────────────────────────────────────────────────
  {
    id: "masteria",
    name: "Crimson Balrog",
    title: "Shadow Lord of New Leaf City",
    icon: "🔴",
    lore: "A crimson-armoured demon lord that commands the shadow forces overrunning New Leaf City.",
    baseHp: 310000,
    baseAttack: 330,
    baseDefense: 90,
    phases: [
      {
        phase: 1, hpRange: [70, 100], label: "Shadow Form",
        description: "Wrapped in shadow — attacks partially absorbed.",
        damageMultiplier: 1.0, defenseMultiplier: 0.7,
        transitionLine: "Shadow consumes all light here.",
        animTrigger: "shield_pulse"
      },
      {
        phase: 2, hpRange: [30, 70], label: "Crimson Aura",
        description: "Shadow drops — crimson aura active. Full damage both ways.",
        damageMultiplier: 2.0, defenseMultiplier: 1.0,
        transitionLine: "CRIMSON AURA! ALL DAMAGE DOUBLES — mine AND yours!",
        animTrigger: "enrage_flash"
      },
      {
        phase: 3, hpRange: [0, 30], label: "Rage Form",
        description: "40% HP rage — Execute skill instant-kills in this window.",
        damageMultiplier: 3.2, defenseMultiplier: 0.75,
        transitionLine: "RAGE FORM — I will obliterate everything!",
        animTrigger: "enrage_flash"
      }
    ],
    abilities: [
      { id: "cbalrog_shadow", name: "Shadow Cloak", icon: "🌑", description: "Shadow aura deflects 30% of attacks.",
        phases: [1], triggerEvery: 10, effect: "shield", effectStrength: 0.30, duration: 6, cooldown: 8 },
      { id: "cbalrog_cleave", name: "Crimson Cleave", icon: "⚔️", description: "Devastating slash that hits the entire party.",
        phases: [1, 2, 3], triggerEvery: 10, effect: "aoe", effectStrength: 0, duration: 1, cooldown: 8 },
      { id: "cbalrog_rage", name: "Rage Form", icon: "😡", description: "Berserker fury — ATK triples for 5 seconds.",
        phases: [2, 3], triggerEvery: 18, effect: "enrage", effectStrength: 3.0, duration: 5, cooldown: 16 }
    ],
    rewards: { xpMultiplier: 10.0, mesosMultiplier: 30.0, crystalBonus: 7, fameBonus: 180, guaranteedRarity: "legendary" },
    enrageTimer: 35,
    voiceLines: {
      intro: "🔴 CRIMSON BALROG! Phase 2 doubles damage for everyone!",
      phase2: "🔴 CRIMSON AURA — all damage ×2. High risk, high reward!",
      phase3: "🔴 RAGE FORM — use Execute skill for instant kill if you have it!",
      enrage: "🔴 THE SHADOW CITY BELONGS TO ME.",
      death: "🔴 …the crimson fades…"
    }
  },

  // ── Zone: crimsonwood ────────────────────────────────────────────────────
  {
    id: "crimsonwood",
    name: "Headless Horseman",
    title: "Eternal Sentinel of the Keep",
    icon: "🐎",
    lore: "A cursed warrior bound to Crimsonwood Keep. He lost his head in battle but cannot die — he can only be bested.",
    baseHp: 400000,
    baseAttack: 396,
    baseDefense: 100,
    phases: [
      {
        phase: 1, hpRange: [70, 100], label: "Headless",
        description: "Without his head — 50% miss chance on all attacks.",
        damageMultiplier: 1.0, defenseMultiplier: 0.5,
        transitionLine: "…heedless… headless… I ride eternal…",
        animTrigger: "shield_pulse"
      },
      {
        phase: 2, hpRange: [30, 70], label: "Head Returns",
        description: "Head reattaches — deal 5× damage for 8 seconds!",
        damageMultiplier: 1.5, defenseMultiplier: 1.0,
        transitionLine: "MY HEAD RETURNS! 5× DAMAGE WINDOW!",
        animTrigger: "enrage_flash"
      },
      {
        phase: 3, hpRange: [0, 30], label: "Furious Charge",
        description: "Galloping charge — freeze + AoE.",
        damageMultiplier: 3.5, defenseMultiplier: 0.7,
        transitionLine: "CHARGE! I WILL NOT BE STOPPED!",
        animTrigger: "enrage_flash"
      }
    ],
    abilities: [
      { id: "horseman_miss", name: "Headless Swing", icon: "🗡️", description: "Wild swings from a rider with no sight — half miss.",
        phases: [1, 3], triggerEvery: 8, effect: "shield", effectStrength: 0.45, duration: 6, cooldown: 6 },
      { id: "horseman_charge", name: "Phantom Charge", icon: "💨", description: "Full-speed charge — freezes all heroes on impact.",
        phases: [2, 3], triggerEvery: 15, effect: "freeze", effectStrength: 1.0, duration: 3, cooldown: 14 },
      { id: "horseman_lantern", name: "Cursed Lantern", icon: "🎃", description: "Cursed fire drains hero vitality continuously.",
        phases: [1, 2, 3], triggerEvery: 12, effect: "poison", effectStrength: 0.25, duration: 5, cooldown: 9 }
    ],
    rewards: { xpMultiplier: 11.0, mesosMultiplier: 35.0, crystalBonus: 7, fameBonus: 200, guaranteedRarity: "legendary" },
    enrageTimer: 40,
    voiceLines: {
      intro: "🐎 HEADLESS HORSEMAN — attacks miss 50% in Phase 1!",
      phase2: "🐎 HEAD RETURNS — ×5 DAMAGE WINDOW! All out attack!",
      phase3: "🐎 PHANTOM CHARGE — freeze + AoE incoming!",
      enrage: "🐎 THE KEEP STANDS. I RIDE FOREVER.",
      death: "🐎 …the hoofbeats fade…"
    }
  },

  // ── Zone: zipangu ────────────────────────────────────────────────────────
  {
    id: "zipangu",
    name: "Tengu",
    title: "Master of Illusions",
    icon: "👺",
    lore: "A celestial tengu that guards Zipangu's sacred shrine. He creates perfect copies of himself to confuse foes.",
    baseHp: 520000,
    baseAttack: 475,
    baseDefense: 112,
    phases: [
      {
        phase: 1, hpRange: [70, 100], label: "Single Form",
        description: "True form — normal combat.",
        damageMultiplier: 1.0, defenseMultiplier: 1.0,
        transitionLine: "You face the guardian of Zipangu.",
        animTrigger: "none"
      },
      {
        phase: 2, hpRange: [30, 70], label: "Illusion Split",
        description: "Creates 2 clones. Only the real one takes damage.",
        damageMultiplier: 1.8, defenseMultiplier: 0.7,
        transitionLine: "ILLUSION SPLIT — which one is real?",
        animTrigger: "summon_burst"
      },
      {
        phase: 3, hpRange: [0, 30], label: "Phantom Barrage",
        description: "All clones and real Tengu attack simultaneously.",
        damageMultiplier: 3.0, defenseMultiplier: 0.6,
        transitionLine: "ALL VERSIONS ATTACK AT ONCE!",
        animTrigger: "enrage_flash"
      }
    ],
    abilities: [
      { id: "tengu_clone", name: "Clone Army", icon: "👥", description: "Spawns 2 phantom clones — attacks split across all.",
        phases: [2, 3], triggerEvery: 12, effect: "summon", effectStrength: 0.35, duration: 6, cooldown: 10 },
      { id: "tengu_fan", name: "Tengu Fan", icon: "🍃", description: "Gale fan strike — hits entire party.",
        phases: [1, 2, 3], triggerEvery: 10, effect: "aoe", effectStrength: 0, duration: 1, cooldown: 8 },
      { id: "tengu_seal", name: "Spirit Seal", icon: "📿", description: "Ancient seal — reduces all party attacks.",
        phases: [2, 3], triggerEvery: 16, effect: "seal", effectStrength: 0.45, duration: 7, cooldown: 12 }
    ],
    rewards: { xpMultiplier: 12.0, mesosMultiplier: 40.0, crystalBonus: 8, fameBonus: 225, guaranteedRarity: "legendary" },
    enrageTimer: 38,
    voiceLines: {
      intro: "👺 TENGU — illusion split incoming! Full DPS or miss 2/3 attacks!",
      phase2: "👺 CLONE ARMY — one real, two fake! Deal enough to hit real one!",
      phase3: "👺 PHANTOM BARRAGE — all copies attack! Max burst!",
      enrage: "👺 THE SHRINE GUARDIAN CANNOT BE DECEIVED.",
      death: "👺 …the illusion dissolves…"
    }
  },

  // ── Zone: leafre_sky ─────────────────────────────────────────────────────
  {
    id: "leafre_sky",
    name: "Zeno",
    title: "Sky Dragon of the Storm",
    icon: "🌤️",
    lore: "An ancient lightning dragon that patrols the highest clouds above Leafre. His charge builds every 10 stages.",
    baseHp: 680000,
    baseAttack: 570,
    baseDefense: 128,
    phases: [
      {
        phase: 1, hpRange: [70, 100], label: "Charging",
        description: "Storm energy charges — deal burst damage before discharge.",
        damageMultiplier: 1.0, defenseMultiplier: 1.0,
        transitionLine: "The storm builds. Do not let me discharge.",
        animTrigger: "none"
      },
      {
        phase: 2, hpRange: [30, 70], label: "Discharge",
        description: "Releases lightning — deals massive party damage.",
        damageMultiplier: 2.0, defenseMultiplier: 0.8,
        transitionLine: "LIGHTNING DISCHARGE! FEEL THE STORM!",
        animTrigger: "enrage_flash"
      },
      {
        phase: 3, hpRange: [0, 30], label: "Supercell",
        description: "Full supercell — freeze + discharge combo.",
        damageMultiplier: 3.5, defenseMultiplier: 0.65,
        transitionLine: "SUPERCELL — this ends everything.",
        animTrigger: "enrage_flash"
      }
    ],
    abilities: [
      { id: "zeno_lightning", name: "Lightning Strike", icon: "⚡", description: "Discharges accumulated lightning across the party.",
        phases: [2, 3], triggerEvery: 10, effect: "aoe", effectStrength: 0, duration: 2, cooldown: 8 },
      { id: "zeno_shield", name: "Storm Shield", icon: "🌩️", description: "Static field deflects incoming damage.",
        phases: [1, 2], triggerEvery: 14, effect: "shield", effectStrength: 0.4, duration: 6, cooldown: 10 },
      { id: "zeno_supercell", name: "Supercell", icon: "🌪️", description: "Full atmospheric discharge — freeze + mass AoE.",
        phases: [3], triggerEvery: 16, effect: "freeze", effectStrength: 1.0, duration: 4, cooldown: 14 }
    ],
    rewards: { xpMultiplier: 13.5, mesosMultiplier: 47.0, crystalBonus: 8, fameBonus: 255, guaranteedRarity: "legendary" },
    enrageTimer: 32,
    voiceLines: {
      intro: "🌤️ ZENO — lightning charges every 10s! Burst before discharge!",
      phase2: "🌤️ DISCHARGE! Deal everything you have NOW!",
      phase3: "🌤️ SUPERCELL — freeze and AoE combo! Final phase!",
      enrage: "🌤️ THE STORM HAS NO END.",
      death: "🌤️ …the clouds break…"
    }
  },

  // ── Zone: temple_of_time ─────────────────────────────────────────────────
  {
    id: "temple_of_time",
    name: "Time Controller",
    title: "Arbiter of the Eternal",
    icon: "⏳",
    lore: "The entity that governs time within the Temple. Defeating it resets the timeline — unless you kill it in one burst.",
    baseHp: 900000,
    baseAttack: 690,
    baseDefense: 148,
    phases: [
      {
        phase: 1, hpRange: [70, 100], label: "Timeline",
        description: "Manipulating timelines — random mechanic shuffles.",
        damageMultiplier: 1.0, defenseMultiplier: 1.0,
        transitionLine: "Every timeline ends here.",
        animTrigger: "none"
      },
      {
        phase: 2, hpRange: [30, 70], label: "Reset",
        description: "Boss resets to full HP once unless burst-killed this phase.",
        damageMultiplier: 2.0, defenseMultiplier: 0.85,
        transitionLine: "TIMELINE RESET — I begin anew. Can you keep up?",
        animTrigger: "time_rewind"
      },
      {
        phase: 3, hpRange: [0, 30], label: "Temporal Collapse",
        description: "All time effects stack — seal + freeze + AoE cycle.",
        damageMultiplier: 4.0, defenseMultiplier: 0.65,
        transitionLine: "TIME COLLAPSES. THE END IS NOW.",
        animTrigger: "enrage_flash"
      }
    ],
    abilities: [
      { id: "tc_reset", name: "Timeline Reset", icon: "♻️", description: "Resets HP to 100% once per phase transition.",
        phases: [2], triggerEvery: 60, effect: "lifesteal", effectStrength: 1.0, duration: 3, cooldown: 120 },
      { id: "tc_seal", name: "Temporal Seal", icon: "⏸️", description: "Freezes all skill activations temporarily.",
        phases: [1, 2, 3], triggerEvery: 14, effect: "seal", effectStrength: 0.5, duration: 5, cooldown: 10 },
      { id: "tc_collapse", name: "Time Collapse", icon: "💫", description: "Dimensional implosion — freeze + massive AoE burst.",
        phases: [3], triggerEvery: 18, effect: "freeze", effectStrength: 1.0, duration: 5, cooldown: 16 }
    ],
    rewards: { xpMultiplier: 16.0, mesosMultiplier: 58.0, crystalBonus: 9, fameBonus: 300, guaranteedRarity: "legendary" },
    enrageTimer: 28,
    voiceLines: {
      intro: "⏳ TIME CONTROLLER — he resets HP once! Burst kill Phase 2!",
      phase2: "⏳ TIMELINE RESET — deal the final blow before 60s are up!",
      phase3: "⏳ TEMPORAL COLLAPSE — seal+freeze cycle! Fight through it!",
      enrage: "⏳ ALL TIMELINES CONVERGE ON YOUR DESTRUCTION.",
      death: "⏳ …time flows freely once more…"
    }
  },

  // ── Zone: black_mage_lair ────────────────────────────────────────────────
  {
    id: "black_mage_lair",
    name: "Black Mage",
    title: "The Source of All Darkness",
    icon: "🌑",
    lore: "The architect of Maple World's suffering. His World Seal can unmake reality. Only those who have walked the path of Rebirth may challenge him.",
    baseHp: 2000000,
    baseAttack: 950,
    baseDefense: 200,
    phases: [
      {
        phase: 1, hpRange: [70, 100], label: "World Seal",
        description: "World Seal active — cuts ALL player DPS by 80% for 5 seconds.",
        damageMultiplier: 1.0, defenseMultiplier: 0.9,
        transitionLine: "You dare set foot in my lair?",
        animTrigger: "seal_wave"
      },
      {
        phase: 2, hpRange: [30, 70], label: "Dark Genesis",
        description: "Dark Genesis reshapes the arena. All mechanics intensify.",
        damageMultiplier: 2.2, defenseMultiplier: 0.8,
        transitionLine: "DARK GENESIS — all light is extinguished.",
        animTrigger: "enrage_flash"
      },
      {
        phase: 3, hpRange: [0, 30], label: "Final Darkness",
        description: "The Black Mage channels everything. World-ending attack cycles.",
        damageMultiplier: 4.5, defenseMultiplier: 0.6,
        transitionLine: "THIS IS THE FINAL DARKNESS. BOW.",
        animTrigger: "enrage_flash"
      }
    ],
    abilities: [
      { id: "bm_seal", name: "World Seal", icon: "🌑", description: "Seals all power in the world. 80% DPS reduction for 5 seconds.",
        phases: [1, 2, 3], triggerEvery: 20, effect: "seal", effectStrength: 0.80, duration: 5, cooldown: 15 },
      { id: "bm_genesis", name: "Dark Genesis", icon: "🌌", description: "Reshapes reality — all party attacks halved for 8 seconds.",
        phases: [2, 3], triggerEvery: 16, effect: "seal", effectStrength: 0.50, duration: 8, cooldown: 12 },
      { id: "bm_void", name: "Void Convergence", icon: "🕳️", description: "Collapses all dimensions — freeze + massive AoE.",
        phases: [3], triggerEvery: 18, effect: "freeze", effectStrength: 1.0, duration: 5, cooldown: 16 },
      { id: "bm_curse", name: "Eternal Curse", icon: "⚫", description: "Places an unbreakable curse — regen + shield combo.",
        phases: [2, 3], triggerEvery: 14, effect: "shield", effectStrength: 0.3, duration: 6, cooldown: 10 }
    ],
    rewards: { xpMultiplier: 25.0, mesosMultiplier: 100.0, crystalBonus: 15, fameBonus: 500, guaranteedRarity: "legendary" },
    enrageTimer: 120,
    voiceLines: {
      intro: "🌑 THE BLACK MAGE AWAKENS. World Seal will cut your DPS by 80%!",
      phase2: "🌑 DARK GENESIS — all mechanics intensify. Do not yield!",
      phase3: "🌑 FINAL DARKNESS — push everything. This is what you trained for.",
      enrage: "🌑 THE DARKNESS CANNOT BE CONTAINED.",
      death: "🌑 …darkness… retreats… for now…"
    }
  }

];

// ─── Lookup helpers ───────────────────────────────────────────────────────────

/** Get boss definition by zone ID. Returns null if zone has no custom boss defined. */
export function getBossDefinition(zoneId: string): BossDefinition | null {
  return BOSS_DEFINITIONS.find(b => b.id === zoneId) ?? null;
}

/** Get phase config based on HP percentage (0–100). */
export function getBossPhaseConfig(boss: BossDefinition, hpPct: number): BossPhaseConfig {
  const phase = hpPct > 70 ? 1 : hpPct > 30 ? 2 : 3;
  return boss.phases[phase - 1];
}

export function getBossPhaseNumber(hpPct: number): 1 | 2 | 3 {
  return hpPct > 70 ? 1 : hpPct > 30 ? 2 : 3;
}

/** Get abilities active in the given phase. */
export function getPhaseAbilities(boss: BossDefinition, phase: 1 | 2 | 3): BossAbility[] {
  return boss.abilities.filter(ab => ab.phases.includes(phase));
}

/** Scale boss HP based on zone requirement and prestige count. */
export function scaledBossHp(boss: BossDefinition, zoneRequirement: number, prestigeCount: number): number {
  return scaleBossStats(boss, zoneRequirement, 0, prestigeCount).hp;
}

export function scaleBossStats(
  boss: BossDefinition,
  zoneRequirement: number,
  playerPower: number,
  prestigeCount = 0
): BossScaledStats {
  const zoneTier = Math.max(1, zoneRequirement);
  const zoneMult = Math.pow(1.14, zoneTier / 10);
  const prestigeMult = Math.pow(2.0, Math.max(0, prestigeCount));
  const powerMult = playerPower > 0 ? Math.min(2.4, Math.max(1, Math.pow(playerPower / 120, 0.18))) : 1;

  return {
    hp: Math.round(boss.baseHp * zoneMult * prestigeMult * powerMult),
    attack: Math.round(boss.baseAttack * Math.pow(1.1, zoneTier / 10) * powerMult),
    defense: Math.round(boss.baseDefense * Math.pow(1.08, zoneTier / 10) * prestigeMult)
  };
}

export function getBossRewardProfile(
  boss: BossDefinition,
  zoneRequirement: number,
  playerPower: number,
  speedBonus = 1
): BossRewardProfile {
  const zoneBonus = Math.min(18, Math.floor(Math.max(1, zoneRequirement) / 4));
  const powerBonus = playerPower > 0 ? Math.min(10, Math.floor(Math.log10(playerPower + 10) * 2)) : 0;

  return {
    ...boss.rewards,
    guaranteedLoot: true,
    rarityBonus: 18 + zoneBonus + powerBonus,
    bonusXpMultiplier: boss.rewards.xpMultiplier * Math.max(1, speedBonus)
  };
}
