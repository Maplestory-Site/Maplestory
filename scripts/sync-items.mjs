import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getItemFeed } from "../server/items/service.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const outputPath = path.join(projectRoot, "public", "items-feed.json");

async function readExisting() {
  try {
    const raw = await fs.readFile(outputPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function main() {
  const existing = await readExisting();
  try {
    const feed = await getItemFeed({ forceRefresh: true });
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(feed, null, 2), "utf8");
    console.log(`[sync-items] Synced ${feed.items?.length ?? "?"} item entries.`);
  } catch (error) {
    if (existing) {
      console.warn("[sync-items] Remote fetch failed — using cached data.");
      return;
    }
    console.error("[sync-items] Failed to sync items:", error);
    process.exitCode = 1;
  }
}

main();
