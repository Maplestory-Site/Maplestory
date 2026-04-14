import fs from "node:fs/promises";
import path from "node:path";

const DATA_FILE = path.join(process.cwd(), "server", "data", "cloud-progress.json");

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

export default async function handler(req, res) {
  const { userId } = req.method === "GET" ? req.query : req.body ?? {};

  if (!userId || typeof userId !== "string") {
    res.status(400).json({ error: "Missing userId." });
    return;
  }

  if (req.method === "GET") {
    const store = await readStore();
    res.status(200).json({ progress: store[userId] ?? null });
    return;
  }

  if (req.method === "POST") {
    const { progress } = req.body ?? {};
    if (!progress) {
      res.status(400).json({ error: "Missing progress payload." });
      return;
    }
    const store = await readStore();
    store[userId] = {
      ...progress,
      updatedAt: new Date().toISOString()
    };
    await writeStore(store);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: "Method not allowed." });
}
