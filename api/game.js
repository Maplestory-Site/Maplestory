import fs from "node:fs/promises";
import path from "node:path";

const LEADERBOARD_FILE = path.join(process.cwd(), "server", "data", "leaderboard.json");
const PROGRESS_FILE = path.join(process.cwd(), "server", "data", "cloud-progress.json");
const ROOMS_FILE = path.join(process.cwd(), "server", "data", "rooms.json");

async function readStore(file) {
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeStore(file, payload) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(payload, null, 2), "utf8");
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

function generateRoomId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let index = 0; index < 6; index += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function normalizePlayer({ userId, username }) {
  return {
    userId,
    username,
    score: null,
    ready: false,
    lastSeen: new Date().toISOString()
  };
}

function withUpdatedRoom(room, userId, update) {
  const players = room.players.map((player) =>
    player.userId === userId
      ? {
          ...player,
          ...update,
          lastSeen: new Date().toISOString()
        }
      : player
  );

  const hasBothScores = players.length >= 2 && players.every((player) => typeof player.score === "number");

  return {
    ...room,
    players,
    status: hasBothScores ? "finished" : room.status,
    updatedAt: new Date().toISOString()
  };
}

async function handleLeaderboard(req, res) {
  if (req.method === "GET") {
    const { gameId, userId } = req.query;
    if (!gameId || typeof gameId !== "string") {
      res.status(400).json({ error: "Missing gameId." });
      return;
    }

    const store = await readStore(LEADERBOARD_FILE);
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

    const store = await readStore(LEADERBOARD_FILE);
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
    await writeStore(LEADERBOARD_FILE, store);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: "Method not allowed." });
}

async function handleProgress(req, res) {
  const { userId } = req.method === "GET" ? req.query : req.body ?? {};

  if (!userId || typeof userId !== "string") {
    res.status(400).json({ error: "Missing userId." });
    return;
  }

  if (req.method === "GET") {
    const store = await readStore(PROGRESS_FILE);
    res.status(200).json({ progress: store[userId] ?? null });
    return;
  }

  if (req.method === "POST") {
    const { progress } = req.body ?? {};
    if (!progress) {
      res.status(400).json({ error: "Missing progress payload." });
      return;
    }

    const store = await readStore(PROGRESS_FILE);
    store[userId] = {
      ...progress,
      updatedAt: new Date().toISOString()
    };
    await writeStore(PROGRESS_FILE, store);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: "Method not allowed." });
}

async function handleRooms(req, res) {
  if (req.method === "GET") {
    const { roomId } = req.query;
    if (!roomId || typeof roomId !== "string") {
      res.status(400).json({ error: "Missing roomId." });
      return;
    }

    const store = await readStore(ROOMS_FILE);
    res.status(200).json({ room: store[roomId] ?? null });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const { action } = req.body ?? {};
  const store = await readStore(ROOMS_FILE);

  if (action === "create") {
    const { gameId, userId, username } = req.body ?? {};
    if (!gameId || !userId || !username) {
      res.status(400).json({ error: "Missing room payload." });
      return;
    }

    const roomId = generateRoomId();
    const room = {
      id: roomId,
      gameId,
      status: "lobby",
      players: [normalizePlayer({ userId, username })],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    store[roomId] = room;
    await writeStore(ROOMS_FILE, store);
    res.status(200).json({ room });
    return;
  }

  if (action === "join") {
    const { roomId, userId, username } = req.body ?? {};
    const room = store[roomId];

    if (!room) {
      res.status(404).json({ error: "Room not found." });
      return;
    }

    if (room.players.some((player) => player.userId === userId)) {
      res.status(200).json({ room });
      return;
    }

    if (room.players.length >= 2) {
      res.status(400).json({ error: "Room is full." });
      return;
    }

    room.players.push(normalizePlayer({ userId, username }));
    room.updatedAt = new Date().toISOString();
    store[roomId] = room;
    await writeStore(ROOMS_FILE, store);
    res.status(200).json({ room });
    return;
  }

  if (action === "update") {
    const { roomId, userId, score, ready } = req.body ?? {};
    const room = store[roomId];

    if (!room) {
      res.status(404).json({ error: "Room not found." });
      return;
    }

    const next = withUpdatedRoom(room, userId, {
      ...(typeof score === "number" ? { score } : {}),
      ...(typeof ready === "boolean" ? { ready } : {})
    });

    store[roomId] = next;
    await writeStore(ROOMS_FILE, store);
    res.status(200).json({ room: next });
    return;
  }

  if (action === "start") {
    const { roomId } = req.body ?? {};
    const room = store[roomId];

    if (!room) {
      res.status(404).json({ error: "Room not found." });
      return;
    }

    if (room.players.length < 2) {
      res.status(400).json({ error: "Need two players." });
      return;
    }

    room.status = "running";
    room.updatedAt = new Date().toISOString();
    store[roomId] = room;
    await writeStore(ROOMS_FILE, store);
    res.status(200).json({ room });
    return;
  }

  if (action === "leave") {
    const { roomId, userId } = req.body ?? {};
    const room = store[roomId];

    if (!room) {
      res.status(404).json({ error: "Room not found." });
      return;
    }

    room.players = room.players.filter((player) => player.userId !== userId);
    room.updatedAt = new Date().toISOString();

    if (!room.players.length) {
      delete store[roomId];
    } else {
      store[roomId] = room;
    }

    await writeStore(ROOMS_FILE, store);
    res.status(200).json({ room: store[roomId] ?? null });
    return;
  }

  res.status(400).json({ error: "Unknown action." });
}

export default async function handler(req, res) {
  const resource = String(req.query?.resource ?? "");

  if (!resource) {
    res.status(400).json({ error: "Missing resource parameter." });
    return;
  }

  if (resource === "leaderboard") {
    await handleLeaderboard(req, res);
    return;
  }

  if (resource === "progress") {
    await handleProgress(req, res);
    return;
  }

  if (resource === "rooms") {
    await handleRooms(req, res);
    return;
  }

  res.status(404).json({ error: "Unknown game resource." });
}
