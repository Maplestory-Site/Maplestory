/**
 * passwords.mjs — scrypt-based password hashing using Node's built-in crypto.
 *
 * No external dependencies. The hash format is:
 *
 *   scrypt$N$r$p$<salt-hex>$<hash-hex>
 *
 * where N, r, p are scrypt parameters. We pin them to OWASP-recommended
 * values (N=2^15, r=8, p=1, keyLen=64) so verification is forward-compatible
 * with hashes produced under different parameter choices later.
 *
 * Public surface:
 *   hashPassword(plaintext) -> Promise<string>
 *   verifyPassword(plaintext, stored) -> Promise<boolean>
 *   isPlaintextLegacy(stored) -> boolean   // true if stored value is NOT in the new format
 */

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

const PARAMS = {
  N: 1 << 15, // 32768 — OWASP recommended minimum for scrypt
  r: 8,
  p: 1,
  keyLen: 64,
  saltLen: 16
};

const FORMAT_PREFIX = "scrypt";

/**
 * Returns a serialised scrypt hash:  scrypt$N$r$p$saltHex$hashHex
 */
export async function hashPassword(plaintext) {
  if (typeof plaintext !== "string" || plaintext.length === 0) {
    throw new Error("Password must be a non-empty string.");
  }
  if (plaintext.length > 1024) {
    // Defensive cap: scrypt memory cost is fixed but we still don't want a
    // pathological multi-megabyte input.
    throw new Error("Password too long.");
  }
  const salt = randomBytes(PARAMS.saltLen);
  const derived = await scryptAsync(plaintext, salt, PARAMS.keyLen, {
    N: PARAMS.N,
    r: PARAMS.r,
    p: PARAMS.p
  });
  return [
    FORMAT_PREFIX,
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("hex"),
    derived.toString("hex")
  ].join("$");
}

/**
 * Verifies a plaintext against a stored value.
 *  - Returns false if the stored value is in the legacy plaintext format
 *    (callers should detect that with isPlaintextLegacy and force a re-hash
 *    on next successful login).
 *  - Uses timingSafeEqual so login does not leak match-prefix length.
 */
export async function verifyPassword(plaintext, stored) {
  if (typeof plaintext !== "string" || typeof stored !== "string") return false;
  if (isPlaintextLegacy(stored)) return false;
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== FORMAT_PREFIX) return false;
  const n = Number.parseInt(parts[1] ?? "", 10);
  const r = Number.parseInt(parts[2] ?? "", 10);
  const p = Number.parseInt(parts[3] ?? "", 10);
  if (![n, r, p].every((value) => Number.isFinite(value) && value > 0)) return false;
  let salt;
  let expected;
  try {
    salt = Buffer.from(parts[4] ?? "", "hex");
    expected = Buffer.from(parts[5] ?? "", "hex");
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;
  const candidate = await scryptAsync(plaintext, salt, expected.length, { N: n, r, p });
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

/** True when `stored` does NOT begin with the new scrypt format prefix. */
export function isPlaintextLegacy(stored) {
  return typeof stored === "string" && !stored.startsWith(`${FORMAT_PREFIX}$`);
}

/** Internal — exported for tests. */
export const _internals = { PARAMS, FORMAT_PREFIX };
