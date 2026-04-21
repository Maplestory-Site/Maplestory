import { getNewsFeed } from "../server/news/service.mjs";

async function main() {
  try {
    const feed = await getNewsFeed({ forceRefresh: true, persistBundled: true });
    console.log(`[sync-news] Synced ${feed.meta?.itemCount ?? "?"} official MapleStory news items.`);
  } catch (error) {
    console.warn("[sync-news] Remote fetch failed — news will use cached data.", error?.message ?? error);
    // Non-fatal: news feed failing should not crash the build
  }
}

main();
