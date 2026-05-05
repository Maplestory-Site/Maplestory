import fs from "node:fs/promises";
import path from "node:path";

const DATA_ROOT = path.join(process.cwd(), "server", "data");

function hasConfiguredProductionStorage() {
  return Boolean(
    process.env.ALLOW_LOCAL_JSON_STORAGE === "true" ||
      process.env.KV_REST_API_URL ||
      process.env.POSTGRES_URL ||
      process.env.BLOB_READ_WRITE_TOKEN
  );
}

function assertStorageAllowed() {
  const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
  if (isProduction && !hasConfiguredProductionStorage()) {
    throw new Error(
      "Persistent storage is not configured. Set a production storage provider env var or ALLOW_LOCAL_JSON_STORAGE=true for a temporary local-json fallback."
    );
  }
}

function storeFile(key) {
  const safeKey = String(key).replace(/[^a-z0-9._-]/gi, "-");
  return path.join(DATA_ROOT, `${safeKey}.json`);
}

async function get(key, fallback = {}) {
  assertStorageAllowed();
  try {
    const raw = await fs.readFile(storeFile(key), "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function set(key, payload) {
  assertStorageAllowed();
  const file = storeFile(key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(payload, null, 2), "utf8");
}

async function mutate(key, updater, fallback = {}) {
  const current = await get(key, fallback);
  const next = await updater(current);
  await set(key, next);
  return next;
}

export const storage = { get, set, mutate };
export { get, set, mutate };
