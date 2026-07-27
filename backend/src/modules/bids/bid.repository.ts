import { Types, type ClientSession } from "mongoose";

import type { ObjectIdLike } from "../../utils/mongoose-helpers.js";
import { Bid, type BidDoc, type BidDocument, type BidStatus } from "./bid.model.js";

export type CreateBidInput = Omit<
  BidDoc,
  "createdAt" | "updatedAt" | "tenantId" | "chitCycleId" | "chitMembershipId" | "status" | "submittedAt"
> & {
  tenantId: ObjectIdLike;
  chitCycleId: ObjectIdLike;
  chitMembershipId: ObjectIdLike;
  status?: BidStatus;
  submittedAt?: Date;
};

export interface PopulatedBidMembership {
  _id: Types.ObjectId;
  ticketNumber: number;
  memberId: { _id: Types.ObjectId; name: string; memberCode: string };
}

export type PopulatedBid = Omit<BidDocument, "chitMembershipId"> & { chitMembershipId: PopulatedBidMembership };

export async function createBid(data: CreateBidInput): Promise<BidDocument> {
  return Bid.create(data);
}

export async function findBidById(id: string, tenantId: string): Promise<BidDocument | null> {
  return Bid.findOne({ _id: id, tenantId });
}

export async function saveBid(bid: BidDocument, session?: ClientSession): Promise<BidDocument> {
  return bid.save({ session });
}

/** All bids for a cycle, newest first, with member name/ticket populated — powers the Bid History. */
export async function listBidsByCycle(tenantId: string, chitCycleId: string): Promise<PopulatedBid[]> {
  return Bid.find({ tenantId, chitCycleId })
    .sort({ discountAmount: -1, submittedAt: 1 })
    .populate<{ chitMembershipId: PopulatedBidMembership }>({
      path: "chitMembershipId",
      match: { tenantId: { $exists: true } },
      select: "ticketNumber memberId",
      populate: { path: "memberId", match: { tenantId: { $exists: true } }, select: "name memberCode" },
    });
}

export async function findActiveBidForMembership(
  tenantId: string,
  chitCycleId: string,
  chitMembershipId: string,
): Promise<BidDocument | null> {
  return Bid.findOne({ tenantId, chitCycleId, chitMembershipId, status: "ACTIVE" });
}

/**
 * The winning bid under "lowest bid" rules: the ACTIVE bid offering the highest discount (i.e. the
 * member willing to take the lowest prize). Ties break to the earliest submission.
 */
export async function findWinningBid(tenantId: string, chitCycleId: string): Promise<BidDocument | null> {
  return Bid.findOne({ tenantId, chitCycleId, status: "ACTIVE" }).sort({ discountAmount: -1, submittedAt: 1 });
}

export async function countActiveBids(tenantId: string, chitCycleId: string): Promise<number> {
  return Bid.countDocuments({ tenantId, chitCycleId, status: "ACTIVE" });
}

/** Bulk status transition for a cycle's bids (e.g. WINNING/LOST at settlement, back to ACTIVE on re-pick). */
export async function updateBidStatusesForCycle(
  tenantId: string,
  chitCycleId: string,
  from: BidStatus[],
  to: BidStatus,
  session?: ClientSession,
): Promise<number> {
  const result = await Bid.updateMany(
    { tenantId, chitCycleId, status: { $in: from } },
    { $set: { status: to } },
    { session },
  );
  return result.modifiedCount;
}

export async function setBidStatus(
  tenantId: string,
  bidId: string,
  status: BidStatus,
  session?: ClientSession,
): Promise<void> {
  await Bid.updateOne({ _id: new Types.ObjectId(bidId), tenantId }, { $set: { status } }, { session });
}
