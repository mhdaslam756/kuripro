import { describe, expect, it } from "vitest";

import {
  AUTO_VARIABLES,
  extractVariables,
  isAutoVariable,
  manualVariables,
  renderTemplate,
} from "@/features/notifications/lib/template-vars";

describe("template-vars (frontend preview parity with backend)", () => {
  it("renders known variables and blanks unknown ones", () => {
    expect(renderTemplate("Hi {{memberName}} — {{amount}}", { memberName: "Asha", amount: "₹5,000" })).toBe("Hi Asha — ₹5,000");
    expect(renderTemplate("Hi {{x}}", {})).toBe("Hi ");
  });

  it("extracts distinct variables", () => {
    expect(extractVariables("{{a}} {{ b }} {{a}}").sort()).toEqual(["a", "b"]);
  });

  it("classifies auto vs manual variables", () => {
    for (const v of AUTO_VARIABLES) expect(isAutoVariable(v)).toBe(true);
    expect(isAutoVariable("amount")).toBe(false);
  });

  it("returns only the manual (sender-provided) variables in a template", () => {
    const vars = manualVariables("Hi {{memberName}}, pay {{amount}} for {{chitGroupName}} — {{orgName}}");
    expect(vars.sort()).toEqual(["amount", "chitGroupName"]);
    // memberName + orgName are auto-filled, so excluded.
    expect(vars).not.toContain("memberName");
    expect(vars).not.toContain("orgName");
  });
});
