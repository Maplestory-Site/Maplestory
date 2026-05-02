import type { VideoItem } from "../data/siteContent";

export type ContentFilterKey = "all" | "boss" | "guide" | "funny" | "progression";

export type ContentFilterDefinition = {
  key: ContentFilterKey;
  label: string;
};

export const contentFilters: ContentFilterDefinition[] = [
  { key: "all", label: "All" },
  { key: "boss", label: "Boss" },
  { key: "guide", label: "Guides" },
  { key: "funny", label: "Funny" },
  { key: "progression", label: "Progression" }
];

function normalizeText(value: string) {
  return value.toLowerCase();
}

export function inferDisplayCategory(item: Pick<VideoItem, "category" | "title" | "description">): string {
  const category = normalizeText(item.category);
  const title = normalizeText(item.title);
  const description = normalizeText(item.description);
  const text = `${category} ${title} ${description}`;

  if (/(patch|v\.\d+|v\s*\d+|update preview|patch notes|maple university)/.test(text)) return "Patch Notes";
  if (/(inkwell|note|contest|community|summer is here|announcement)/.test(text)) return "News";
  if (/(live|stream|chill stream|lets cheat|come lets)/.test(text)) return "Live Stream";
  if (/(progress|zero to hero|upgrade|gear|cubing|meso|reboot|account|arcane|hexa|symbol)/.test(text)) return "Progression";
  if (/(guide|explained|how to|tips|what'?s next|skills?|class|build)/.test(text)) return "Guides";
  if (/(boss|lotus|damien|lucid|will|kalos|seren|gloom|vhilla|verus|weekly boss)/.test(text)) return "Bossing";
  if (/(funny|fail|reaction|clip)/.test(text)) return "Funny";
  return item.category || "Highlights";
}

export function getVideoDisplayDescription(item: Pick<VideoItem, "category" | "title" | "description">): string {
  const displayCategory = inferDisplayCategory(item);
  const rawDescription = item.description?.trim();

  if (displayCategory === "Live Stream") {
    return "Relaxed MapleStory live session with chat, farming, account progress, and moment-to-moment gameplay.";
  }

  if (displayCategory === "News") {
    return "MapleStory news and commentary with the important points pulled into a quick, readable watch card.";
  }

  if (displayCategory === "Patch Notes") {
    return "Patch notes and update coverage focused on what changed, what matters, and what players should check first.";
  }

  if (displayCategory === "Bossing") {
    return "Boss-focused gameplay, clear attempts, setup decisions, and combat lessons from the run.";
  }

  return rawDescription || "Watch the latest MapleStory upload from SNAILSLAYER.";
}

export function inferPrimaryCategory(item: Pick<VideoItem, "category" | "title" | "description">): ContentFilterKey {
  const displayCategory = inferDisplayCategory(item);
  const text = normalizeText(`${displayCategory} ${item.title} ${item.description}`);

  if (displayCategory === "Bossing") return "boss";
  if (displayCategory === "Guides" || displayCategory === "Patch Notes" || text.includes("guide") || text.includes("build") || text.includes("skill")) return "guide";
  if (text.includes("funny") || text.includes("fail") || text.includes("reaction") || text.includes("clip")) return "funny";
  return "progression";
}

export function inferContentTags(item: Pick<VideoItem, "category" | "title" | "description" | "tags">) {
  const existing = item.tags?.filter(Boolean) ?? [];
  if (existing.length) {
    return Array.from(new Set(existing)).slice(0, 3);
  }

  const primary = inferPrimaryCategory(item);
  const tags = new Set<string>();

  const displayCategory = inferDisplayCategory(item);

  if (displayCategory === "Live Stream") {
    tags.add("Live Session");
    tags.add("Chat");
  } else if (displayCategory === "News") {
    tags.add("News");
    tags.add("Discussion");
  } else if (displayCategory === "Patch Notes") {
    tags.add("Patch Notes");
    tags.add("Update");
  } else if (primary === "boss") {
    tags.add("Boss Fight");
    tags.add("Clean Clear");
  }

  if (primary === "guide" && !tags.size) {
    tags.add("Guide");
    tags.add("Build Tips");
  }

  if (primary === "funny") {
    tags.add("Funny Moment");
    tags.add("Clip");
  }

  if (primary === "progression" && !tags.size) {
    tags.add("Progression");
    tags.add("Account Push");
  }

  const text = `${normalizeText(item.title)} ${normalizeText(item.description)}`;

  if (text.includes("patch")) tags.add("Patch Notes");
  if (text.includes("class") || text.includes("skill")) tags.add("Class Update");
  if (text.includes("preview")) tags.add("Preview");
  if (text.includes("update")) tags.add("Update");
  if (text.includes("run")) tags.add("Live Run");

  return Array.from(tags).slice(0, 3);
}

export function matchesFilter(item: Pick<VideoItem, "category" | "title" | "description" | "tags">, filter: ContentFilterKey) {
  if (filter === "all") return true;
  return inferPrimaryCategory(item) === filter;
}

export function filterVideos(items: VideoItem[], filter: ContentFilterKey) {
  return items.filter((item) => matchesFilter(item, filter));
}
