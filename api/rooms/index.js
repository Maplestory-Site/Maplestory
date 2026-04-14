import fs from "node:fs/promises";
import path from "node:path";

const DATA_FILE = path.join(process.cwd(), "server", "data", "rooms.json");

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

function generateRoomId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i += 1) {
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

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { roomId } = req.query;
    if (!roomId || typeof roomId !== "string") {
      res.status(400).json({ error: "Missing roomId." });
      return;
    }
    const store = await readStore();
    res.status(200).json({ room: store[roomId] ?? null });
    return;
  }

  if (req.method === "POST") {
    const { action } = req.body ?? {};
    const store = await readStore();

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
      await writeStore(store);
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
      await writeStore(store);
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
      await writeStore(store);
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
      await writeStore(store);
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
      await writeStore(store);
      res.status(200).json({ room: store[roomId] ?? null });
      return;
    }

    res.status(400).json({ error: "Unknown action." });
    return;
  }

  res.status(405).json({ error: "Method not allowed." });
}
