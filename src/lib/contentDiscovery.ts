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

export function inferPrimaryCategory(item: Pick<VideoItem, "category" | "title" | "description">): ContentFilterKey {
  const category = normalizeText(item.category);
  const title = normalizeText(item.title);
  const description = normalizeText(item.description);
  const text = `${category} ${title} ${description}`;

  if (text.includes("boss")) return "boss";
  if (text.includes("guide") || text.includes("build") || text.includes("skill")) return "guide";
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

  if (primary === "boss") {
    tags.add("Boss Fight");
    tags.add("Clean Clear");
  }

  if (primary === "guide") {
    tags.add("Guide");
    tags.add("Build Tips");
  }

  if (primary === "funny") {
    tags.add("Funny Moment");
    tags.add("Clip");
  }

  if (primary === "progression") {
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
