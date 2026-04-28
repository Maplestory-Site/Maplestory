/**
 * IdleStory World - Seeded / injectable RNG
 *
 * Provides a simple xorshift32 PRNG for deterministic tests.
 * Runtime gameplay uses secure random values via crypto.getRandomValues when available.
 */

export type RngFn = () => number;

/** xorshift32 - fast, good distribution, trivially seedable. */
export function createSeededRng(seed: number): { next: RngFn; reset: () => void } {
  // Seed 0 breaks xorshift; remap it.
  let state = (seed >>> 0) || 0xdeadbeef;
  const initial = state;

  function next(): number {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    // Map uint32 -> [0, 1)
    return (state >>> 0) / 0x100000000;
  }

  function reset(): void {
    state = initial;
  }

  return { next, reset };
}

function createRuntimeCryptoRng(): RngFn {
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const buf = new Uint32Array(1);
    return () => {
      globalThis.crypto.getRandomValues(buf);
      return buf[0]! / 0x100000000;
    };
  }
  const seeded = createSeededRng(Date.now() ^ 0x9e3779b9);
  return seeded.next;
}

/** The default RNG used at runtime. */
export const defaultRng: RngFn = createRuntimeCryptoRng();
