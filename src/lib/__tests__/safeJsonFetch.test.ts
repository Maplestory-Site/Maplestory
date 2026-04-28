import { describe, expect, it, vi } from "vitest";
import { safeFetchJson } from "../safeJsonFetch";

describe("safeFetchJson", () => {
  it("returns parsed JSON for successful responses", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })) as unknown as typeof fetch;

    const result = await safeFetchJson("/api/news", {
      fallback: { ok: false },
      fetchImpl
    });

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ ok: true });
    expect(result.fromFallback).toBe(false);
  });

  it("returns fallback for malformed JSON", async () => {
    const fallback = { items: [] };
    const fetchImpl = vi.fn(async () => new Response("{bad json", { status: 200 })) as unknown as typeof fetch;

    const result = await safeFetchJson("/api/news", {
      fallback,
      fetchImpl
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("parse");
    expect(result.data).toBe(fallback);
  });

  it("returns fallback when the request times out", async () => {
    const fallback = { timedOut: true };
    const fetchImpl = vi.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        })
    ) as unknown as typeof fetch;

    const result = await safeFetchJson("/api/news", {
      fallback,
      fetchImpl,
      timeoutMs: 1
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("timeout");
    expect(result.data).toBe(fallback);
  });
});
