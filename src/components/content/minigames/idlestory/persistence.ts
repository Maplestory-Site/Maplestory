/**
 * IdleStory World — Persistence Layer
 *
 * Handles all localStorage read/write operations with:
 *   - automatic backup-slot protection before every overwrite
 *   - primary → backup fallback on load corruption
 *   - corrupted payload preserved under a recovery key for debugging
 *   - base64 export / import for manual save portability
 *   - non-throwing API (returns success flags instead of throwing)
 */

export const STORAGE_KEY         = "snailslayer-idlestory-world";
export const BACKUP_STORAGE_KEY  = "snailslayer-idlestory-world-backup";
export const RECOVERY_STORAGE_KEY = "snailslayer-idlestory-world-recovery";

export type SaveResult = {
  ok: boolean;
  /** Present when the write failed (e.g. QuotaExceededError). */
  error?: string;
};

// ─── Low-level helpers ────────────────────────────────────────────────────────

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage; } catch { return null; }
}

function safeRead(key: string): string | null {
  try { return getStorage()?.getItem(key) ?? null; } catch { return null; }
}

function safeWrite(key: string, value: string): SaveResult {
  try {
    getStorage()?.setItem(key, value);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown storage error";
    return { ok: false, error: message };
  }
}

function safeDelete(key: string): void {
  try { getStorage()?.removeItem(key); } catch { /* ignore */ }
}

// ─── Serialization ────────────────────────────────────────────────────────────

/**
 * Attempt to JSON-parse a raw string.  Returns null on any failure.
 */
export function tryParseJson<T = unknown>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

// ─── Core read / write ────────────────────────────────────────────────────────

/**
 * Persist a serialized state snapshot.
 *
 * Steps:
 *  1. Copy the current primary slot into the backup slot (best-effort).
 *  2. Write the new state to the primary slot.
 *
 * Returns a SaveResult so the caller can surface a non-blocking warning.
 */
export function writeSave(state: object): SaveResult {
  const now = Date.now();
  const payload = JSON.stringify({ ...state, lastSavedAt: now });

  // Promote current primary → backup before overwriting.
  const existing = safeRead(STORAGE_KEY);
  if (existing) {
    safeWrite(BACKUP_STORAGE_KEY, existing);
  }

  return safeWrite(STORAGE_KEY, payload);
}

/**
 * Read raw JSON strings from the primary and backup slots.
 * Never throws; returns null on missing / unreadable keys.
 */
export function readSaveRaw(): { primary: string | null; backup: string | null } {
  return {
    primary: safeRead(STORAGE_KEY),
    backup:  safeRead(BACKUP_STORAGE_KEY)
  };
}

/**
 * If a corrupted payload was detected, stash it under the recovery key so a
 * developer can inspect it later without losing the backup.
 */
export function stashCorruptedPayload(raw: string): void {
  safeWrite(RECOVERY_STORAGE_KEY, raw);
}

/** Remove all IdleStory save slots (used by hard reset / rebirth). */
export function clearAllSaveSlots(): void {
  safeDelete(STORAGE_KEY);
  safeDelete(BACKUP_STORAGE_KEY);
  safeDelete(RECOVERY_STORAGE_KEY);
}

// ─── Export / Import ──────────────────────────────────────────────────────────

/**
 * Encode a game state to a portable base64 string the player can copy/paste.
 * Format:  base64( JSON.stringify(state) )
 */
export function exportSaveToString(state: object): string {
  const json = JSON.stringify({ ...state, lastSavedAt: Date.now() });
  // btoa is available in all modern browsers; fall back for SSR.
  if (typeof btoa !== "undefined") {
    return btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    ));
  }
  return Buffer.from(json, "utf8").toString("base64");
}

/**
 * Decode a base64 export string back to a raw JSON string.
 * Returns null if decoding fails.
 */
export function importSaveFromString(encoded: string): string | null {
  try {
    const trimmed = encoded.trim();
    if (typeof atob !== "undefined") {
      const binary = atob(trimmed);
      return decodeURIComponent(
        Array.from(binary).map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`).join("")
      );
    }
    return Buffer.from(trimmed, "base64").toString("utf8");
  } catch {
    return null;
  }
}
