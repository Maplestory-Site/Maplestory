import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getMapFeed } from "../server/maps/service.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const outputPath = path.join(projectRoot, "public", "maps-feed.json");

async function main() {
  const feed = await getMapFeed({ forceRefresh: true });
  await fs.writeFile(outputPath, JSON.stringify(feed, null, 2), "utf8");
  console.log(`Synced ${feed.items.length} map entries.`);
}

main().catch((error) => {
  console.error("[sync-maps] Failed to sync maps:", error);
  process.exitCode = 1;
});
