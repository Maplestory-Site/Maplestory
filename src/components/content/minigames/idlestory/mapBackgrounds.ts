/**
 * IdleStory World — Map Backgrounds
 *
 * Curated MapleStory map images from the CDN for each game zone.
 * Images are served as medium WebP from CloudFront.
 *
 * CDN pattern: https://d3uzjcc4cyf4cj.cloudfront.net/maps/md/{mapId}.webp?tmp=1
 */

const CDN = "https://d3uzjcc4cyf4cj.cloudfront.net/maps/md";

function cdnUrl(mapId: string): string {
  return `${CDN}/${mapId}.webp?tmp=1`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ZoneBackground {
  /** Game zone ID (matches zones.json) */
  zoneId: string;
  /** MapleStory map ID used for CDN image */
  mapId: string;
  /** Human-readable map location name */
  locationName: string;
  /** Full CDN image URL */
  image: string;
  /**
   * CSS gradient overlay applied on top of the image for readability.
   * Should darken or tint sufficiently for white text to be legible.
   */
  overlay: string;
  /**
   * Optional extra color-tint layer (e.g. red wash for boss zones).
   * Applied between the image and the readability overlay.
   */
  tint?: string;
}

export interface ZoneVisualIdentity {
  theme: string;
  tone: string;
  progressionRole: string;
  atmosphere: string;
  monsterCue: string;
}

const THEME_VISUAL_IDENTITY: Record<string, ZoneVisualIdentity> = {
  meadow: { theme: "Sunny Meadow", tone: "Cute / safe", progressionRole: "Beginner warm-up", atmosphere: "Soft grass, bright color, and friendly starter danger.", monsterCue: "Snails, mushrooms, spores, and playful piglets." },
  forest: { theme: "Magic Forest", tone: "Mystical / curious", progressionRole: "First magic pressure", atmosphere: "Tall trees, blue light, faeries, vines, and hidden eyes.", monsterCue: "Forest slimes, wisps, mushrooms, and curse eyes." },
  sewer: { theme: "Urban Sewer", tone: "Dirty / fast", progressionRole: "Speed and poison check", atmosphere: "Dark tunnels, toxic water, and ambush corners.", monsterCue: "Rats, toxic slime, pipe ghosts, and sewer reptiles." },
  wasteland: { theme: "Warrior Wasteland", tone: "Dry / rugged", progressionRole: "First durability check", atmosphere: "Scorched cliffs, cracked earth, and stone armor.", monsterCue: "Boars, stumps, lizards, drakes, and golems." },
  dungeon: { theme: "Ancient Dungeon", tone: "Dark / dangerous", progressionRole: "Sustain and curse spike", atmosphere: "Sealed caves, old magic, and echoing monster halls.", monsterCue: "Bats, cave slime, worms, drakes, and abyss demons." },
  clocktower: { theme: "Toy Clocktower", tone: "Whimsical / mechanical", progressionRole: "Time mechanic intro", atmosphere: "Moving gears, dolls, toy soldiers, and ticking pressure.", monsterCue: "Clock spirits, dolls, block golems, and gear rats." },
  "sci-fi": { theme: "Alien Base", tone: "Tech / tactical", progressionRole: "Shield and ranged check", atmosphere: "Military lights, alien scans, and unstable machines.", monsterCue: "Gray aliens, drones, bots, and plasma commanders." },
  frozen: { theme: "Frozen Mountain", tone: "Cold / harsh", progressionRole: "Slow control check", atmosphere: "Snowfields, frozen wind, and low visibility.", monsterCue: "Penguins, wolves, ice spirits, zombies, and yetis." },
  ice_cave: { theme: "Demon Ice Cave", tone: "Cold / ominous", progressionRole: "Burst checkpoint", atmosphere: "Frozen caverns, sealed demons, and crystal shadows.", monsterCue: "Frost bats, ice golems, wyverns, imps, and Balrogs." },
  underwater: { theme: "Undersea Road", tone: "Fluid / ancient", progressionRole: "Sustain and shield map", atmosphere: "Blue currents, coral ruins, and deep pressure.", monsterCue: "Fish, crabs, sea slimes, sharks, and Pianus." },
  dragon_forest: { theme: "Dragon Forest", tone: "Wild / heroic", progressionRole: "Advanced DPS gate", atmosphere: "Ancient roots, dragon trails, and high fantasy danger.", monsterCue: "Wyverns, harps, kentaurus, drakes, and dragons." },
  cliff: { theme: "Dragon Cliffs", tone: "Aerial / lethal", progressionRole: "Crit and burst pressure", atmosphere: "High nests, sharp wind, and flying predators.", monsterCue: "Wyverns, bone dragons, harps, and Griffey." },
  oriental: { theme: "Mu Lung Gardens", tone: "Serene / disciplined", progressionRole: "Technique and stance map", atmosphere: "Bamboo paths, monks, spirits, and training grounds.", monsterCue: "Pandas, cranes, monks, peach imps, and gatekeepers." },
  desert: { theme: "Nihal Desert", tone: "Hot / hidden", progressionRole: "Anti-skill storm check", atmosphere: "Dunes, ruins, buried treasure, and desert ambushes.", monsterCue: "Cacti, scorpions, sand rats, spirits, and Deo." },
  alchemy: { theme: "Alchemy City", tone: "Experimental / unstable", progressionRole: "Regeneration check", atmosphere: "Labs, flasks, machines, and faction experiments.", monsterCue: "Homun, Huroids, cores, flasks, and prototypes." },
  urban: { theme: "Neon Streets", tone: "Bright / chaotic", progressionRole: "Multi-target city fight", atmosphere: "Night traffic, neon signs, gangs, and city monsters.", monsterCue: "Street shadows, veetrons, neon bubbles, and Krexel." },
  shadow_city: { theme: "Shadow City", tone: "Corrupted / elite", progressionRole: "High-risk rage map", atmosphere: "Alternate Maple darkness, crimson magic, and void streets.", monsterCue: "Ghost soldiers, nightmares, void bats, and Balrogs." },
  fortress: { theme: "Crimson Fortress", tone: "War / haunted", progressionRole: "Prestige milestone", atmosphere: "Old keep walls, ghost pirates, and cursed knights.", monsterCue: "Watchers, sabres, keep golems, captains, and horsemen." },
  shrine: { theme: "Spirit Shrine", tone: "Folklore / magical", progressionRole: "Spirit control map", atmosphere: "Lanterns, fox fire, shrine ghosts, and night forest.", monsterCue: "Oni, shrine ghosts, fox spirits, lantern imps, and Tengu." },
  sky: { theme: "Sky Route", tone: "Airy / fast", progressionRole: "Speed and ranged map", atmosphere: "Cloud roads, takeoff platforms, and storm monsters.", monsterCue: "Cloud foxes, wind drakes, storm harps, and Zeno." },
  time: { theme: "Temple of Time", tone: "Ancient / cosmic", progressionRole: "Late-game time control", atmosphere: "Memory lanes, paradox energy, and lost guardians.", monsterCue: "Memory keepers, monks, time soldiers, and controllers." },
  abyss: { theme: "Abyss Lair", tone: "Final / terrifying", progressionRole: "Endgame wall", atmosphere: "Black magic, void pressure, and world-ending darkness.", monsterCue: "Dark servants, void golems, archons, knights, and the Black Mage." }
};

export function getThemeVisualIdentity(theme: string): ZoneVisualIdentity {
  return THEME_VISUAL_IDENTITY[theme] ?? {
    theme: "Unknown Region",
    tone: "Uncharted",
    progressionRole: "Exploration",
    atmosphere: "A strange map with unstable monster activity.",
    monsterCue: "Unknown enemies adapted to this region."
  };
}

// ─── Curated zone → map image mapping ────────────────────────────────────────

export const ZONE_BACKGROUNDS: ZoneBackground[] = [
  {
    zoneId: "henesys",
    mapId: "100000000",
    locationName: "Henesys",
    image: cdnUrl("100000000"),
    overlay: "linear-gradient(180deg, rgba(5,25,5,.42) 0%, rgba(0,8,0,.70) 100%)",
  },
  {
    zoneId: "ellinia",
    mapId: "101000000",
    locationName: "Ellinia",
    image: cdnUrl("101000000"),
    overlay: "linear-gradient(180deg, rgba(0,20,10,.44) 0%, rgba(0,12,5,.72) 100%)",
  },
  {
    zoneId: "kerning",
    mapId: "103000000",
    locationName: "Kerning City",
    image: cdnUrl("103000000"),
    overlay: "linear-gradient(180deg, rgba(5,10,25,.50) 0%, rgba(2,5,18,.75) 100%)",
  },
  {
    zoneId: "perion",
    mapId: "273010000",
    locationName: "Twilight Perion",
    image: cdnUrl("273010000"),
    overlay: "linear-gradient(180deg, rgba(30,10,0,.48) 0%, rgba(20,5,0,.74) 100%)",
  },
  {
    zoneId: "sleepywood",
    mapId: "105000011",
    locationName: "Sleepywood",
    image: cdnUrl("105000011"),
    overlay: "linear-gradient(180deg, rgba(10,0,20,.52) 0%, rgba(6,0,15,.78) 100%)",
  },
  {
    zoneId: "ludibrium",
    mapId: "220010001",
    locationName: "Cloud Balcony",
    image: cdnUrl("220010001"),
    overlay: "linear-gradient(180deg, rgba(0,15,35,.45) 0%, rgba(0,10,28,.72) 100%)",
  },
  {
    zoneId: "omega_sector",
    mapId: "221030100",
    locationName: "Boswell Field I",
    image: cdnUrl("221030100"),
    overlay: "linear-gradient(180deg, rgba(0,20,15,.48) 0%, rgba(0,12,8,.74) 100%)",
  },
  {
    zoneId: "elnath",
    mapId: "211030000",
    locationName: "Cold Field I",
    image: cdnUrl("211030000"),
    overlay: "linear-gradient(180deg, rgba(0,10,30,.46) 0%, rgba(0,8,22,.72) 100%)",
  },
  {
    zoneId: "ice_valley",
    mapId: "211040100",
    locationName: "Ice Valley I",
    image: cdnUrl("211040100"),
    overlay: "linear-gradient(180deg, rgba(0,15,35,.48) 0%, rgba(0,10,28,.74) 100%)",
  },
  {
    zoneId: "aqua_road",
    mapId: "230030000",
    locationName: "Blue Seaweed Road",
    image: cdnUrl("230030000"),
    overlay: "linear-gradient(180deg, rgba(0,10,30,.46) 0%, rgba(0,8,25,.72) 100%)",
  },
  {
    zoneId: "minar_forest",
    mapId: "240030000",
    locationName: "Dragon Forest Entrance",
    image: cdnUrl("240030000"),
    overlay: "linear-gradient(180deg, rgba(5,20,0,.44) 0%, rgba(2,12,0,.70) 100%)",
  },
  {
    zoneId: "dragon_nest",
    mapId: "240040521",
    locationName: "Dangerous Dragon Nest",
    image: cdnUrl("240040521"),
    overlay: "linear-gradient(180deg, rgba(25,5,0,.52) 0%, rgba(18,0,0,.78) 100%)",
    tint: "rgba(120,20,0,.14)",
  },
  {
    zoneId: "mu_lung",
    mapId: "324030000",
    locationName: "Bear Territory",
    image: cdnUrl("324030000"),
    overlay: "linear-gradient(180deg, rgba(20,12,0,.46) 0%, rgba(14,8,0,.72) 100%)",
  },
  {
    zoneId: "nihal_desert",
    mapId: "260000201",
    locationName: "Ariant",
    image: cdnUrl("260000201"),
    overlay: "linear-gradient(180deg, rgba(35,20,0,.46) 0%, rgba(25,12,0,.72) 100%)",
  },
  {
    zoneId: "magatia",
    mapId: "261000000",
    locationName: "Magatia",
    image: cdnUrl("261000000"),
    overlay: "linear-gradient(180deg, rgba(30,15,0,.48) 0%, rgba(20,10,0,.74) 100%)",
  },
  {
    zoneId: "singapore",
    mapId: "103020100",
    locationName: "Kerning Railway",
    image: cdnUrl("103020100"),
    overlay: "linear-gradient(180deg, rgba(5,10,30,.50) 0%, rgba(2,6,22,.76) 100%)",
  },
  {
    zoneId: "masteria",
    mapId: "105200410",
    locationName: "Abyssal Cave",
    image: cdnUrl("105200410"),
    overlay: "linear-gradient(180deg, rgba(5,0,20,.54) 0%, rgba(3,0,15,.80) 100%)",
    tint: "rgba(0,0,30,.18)",
  },
  {
    zoneId: "crimsonwood",
    mapId: "105200410",
    locationName: "Crimsonwood Depths",
    image: cdnUrl("105200410"),
    overlay: "linear-gradient(180deg, rgba(25,0,5,.54) 0%, rgba(18,0,2,.80) 100%)",
    tint: "rgba(80,0,0,.22)",
  },
  {
    zoneId: "zipangu",
    mapId: "800020110",
    locationName: "A Night in the Forest",
    image: cdnUrl("800020110"),
    overlay: "linear-gradient(180deg, rgba(10,5,0,.46) 0%, rgba(8,3,0,.72) 100%)",
  },
  {
    zoneId: "leafre_sky",
    mapId: "240000111",
    locationName: "Before Takeoff",
    image: cdnUrl("240000111"),
    overlay: "linear-gradient(180deg, rgba(0,8,28,.44) 0%, rgba(0,5,20,.70) 100%)",
  },
  {
    zoneId: "temple_of_time",
    mapId: "328010000",
    locationName: "Memory Lane",
    image: cdnUrl("328010000"),
    overlay: "linear-gradient(180deg, rgba(8,0,25,.50) 0%, rgba(5,0,18,.76) 100%)",
    tint: "rgba(60,0,80,.12)",
  },
  {
    zoneId: "black_mage_lair",
    mapId: "328000000",
    locationName: "Dark Temple of Time",
    image: cdnUrl("328000000"),
    overlay: "linear-gradient(180deg, rgba(15,0,5,.56) 0%, rgba(10,0,2,.82) 100%)",
    tint: "rgba(40,0,0,.24)",
  },
];

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export const ZONE_BG_MAP: Record<string, ZoneBackground> = Object.fromEntries(
  ZONE_BACKGROUNDS.map((bg) => [bg.zoneId, bg]),
);

export function getZoneBackground(zoneId: string): ZoneBackground | undefined {
  return ZONE_BG_MAP[zoneId];
}
