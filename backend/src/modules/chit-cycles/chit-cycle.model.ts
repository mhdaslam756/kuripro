import { Schema, model, Types, type HydratedDocument } from "mongoose";

import { tenantScopedPlugin } from "../../middleware/tenant-scope.plugin.js";
import { baseSchemaOptions, type Timestamps } from "../../utils/mongoose-helpers.js";

export const CHIT_CYCLE_STATUSES = ["SCHEDULED", "BIDDING_OPEN", "BIDDING_CLOSED", "SETTLED"] as const;
export type ChitCycleStatus = (typeof CHIT_CYCLE_STATUSES)[number];

export interface ChitCycleDoc extends Timestamps {
  tenantId: Types.ObjectId;
  chitGroupId: Types.ObjectId;

  cycleNumber: number;
  scheduledDate: Date;
  status: ChitCycleStatus;

  /** Snapshot of ChitGroup.chitValue at cycle creation — protects historical settlement math from later edits. */
  totalPotAmount: number;

  winningBidId?: Types.ObjectId;
  winnerMembershipId?: Types.ObjectId;

  commissionAmount?: number;
  discountAmount?: number;
  dividendPerMember?: number;
  prizeAmount?: number;

  settledAt?: Date;
}

export type ChitCycleDocument = HydratedDocument<ChitCycleDoc>;

const chitCycleSchema = new Schema<ChitCycleDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    chitGroupId: { type: Schema.Types.ObjectId, ref: "ChitGroup", required: true },

    cycleNumber: { type: Number, required: true, min: 1 },
    scheduledDate: { type: Date, required: true },
    status: { type: String, enum: CHIT_CYCLE_STATUSES, required: true, default: "SCHEDULED" },

    totalPotAmount: { type: Number, required: true, min: 1 },

    winningBidId: { type: Schema.Types.ObjectId, ref: "Bid" },
    winnerMembershipId: { type: Schema.Types.ObjectId, ref: "ChitMembership" },

    commissionAmount: { type: Number, min: 0 },
    discountAmount: { type: Number, min: 0 },
    dividendPerMember: { type: Number, min: 0 },
    prizeAmount: { type: Number, min: 0 },

    settledAt: { type: Date },
  },
  baseSchemaOptions,
);

chitCycleSchema.index({ chitGroupId: 1, cycleNumber: 1 }, { unique: true });
chitCycleSchema.index({ tenantId: 1, status: 1, scheduledDate: 1 });

chitCycleSchema.plugin(tenantScopedPlugin);

export const ChitCycle = model<ChitCycleDoc>("ChitCycle", chitCycleSchema);
