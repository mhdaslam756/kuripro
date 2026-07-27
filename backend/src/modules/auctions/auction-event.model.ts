import { Schema, model, Types, type HydratedDocument } from "mongoose";

import { tenantScopedPlugin } from "../../middleware/tenant-scope.plugin.js";
import { baseSchemaOptions, type Timestamps } from "../../utils/mongoose-helpers.js";

export const AUCTION_EVENT_TYPES = [
  "BIDDING_OPENED",
  "BID_RECORDED",
  "BID_WITHDRAWN",
  "BIDDING_CLOSED",
  "SETTLED",
  "REPICK_REVERSED",
  "MINUTES_GENERATED",
] as const;
export type AuctionEventType = (typeof AUCTION_EVENT_TYPES)[number];

/**
 * Append-only audit trail for everything that happens to a cycle's auction. Kept separate from the
 * generic ActivityLog because auctions need a rich, per-cycle, immutable record (bids, winner,
 * amounts, reversals) — this is the source for the Audit Trail view and the auction Minutes.
 */
export interface AuctionEventDoc extends Timestamps {
  tenantId: Types.ObjectId;
  chitGroupId: Types.ObjectId;
  chitCycleId: Types.ObjectId;
  type: AuctionEventType;
  actorUserId: Types.ObjectId;
  message: string;
  /** Structured snapshot for the event — amounts, membershipId, method, etc. Free-form by design. */
  metadata?: Record<string, unknown>;
}

export type AuctionEventDocument = HydratedDocument<AuctionEventDoc>;

const auctionEventSchema = new Schema<AuctionEventDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    chitGroupId: { type: Schema.Types.ObjectId, ref: "ChitGroup", required: true },
    chitCycleId: { type: Schema.Types.ObjectId, ref: "ChitCycle", required: true },
    type: { type: String, enum: AUCTION_EVENT_TYPES, required: true },
    actorUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true, trim: true },
    metadata: { type: Schema.Types.Mixed },
  },
  baseSchemaOptions,
);

auctionEventSchema.index({ tenantId: 1, chitCycleId: 1, createdAt: 1 });

auctionEventSchema.plugin(tenantScopedPlugin);

export const AuctionEvent = model<AuctionEventDoc>("AuctionEvent", auctionEventSchema);
