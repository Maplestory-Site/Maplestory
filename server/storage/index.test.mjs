import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import { get, mutate, set } from "./index.mjs";

describe("storage local-json adapter", () => {
  it("gets, sets, and mutates JSON payloads", async () => {
    const key = `storage-test-${Date.now()}`;

    expect(await get(key, { missing: true })).toEqual({ missing: true });
    await set(key, { count: 1 });
    expect(await get(key, {})).toEqual({ count: 1 });

    const next = await mutate(key, (current) => ({ count: current.count + 1 }), {});
    expect(next).toEqual({ count: 2 });
    expect(await get(key, {})).toEqual({ count: 2 });
    await fs.rm(path.join(process.cwd(), "server", "data", `${key}.json`), { force: true });
  });
});
