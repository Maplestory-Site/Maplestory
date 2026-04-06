import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const outputPath = path.resolve("src/data/twitchStatus.json");
const login = process.env.TWITCH_BROADCASTER_LOGIN || "snailslayermain";
const clientId = process.env.TWITCH_CLIENT_ID;
const clientSecret = process.env.TWITCH_CLIENT_SECRET;

const fallbackStatus = {
  login,
  status: "offline",
  viewerCount: 0,
  title: "",
  gameName: "MapleStory",
  startedAt: "",
  lastSynced: new Date().toISOString(),
  source: "fallback"
};

async function readExistingStatus() {
  try {
    const raw = await readFile(outputPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeStatus(status) {
  await writeFile(outputPath, `${JSON.stringify(status, null, 2)}\n`, "utf8");
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function getAccessToken() {
  const response = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials"
    })
  });

  if (!response.ok) {
    throw new Error(`Token request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function syncTwitchStatus() {
  if (!clientId || !clientSecret) {
    const existing = await readExistingStatus();
    await writeStatus(existing || fallbackStatus);
    console.log("Skipped Twitch sync: missing TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET.");
    return;
  }

  const accessToken = await getAccessToken();
  const headers = {
    "Client-Id": clientId,
    Authorization: `Bearer ${accessToken}`
  };

  const usersResponse = await fetchJson(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`, { headers });
  const user = usersResponse.data?.[0];

  if (!user?.id) {
    throw new Error(`Unable to resolve Twitch user for login "${login}".`);
  }

  const streamsResponse = await fetchJson(`https://api.twitch.tv/helix/streams?user_id=${encodeURIComponent(user.id)}`, { headers });
  const stream = streamsResponse.data?.[0];

  const nextStatus = stream
    ? {
        login,
        status: "live",
        viewerCount: stream.viewer_count ?? 0,
        title: stream.title ?? "",
        gameName: stream.game_name ?? "MapleStory",
        startedAt: stream.started_at ?? "",
        lastSynced: new Date().toISOString(),
        source: "twitch-api"
      }
    : {
        ...fallbackStatus,
        lastSynced: new Date().toISOString(),
        source: "twitch-api"
      };

  await writeStatus(nextStatus);
  console.log(`Synced Twitch status: ${nextStatus.status}.`);
}

syncTwitchStatus().catch(async (error) => {
  console.error("Twitch sync failed:", error.message);
  const existing = await readExistingStatus();
  await writeStatus(existing || fallbackStatus);
  process.exitCode = 1;
});
