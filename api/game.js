import { hashPassword, isPlaintextLegacy, verifyPassword } from "../server/security/passwords.mjs";
import { extractBearerToken, issueSessionToken, verifySessionToken } from "../server/security/sessionToken.mjs";
import { storage } from "../server/storage/index.mjs";

const LEADERBOARD_FILE = "leaderboard";
const PROGRESS_FILE = "cloud-progress";
const ROOMS_FILE = "rooms";
const USERS_FILE = "users";
const GUILDS_FILE = "guilds";
const CHAT_FILE = "global-chat";
const SOCIAL_FILE = "social-state";
const MAX_SCORE = 1_000_000_000;
const MAX_PROGRESS_BYTES = 512_000;
const MAX_RAID_DAMAGE = 10_000_000;

async function readStore(file) {
  return storage.get(file, {});
}

async function writeStore(file, payload) {
  await storage.set(file, payload);
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

function sanitizeName(value, fallback = "Player", maxLength = 32) {
  return sanitizeText(value, fallback).replace(/\s+/g, " ").slice(0, maxLength) || fallback;
}

function boundedNumber(value, fallback = 0, min = 0, max = MAX_SCORE) {
  const next = Number(value);
  if (!Number.isFinite(next)) return fallback;
  return Math.min(max, Math.max(min, next));
}

function payloadSizeBytes(value) {
  return Buffer.byteLength(JSON.stringify(value ?? {}), "utf8");
}

function requireAuthUser(req, res) {
  const userId = getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required." });
    return null;
  }
  return userId;
}

function idleProgressKeyFor(userId, requestedKey) {
  return String(requestedKey ?? "").startsWith("idlestory-world:")
    ? `idlestory-world:${userId}`
    : userId;
}

function getWeekKey(now = Date.now()) {
  const date = new Date(now);
  const utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const day = (new Date(utc).getUTCDay() + 6) % 7;
  const weekStart = new Date(utc - day * 86400000);
  return weekStart.toISOString().slice(0, 10);
}

function createBotProfile(id, username, value, extra = {}) {
  return {
    userId: id,
    username,
    guildId: null,
    guildName: extra.guildName ?? null,
    level: extra.level ?? Math.max(1, Math.floor(value / 20)),
    power: extra.power ?? value,
    stage: extra.stage ?? Math.max(1, Math.floor(value / 4)),
    bossKills: extra.bossKills ?? Math.max(0, Math.floor(value / 7)),
    goldEarned: extra.goldEarned ?? value * 2200,
    weeklyStage: extra.weeklyStage ?? Math.max(1, Math.floor(value / 5)),
    weeklyBossClears: extra.weeklyBossClears ?? Math.max(0, Math.floor(value / 18)),
    updatedAt: new Date().toISOString(),
    pvp: {
      rating: extra.rating ?? 900 + Math.floor(value / 3),
      wins: extra.wins ?? Math.floor(value / 9),
      losses: extra.losses ?? Math.floor(value / 12)
    },
    shadow: {
      dps: extra.dps ?? Math.max(12, Math.floor(value * 0.82)),
      hp: extra.hp ?? Math.max(320, Math.floor(value * 6.4)),
      defense: extra.defense ?? Math.max(16, Math.floor(value * 0.15)),
      attackSpeed: extra.attackSpeed ?? 1.05,
      critChance: extra.critChance ?? 0.1,
      critDamage: extra.critDamage ?? 1.5
    }
  };
}

