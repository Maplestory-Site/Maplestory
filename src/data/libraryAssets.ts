import type { LibraryCategory, LibraryGuide } from "./libraryGuides";

export type LibraryIconKey =
  | "trending-up"
  | "compass"
  | "skull"
  | "calendar"
  | "shield"
  | "sword"
  | "star"
  | "zap"
  | "link"
  | "sparkles"
  | "help-circle"
  | "book"
  | "globe"
  | "tool"
  | "users"
  | "fire"
  | "keyboard"
  | "alert-triangle";

export const LIBRARY_ICON_PATHS: Record<LibraryIconKey, string> = {
  "trending-up": "M3 17l6-6 4 4 8-8M14 7h7v7",
  compass: "M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Zm4-14-2 6-6 2 2-6 6-2Z",
  skull:
    "M12 2a8 8 0 0 0-5 14v3l2 1 1-2h4l1 2 2-1v-3a8 8 0 0 0-5-14ZM9 12a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm6 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM10 16h4",
  calendar: "M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2ZM8 3v4M16 3v4",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z",
  sword: "M14.5 9.5 4 20l1 1 10.5-10.5M14.5 9.5 18 6l3 3-3.5 3.5M14.5 9.5 18 13",
  star:
    "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z",
  zap: "M13 2 3 14h7l-1 8 10-12h-7l1-8Z",
  link: "M10 13a5 5 0 0 1 0-7l2-2a5 5 0 0 1 7 7l-1 1M14 11a5 5 0 0 1 0 7l-2 2a5 5 0 0 1-7-7l1-1",
  sparkles:
    "M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3ZM19 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3ZM5 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z",
  "help-circle": "M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Zm0-7v.01M9.5 9a2.5 2.5 0 1 1 4 2c-.7.7-1.5 1-1.5 2",
  book: "M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4V4ZM4 16a4 4 0 0 1 4-4h12",
  globe:
    "M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20ZM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20",
  tool: "M14.7 6.3a4 4 0 0 1 5 5l-9.5 9.5-4-1-1-4 9.5-9.5ZM5 19l-1 1",
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  fire: "M12 2c2 4 6 6 6 11a6 6 0 0 1-12 0c0-3 1-5 3-7 0 2 1 3 2 3 0-3 0-5 1-7Z",
  keyboard:
    "M2 6h20a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1ZM6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10",
  "alert-triangle": "M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0ZM12 9v4M12 17h.01"
};

export type LibraryCategoryAsset = {
  icon: LibraryIconKey;
  gradient: string;
  accent: string;
  cardImage: string;
  heroImage: string;
  fallbackImage: string;
  description: string;
};

export const libraryCategoryAssets: Record<LibraryCategory, LibraryCategoryAsset> = {
  Beginner: {
    icon: "sparkles",
    gradient: "linear-gradient(135deg, #75e2a6 0%, #2d7a52 100%)",
    accent: "#75e2a6",
    cardImage: "/library/grandis/logo.png",
    heroImage: "/library/grandis/logo.png",
    fallbackImage: "/library/beginner.svg",
    description: "Fast answers for new and returning players."
  },
  Content: {
    icon: "compass",
    gradient: "linear-gradient(135deg, #f6c66a 0%, #c97a2b 100%)",
    accent: "#f6c66a",
    cardImage: "/library/grandis/headers/grandis-library.png",
    heroImage: "/library/grandis/headers/grandis-library.png",
    fallbackImage: "/library/content.svg",
    description: "Progression, bosses, systems, and unlocks."
  },
  Classes: {
    icon: "sword",
    gradient: "linear-gradient(135deg, #b997ff 0%, #5d39c3 100%)",
    accent: "#b997ff",
    cardImage: "/library/grandis/headers/verdel-block.png",
    heroImage: "/library/grandis/headers/verdel-block.png",
    fallbackImage: "/library/classes.svg",
    description: "Class identity, stats, links, Legion, and terms."
  },
  Equipment: {
    icon: "shield",
    gradient: "linear-gradient(135deg, #7bd9ff 0%, #2965c3 100%)",
    accent: "#7bd9ff",
    cardImage: "/library/grandis/headers/borderless-block.png",
    heroImage: "/library/grandis/headers/borderless-block.png",
    fallbackImage: "/library/equipment.svg",
    description: "Enhancement, Star Force, potential, and set effects."
  },
  Events: {
    icon: "fire",
    gradient: "linear-gradient(135deg, #ff7f6a 0%, #b3361f 100%)",
    accent: "#ff7f6a",
    cardImage: "/library/grandis/headers/fox-valley-block.png",
    heroImage: "/library/grandis/headers/fox-valley-block.png",
    fallbackImage: "/library/events.svg",
    description: "Burning, relays, rewards, and event planning."
  },
  Resources: {
    icon: "globe",
    gradient: "linear-gradient(135deg, #9bd3a8 0%, #2c6a4e 100%)",
    accent: "#9bd3a8",
    cardImage: "/library/grandis/headers/ristonia-block.png",
    heroImage: "/library/grandis/headers/ristonia-block.png",
    fallbackImage: "/library/resources.svg",
    description: "Trusted links, tools, creators, and FAQ."
  }
};

