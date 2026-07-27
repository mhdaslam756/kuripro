import { beforeEach, describe, expect, it } from "vitest";

import { outboxAdd, outboxAll, outboxClear, outboxCount, outboxDelete, type OutboxCollection } from "@/lib/idb";

function sample(id: string, extra: Partial<OutboxCollection> = {}): OutboxCollection {
  return {
    clientReceiptId: id,
    paymentId: "pay-1",
    method: "CASH",
    memberName: "Asha",
    chitGroupName: "Gold",
    queuedAt: new Date().toISOString(),
    ...extra,
  };
}

describe("IndexedDB offline outbox", () => {
  beforeEach(async () => {
    await outboxClear();
  });

  it("adds and reads entries", async () => {
    await outboxAdd(sample("a"));
    await outboxAdd(sample("b"));
    expect(await outboxCount()).toBe(2);
    expect((await outboxAll()).map((x) => x.clientReceiptId).sort()).toEqual(["a", "b"]);
  });

  it("upserts on the same clientReceiptId (no duplicate)", async () => {
    await outboxAdd(sample("a"));
    await outboxAdd(sample("a", { amount: 50_000 }));
    expect(await outboxCount()).toBe(1);
    expect((await outboxAll())[0]!.amount).toBe(50_000);
  });

  it("deletes only the given ids (dedup-safe partial sync)", async () => {
    await outboxAdd(sample("a"));
    await outboxAdd(sample("b"));
    await outboxAdd(sample("c"));
    await outboxDelete(["a", "c"]);
    expect((await outboxAll()).map((x) => x.clientReceiptId)).toEqual(["b"]);
  });

  it("clears the whole outbox", async () => {
    await outboxAdd(sample("a"));
    await outboxClear();
    expect(await outboxCount()).toBe(0);
  });
});