function ensureSocialStore(store = {}) {
  const guilds = Array.isArray(store.guilds) ? store.guilds : [];
  const profiles = store.profiles && typeof store.profiles === "object" ? store.profiles : {};
  const weekKey = getWeekKey();

  const bots = [
    createBotProfile("bot-henesys", "Mushroom Ace", 180, { guildName: "Sprout Guard" }),
    createBotProfile("bot-ellinia", "Forest Nova", 340, { guildName: "Verdant Hex" }),
    createBotProfile("bot-perion", "Stone Breaker", 520, { guildName: "Red Dust" }),
    createBotProfile("bot-ludibrium", "Clock Duelist", 780, { guildName: "Timekeepers" }),
    createBotProfile("bot-mirror", "Mirror Hunter", 1020, { guildName: "Echo Raid" }),
    createBotProfile("bot-sky", "Cloud Ranger", 1260, { guildName: "Skyfall" })
  ];

  for (const bot of bots) {
    profiles[bot.userId] = { ...(profiles[bot.userId] ?? {}), ...bot };
  }

  return {
    profiles,
    guilds: guilds.map((guild) => ({
      id: guild.id,
      name: guild.name,
      icon: guild.icon ?? "shield",
      level: guild.level ?? 1,
      xp: guild.xp ?? 0,
      buffs: Array.isArray(guild.buffs) ? guild.buffs : ["battle-standard"],
      members: Array.isArray(guild.members) ? guild.members : [],
      raid: {
        bossName: guild.raid?.bossName ?? "Ancient Guild Slime",
        maxHp: guild.raid?.maxHp ?? 250000,
        hp: guild.raid?.hp ?? 250000,
        resetAt: guild.raid?.resetAt ?? new Date(Date.now() + 86400000).toISOString(),
        contributors: Array.isArray(guild.raid?.contributors) ? guild.raid.contributors : []
      }
    })),
    weekly: {
      weekKey: store.weekly?.weekKey === weekKey ? store.weekly.weekKey : weekKey
    }
  };
}

function getLeaderboardValue(profile, category) {
  if (category === "level") return profile.level ?? 0;
  if (category === "power") return profile.power ?? 0;
  if (category === "stage") return profile.stage ?? 0;
  if (category === "bossKills") return profile.bossKills ?? 0;
  return profile.goldEarned ?? 0;
}

function getWeeklyScore(profile) {
  return (profile.weeklyStage ?? 1) * 100 + (profile.weeklyBossClears ?? 0) * 750;
}

