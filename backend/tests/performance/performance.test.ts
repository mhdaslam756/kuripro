import { describe, expect, it } from "vitest";

import { makeAgent } from "../helpers/api.js";
import { computeSettlement } from "../../src/modules/auctions/settlement.js";
import { renderTemplate } from "../../src/modules/notifications/template.util.js";

/**
 * Performance guard-rails. Thresholds are deliberately generous — the goal is to catch a catastrophic
 * regression (an accidental O(n²), a sync bottleneck), not to enforce a tight SLA on shared CI hardware.
 * Measured numbers are attached to each assertion message for visibility.
 */
describe("performance budgets", () => {
  it("computes 50k settlements quickly", () => {
    const t0 = performance.now();
    let acc = 0;
    for (let i = 0; i < 50_000; i += 1) {
      const r = computeSettlement({ potAmount: 5_000_000, totalMembers: 20, foremanCommissionPercent: 5, winningDiscount: 500_000 + (i % 1000) });
      acc += r.prizeAmount;
    }
    const ms = performance.now() - t0;
    expect(acc).toBeGreaterThan(0);
    expect(ms, `50k settlements took ${ms.toFixed(0)}ms`).toBeLessThan(2000);
  });

  it("renders 50k templates quickly", () => {
    const body = "Dear {{memberName}}, your installment of {{amount}} for {{chitGroupName}} is due {{dueDate}}. — {{orgName}}";
    const ctx = { memberName: "Asha", amount: "₹5,000", chitGroupName: "Gold", dueDate: "05 Aug", orgName: "Kuri Co" };
    const t0 = performance.now();
    let len = 0;
    for (let i = 0; i < 50_000; i += 1) len += renderTemplate(body, ctx).length;
    const ms = performance.now() - t0;
    expect(len).toBeGreaterThan(0);
    expect(ms, `50k template renders took ${ms.toFixed(0)}ms`).toBeLessThan(2000);
  });

  it("keeps /health p95 latency low under a burst", async () => {
    const agent = makeAgent();
    await agent.get("/health"); // warm up

    const N = 100;
    const times: number[] = [];
    for (let i = 0; i < N; i += 1) {
      const t = performance.now();
      const res = await agent.get("/health");
      times.push(performance.now() - t);
      expect(res.status).toBe(200);
    }
    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(N * 0.95)]!;
    const median = times[Math.floor(N * 0.5)]!;
    expect(p95, `median=${median.toFixed(1)}ms p95=${p95.toFixed(1)}ms`).toBeLessThan(500);
  });
});
