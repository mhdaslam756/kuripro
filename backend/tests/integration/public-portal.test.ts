import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../../src/app.js";
import { Tenant } from "../../src/modules/tenants/tenant.model.js";
import { seedSystemRolesForOrganization } from "../../src/modules/roles/role.service.js";
import { describeDb, useTestDb } from "../helpers/db.js";

describeDb("Public Portal Integration Tests", () => {
  useTestDb();

  async function createTestOrg(slug = "demo-org") {
    const tenant = await Tenant.create({
      name: "Demo Organization",
      slug,
      registrationNumber: "REG-12345",
      contactEmail: "contact@demo.org",
      contactPhone: "9876543210",
      address: {
        line1: "123 Main St",
        city: "Kochi",
        state: "Kerala",
        pincode: "682001",
        country: "India",
      },
      settings: {
        defaultForemanCommissionPercent: 5,
        defaultMaxBidDiscountPercent: 40,
        currency: "INR",
        financialYearStartMonth: 4,
      },
      subscription: {
        plan: "BASIC",
        status: "ACTIVE",
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      businessHours: [],
      status: "ACTIVE",
    });

    await seedSystemRolesForOrganization(tenant._id.toString());
    return tenant;
  }

  it("GET /api/public/org/:slug returns public organization details", async () => {
    await createTestOrg("org-lookup");
    const app = createApp();

    const res = await request(app).get("/api/public/org/org-lookup");

    expect(res.status).toBe(200);
    expect(res.body.org).toEqual(
      expect.objectContaining({
        name: "Demo Organization",
        slug: "org-lookup",
        contactPhone: "9876543210",
        contactEmail: "contact@demo.org",
      }),
    );
  });

  it("POST /api/public/org/:slug/register-member registers a new member and returns auth tokens", async () => {
    await createTestOrg("org-register");
    const app = createApp();

    const res = await request(app)
      .post("/api/public/org/org-register/register-member")
      .send({
        name: "Self Registered Member",
        phone: "9998887770",
        email: "member@example.com",
        password: "SecretPassword123",
        address: {
          line1: "45 Park Avenue",
          city: "Kochi",
          state: "Kerala",
          pincode: "682002",
        },
        occupation: {
          type: "SALARIED",
          employerOrBusinessName: "TechCorp",
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.auth).toHaveProperty("accessToken");
    expect(res.body.auth.user.role.slug).toBe("MEMBER");
    expect(res.body.member.name).toBe("Self Registered Member");
    expect(res.body.member.memberCode).toMatch(/^MBR-/);
  });

  it("POST /api/public/org/:slug/login authenticates a registered member", async () => {
    await createTestOrg("org-login");
    const app = createApp();

    // Register first
    await request(app)
      .post("/api/public/org/org-login/register-member")
      .send({
        name: "Member Login Test",
        phone: "9876543219",
        email: "logintest@example.com",
        password: "Password123!",
        address: { line1: "Test Address", city: "Kochi", state: "Kerala", pincode: "682001" },
        occupation: { type: "BUSINESS_OWNER" },
      });

    // Login via phone
    const phoneLoginRes = await request(app)
      .post("/api/public/org/org-login/login")
      .send({
        identifier: "9876543219",
        password: "Password123!",
      });

    expect(phoneLoginRes.status).toBe(200);
    expect(phoneLoginRes.body.auth).toHaveProperty("accessToken");

    // Login via email
    const emailLoginRes = await request(app)
      .post("/api/public/org/org-login/login")
      .send({
        identifier: "logintest@example.com",
        password: "Password123!",
      });

    expect(emailLoginRes.status).toBe(200);
    expect(emailLoginRes.body.auth).toHaveProperty("accessToken");
  });
});