function getWeeklyReward(rank) {
  if (rank <= 1) return { mesos: 180000, crystals: 18, fame: 80, rarity: "legendary" };
  if (rank <= 3) return { mesos: 120000, crystals: 12, fame: 54, rarity: "epic" };
  if (rank <= 10) return { mesos: 80000, crystals: 8, fame: 32, rarity: "epic" };
  if (rank <= 25) return { mesos: 45000, crystals: 4, fame: 18, rarity: "rare" };
  return { mesos: 18000, crystals: 2, fame: 8, rarity: "rare" };
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
    const userId = requireAuthUser(req, res);
    if (!userId) return;
    const { username, gameId, score } = req.body ?? {};
    const safeScore = boundedNumber(score);
    if (!username || !gameId || !Number.isFinite(Number(score))) {
      res.status(400).json({ error: "Missing leaderboard payload." });
      return;
    }

    const store = await readStore(LEADERBOARD_FILE);
    const entries = store[gameId] ?? [];
    const existing = entries.find((entry) => entry.userId === userId);

    if (existing) {
      if (safeScore > existing.score) {
        existing.score = safeScore;
        existing.username = sanitizeName(username);
        existing.updatedAt = new Date().toISOString();
      }
    } else {
      entries.push({
        userId,
        username: sanitizeName(username),
        score: safeScore,
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
  const authUserId = requireAuthUser(req, res);
  if (!authUserId) return;
  const requestedUserId = req.method === "GET" ? req.query?.userId : req.body?.userId;
  const userId = idleProgressKeyFor(authUserId, requestedUserId);

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
    if (payloadSizeBytes(progress) > MAX_PROGRESS_BYTES) {
      res.status(413).json({ error: "Progress payload too large." });
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

  // Common payload validation
  if (!safeEmail || typeof password !== "string" || password.length === 0) {
    res.status(400).json({ error: "Missing signup payload." });
    return;
  }
  if (password.length > 256) {
    res.status(400).json({ error: "Password too long." });
    return;
  }

  if (action === "signup") {
    if (entries.some((user) => user.email === safeEmail)) {
      res.status(409).json({ error: "Account already exists." });
      return;
    }
    const passwordHash = await hashPassword(password);
    const user = {
      id: `${safeEmail}-${Date.now()}`,
      username: safeName,
      email: safeEmail,
      // Hash only — never plaintext.
      passwordHash,
      createdAt: new Date().toISOString()
    };
    entries.push(user);
    await writeStore(USERS_FILE, { entries });
    const token = issueSessionToken(user.id);
    res.status(200).json({ user: publicUser(user), token });
    return;
  }

  if (action === "login") {
    const user = entries.find((entry) => entry.email === safeEmail);
    if (!user) {
      res.status(401).json({ error: "Invalid login." });
      return;
    }
    // Migration path: legacy plaintext rows compare directly, then re-hash
    // on first successful login. New rows use scrypt only.
    let ok = false;
    if (typeof user.passwordHash === "string" && user.passwordHash.length > 0) {
      ok = await verifyPassword(password, user.passwordHash);
    } else if (typeof user.password === "string" && isPlaintextLegacy(user.password)) {
      // Legacy plaintext field — compare-then-migrate.
      if (user.password === String(password)) {
        ok = true;
        user.passwordHash = await hashPassword(password);
        delete user.password;
        await writeStore(USERS_FILE, { entries });
      }
    }
    if (!ok) {
      res.status(401).json({ error: "Invalid login." });
      return;
    }
    const token = issueSessionToken(user.id);
    res.status(200).json({ user: publicUser(user), token });
    return;
  }

  res.status(400).json({ error: "Unknown auth action." });
}

/**
 * Resolve the authenticated user from `Authorization: Bearer <token>`.
 * Returns the userId on success, or null when the token is missing/invalid.
 */
function getAuthUserId(req) {
  const header = req.headers?.authorization ?? req.headers?.Authorization;
  const token = extractBearerToken(typeof header === "string" ? header : null);
  if (!token) return null;
  const verified = verifySessionToken(token);
  return verified ? verified.userId : null;
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

  const userId = requireAuthUser(req, res);
  if (!userId) return;
  const { action, username, guildId, name } = req.body ?? {};
  const safeUsername = sanitizeName(username);

  if (action === "create") {
    const guildName = sanitizeName(name, "Maple Guild");
    const guild = {
      id: `${guildName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      name: guildName,
      ownerId: userId,
      members: [{ userId, username: safeUsername }],
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
      guild.members.push({ userId, username: safeUsername });
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

  const userId = requireAuthUser(req, res);
  if (!userId) return;
  const { username, message } = req.body ?? {};
  const safeMessage = sanitizeText(message).slice(0, 180);
  if (!safeMessage) {
    res.status(400).json({ error: "Missing chat payload." });
    return;
  }

  messages.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    username: sanitizeName(username),
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

  const authUserId = requireAuthUser(req, res);
  if (!authUserId) return;
  const { action } = req.body ?? {};
  const store = await readStore(ROOMS_FILE);

  if (action === "create") {
    const { gameId, username } = req.body ?? {};
    if (!gameId || !username) {
      res.status(400).json({ error: "Missing room payload." });
      return;
    }

    const roomId = generateRoomId();
    const room = {
      id: roomId,
      gameId,
      status: "lobby",
      players: [normalizePlayer({ userId: authUserId, username: sanitizeName(username) })],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    store[roomId] = room;
    await writeStore(ROOMS_FILE, store);
    res.status(200).json({ room });
    return;
  }

  if (action === "join") {
    const { roomId, username } = req.body ?? {};
    const room = store[roomId];

    if (!room) {
      res.status(404).json({ error: "Room not found." });
      return;
    }

    if (room.players.some((player) => player.userId === authUserId)) {
      res.status(200).json({ room });
      return;
    }

    if (room.players.length >= 2) {
      res.status(400).json({ error: "Room is full." });
      return;
    }

    room.players.push(normalizePlayer({ userId: authUserId, username: sanitizeName(username) }));
    room.updatedAt = new Date().toISOString();
    store[roomId] = room;
    await writeStore(ROOMS_FILE, store);
    res.status(200).json({ room });
    return;
  }

  if (action === "update") {
    const { roomId, score, ready } = req.body ?? {};
    const room = store[roomId];

    if (!room) {
      res.status(404).json({ error: "Room not found." });
      return;
    }

    if (!room.players.some((player) => player.userId === authUserId)) {
      res.status(403).json({ error: "Player is not in this room." });
      return;
    }

    const next = withUpdatedRoom(room, authUserId, {
      ...(typeof score === "number" ? { score: boundedNumber(score) } : {}),
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
    if (!room.players.some((player) => player.userId === authUserId)) {
      res.status(403).json({ error: "Player is not in this room." });
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
    const { roomId } = req.body ?? {};
    const room = store[roomId];

    if (!room) {
      res.status(404).json({ error: "Room not found." });
      return;
    }

    room.players = room.players.filter((player) => player.userId !== authUserId);
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

function buildLeaderboards(profiles, currentUserId) {
  const categories = ["level", "power", "stage", "bossKills", "goldEarned"];
  const leaderboards = {};
  const currentRanks = {};

  for (const category of categories) {
    const entries = profiles
      .slice()
      .sort((left, right) => getLeaderboardValue(right, category) - getLeaderboardValue(left, category))
      .map((profile, index) => ({
        rank: index + 1,
        userId: profile.userId,
        username: profile.username,
        guildName: profile.guildName ?? null,
        value: getLeaderboardValue(profile, category),
        updatedAt: profile.updatedAt,
        isCurrentPlayer: profile.userId === currentUserId
      }));

    leaderboards[category] = entries.slice(0, 25);
    currentRanks[category] = entries.find((entry) => entry.userId === currentUserId)?.rank ?? null;
  }

  return { leaderboards, currentRanks };
}

function buildWeeklyRanking(profiles, currentUserId) {
  const entries = profiles
    .slice()
    .sort((left, right) => getWeeklyScore(right) - getWeeklyScore(left))
    .map((profile, index) => ({
      rank: index + 1,
      userId: profile.userId,
      username: profile.username,
      guildName: profile.guildName ?? null,
      stageProgress: profile.weeklyStage ?? 1,
      bossClears: profile.weeklyBossClears ?? 0,
      score: getWeeklyScore(profile),
      reward: getWeeklyReward(index + 1),
      updatedAt: profile.updatedAt,
      isCurrentPlayer: profile.userId === currentUserId
    }));

  return {
    entries: entries.slice(0, 30),
    currentRank: entries.find((entry) => entry.userId === currentUserId)?.rank ?? null
  };
}

function buildShadowOpponents(profiles, currentUserId, power = 0) {
  return profiles
    .filter((profile) => profile.userId !== currentUserId)
    .sort((left, right) => Math.abs((left.power ?? 0) - power) - Math.abs((right.power ?? 0) - power))
    .slice(0, 6)
    .map((profile) => ({
      userId: profile.userId,
      username: profile.username,
      level: profile.level ?? 1,
      power: profile.power ?? 0,
      dps: profile.shadow?.dps ?? profile.power ?? 1,
      hp: profile.shadow?.hp ?? 400,
      defense: profile.shadow?.defense ?? 20,
      attackSpeed: profile.shadow?.attackSpeed ?? 1,
      critChance: profile.shadow?.critChance ?? 0.1,
      critDamage: profile.shadow?.critDamage ?? 1.5,
      stage: profile.stage ?? 1,
      guildName: profile.guildName ?? null,
      updatedAt: profile.updatedAt
    }));
}

function attachProfileToGuild(store, userId, username, power, level) {
  for (const guild of store.guilds) {
    const member = guild.members.find((entry) => entry.userId === userId);
    if (member) {
      member.username = username;
      member.power = power;
      member.level = level;
    }
  }
}

async function handleSocial(req, res) {
  const rawStore = await readStore(SOCIAL_FILE);
  const store = ensureSocialStore(rawStore);

  if (req.method === "GET") {
    const userId = requireAuthUser(req, res);
    if (!userId) return;
    const profiles = Object.values(store.profiles);
    const currentUser = userId ? store.profiles[userId] ?? null : null;
    const { leaderboards, currentRanks } = buildLeaderboards(profiles, userId);
    const weekly = buildWeeklyRanking(profiles, userId);
    const currentGuild = currentUser?.guildId
      ? store.guilds.find((guild) => guild.id === currentUser.guildId) ?? null
      : null;

    res.status(200).json({
      leaderboards,
      currentRanks,
      weeklyRanking: weekly.entries,
      weeklyRank: weekly.currentRank,
      guilds: store.guilds.slice(0, 12),
      currentGuild,
      shadowOpponents: buildShadowOpponents(profiles, userId, currentUser?.power ?? 0)
    });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const action = String(req.body?.action ?? "sync");
  const userId = requireAuthUser(req, res);
  if (!userId) return;
  const username = sanitizeName(req.body?.username, "Idle Hero");

  if (action === "sync") {
    const profile = req.body?.profile ?? {};
    const nextProfile = {
      ...(store.profiles[userId] ?? {}),
      userId,
      username,
      guildId: profile.guildId ?? store.profiles[userId]?.guildId ?? null,
      guildName: profile.guildName ?? store.profiles[userId]?.guildName ?? null,
      level: boundedNumber(profile.level, 1, 1, 10000),
      power: boundedNumber(profile.power, 0),
      stage: boundedNumber(profile.stage, 1, 1, 1000000),
      bossKills: boundedNumber(profile.bossKills, 0),
      goldEarned: boundedNumber(profile.goldEarned, 0),
      weeklyStage: boundedNumber(profile.weeklyStage, 1, 1, 1000000),
      weeklyBossClears: boundedNumber(profile.weeklyBossClears, 0),
      updatedAt: new Date().toISOString(),
      pvp: {
        rating: boundedNumber(req.body?.pvp?.rating, store.profiles[userId]?.pvp?.rating || 1000, 0, 100000),
        wins: boundedNumber(req.body?.pvp?.wins, store.profiles[userId]?.pvp?.wins || 0),
        losses: boundedNumber(req.body?.pvp?.losses, store.profiles[userId]?.pvp?.losses || 0)
      },
      shadow: {
        dps: Number(req.body?.shadow?.dps) || Number(profile.power) || 1,
        hp: Number(req.body?.shadow?.hp) || 480,
        defense: Number(req.body?.shadow?.defense) || 28,
        attackSpeed: Number(req.body?.shadow?.attackSpeed) || 1,
        critChance: Number(req.body?.shadow?.critChance) || 0.1,
        critDamage: Number(req.body?.shadow?.critDamage) || 1.5
      }
    };
    store.profiles[userId] = nextProfile;
    attachProfileToGuild(store, userId, username, nextProfile.power, nextProfile.level);
    await writeStore(SOCIAL_FILE, store);
    res.status(200).json({ ok: true });
    return;
  }

  if (action === "guild-create") {
    const name = sanitizeName(req.body?.name, "Idle Guild");
    const icon = sanitizeText(req.body?.icon, "shield") || "shield";
    const guild = {
      id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      name,
      icon,
      level: 1,
      xp: 0,
      buffs: ["battle-standard"],
      members: [{ userId, username, role: "leader", power: boundedNumber(req.body?.power, 0), level: boundedNumber(req.body?.level, 1, 1, 10000), contribution: 0 }],
      raid: {
        bossName: "Ancient Guild Slime",
        maxHp: 250000,
        hp: 250000,
        resetAt: new Date(Date.now() + 86400000).toISOString(),
        contributors: []
      }
    };
    store.guilds.unshift(guild);
    if (store.profiles[userId]) {
      store.profiles[userId].guildId = guild.id;
      store.profiles[userId].guildName = guild.name;
    }
    await writeStore(SOCIAL_FILE, store);
    res.status(200).json({ guild });
    return;
  }

  if (action === "guild-join") {
    const guildId = sanitizeText(req.body?.guildId);
    const guild = store.guilds.find((entry) => entry.id === guildId);
    if (!guild) {
      res.status(404).json({ error: "Guild not found." });
      return;
    }
    for (const entry of store.guilds) {
      entry.members = entry.members.filter((member) => member.userId !== userId);
    }
    guild.members.push({
      userId,
      username,
      role: "member",
      power: boundedNumber(req.body?.power, 0),
      level: boundedNumber(req.body?.level, 1, 1, 10000),
      contribution: 0
    });
    if (store.profiles[userId]) {
      store.profiles[userId].guildId = guild.id;
      store.profiles[userId].guildName = guild.name;
    }
    await writeStore(SOCIAL_FILE, store);
    res.status(200).json({ guild });
    return;
  }

  if (action === "guild-leave") {
    for (const guild of store.guilds) {
      guild.members = guild.members.filter((member) => member.userId !== userId);
    }
    if (store.profiles[userId]) {
      store.profiles[userId].guildId = null;
      store.profiles[userId].guildName = null;
    }
    await writeStore(SOCIAL_FILE, store);
    res.status(200).json({ ok: true });
    return;
  }

  if (action === "guild-raid") {
    const guildId = sanitizeText(req.body?.guildId);
    const damage = boundedNumber(req.body?.damage, 0, 0, MAX_RAID_DAMAGE);
    const guild = store.guilds.find((entry) => entry.id === guildId);
    if (!guild) {
      res.status(404).json({ error: "Guild not found." });
      return;
    }
    if (!guild.members.some((member) => member.userId === userId)) {
      res.status(403).json({ error: "Guild membership required." });
      return;
    }
    guild.raid.hp = Math.max(0, guild.raid.hp - damage);
    const contributor = guild.raid.contributors.find((entry) => entry.userId === userId);
    if (contributor) {
      contributor.damage += damage;
    } else {
      guild.raid.contributors.push({ userId, username, damage });
    }
    guild.xp += Math.floor(damage / 200);
    guild.level = 1 + Math.floor(guild.xp / 500);
    if (guild.raid.hp === 0) {
      guild.raid.hp = guild.raid.maxHp + guild.level * 75000;
      guild.raid.maxHp = guild.raid.hp;
      guild.raid.resetAt = new Date(Date.now() + 86400000).toISOString();
      guild.raid.contributors = [];
      guild.raid.bossName = guild.level >= 8 ? "Crimson Guild Dragon" : "Ancient Guild Slime";
    }
    await writeStore(SOCIAL_FILE, store);
    res.status(200).json({ guild });
    return;
  }

  if (action === "shadow-battle") {
    if (store.profiles[userId]) {
      store.profiles[userId].pvp = {
        rating: boundedNumber(req.body?.pvp?.rating, store.profiles[userId].pvp?.rating || 1000, 0, 100000),
        wins: boundedNumber(req.body?.pvp?.wins, store.profiles[userId].pvp?.wins || 0),
        losses: boundedNumber(req.body?.pvp?.losses, store.profiles[userId].pvp?.losses || 0)
      };
      store.profiles[userId].updatedAt = new Date().toISOString();
    }
    await writeStore(SOCIAL_FILE, store);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(400).json({ error: "Unknown social action." });
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

  if (resource === "social") {
    await handleSocial(req, res);
    return;
  }

  res.status(404).json({ error: "Unknown game resource." });
}
