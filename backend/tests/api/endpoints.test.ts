import { expect, it } from "vitest";

import { Member } from "../../src/modules/members/member.model.js";
import { User } from "../../src/modules/users/user.model.js";
import { bearer, makeAgent, registerOrg, type Agent } from "../helpers/api.js";
import { describeDb, useTestDb } from "../helpers/db.js";

/** Full-stack API coverage of representative authenticated read endpoints for a freshly-registered org. */
describeDb("authenticated API endpoints", () => {
  useTestDb();

  async function createMember(agent: Agent, accessToken: string, name: string, phone: string): Promise<string> {
    const res = await agent
      .post("/api/v1/members")
      .set(bearer(accessToken))
      .send({
        name,
        phone,
        occupation: { type: "SALARIED" },
        address: { line1: "1 MG Road", city: "Kochi", state: "Kerala", pincode: "682001" },
      });
    expect(res.status).toBe(201);
    return res.body.member.id as string;
  }

  it("serves the dashboard summary to an organizer", async () => {
    const { agent, accessToken } = await registerOrg();
    const res = await agent.get("/api/v1/dashboard/summary").set(bearer(accessToken));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("kpis.activeMembers");
    expect(res.body.today).toHaveProperty("total");
    expect(res.body.pending).toHaveProperty("pendingAmount");
    expect(Array.isArray(res.body.upcomingAuctions)).toBe(true);
  });

  it("serves a zero-filled dashboard trend series", async () => {
    const { agent, accessToken } = await registerOrg();
    const res = await agent.get("/api/v1/dashboard/trends?months=6").set(bearer(accessToken));
    expect(res.status).toBe(200);
    expect(res.body.months).toHaveLength(6);
    expect(res.body.collectionTrend).toHaveLength(6);
    expect(res.body.cashFlow).toHaveLength(6);
  });

  it("lists members (empty) for a new organization", async () => {
    const { agent, accessToken } = await registerOrg();
    const res = await agent.get("/api/v1/members").set(bearer(accessToken));
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  it("registers multiple members in one organization", async () => {
    const { agent, accessToken } = await registerOrg();
    // Mongoose builds indexes in the background — without this the inserts can win the race and
    // the unique-index regression below would go unnoticed.
    await Member.init();
    const payload = (name: string, phone: string) => ({
      name,
      phone,
      occupation: { type: "SALARIED" },
      address: { line1: "1 MG Road", city: "Kochi", state: "Kerala", pincode: "682001" },
    });

    const first = await agent.post("/api/v1/members").set(bearer(accessToken)).send(payload("Member One", "9000000001"));
    expect(first.status).toBe(201);

    // Regression: `userId` defaults to null, so a sparse unique index on (tenantId, userId) made
    // every member after the first collide with a 409.
    const second = await agent
      .post("/api/v1/members")
      .set(bearer(accessToken))
      .send(payload("Member Two", "9000000002"));
    expect(second.status).toBe(201);
    expect(second.body.member.memberCode).not.toBe(first.body.member.memberCode);
  });

  it("creates a portal login for a member with a fresh email", async () => {
    const { agent, accessToken } = await registerOrg();
    const memberId = await createMember(agent, accessToken, "Invitee", "9000000003");

    const res = await agent
      .post(`/api/v1/members/${memberId}/invite`)
      .set(bearer(accessToken))
      .send({ email: "invitee@example.com" });

    expect(res.status).toBe(201);
    expect(res.body.linkedExistingAccount).toBe(false);
    expect(res.body.temporaryPassword).toBeTruthy();
    expect(res.body.member.userId).toBeTruthy();
  });

  it("links a member to the existing account when the email already signs in to this organization", async () => {
    const { agent, accessToken, email: organizerEmail, user } = await registerOrg();
    const memberId = await createMember(agent, accessToken, "Organizer As Member", "9000000004");

    // An organizer who also holds a chit slot: one human, one login. Sent uppercase to pin the
    // case-normalization — a raw lookup would miss the stored lowercase address.
    const res = await agent
      .post(`/api/v1/members/${memberId}/invite`)
      .set(bearer(accessToken))
      .send({ email: organizerEmail.toUpperCase() });

    expect(res.status).toBe(201);
    expect(res.body.linkedExistingAccount).toBe(true);
    expect(res.body.temporaryPassword).toBeNull();
    expect(res.body.member.userId).toBe(user.id);

    // No second login was minted for the same person.
    expect(await User.countDocuments({ email: organizerEmail })).toBe(1);
  });

  it("refuses to link one login to a second member record", async () => {
    const { agent, accessToken, email: organizerEmail } = await registerOrg();
    const firstId = await createMember(agent, accessToken, "First", "9000000005");
    const secondId = await createMember(agent, accessToken, "Second", "9000000006");

    const first = await agent
      .post(`/api/v1/members/${firstId}/invite`)
      .set(bearer(accessToken))
      .send({ email: organizerEmail });
    expect(first.status).toBe(201);

    const second = await agent
      .post(`/api/v1/members/${secondId}/invite`)
      .set(bearer(accessToken))
      .send({ email: organizerEmail });
    expect(second.status).toBe(409);
    expect(second.body.error.message).toContain("already has portal access as First");

    // The rejected member is untouched and still invitable with another address.
    const unchanged = await agent.get(`/api/v1/members/${secondId}`).set(bearer(accessToken));
    expect(unchanged.body.member.userId).toBeNull();
  });

  it("refuses to link an email belonging to a different organization", async () => {
    const other = await registerOrg();
    const { agent, accessToken } = await registerOrg();
    const memberId = await createMember(agent, accessToken, "Outsider", "9000000007");

    const res = await agent
      .post(`/api/v1/members/${memberId}/invite`)
      .set(bearer(accessToken))
      .send({ email: other.email });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toContain("outside this organization");
  });

  it("rejects an authenticated endpoint when no token is presented", async () => {
    const res = await makeAgent().get("/api/v1/members");
    expect(res.status).toBe(401);
  });

  it("rejects a malformed/garbage bearer token", async () => {
    const res = await makeAgent().get("/api/v1/members").set(bearer("not-a-real-jwt"));
    expect(res.status).toBe(401);
  });
});
