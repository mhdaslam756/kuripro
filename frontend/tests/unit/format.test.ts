import { describe, expect, it } from "vitest";

import { formatDate, formatDateTime, formatPaise, humanize } from "@/lib/format";

describe("format helpers", () => {
  it("formats paise as INR rupees", () => {
    expect(formatPaise(2_500_000)).toContain("25,000");
    expect(formatPaise(0)).toContain("0");
  });

  it("formats an ISO date", () => {
    const out = formatDate("2026-07-22T00:00:00.000Z");
    expect(out).toMatch(/2026/);
    expect(out.length).toBeGreaterThan(0);
  });

  it("formats an ISO date-time", () => {
    const out = formatDateTime("2026-07-22T09:30:00.000Z");
    expect(out).toMatch(/2026/);
  });

  it("humanizes SCREAMING_SNAKE_CASE actions", () => {
    const out = humanize("COLLECTION_RECORDED");
    expect(out.toLowerCase()).toContain("collection");
    expect(out).not.toContain("_");
  });
});
