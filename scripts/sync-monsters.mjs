import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getMonsterFeed } from "../server/monsters/service.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const outputPath = path.join(projectRoot, "public", "monsters-feed.json");

async function main() {
  const feed = await getMonsterFeed({ forceRefresh: true });
  await fs.writeFile(outputPath, JSON.stringify(feed, null, 2), "utf8");
  console.log(`Synced ${feed.meta.itemCount} monster entries.`);
}

main().catch((error) => {
  console.error("Failed to sync monsters feed.");
  console.error(error);
  process.exit(1);
});
