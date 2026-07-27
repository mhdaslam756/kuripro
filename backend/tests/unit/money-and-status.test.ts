import { describe, expect, it } from "vitest";

import { computeInstallmentStatus } from "../../src/modules/payments/installment-status.js";
import { formatPaiseAsINR, paiseToRupees, percentageOfPaise, rupeesToPaise, sumPaise } from "../../src/utils/money.js";
import { slugify } from "../../src/utils/slugify.js";

describe("money utils", () => {
  it("converts rupees ↔ paise as integers", () => {
    expect(rupeesToPaise(1)).toBe(100);
    expect(rupeesToPaise(2500.5)).toBe(250_050);
    expect(paiseToRupees(250_050)).toBe(2500.5);
  });

  it("computes a percentage of a paise amount (rounded to whole paise)", () => {
    expect(percentageOfPaise(5_000_000, 5)).toBe(250_000);
    expect(percentageOfPaise(3_333_337, 7)).toBe(Math.round((3_333_337 * 7) / 100));
  });

  it("sums paise without floating drift", () => {
    expect(sumPaise(10, 20, 30)).toBe(60);
    expect(sumPaise()).toBe(0);
  });

  it("formats paise as INR", () => {
    const formatted = formatPaiseAsINR(2_500_000);
    expect(formatted).toContain("25,000");
    expect(formatted).toMatch(/₹|Rs|INR/);
  });
});

describe("computeInstallmentStatus", () => {
  const future = new Date(Date.now() + 86_400_000);
  const past = new Date(Date.now() - 86_400_000);

  it("is PAID once the full amount is covered", () => {
    expect(computeInstallmentStatus(1000, 1000, future)).toBe("PAID");
    expect(computeInstallmentStatus(1200, 1000, past)).toBe("PAID");
  });

  it("is PARTIAL when some but not all is paid", () => {
    expect(computeInstallmentStatus(400, 1000, future)).toBe("PARTIAL");
    expect(computeInstallmentStatus(400, 1000, past)).toBe("PARTIAL");
  });

  it("is PENDING when nothing is paid and the due date is in the future", () => {
    expect(computeInstallmentStatus(0, 1000, future)).toBe("PENDING");
  });

  it("is OVERDUE when nothing is paid and the due date has passed", () => {
    expect(computeInstallmentStatus(0, 1000, past)).toBe("OVERDUE");
  });
});

describe("slugify", () => {
  it("produces url-safe slugs", () => {
    expect(slugify("Vaidegi Gold 5 Lakh")).toBe("vaidegi-gold-5-lakh");
    expect(slugify("  Trim  &  Symbols!! ")).toMatch(/^[a-z0-9-]+$/);
  });
});
