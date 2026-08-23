import { Schema, model, Types, type HydratedDocument } from "mongoose";

import { tenantScopedPlugin } from "../../middleware/tenant-scope.plugin.js";
import { baseSchemaOptions, type Timestamps } from "../../utils/mongoose-helpers.js";

export const PAYOUT_STATUSES = ["PENDING", "PARTIALLY_PAID", "PAID"] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

/**
 * A prize-payout obligation to the winner of a cycle — the amount *declared* owed, plus the running
 * total *paid* across one or more disbursement tranches (see PayoutDisbursement). Created PENDING at
 * auction settlement; moves to PARTIALLY_PAID / PAID as the prize is disbursed. `chitGroupId` and
 * `memberId` are denormalized so the payout History and receipts render without extra joins.
 */
export interface PayoutDoc extends Timestamps {
  tenantId: Types.ObjectId;
  chitGroupId: Types.ObjectId;
  chitCycleId: Types.ObjectId;
  chitMembershipId: Types.ObjectId;
  memberId: Types.ObjectId;

  /** Declared prize (paise). */
  amount: number;
  /** Running total disbursed (paise). Remaining = amount − amountPaid. */
  amountPaid: number;
  status: PayoutStatus;

  lastDisbursedAt?: Date;
  notes?: string;
}

export type PayoutDocument = HydratedDocument<PayoutDoc>;

const payoutSchema = new Schema<PayoutDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    chitGroupId: { type: Schema.Types.ObjectId, ref: "ChitGroup", required: true },
    chitCycleId: { type: Schema.Types.ObjectId, ref: "ChitCycle", required: true },
    chitMembershipId: { type: Schema.Types.ObjectId, ref: "ChitMembership", required: true },
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },

    amount: { type: Number, required: true, min: 1 },
    amountPaid: { type: Number, required: true, default: 0, min: 0 },
    status: { type: String, enum: PAYOUT_STATUSES, required: true, default: "PENDING" },

    lastDisbursedAt: { type: Date },
    notes: { type: String, trim: true },
  },
  baseSchemaOptions,
);

payoutSchema.index({ chitCycleId: 1, chitMembershipId: 1 }, { unique: true });
payoutSchema.index({ tenantId: 1, status: 1 });
payoutSchema.index({ tenantId: 1, chitGroupId: 1, createdAt: -1 });
payoutSchema.index({ tenantId: 1, memberId: 1 });

payoutSchema.plugin(tenantScopedPlugin);

export const Payout = model<PayoutDoc>("Payout", payoutSchema);