const TAG_ICON_HINTS: Array<[string, LibraryIconKey]> = [
  ["progression", "trending-up"],
  ["boss", "skull"],
  ["event", "calendar"],
  ["star-force", "star"],
  ["potential", "sparkles"],
  ["link", "link"],
  ["skill", "sparkles"],
  ["legion", "users"],
  ["attack-speed", "zap"],
  ["stat", "zap"],
  ["equipment", "shield"],
  ["shortcut", "keyboard"],
  ["status", "alert-triangle"],
  ["faq", "help-circle"],
  ["wiki", "book"],
  ["tool", "tool"],
  ["calculator", "tool"],
  ["community", "users"],
  ["official", "globe"],
  ["burning", "fire"]
];

const GUIDE_IMAGE_HINTS: Array<[string, string]> = [
  ["boss-prequests", "/library/guides/boss-prequests.svg"],
  ["boss", "/library/bosses.svg"],
  ["progression", "/library/guides/progression-roadmap.svg"],
  ["leveling", "/library/guides/level-content-guide.svg"],
  ["level", "/library/guides/level-content-guide.svg"],
  ["keyboard", "/library/guides/keyboard-shortcuts.svg"],
  ["shortcut", "/library/guides/keyboard-shortcuts.svg"],
  ["abnormal", "/library/guides/abnormal-statuses.svg"],
  ["status", "/library/guides/abnormal-statuses.svg"],
  ["link-skills", "/library/guides/link-skills.svg"],
  ["link", "/library/guides/link-skills.svg"],
  ["legion", "/library/legion.svg"],
  ["attack-speed", "/library/guides/attack-speed.svg"],
  ["fifth-job", "/library/guides/fifth-job-skills.svg"],
  ["5th-job", "/library/guides/fifth-job-skills.svg"],
  ["v-matrix", "/library/guides/v-matrix.svg"],
  ["hexa", "/library/guides/hexa-skills.svg"],
  ["rotation", "/library/guides/skill-rotation.svg"],
  ["burst", "/library/guides/burst-and-bind.svg"],
  ["bind", "/library/guides/burst-and-bind.svg"],
  ["star-force", "/library/star-force.svg"],
  ["star", "/library/star-force.svg"],
  ["upgrade", "/library/equipment-upgrade.svg"],
  ["enhancing", "/library/equipment-upgrade.svg"],
  ["equipment", "/library/equipment-upgrade.svg"],
  ["set-effects", "/library/equipment.svg"],
  ["burning", "/library/burning.svg"],
  ["event", "/library/events.svg"],
  ["resource", "/library/resources.svg"],
  ["tool", "/library/resources.svg"],
  ["faq", "/library/beginner.svg"],
  ["beginner", "/library/beginner.svg"]
];

function guideSearchText(
  guide: Pick<LibraryGuide, "category"> & { title?: string; tags?: string[]; subcategory?: string }
): string {
  return [guide.title ?? "", guide.category, guide.subcategory ?? "", ...(guide.tags ?? [])].join(" ").toLowerCase();
}

export function getCategoryAsset(category: LibraryCategory): LibraryCategoryAsset {
  return libraryCategoryAssets[category] ?? libraryCategoryAssets.Content;
}

export function getGuideIcon(
  guide: Pick<LibraryGuide, "category"> & { tags?: string[]; iconKey?: LibraryIconKey }
): LibraryIconKey {
  if (guide.iconKey && LIBRARY_ICON_PATHS[guide.iconKey]) return guide.iconKey;
  const haystack = (guide.tags ?? []).join(" ").toLowerCase();
  for (const [hint, key] of TAG_ICON_HINTS) {
    if (haystack.includes(hint)) return key;
  }
  return getCategoryAsset(guide.category).icon;
}

export function getGuideVisualImage(
  guide: Pick<LibraryGuide, "category"> & { title?: string; tags?: string[]; subcategory?: string }
): string {
  const haystack = guideSearchText(guide);
  for (const [hint, image] of GUIDE_IMAGE_HINTS) {
    if (haystack.includes(hint)) return image;
  }
  return getCategoryAsset(guide.category).cardImage;
}

export function getGuideCardImage(
  guide: Pick<LibraryGuide, "category"> & {
    title?: string;
    tags?: string[];
    subcategory?: string;
    heroImage?: string;
    image?: string;
    cardImage?: string;
    keyPoints?: string[];
    sections?: LibraryGuide["sections"];
  }
): string {
  if (guide.cardImage) return guide.cardImage;
  if (guide.heroImage) return guide.heroImage;
  if (guide.image) return guide.image;
  const sectionImg = guide.sections?.find((section) => section.image)?.image;
  if (sectionImg) return sectionImg;
  return getGuideVisualImage(guide);
}

export function getGuideHeroImage(
  guide: Pick<LibraryGuide, "category"> & {
    title?: string;
    tags?: string[];
    subcategory?: string;
    heroImage?: string;
    image?: string;
    cardImage?: string;
    keyPoints?: string[];
    sections?: LibraryGuide["sections"];
  }
): string {
  if (guide.heroImage) return guide.heroImage;
  if (guide.cardImage) return guide.cardImage;
  if (guide.image) return guide.image;
  const sectionImg = guide.sections?.find((section) => section.image)?.image;
  if (sectionImg) return sectionImg;
  return getGuideVisualImage(guide);
}

export function getGuideTheme(guide: Pick<LibraryGuide, "category">): { gradient: string; accent: string } {
  const asset = getCategoryAsset(guide.category);
  return { gradient: asset.gradient, accent: asset.accent };
}

export function hasOwnImage(guide: { heroImage?: string; image?: string; cardImage?: string }): boolean {
  return Boolean(guide.heroImage || guide.cardImage || guide.image);
}
