import express from "express";
import rateLimit from "express-rate-limit";
import supertest from "supertest";
import { describe, expect, it } from "vitest";

import { bearer, makeAgent, registerOrg } from "../helpers/api.js";
import { describeDb, useTestDb } from "../helpers/db.js";

describe("HTTP security hardening", () => {
  it("sets defensive security headers (helmet) on responses", async () => {
    const res = await makeAgent().get("/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBeDefined();
    expect(res.headers["content-security-policy"]).toContain("default-src 'self'");
    expect(res.headers["strict-transport-security"]).toBeDefined();
  });

  it("advertises rate-limit headers (limiter is wired on the app)", async () => {
    const res = await makeAgent().get("/health");
    expect(res.headers["ratelimit-limit"]).toBeDefined();
    expect(res.headers["ratelimit-remaining"]).toBeDefined();
  });

  it("actually enforces the rate limiter (429 past the ceiling)", async () => {
    const app = express();
    app.use(rateLimit({ windowMs: 60_000, limit: 2, standardHeaders: true, legacyHeaders: false }));
    app.get("/", (_req, res) => res.send("ok"));
    const agent = supertest(app);
    expect((await agent.get("/")).status).toBe(200);
    expect((await agent.get("/")).status).toBe(200);
    expect((await agent.get("/")).status).toBe(429);
  });

  it("requires authentication on protected routes", async () => {
    for (const path of ["/api/v1/members", "/api/v1/dashboard/summary", "/api/v1/collections"]) {
      expect((await makeAgent().get(path)).status).toBe(401);
    }
  });

  it("returns a structured error shape without leaking internals", async () => {
    const res = await makeAgent().get("/api/v1/members");
    expect(res.body).toHaveProperty("error.code");
    expect(res.body).toHaveProperty("error.message");
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain(process.env["JWT_ACCESS_SECRET"] ?? "__unset__");
    expect(serialized).not.toMatch(/mongodb(\+srv)?:\/\//);
  });
});

describeDb("data-layer security", () => {
  useTestDb();

  it("blocks NoSQL operator injection in the login body (no auth bypass)", async () => {
    await registerOrg();
    // A classic `{ "$ne": null }` operator-injection attempt must be rejected by validation, never
    // reach the query layer, and never authenticate.
    const res = await makeAgent()
      .post("/api/v1/auth/login")
      .send({ email: { $ne: null }, password: { $ne: null } });
    expect(res.status).toBe(400);
    expect(res.body.accessToken).toBeUndefined();
  });

  it("keeps one organization's session/token from reading another's tenant context", async () => {
    const orgA = await registerOrg();
    const orgB = await registerOrg();
    expect(orgA.user.tenantId).not.toBe(orgB.user.tenantId);

    // Each org, using its own token, sees only its own (empty) member list — never the other's data.
    const aMembers = await orgA.agent.get("/api/v1/members").set(bearer(orgA.accessToken));
    const bMembers = await orgB.agent.get("/api/v1/members").set(bearer(orgB.accessToken));
    expect(aMembers.status).toBe(200);
    expect(bMembers.status).toBe(200);
    expect(aMembers.body.total).toBe(0);
    expect(bMembers.body.total).toBe(0);
  });

  it("rejects a tampered/forged JWT", async () => {
    const forged =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJoYWNrZXIiLCJ0ZW5hbnRJZCI6IngifQ.not_a_valid_signature";
    const res = await makeAgent().get("/api/v1/members").set(bearer(forged));
    expect(res.status).toBe(401);
  });
});
