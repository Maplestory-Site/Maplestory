import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getItemFeed } from "../server/items/service.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const outputPath = path.join(projectRoot, "public", "items-feed.json");

async function main() {
  const feed = await getItemFeed({ forceRefresh: true });
  await fs.writeFile(outputPath, JSON.stringify(feed, null, 2), "utf8");
  console.log(`Synced ${feed.items.length} item entries.`);
}

main().catch((error) => {
  console.error("[sync-items] Failed to sync items:", error);
  process.exitCode = 1;
});
