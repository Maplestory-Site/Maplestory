import type { ClassJob } from "./classesJobs";

type ClassPreviewEntry = {
  className: string;
  sourceFaction: string;
  videoPath: string;
};

type ClassDetailPreviewEntry = {
  className: string;
  videoPath: string;
};

const classPreviewEntries: ClassPreviewEntry[] = [
  { className: "Hero", sourceFaction: "Explorers", videoPath: "/class-previews/Explorers/Hero.mp4" },
  { className: "Paladin", sourceFaction: "Explorers", videoPath: "/class-previews/Explorers/Paladin.mp4" },
  { className: "Dark Knight", sourceFaction: "Explorers", videoPath: "/class-previews/Explorers/Dark Knight.mp4" },
  {
    className: "Fire Poison Mage",
    sourceFaction: "Explorers",
    videoPath: "/class-previews/Explorers/Arch Mage (Fire, Poison).mp4"
  },
  {
    className: "Ice Lightning Mage",
    sourceFaction: "Explorers",
    videoPath: "/class-previews/Explorers/Arch Mage (Ice, Lightning).mp4"
  },
  { className: "Bishop", sourceFaction: "Explorers", videoPath: "/class-previews/Explorers/Bishop.mp4" },
  { className: "Bowmaster", sourceFaction: "Explorers", videoPath: "/class-previews/Explorers/Bowmaster.mp4" },
  { className: "Marksman", sourceFaction: "Explorers", videoPath: "/class-previews/Explorers/Marksman.mp4" },
  { className: "Pathfinder", sourceFaction: "Explorers", videoPath: "/class-previews/Explorers/Pathfinder.mp4" },
  { className: "Night Lord", sourceFaction: "Explorers", videoPath: "/class-previews/Explorers/Night Lord.mp4" },
  { className: "Shadower", sourceFaction: "Explorers", videoPath: "/class-previews/Explorers/Shadower.mp4" },
  { className: "Dual Blade", sourceFaction: "Explorers", videoPath: "/class-previews/Explorers/Dual Blade.mp4" },
  { className: "Buccaneer", sourceFaction: "Explorers", videoPath: "/class-previews/Explorers/Buccaneer.mp4" },
  { className: "Corsair", sourceFaction: "Explorers", videoPath: "/class-previews/Explorers/Corsair.mp4" },
  { className: "Cannoneer", sourceFaction: "Explorers", videoPath: "/class-previews/Explorers/Cannoneer.mp4" },
  { className: "Dawn Warrior", sourceFaction: "Cygnus Knights", videoPath: "/class-previews/Cygnus Knights/Dawn Warrior.mp4" },
  { className: "Blaze Wizard", sourceFaction: "Cygnus Knights", videoPath: "/class-previews/Cygnus Knights/Blaze Wizard.mp4" },
  { className: "Wind Archer", sourceFaction: "Cygnus Knights", videoPath: "/class-previews/Cygnus Knights/Wind Archer.mp4" },
  { className: "Night Walker", sourceFaction: "Cygnus Knights", videoPath: "/class-previews/Cygnus Knights/Night Walker.mp4" },
  {
    className: "Thunder Breaker",
    sourceFaction: "Cygnus Knights",
    videoPath: "/class-previews/Cygnus Knights/Thunder Breaker.mp4"
  },
  { className: "Mihile", sourceFaction: "Cygnus Knights", videoPath: "/class-previews/Cygnus Knights/Mihile.mp4" },
  { className: "Adele", sourceFaction: "Flora", videoPath: "/class-previews/Flora/Adele.mp4" },
  { className: "Ark", sourceFaction: "Flora", videoPath: "/class-previews/Flora/Ark.mp4" },
  { className: "Illium", sourceFaction: "Flora", videoPath: "/class-previews/Flora/Illium.mp4" },
  { className: "Khali", sourceFaction: "Flora", videoPath: "/class-previews/Flora/Khali.mp4" },
  { className: "Hoyoung", sourceFaction: "Anima", videoPath: "/class-previews/Anima/Hoyoung.mp4" },
  { className: "Lara", sourceFaction: "Anima", videoPath: "/class-previews/Anima/Lara.mp4" },
  { className: "Ren", sourceFaction: "Anima", videoPath: "/class-previews/Anima/Ren.mp4" },
  { className: "Aran", sourceFaction: "Heroes", videoPath: "/class-previews/Heroes/Aran.mp4" },
  { className: "Evan", sourceFaction: "Heroes", videoPath: "/class-previews/Heroes/Evan.mp4" },
  { className: "Luminous", sourceFaction: "Heroes", videoPath: "/class-previews/Heroes/Luminous.mp4" },
  { className: "Mercedes", sourceFaction: "Heroes", videoPath: "/class-previews/Heroes/Mercedes.mp4" },
  { className: "Phantom", sourceFaction: "Heroes", videoPath: "/class-previews/Heroes/Phantom.mp4" },
  { className: "Shade", sourceFaction: "Heroes", videoPath: "/class-previews/Heroes/Shade.mp4" },
  { className: "Lynn", sourceFaction: "Jianghu", videoPath: "/class-previews/Jianghu/Lynn.mp4" },
  { className: "Mo Xuan", sourceFaction: "Jianghu", videoPath: "/class-previews/Jianghu/Mo Xuan.mp4" },
  { className: "Sia Astelle", sourceFaction: "Shine", videoPath: "/class-previews/Shine/Sia Astelle.mp4" },
  { className: "Angelic Buster", sourceFaction: "Nova", videoPath: "/class-previews/Nova/Angelic Buster.mp4" },
  { className: "Cadena", sourceFaction: "Nova", videoPath: "/class-previews/Nova/Cadena.mp4" },
  { className: "Kain", sourceFaction: "Nova", videoPath: "/class-previews/Nova/Kain.mp4" },
  { className: "Kaiser", sourceFaction: "Nova", videoPath: "/class-previews/Nova/Kaiser.mp4" },
  { className: "Kinesis", sourceFaction: "Other", videoPath: "/class-previews/Other/Kinesis.mp4" },
  { className: "Zero", sourceFaction: "Other", videoPath: "/class-previews/Other/Zero.mp4" },
  { className: "Battle Mage", sourceFaction: "Resistance", videoPath: "/class-previews/Resistance/Battle Mage.mp4" },
  { className: "Blaster", sourceFaction: "Resistance", videoPath: "/class-previews/Resistance/Blaster.mp4" },
  { className: "Demon Avenger", sourceFaction: "Resistance", videoPath: "/class-previews/Resistance/Demon Avenger.mp4" },
  { className: "Demon Slayer", sourceFaction: "Resistance", videoPath: "/class-previews/Resistance/Demon Slayer.mp4" },
  { className: "Mechanic", sourceFaction: "Resistance", videoPath: "/class-previews/Resistance/Mechanic.mp4" },
  { className: "Wild Hunter", sourceFaction: "Resistance", videoPath: "/class-previews/Resistance/Wild Hunter.mp4" },
  { className: "Xenon", sourceFaction: "Resistance", videoPath: "/class-previews/Resistance/Xenon.mp4" },
  { className: "Hayato", sourceFaction: "Sengoku", videoPath: "/class-previews/Sengoku/Hayato.mp4" },
  { className: "Kanna", sourceFaction: "Sengoku", videoPath: "/class-previews/Sengoku/Kanna.mp4" }
];

