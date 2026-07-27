import { describe, expect, it } from "vitest";

import { PERMISSION_CATALOG, PERMISSION_KEYS } from "../../src/modules/permissions/permission.catalog.js";
import { PERMISSION_CATEGORIES } from "../../src/modules/permissions/permission.model.js";
import { DEFAULT_ROLE_PERMISSIONS } from "../../src/modules/roles/role.defaults.js";

describe("permission catalog integrity", () => {
  it("has no duplicate permission keys", () => {
    expect(new Set(PERMISSION_KEYS).size).toBe(PERMISSION_KEYS.length);
  });

  it("only uses declared categories", () => {
    for (const entry of PERMISSION_CATALOG) {
      expect(PERMISSION_CATEGORIES).toContain(entry.category);
    }
  });

  it("every default role permission exists in the catalog", () => {
    const known = new Set(PERMISSION_KEYS);
    for (const [role, keys] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      for (const key of keys) {
        expect(known, `role ${role} references unknown permission "${key}"`).toContain(key);
      }
    }
  });

  it("grants the organizer at least as many permissions as staff", () => {
    expect(DEFAULT_ROLE_PERMISSIONS.ORGANIZER.length).toBeGreaterThanOrEqual(DEFAULT_ROLE_PERMISSIONS.STAFF.length);
  });

  it("includes the dashboard permission for organizer and staff", () => {
    expect(DEFAULT_ROLE_PERMISSIONS.ORGANIZER).toContain("dashboard.view");
    expect(DEFAULT_ROLE_PERMISSIONS.STAFF).toContain("dashboard.view");
  });
});
