import { beforeEach, describe, expect, it } from "vitest";

import { clearSyncedFromQueue, countQueue, enqueueCollection, getQueue } from "@/features/collections/offline-queue";
import { outboxClear } from "@/lib/idb";

describe("collections offline queue", () => {
  beforeEach(async () => {
    await outboxClear();
  });

  it("enqueues with a generated clientReceiptId + queuedAt", async () => {
    const item = await enqueueCollection({ paymentId: "p1", method: "CASH", memberName: "Asha", chitGroupName: "Gold" });
    expect(item.clientReceiptId).toBeTruthy();
    expect(item.queuedAt).toBeTruthy();
    expect(await countQueue()).toBe(1);
  });

  it("carries an optional GPS stamp through the queue", async () => {
    await enqueueCollection({ paymentId: "p1", method: "CASH", memberName: "A", chitGroupName: "G", lat: 9.98, lng: 76.29 });
    const [entry] = await getQueue();
    expect(entry!.lat).toBe(9.98);
    expect(entry!.lng).toBe(76.29);
  });

  it("clears only the synced receipts, leaving the rest queued", async () => {
    const a = await enqueueCollection({ paymentId: "p1", method: "CASH", memberName: "A", chitGroupName: "G" });
    const b = await enqueueCollection({ paymentId: "p2", method: "UPI", memberName: "B", chitGroupName: "G" });
    await clearSyncedFromQueue([a.clientReceiptId]);
    const rest = await getQueue();
    expect(rest.map((x) => x.clientReceiptId)).toEqual([b.clientReceiptId]);
  });
});
