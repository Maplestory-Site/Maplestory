import fs from "node:fs/promises";
import path from "node:path";

const LEADERBOARD_FILE = path.join(process.cwd(), "server", "data", "leaderboard.json");
const PROGRESS_FILE = path.join(process.cwd(), "server", "data", "cloud-progress.json");
const ROOMS_FILE = path.join(process.cwd(), "server", "data", "rooms.json");
const USERS_FILE = path.join(process.cwd(), "server", "data", "users.json");
const GUILDS_FILE = path.join(process.cwd(), "server", "data", "guilds.json");
const CHAT_FILE = path.join(process.cwd(), "server", "data", "global-chat.json");

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

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt
  };
}

function sanitizeText(value, fallback = "") {
  return String(value ?? fallback).trim().slice(0, 180);
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

async function handleAuth(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const { action, username, email, password } = req.body ?? {};
  const safeEmail = sanitizeText(email).toLowerCase();
  const safeName = sanitizeText(username, "Maple Player") || "Maple Player";
  const users = await readStore(USERS_FILE);
  const entries = Array.isArray(users.entries) ? users.entries : [];

  if (action === "signup") {
    if (!safeEmail || !password) {
      res.status(400).json({ error: "Missing signup payload." });
      return;
    }
    if (entries.some((user) => user.email === safeEmail)) {
      res.status(409).json({ error: "Account already exists." });
      return;
    }
    const user = {
      id: `${safeEmail}-${Date.now()}`,
      username: safeName,
      email: safeEmail,
      password: String(password),
      createdAt: new Date().toISOString()
    };
    entries.push(user);
    await writeStore(USERS_FILE, { entries });
    res.status(200).json({ user: publicUser(user) });
    return;
  }

  if (action === "login") {
    const user = entries.find((entry) => entry.email === safeEmail && entry.password === String(password));
    if (!user) {
      res.status(401).json({ error: "Invalid login." });
      return;
    }
    res.status(200).json({ user: publicUser(user) });
    return;
  }

  res.status(400).json({ error: "Unknown auth action." });
}

async function handleGuilds(req, res) {
  const store = await readStore(GUILDS_FILE);
  const guilds = Array.isArray(store.guilds) ? store.guilds : [];

  if (req.method === "GET") {
    res.status(200).json({ guilds: guilds.slice(0, 20) });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const { action, userId, username, guildId, name } = req.body ?? {};

  if (action === "create") {
    const guildName = sanitizeText(name, "Maple Guild").slice(0, 32) || "Maple Guild";
    const guild = {
      id: `${guildName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      name: guildName,
      ownerId: userId,
      members: [{ userId, username: sanitizeText(username, "Player") }],
      createdAt: new Date().toISOString()
    };
    guilds.push(guild);
    await writeStore(GUILDS_FILE, { guilds });
    res.status(200).json({ guild });
    return;
  }

  if (action === "join") {
    const guild = guilds.find((entry) => entry.id === guildId);
    if (!guild) {
      res.status(404).json({ error: "Guild not found." });
      return;
    }
    if (!guild.members.some((member) => member.userId === userId)) {
      guild.members.push({ userId, username: sanitizeText(username, "Player") });
    }
    await writeStore(GUILDS_FILE, { guilds });
    res.status(200).json({ guild });
    return;
  }

  res.status(400).json({ error: "Unknown guild action." });
}

async function handleChat(req, res) {
  const store = await readStore(CHAT_FILE);
  const messages = Array.isArray(store.messages) ? store.messages : [];

  if (req.method === "GET") {
    res.status(200).json({ messages: messages.slice(-40) });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const { userId, username, message } = req.body ?? {};
  const safeMessage = sanitizeText(message);
  if (!userId || !safeMessage) {
    res.status(400).json({ error: "Missing chat payload." });
    return;
  }

  messages.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    username: sanitizeText(username, "Player"),
    message: safeMessage,
    createdAt: new Date().toISOString()
  });

  await writeStore(CHAT_FILE, { messages: messages.slice(-100) });
  res.status(200).json({ ok: true });
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

  if (resource === "auth") {
    await handleAuth(req, res);
    return;
  }

  if (resource === "guilds") {
    await handleGuilds(req, res);
    return;
  }

  if (resource === "chat") {
    await handleChat(req, res);
    return;
  }

  res.status(404).json({ error: "Unknown game resource." });
}
