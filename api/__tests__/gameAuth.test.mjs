import { describe, expect, it } from "vitest";
import handler from "../game.js";
import { issueSessionToken } from "../../server/security/sessionToken.mjs";

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

async function callGame({ resource, method = "GET", token, body = {}, query = {} }) {
  const res = createRes();
  await handler(
    {
      method,
      query: { resource, ...query },
      body,
      headers: token ? { authorization: `Bearer ${token}` } : {}
    },
    res
  );
  return res;
}

describe("game API authorization", () => {
  it("rejects protected progress writes without a token", async () => {
    const res = await callGame({
      resource: "progress",
      method: "POST",
      body: { userId: "victim", progress: { score: 1 } }
    });

    expect(res.statusCode).toBe(401);
  });

  it("ignores client-supplied progress userId and stores under token user", async () => {
    const attackerId = `auth-test-${Date.now()}`;
    const token = issueSessionToken(attackerId);

    const write = await callGame({
      resource: "progress",
      method: "POST",
      token,
      body: { userId: "victim", progress: { score: 1234 } }
    });
    expect(write.statusCode).toBe(200);

    const read = await callGame({
      resource: "progress",
      method: "GET",
      token,
      query: { userId: "victim" }
    });

    expect(read.statusCode).toBe(200);
    expect(read.payload.progress.score).toBe(1234);
  });
});
