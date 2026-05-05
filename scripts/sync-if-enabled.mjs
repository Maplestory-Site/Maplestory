import { spawnSync } from "node:child_process";

const SHOULD_SYNC = String(process.env.SYNC_REMOTE_ON_BUILD ?? "").toLowerCase() === "true";

if (!SHOULD_SYNC) {
  console.log("[sync] Skipping remote content sync. Set SYNC_REMOTE_ON_BUILD=true to enable.");
  process.exit(0);
}

const scripts = [
  "sync-youtube.mjs",
  "sync-twitch.mjs",
  "sync-news.mjs",
  "sync-monsters.mjs",
  "sync-items.mjs",
  "sync-maps.mjs",
  "sync-pets.mjs",
  "sync-quests.mjs"
];

for (const script of scripts) {
  const result = spawnSync(process.execPath, [`./scripts/${script}`], {
    stdio: "inherit",
    shell: false
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
