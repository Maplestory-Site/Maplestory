import type { ClassJob } from "./classesJobs";

type ClassPreviewEntry = {
  className: string;
  sourceFaction: string;
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

export function getClassPreviewMatch(className: string) {
  return classPreviewLookup.get(normalizeClassName(className)) ?? null;
}

export function attachClassPreviewVideos<T extends ClassJob>(items: T[]) {
  return items.map((item) => {
    const preview = getClassPreviewMatch(item.name);

    return preview
      ? {
          ...item,
          previewVideo: preview.videoPath,
          previewVideoFaction: preview.sourceFaction
        }
      : item;
  });
}

export const classPreviewVideoEntries = classPreviewEntries;
