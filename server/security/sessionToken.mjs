/**
 * sessionToken.mjs — opaque, HMAC-signed session tokens.
 *
 * Format:   v1.<userId-base64url>.<expiresAt-ms>.<hmac-base64url>
 *
 * The token carries the userId + expiry in plaintext (base64url-encoded) and
 * an HMAC-SHA-256 signature over `${userId}.${expiresAt}` using the secret in
 * SESSION_SECRET. Server-side verification rejects:
 *   - tampered signatures
 *   - expired tokens
 *   - mismatched format
 *
 * No new dependencies — everything ships with Node.
 *
 * SESSION_SECRET fallback:
 *   - In production we REQUIRE process.env.SESSION_SECRET to be set.
 *   - In dev/tests we fall back to a derived per-process random secret so
 *     tokens are still well-formed and the suite can verify round-trips.
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const VERSION = "v1";
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

let cachedSecret = null;

function getSecret() {
  if (cachedSecret) return cachedSecret;
  const env = process.env.SESSION_SECRET;
  if (env && env.length >= 16) {
    cachedSecret = env;
    return cachedSecret;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production (>= 16 chars).");
  }
  // Dev / test fallback — random per-process secret.
  cachedSecret = randomBytes(32).toString("hex");
  return cachedSecret;
}

/** Test-only: reset the cached secret so a test can re-derive it. */
export function _resetSecretCache() {
  cachedSecret = null;
}

function base64url(buffer) {
  return Buffer.from(buffer).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function fromBase64url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64");
}

function sign(payload) {
  return base64url(createHmac("sha256", getSecret()).update(payload).digest());
}

/** Issue a new session token for `userId` valid for `ttlMs` (default 7 days). */
export function issueSessionToken(userId, ttlMs = DEFAULT_TTL_MS) {
  if (typeof userId !== "string" || userId.length === 0) {
    throw new Error("issueSessionToken: userId must be a non-empty string.");
  }
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
    throw new Error("issueSessionToken: ttlMs must be a positive number.");
  }
  const expiresAt = Date.now() + ttlMs;
  const userIdEnc = base64url(userId);
  const payload = `${userIdEnc}.${expiresAt}`;
  const signature = sign(payload);
  return `${VERSION}.${payload}.${signature}`;
}

/**
 * Verify a session token. Returns `{ userId, expiresAt }` on success,
 * `null` on any failure.
 */
export function verifySessionToken(token) {
  if (typeof token !== "string" || token.length === 0) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [version, userIdEnc, expiresStr, suppliedSig] = parts;
  if (version !== VERSION) return null;
  const expiresAt = Number.parseInt(expiresStr ?? "", 10);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;

  const expectedSig = sign(`${userIdEnc}.${expiresAt}`);
  const a = Buffer.from(suppliedSig ?? "", "utf8");
  const b = Buffer.from(expectedSig, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let userId;
  try {
    userId = fromBase64url(userIdEnc ?? "").toString("utf8");
  } catch {
    return null;
  }
  if (!userId) return null;
  return { userId, expiresAt };
}

/**
 * Extract a Bearer token from an Authorization header. Returns null if the
 * header is missing or malformed.
 */
export function extractBearerToken(authorizationHeader) {
  if (typeof authorizationHeader !== "string") return null;
  const match = /^Bearer\s+(\S+)\s*$/.exec(authorizationHeader);
  return match ? match[1] : null;
}
