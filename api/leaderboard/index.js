import fs from "node:fs/promises";
import path from "node:path";

const DATA_FILE = path.join(process.cwd(), "server", "data", "leaderboard.json");

async function readStore() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeStore(payload) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(payload, null, 2), "utf8");
}

function buildRankings(entries, userId) {
  const sorted = entries.slice().sort((a, b) => b.score - a.score);
  const top = sorted.slice(0, 10);
  const index = userId ? sorted.findIndex((entry) => entry.userId === userId) : -1;
  return {
    entries: top,
    userRank: index >= 0 ? index + 1 : undefined
  };
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { gameId, userId } = req.query;
    if (!gameId || typeof gameId !== "string") {
      res.status(400).json({ error: "Missing gameId." });
      return;
    }
    const store = await readStore();
    const entries = store[gameId] ?? [];
    res.status(200).json(buildRankings(entries, typeof userId === "string" ? userId : undefined));
    return;
  }

  if (req.method === "POST") {
    const { userId, username, gameId, score } = req.body ?? {};
    if (!userId || !username || !gameId || typeof score !== "number") {
      res.status(400).json({ error: "Missing leaderboard payload." });
      return;
    }
    const store = await readStore();
    const entries = store[gameId] ?? [];
    const existing = entries.find((entry) => entry.userId === userId);
    if (existing) {
      if (score > existing.score) {
        existing.score = score;
        existing.username = username;
        existing.updatedAt = new Date().toISOString();
      }
    } else {
      entries.push({
        userId,
        username,
        score,
        createdAt: new Date().toISOString()
      });
    }
    store[gameId] = entries;
    await writeStore(store);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: "Method not allowed." });
}
