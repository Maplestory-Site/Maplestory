import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getQuestFeed } from "../server/quests/service.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const outputPath = path.join(projectRoot, "public", "quests-feed.json");

async function main() {
  const feed = await getQuestFeed({ forceRefresh: true });
  await fs.writeFile(outputPath, JSON.stringify(feed, null, 2), "utf8");
  console.log(`Synced ${feed.items.length} quest entries.`);
}

main().catch((error) => {
  console.error("[sync-quests] Failed to sync quests:", error);
  process.exitCode = 1;
});
