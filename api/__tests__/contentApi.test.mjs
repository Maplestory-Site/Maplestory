import { describe, expect, it } from "vitest";
import handler from "../content.js";

function createResponse() {
  return {
    body: undefined,
    headers: {},
    statusCode: 200,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

describe("content API errors", () => {
  it("returns a structured error when resource is missing", async () => {
    const res = createResponse();

    await handler({ method: "GET", query: {} }, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ ok: false, code: "MISSING_RESOURCE" });
  });

  it("returns a structured error for unsupported methods", async () => {
    const res = createResponse();

    await handler({ method: "POST", query: { resource: "news-feed" } }, res);

    expect(res.statusCode).toBe(405);
    expect(res.body).toMatchObject({ ok: false, code: "METHOD_NOT_ALLOWED" });
  });

  it("returns a structured error for unknown resources", async () => {
    const res = createResponse();

    await handler({ method: "GET", query: { resource: "not-real" } }, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toMatchObject({ ok: false, code: "UNKNOWN_RESOURCE" });
  });
});
