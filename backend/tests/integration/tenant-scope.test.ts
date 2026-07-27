import mongoose from "mongoose";
import { expect, it } from "vitest";

import { Member } from "../../src/modules/members/member.model.js";
import { describeDb, useTestDb } from "../helpers/db.js";

/**
 * The tenant-scope plugin is the app's core data-isolation guard: every read/update/delete on a
 * multi-tenant collection MUST filter by tenantId, or it throws loudly rather than leaking across
 * tenants. These tests prove the guard against the real Mongoose model on a real (in-memory) database.
 */
describeDb("tenant-scope guard", () => {
  useTestDb();

  it("refuses a find() with no tenantId filter", async () => {
    await expect(Member.find({})).rejects.toThrow(/tenantId/i);
  });

  it("refuses a countDocuments() with no tenantId filter", async () => {
    await expect(Member.countDocuments({})).rejects.toThrow(/tenantId/i);
  });

  it("allows a tenant-scoped find()", async () => {
    const tenantId = new mongoose.Types.ObjectId();
    await expect(Member.find({ tenantId })).resolves.toBeInstanceOf(Array);
  });

  it("permits an explicit cross-tenant query via { tenantId: { $exists: true } }", async () => {
    await expect(Member.find({ tenantId: { $exists: true } })).resolves.toBeInstanceOf(Array);
  });
});
