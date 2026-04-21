import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getMonsterFeed } from "../server/monsters/service.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const outputPath = path.join(projectRoot, "public", "monsters-feed.json");

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
    const feed = await getMonsterFeed({ forceRefresh: true });
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(feed, null, 2), "utf8");
    console.log(`[sync-monsters] Synced ${feed.meta?.itemCount ?? feed.items?.length ?? "?"} monster entries.`);
  } catch (error) {
    if (existing) {
      console.warn("[sync-monsters] Remote fetch failed — using cached data.");
      return;
    }
    console.error("[sync-monsters] Failed to sync monsters feed:", error);
    process.exitCode = 1;
  }
}

main();
