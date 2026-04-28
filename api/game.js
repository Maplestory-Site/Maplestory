import fs from "node:fs/promises";
import path from "node:path";

const LEADERBOARD_FILE = path.join(process.cwd(), "server", "data", "leaderboard.json");
const PROGRESS_FILE = path.join(process.cwd(), "server", "data", "cloud-progress.json");
const ROOMS_FILE = path.join(process.cwd(), "server", "data", "rooms.json");
const USERS_FILE = path.join(process.cwd(), "server", "data", "users.json");
const GUILDS_FILE = path.join(process.cwd(), "server", "data", "guilds.json");
const CHAT_FILE = path.join(process.cwd(), "server", "data", "global-chat.json");
const SOCIAL_FILE = path.join(process.cwd(), "server", "data", "social-state.json");

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
      icon: guild.icon ?? "🛡️",
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
    const userId = typeof req.query?.userId === "string" ? req.query.userId : "";
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
  const userId = sanitizeText(req.body?.userId);
  const username = sanitizeText(req.body?.username, "Idle Hero") || "Idle Hero";

  if (!userId) {
    res.status(400).json({ error: "Missing userId." });
    return;
  }

  if (action === "sync") {
    const profile = req.body?.profile ?? {};
    const nextProfile = {
      ...(store.profiles[userId] ?? {}),
      userId,
      username,
      guildId: profile.guildId ?? store.profiles[userId]?.guildId ?? null,
      guildName: profile.guildName ?? store.profiles[userId]?.guildName ?? null,
      level: Number(profile.level) || 1,
      power: Number(profile.power) || 0,
      stage: Number(profile.stage) || 1,
      bossKills: Number(profile.bossKills) || 0,
      goldEarned: Number(profile.goldEarned) || 0,
      weeklyStage: Number(profile.weeklyStage) || 1,
      weeklyBossClears: Number(profile.weeklyBossClears) || 0,
      updatedAt: new Date().toISOString(),
      pvp: {
        rating: Number(req.body?.pvp?.rating) || store.profiles[userId]?.pvp?.rating || 1000,
        wins: Number(req.body?.pvp?.wins) || store.profiles[userId]?.pvp?.wins || 0,
        losses: Number(req.body?.pvp?.losses) || store.profiles[userId]?.pvp?.losses || 0
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
    const name = sanitizeText(req.body?.name, "Idle Guild").slice(0, 32) || "Idle Guild";
    const icon = sanitizeText(req.body?.icon, "🛡️") || "🛡️";
    const guild = {
      id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      name,
      icon,
      level: 1,
      xp: 0,
      buffs: ["battle-standard"],
      members: [{ userId, username, role: "leader", power: Number(req.body?.power) || 0, level: Number(req.body?.level) || 1, contribution: 0 }],
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
      power: Number(req.body?.power) || 0,
      level: Number(req.body?.level) || 1,
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
    const damage = Math.max(1, Number(req.body?.damage) || 0);
    const guild = store.guilds.find((entry) => entry.id === guildId);
    if (!guild) {
      res.status(404).json({ error: "Guild not found." });
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
        rating: Number(req.body?.pvp?.rating) || store.profiles[userId].pvp?.rating || 1000,
        wins: Number(req.body?.pvp?.wins) || store.profiles[userId].pvp?.wins || 0,
        losses: Number(req.body?.pvp?.losses) || store.profiles[userId].pvp?.losses || 0
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