const normalizeClassName = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const classPreviewLookup = new Map(
  classPreviewEntries.map((entry) => [normalizeClassName(entry.className), entry] as const)
);

const classDetailPreviewEntries: ClassDetailPreviewEntry[] = [
  { className: "Adele", videoPath: "/class-detail-previews/adele.mp4" },
  { className: "Angelic Buster", videoPath: "/class-detail-previews/angelic buster.mp4" },
  { className: "Aran", videoPath: "/class-detail-previews/aran.mp4" },
  { className: "Ark", videoPath: "/class-detail-previews/ark.mp4" },
  { className: "Battle Mage", videoPath: "/class-detail-previews/battle mage.mp4" },
  { className: "Bishop", videoPath: "/class-detail-previews/bishop.mp4" },
  { className: "Blaster", videoPath: "/class-detail-previews/blaster.mp4" },
  { className: "Blaze Wizard", videoPath: "/class-detail-previews/blaze-wizard.mp4" },
  { className: "Bowmaster", videoPath: "/class-detail-previews/bowmaster.mp4" },
  { className: "Buccaneer", videoPath: "/class-detail-previews/buccaneer.mp4" },
  { className: "Cadena", videoPath: "/class-detail-previews/cadena.mp4" },
  { className: "Cannoneer", videoPath: "/class-detail-previews/cannoneer.mp4" },
  { className: "Corsair", videoPath: "/class-detail-previews/corsair.mp4" },
  { className: "Dark Knight", videoPath: "/class-detail-previews/dark-knight.mp4" },
  { className: "Dawn Warrior", videoPath: "/class-detail-previews/dawn-warrior.mp4" },
  { className: "Demon Avenger", videoPath: "/class-detail-previews/demon-avenger.mp4" },
  { className: "Demon Slayer", videoPath: "/class-detail-previews/demon-slayer.mp4" },
  { className: "Dual Blade", videoPath: "/class-detail-previews/dual-blade.mp4" },
  { className: "Evan", videoPath: "/class-detail-previews/evan.mp4" },
  { className: "Fire Poison Mage", videoPath: "/class-detail-previews/fire-poison-arch-mage.mp4" },
  { className: "Hayato", videoPath: "/class-detail-previews/hayato.mp4" },
  { className: "Hero", videoPath: "/class-detail-previews/hero.mp4" },
  { className: "Hoyoung", videoPath: "/class-detail-previews/hoyung.mp4" },
  { className: "Ice Lightning Mage", videoPath: "/class-detail-previews/ice lightening-arch-mage.mp4" },
  { className: "Illium", videoPath: "/class-detail-previews/ilium.mp4" },
  { className: "Kain", videoPath: "/class-detail-previews/kain.mp4" },
  { className: "Kaiser", videoPath: "/class-detail-previews/kaiser.mp4" },
  { className: "Kanna", videoPath: "/class-detail-previews/kanna.mp4" },
  { className: "Khali", videoPath: "/class-detail-previews/khali.mp4" },
  { className: "Kinesis", videoPath: "/class-detail-previews/kinesis.mp4" },
  { className: "Lara", videoPath: "/class-detail-previews/lara.mp4" },
  { className: "Luminous", videoPath: "/class-detail-previews/luminous.mp4" },
  { className: "Lynn", videoPath: "/class-detail-previews/Lynn.mp4" },
  { className: "Marksman", videoPath: "/class-detail-previews/marksman.mp4" },
  { className: "Mechanic", videoPath: "/class-detail-previews/mechanic.mp4" },
  { className: "Mercedes", videoPath: "/class-detail-previews/mercedes.mp4" },
  { className: "Mihile", videoPath: "/class-detail-previews/mihile.mp4" },
  { className: "Mo Xuan", videoPath: "/class-detail-previews/Mo Xuan.mp4" },
  { className: "Night Lord", videoPath: "/class-detail-previews/night-lord.mp4" },
  { className: "Night Walker", videoPath: "/class-detail-previews/night-walker.mp4" },
  { className: "Paladin", videoPath: "/class-detail-previews/paladin.mp4" },
  { className: "Pathfinder", videoPath: "/class-detail-previews/pathfinder_1.mp4" },
  { className: "Phantom", videoPath: "/class-detail-previews/phantom.mp4" },
  { className: "Ren", videoPath: "/class-detail-previews/ren.mp4" },
  { className: "Shade", videoPath: "/class-detail-previews/shade.mp4" },
  { className: "Shadower", videoPath: "/class-detail-previews/shadower.mp4" },
  { className: "Sia Astelle", videoPath: "/class-detail-previews/Sia Astelle.mp4" },
  { className: "Thunder Breaker", videoPath: "/class-detail-previews/thunderbreaker.mp4" },
  { className: "Wild Hunter", videoPath: "/class-detail-previews/vid-571-wild-hunter-overview.mp4" },
  { className: "Wind Archer", videoPath: "/class-detail-previews/wind-archer.mp4" },
  { className: "Xenon", videoPath: "/class-detail-previews/xenon.mp4" },
  { className: "Zero", videoPath: "/class-detail-previews/zero.mp4" }
];

const classDetailPreviewLookup = new Map(
  classDetailPreviewEntries.map((entry) => [normalizeClassName(entry.className), entry] as const)
);

export function getClassPreviewMatch(className: string) {
  return classPreviewLookup.get(normalizeClassName(className)) ?? null;
}

export function attachClassPreviewVideos<T extends ClassJob>(items: T[]) {
  return items.map((item) => {
    const preview = getClassPreviewMatch(item.name);
    const detailPreview = classDetailPreviewLookup.get(normalizeClassName(item.name));

    return {
      ...item,
      previewVideo: preview?.videoPath ?? item.previewVideo,
      previewVideoFaction: preview?.sourceFaction ?? item.previewVideoFaction,
      detailPreviewVideo: detailPreview?.videoPath ?? item.detailPreviewVideo
    };
  });
}

export const classPreviewVideoEntries = classPreviewEntries;
export const classDetailVideoEntries = classDetailPreviewEntries;
