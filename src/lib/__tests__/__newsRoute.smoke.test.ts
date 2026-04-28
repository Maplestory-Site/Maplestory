/**
 * Smoke test for the /api/news route contract.
 *
 * The vite dev middleware and vercel.json rewrites both forward /api/news
 * to api/content.js with resource=news-feed. This test invokes content.js
 * directly with that shape and asserts it returns a feed-shaped payload.
 *
 * If this test ever 404s or returns a non-JSON body, both dev and prod
 * routing are broken simultaneously.
 */

import { describe, expect, it } from "vitest";
// @ts-expect-error — local Vercel-style API handler is plain JS
import handler from "../../../api/content.js";

function createResponse() {
  return {
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    statusCode: 200,
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    }
  };
}

describe("api/content.js — /api/news route contract", () => {
  it("resource=news-feed returns 200 with items + meta", async () => {
    const res = createResponse();
    await handler({ method: "GET", query: { resource: "news-feed" } }, res);

    expect(res.statusCode).toBe(200);
    const body = res.body as { items?: unknown[]; meta?: { sourceStatus?: string } };
    expect(Array.isArray(body?.items)).toBe(true);
    expect(body?.meta).toBeTruthy();
    expect(typeof body?.meta?.sourceStatus).toBe("string");
  });

  it("resource=news-latest accepts a limit and returns ≤ that many items", async () => {
    const res = createResponse();
    await handler({ method: "GET", query: { resource: "news-latest", limit: "3" } }, res);

    expect(res.statusCode).toBe(200);
    const body = res.body as { items?: unknown[] };
    expect(Array.isArray(body?.items)).toBe(true);
    expect((body?.items ?? []).length).toBeLessThanOrEqual(3);
  });
});
