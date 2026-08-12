import { expect, it } from "vitest";

import { makeAgent, registerOrg, validRegisterPayload } from "../helpers/api.js";
import { describeDb, useTestDb } from "../helpers/db.js";

/**
 * Full-stack authentication tests: real HTTP → controller → service → in-memory Mongo + mocked Redis.
 * These exercise the register / login / refresh / logout / change-password lifecycle end to end.
 */
describeDb("authentication API", () => {
  useTestDb();

  it("registers an organization and returns an access token + organizer user", async () => {
    const { accessToken, user } = await registerOrg();
    expect(accessToken).toBeTruthy();
    expect(user.role.slug).toBe("ORGANIZER");
    expect(user.permissions).toContain("dashboard.view");
    expect(user.tenantId).toBeTruthy();
  });

  it("rejects a duplicate organizer email", async () => {
    const payload = validRegisterPayload();
    const first = await makeAgent().post("/api/auth/register-organizer").send(payload);
    expect(first.status).toBe(201);
    const dup = await makeAgent()
      .post("/api/auth/register-organizer")
      .send({ ...validRegisterPayload(), organizerEmail: payload["organizerEmail"] });
    expect(dup.status).toBeGreaterThanOrEqual(400);
    expect(dup.status).toBeLessThan(500);
  });

  it("logs in with correct credentials and rejects a wrong password", async () => {
    const { email, password } = await registerOrg();
    const ok = await makeAgent().post("/api/auth/login").send({ email, password });
    expect(ok.status).toBe(200);
    expect(ok.body.accessToken).toBeTruthy();

    const bad = await makeAgent().post("/api/auth/login").send({ email, password: "WrongPass123" });
    expect(bad.status).toBe(401);
    expect(bad.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("refreshes the session from the httpOnly cookie", async () => {
    const { agent } = await registerOrg();
    const res = await agent.post("/api/auth/refresh");
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user.role.slug).toBe("ORGANIZER");
  });

  it("logs out and then refuses to refresh", async () => {
    const { agent } = await registerOrg();
    expect((await agent.post("/api/auth/logout")).status).toBe(204);
    expect((await agent.post("/api/auth/refresh")).status).toBe(401);
  });

  it("changes the password, revoking the old credential", async () => {
    const { agent, accessToken, email, password } = await registerOrg();
    const changed = await agent
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ currentPassword: password, newPassword: "BrandNewPass123" });
    expect(changed.status).toBe(204);

    expect((await makeAgent().post("/api/auth/login").send({ email, password })).status).toBe(401);
    expect((await makeAgent().post("/api/auth/login").send({ email, password: "BrandNewPass123" })).status).toBe(200);
  });

  it("enforces the password policy on registration", async () => {
    const weak = await makeAgent()
      .post("/api/auth/register-organizer")
      .send(validRegisterPayload({ organizerPassword: "weak" }));
    expect(weak.status).toBe(400);
  });
});
