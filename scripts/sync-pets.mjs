import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getPetFeed } from "../server/pets/service.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const outputPath = path.join(projectRoot, "public", "pets-feed.json");

async function main() {
  const feed = await getPetFeed();
  await fs.writeFile(outputPath, JSON.stringify(feed, null, 2), "utf8");
  console.log(`Synced ${feed.items.length} pet entries.`);
}

main().catch((error) => {
  console.error("[sync-pets] Failed to sync pets:", error);
  process.exitCode = 1;
});
