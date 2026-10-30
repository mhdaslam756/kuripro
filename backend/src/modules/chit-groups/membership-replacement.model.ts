import { Schema, model, Types, type HydratedDocument } from "mongoose";

import { tenantScopedPlugin } from "../../middleware/tenant-scope.plugin.js";
import { baseSchemaOptions, type Timestamps } from "../../utils/mongoose-helpers.js";
import { PAYMENT_METHODS, type PaymentMethod } from "../payments/payment.model.js";

export const REPLACEMENT_SETTLEMENT_STATUSES = ["PENDING", "SETTLED"] as const;
export type ReplacementSettlementStatus = (typeof REPLACEMENT_SETTLEMENT_STATUSES)[number];

/** Financial position of the outgoing member at the moment of replacement. Frozen — never recomputed. */
export interface PreviousMemberSnapshot {
  /** Instalments the member was responsible for (cycles before the effective cycle), excluding waived. */
  instalmentsDue: number;
  instalmentsPaid: number;
  totalDue: number;
  totalPaid: number;
  /** Unpaid balance on cycles before the effective cycle. */
  pendingDues: number;
  /** Money already received for cycles from the effective cycle on (those are now the new member's). */
  prepaidAmount: number;
}

export interface NewMemberTerms {
  remainingInstalments: number;
  totalPayable: number;
}

/**
 * The outgoing member's exit settlement — tracked on its own, independent of the replacement
 * member's account. net = refund − pendingDues − deductions: positive is owed TO the previous
 * member, negative is owed BY them.
 */
export interface ReplacementSettlement {
  status: ReplacementSettlementStatus;
  pendingDues: number;
  refundAmount: number;
  deductionAmount: number;
  deductionReason?: string;
  netAmount: number;
  notes?: string;
  settledAmount?: number;
  method?: PaymentMethod;
  settledAt?: Date;
  settledBy?: Types.ObjectId;
}

export interface MembershipReplacementDoc extends Timestamps {
  tenantId: Types.ObjectId;
  chitGroupId: Types.ObjectId;
  ticketNumber: number;
  subTicket?: string;

  previousMembershipId: Types.ObjectId;
  previousMemberId: Types.ObjectId;
  newMembershipId: Types.ObjectId;
  newMemberId: Types.ObjectId;

  effectiveCycleNumber: number;
  effectiveDate: Date;
  reason?: string;

  previous: PreviousMemberSnapshot;
  newMember: NewMemberTerms;
  settlement: ReplacementSettlement;

  replacedBy: Types.ObjectId;
}

export type MembershipReplacementDocument = HydratedDocument<MembershipReplacementDoc>;

const previousSchema = new Schema<PreviousMemberSnapshot>(
  {
    instalmentsDue: { type: Number, required: true, min: 0 },
    instalmentsPaid: { type: Number, required: true, min: 0 },
    totalDue: { type: Number, required: true, min: 0 },
    totalPaid: { type: Number, required: true, min: 0 },
    pendingDues: { type: Number, required: true, min: 0 },
    prepaidAmount: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const newMemberSchema = new Schema<NewMemberTerms>(
  {
    remainingInstalments: { type: Number, required: true, min: 0 },
    totalPayable: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const settlementSchema = new Schema<ReplacementSettlement>(
  {
    status: { type: String, enum: REPLACEMENT_SETTLEMENT_STATUSES, required: true, default: "PENDING" },
    pendingDues: { type: Number, required: true, min: 0 },
    refundAmount: { type: Number, required: true, min: 0, default: 0 },
    deductionAmount: { type: Number, required: true, min: 0, default: 0 },
    deductionReason: { type: String, trim: true },
    netAmount: { type: Number, required: true },
    notes: { type: String, trim: true },
    settledAmount: { type: Number, min: 0 },
    method: { type: String, enum: PAYMENT_METHODS },
    settledAt: { type: Date },
    settledBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false },
);

const membershipReplacementSchema = new Schema<MembershipReplacementDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    chitGroupId: { type: Schema.Types.ObjectId, ref: "ChitGroup", required: true },
    ticketNumber: { type: Number, required: true, min: 1 },
    subTicket: { type: String, trim: true },

    previousMembershipId: { type: Schema.Types.ObjectId, ref: "ChitMembership", required: true },
    previousMemberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    newMembershipId: { type: Schema.Types.ObjectId, ref: "ChitMembership", required: true },
    newMemberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },

    effectiveCycleNumber: { type: Number, required: true, min: 1 },
    effectiveDate: { type: Date, required: true },
    reason: { type: String, trim: true },

    previous: { type: previousSchema, required: true },
    newMember: { type: newMemberSchema, required: true },
    settlement: { type: settlementSchema, required: true },

    replacedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  baseSchemaOptions,
);

// One replacement record per outgoing membership — a membership can only be replaced once.
membershipReplacementSchema.index({ previousMembershipId: 1 }, { unique: true });
membershipReplacementSchema.index({ tenantId: 1, chitGroupId: 1, ticketNumber: 1 });
membershipReplacementSchema.index({ tenantId: 1, "settlement.status": 1 });

membershipReplacementSchema.plugin(tenantScopedPlugin);

export const MembershipReplacement = model<MembershipReplacementDoc>(
  "MembershipReplacement",
  membershipReplacementSchema,
);
