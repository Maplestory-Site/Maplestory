import { getNewsFeed } from "../server/news/service.mjs";

async function main() {
  const feed = await getNewsFeed({ forceRefresh: true, persistBundled: true });
  console.log(`Synced ${feed.meta.itemCount} official MapleStory news items.`);
}

main().catch((error) => {
  console.error("Failed to sync official MapleStory news.");
  console.error(error);
  process.exit(1);
});
