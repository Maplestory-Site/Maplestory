import fs from "node:fs/promises";

/**
 * Counts the items in a feed payload. Tolerates several shapes:
 *  - { items: [...] }
 *  - { entries: [...] }
 *  - { data: [...] }
 *  - bare arrays
 *  - newsFeed-style { items: [...], meta: { itemCount: N } }
 */
export function countFeedItems(feed) {
  if (!feed) return 0;
  if (Array.isArray(feed)) return feed.length;
  // Take the max across every shape we know — the news feed in particular
  // can have an empty `items` array while `meta.itemCount` reports the
  // real cache size of a previously synced (but later trimmed) snapshot.
  const counts = [
    Array.isArray(feed.items)   ? feed.items.length   : 0,
    Array.isArray(feed.entries) ? feed.entries.length : 0,
    Array.isArray(feed.data)    ? feed.data.length    : 0,
    typeof feed.meta?.itemCount === "number" ? feed.meta.itemCount : 0
  ];
  return Math.max(0, ...counts);
}

/**
 * Read a JSON file, returning null if missing/invalid.
 */
export async function readJsonOrNull(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Decide whether a fresh feed should overwrite an existing on-disk feed.
 *
 * Rule: NEVER overwrite a non-empty existing feed with an empty fresh feed.
 * Returns:
 *   { action: "write", reason: ... }    -> caller should write `fresh`
 *   { action: "preserve", reason: ... } -> caller should keep `existing`
 *   { action: "fail", reason: ... }     -> caller should error out
 */
export function decideFeedWrite({ fresh, existing, label = "feed" }) {
  const freshCount = countFeedItems(fresh);
  const existingCount = countFeedItems(existing);

  // No fresh data at all (network down / parse failure handled separately).
  if (!fresh) {
    if (existingCount > 0) {
      return { action: "preserve", reason: `No fresh ${label}; keeping cached ${existingCount} entries.` };
    }
    return { action: "fail", reason: `No fresh ${label} and no cached fallback available.` };
  }

  // Fresh fetch returned 0 items but a cached feed exists: this is the bug
  // the audit flagged — DO NOT overwrite, mark stale instead.
  if (freshCount === 0 && existingCount > 0) {
    return {
      action: "preserve",
      reason: `Fresh ${label} returned 0 entries; keeping cached ${existingCount} entries.`
    };
  }

  // Otherwise it's safe to write.
  return { action: "write", reason: `Writing ${freshCount} ${label} entries.` };
}
