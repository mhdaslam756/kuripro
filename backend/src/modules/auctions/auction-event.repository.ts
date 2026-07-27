import type { ClientSession } from "mongoose";

import { logger } from "../../config/logger.js";
import type { ObjectIdLike } from "../../utils/mongoose-helpers.js";
import { AuctionEvent, type AuctionEventDoc, type AuctionEventDocument } from "./auction-event.model.js";

export type RecordAuctionEventInput = Omit<AuctionEventDoc, "createdAt" | "updatedAt" | "tenantId" | "chitGroupId" | "chitCycleId" | "actorUserId"> & {
  tenantId: ObjectIdLike;
  chitGroupId: ObjectIdLike;
  chitCycleId: ObjectIdLike;
  actorUserId: ObjectIdLike;
};

/**
 * Best-effort audit write — a failure here must never fail the auction action it describes, so
 * errors are logged and swallowed (mirrors the ActivityLog pattern). Safe to `await`.
 */
export async function recordAuctionEvent(input: RecordAuctionEventInput, session?: ClientSession): Promise<void> {
  try {
    await AuctionEvent.create([input], { session });
  } catch (error) {
    logger.error({ err: error, type: input.type }, "Failed to record auction event");
  }
}

export async function listAuctionEvents(tenantId: string, chitCycleId: string): Promise<AuctionEventDocument[]> {
  return AuctionEvent.find({ tenantId, chitCycleId }).sort({ createdAt: 1 });
}
