import { describe, expect, it } from "vitest";
import handler, { isBlockedIp } from "../content.js";

function createRes() {
  return {
    statusCode: 0,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
    setHeader() {}
  };
}

describe("content fetch-html security", () => {
  it("blocks private and metadata IP ranges", () => {
    expect(isBlockedIp("127.0.0.1")).toBe(true);
    expect(isBlockedIp("10.0.0.5")).toBe(true);
    expect(isBlockedIp("172.16.0.1")).toBe(true);
    expect(isBlockedIp("192.168.1.2")).toBe(true);
    expect(isBlockedIp("169.254.169.254")).toBe(true);
    expect(isBlockedIp("8.8.8.8")).toBe(false);
  });

  it("keeps raw HTML fetching disabled by default", async () => {
    const previous = process.env.ALLOW_RAW_HTML_FETCH;
    delete process.env.ALLOW_RAW_HTML_FETCH;
    const res = createRes();

    await handler({ method: "GET", query: { resource: "fetch-html", url: "http://127.0.0.1/" } }, res);

    process.env.ALLOW_RAW_HTML_FETCH = previous;
    expect(res.statusCode).toBe(403);
    expect(res.payload.code).toBe("RAW_HTML_FETCH_DISABLED");
  });
});
