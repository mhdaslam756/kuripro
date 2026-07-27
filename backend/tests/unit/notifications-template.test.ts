import { describe, expect, it } from "vitest";

import { DEFAULT_TEMPLATES } from "../../src/modules/notifications/notification.defaults.js";
import { NOTIFICATION_CHANNELS } from "../../src/modules/notifications/notification.constants.js";
import { extractVariables, renderTemplate } from "../../src/modules/notifications/template.util.js";

describe("renderTemplate", () => {
  it("substitutes known variables", () => {
    expect(renderTemplate("Hi {{name}}, you owe {{amount}}", { name: "Asha", amount: "₹5,000" })).toBe("Hi Asha, you owe ₹5,000");
  });

  it("tolerates whitespace inside braces", () => {
    expect(renderTemplate("{{ orgName }}", { orgName: "Kuri Co" })).toBe("Kuri Co");
  });

  it("never leaks raw {{...}} for unknown or missing variables", () => {
    const out = renderTemplate("Hi {{name}}, ref {{missing}}", { name: "Asha" });
    expect(out).toBe("Hi Asha, ref ");
    expect(out).not.toContain("{{");
  });

  it("coerces numeric values", () => {
    expect(renderTemplate("Cycle {{n}}", { n: 6 })).toBe("Cycle 6");
  });
});

describe("extractVariables", () => {
  it("returns the distinct variable names", () => {
    expect(extractVariables("{{a}} {{ b }} {{a}} {{c}}").sort()).toEqual(["a", "b", "c"]);
  });
});

describe("default notification templates", () => {
  it("are internally consistent (valid channel, non-empty body, email has subject)", () => {
    expect(DEFAULT_TEMPLATES.length).toBeGreaterThanOrEqual(8);
    for (const t of DEFAULT_TEMPLATES) {
      expect(NOTIFICATION_CHANNELS).toContain(t.channel);
      expect(t.body.trim().length).toBeGreaterThan(0);
      if (t.channel === "EMAIL") expect(t.subject && t.subject.length).toBeTruthy();
    }
  });
});
