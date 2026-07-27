import { Schema, model, Types, type HydratedDocument } from "mongoose";

import { tenantScopedPlugin } from "../../middleware/tenant-scope.plugin.js";
import { baseSchemaOptions, type Timestamps } from "../../utils/mongoose-helpers.js";

export const BID_STATUSES = ["ACTIVE", "WITHDRAWN", "WINNING", "LOST"] as const;
export type BidStatus = (typeof BID_STATUSES)[number];

export interface BidDoc extends Timestamps {
  tenantId: Types.ObjectId;
  chitCycleId: Types.ObjectId;
  chitMembershipId: Types.ObjectId;

  /** Amount (paise) the member offers to forgo from the pot — the chit-auction discount. */
  discountAmount: number;
  /** discountAmount as a % of the cycle's totalPotAmount, denormalized for fast statutory-cap checks/display. */
  discountPercent: number;

  status: BidStatus;
  submittedAt: Date;
}

export type BidDocument = HydratedDocument<BidDoc>;

const bidSchema = new Schema<BidDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    chitCycleId: { type: Schema.Types.ObjectId, ref: "ChitCycle", required: true },
    chitMembershipId: { type: Schema.Types.ObjectId, ref: "ChitMembership", required: true },

    discountAmount: { type: Number, required: true, min: 1 },
    discountPercent: { type: Number, required: true, min: 0, max: 100 },

    status: { type: String, enum: BID_STATUSES, required: true, default: "ACTIVE" },
    submittedAt: { type: Date, required: true, default: () => new Date() },
  },
  baseSchemaOptions,
);

bidSchema.index({ chitCycleId: 1, chitMembershipId: 1, status: 1 });
bidSchema.index({ tenantId: 1, chitCycleId: 1 });

bidSchema.plugin(tenantScopedPlugin);

export const Bid = model<BidDoc>("Bid", bidSchema);
