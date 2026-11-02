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
  /** Commission the previous member owes the chit company, netted off what is paid back to them. */
  commissionAmount?: number;
  /** Running total actually paid out (or collected), in paise. Older records without it are read via paidOf(). */
  paidAmount?: number;
  netAmount: number;
  notes?: string;
  settledAmount?: number;
  method?: PaymentMethod;
  settledAt?: Date;
  settledBy?: Types.ObjectId;
}

/** Who the ticket's commission belongs to after the replacement. Ownership and payment are tracked separately. */
export interface ReplacementCommission {
  total: number;
  previousMemberShare: number;
  replacementMemberShare: number;
  organizationShare?: number;
  previousMemberPayment: "PENDING" | "PAID";
  replacementMemberPayment: "PENDING" | "PAID";
}

export interface ReplacementFeeRecord {
  mode: "NONE" | "FIXED" | "PERCENTAGE";
  base?: string;
  baseAmount: number;
  percentage?: number;
  amount: number;
  status: "NOT_APPLICABLE" | "PENDING" | "COLLECTED";
  method?: PaymentMethod;
  collectedAt?: Date;
}

/** The organisation's settings as they were when this replacement ran — later edits never change them. */
export interface ReplacementPolicySnapshot {
  installmentSettlementMode: "PENDING" | "IMMEDIATE";
  commissionOwnershipMode: "ORGANIZATION" | "PREVIOUS_MEMBER" | "REPLACEMENT_MEMBER" | "EQUAL_SPLIT" | "BY_CYCLES" | "FIXED_AMOUNT";
  replacementFeeMode: "NONE" | "FIXED" | "PERCENTAGE";
  /** Whether the group's own terms or the organisation default applied. */
  source?: "GROUP" | "ORGANIZATION";
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
  /** Set only when a full ticket was split: the first fields above are half A, these are half B. */
  secondNewMembershipId?: Types.ObjectId;
  secondNewMemberId?: Types.ObjectId;
  secondNewMember?: NewMemberTerms;

  effectiveCycleNumber: number;
  effectiveDate: Date;
  reason?: string;

  previous: PreviousMemberSnapshot;
  newMember: NewMemberTerms;
  settlement: ReplacementSettlement;
  policy?: ReplacementPolicySnapshot;
  commission?: ReplacementCommission;
  fee?: ReplacementFeeRecord;

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
    commissionAmount: { type: Number, min: 0, default: 0 },
    paidAmount: { type: Number, min: 0, default: 0 },
    netAmount: { type: Number, required: true },
    notes: { type: String, trim: true },
    settledAmount: { type: Number, min: 0 },
    method: { type: String, enum: PAYMENT_METHODS },
    settledAt: { type: Date },
    settledBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false },
);

const commissionSchema = new Schema<ReplacementCommission>(
  {
    total: { type: Number, required: true, min: 0 },
    previousMemberShare: { type: Number, required: true, min: 0 },
    replacementMemberShare: { type: Number, required: true, min: 0 },
    organizationShare: { type: Number, min: 0, default: 0 },
    previousMemberPayment: { type: String, enum: ["PENDING", "PAID"], required: true, default: "PENDING" },
    replacementMemberPayment: { type: String, enum: ["PENDING", "PAID"], required: true, default: "PENDING" },
  },
  { _id: false },
);

const feeSchema = new Schema<ReplacementFeeRecord>(
  {
    mode: { type: String, enum: ["NONE", "FIXED", "PERCENTAGE"], required: true },
    base: { type: String },
    baseAmount: { type: Number, required: true, min: 0, default: 0 },
    percentage: { type: Number, min: 0, max: 100 },
    amount: { type: Number, required: true, min: 0, default: 0 },
    status: { type: String, enum: ["NOT_APPLICABLE", "PENDING", "COLLECTED"], required: true },
    method: { type: String, enum: PAYMENT_METHODS },
    collectedAt: { type: Date },
  },
  { _id: false },
);

const policySchema = new Schema<ReplacementPolicySnapshot>(
  {
    installmentSettlementMode: { type: String, enum: ["PENDING", "IMMEDIATE"], required: true },
    commissionOwnershipMode: { type: String, enum: ["ORGANIZATION", "PREVIOUS_MEMBER", "REPLACEMENT_MEMBER", "EQUAL_SPLIT", "BY_CYCLES", "FIXED_AMOUNT"], required: true },
    replacementFeeMode: { type: String, enum: ["NONE", "FIXED", "PERCENTAGE"], required: true },
    source: { type: String, enum: ["GROUP", "ORGANIZATION"] },
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
    secondNewMembershipId: { type: Schema.Types.ObjectId, ref: "ChitMembership" },
    secondNewMemberId: { type: Schema.Types.ObjectId, ref: "Member" },
    secondNewMember: { type: newMemberSchema },

    effectiveCycleNumber: { type: Number, required: true, min: 1 },
    effectiveDate: { type: Date, required: true },
    reason: { type: String, trim: true },

    previous: { type: previousSchema, required: true },
    newMember: { type: newMemberSchema, required: true },
    settlement: { type: settlementSchema, required: true },
    policy: { type: policySchema },
    commission: { type: commissionSchema },
    fee: { type: feeSchema },

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
