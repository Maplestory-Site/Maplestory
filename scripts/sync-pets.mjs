import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getPetFeed } from "../server/pets/service.mjs";
import { decideFeedWrite, readJsonOrNull } from "./lib/sync-guard.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const outputPath = path.join(projectRoot, "public", "pets-feed.json");

async function main() {
  const existing = await readJsonOrNull(outputPath);

  let fresh = null;
  try {
    fresh = await getPetFeed({ forceRefresh: true });
  } catch (error) {
    console.warn("[sync-pets] Remote fetch threw:", error?.message ?? error);
  }

  const decision = decideFeedWrite({ fresh, existing, label: "pet" });

  if (decision.action === "preserve") {
    console.warn(`[sync-pets] preserving cache: ${decision.reason}`);
    return;
  }
  if (decision.action === "fail") {
    console.error(`[sync-pets] ${decision.reason}`);
    process.exitCode = 1;
    return;
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(fresh, null, 2), "utf8");
  console.log(`[sync-pets] ${decision.reason}`);
}

main();
