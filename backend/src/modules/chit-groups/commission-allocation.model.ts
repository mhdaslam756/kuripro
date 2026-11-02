import { Schema, model, Types, type HydratedDocument } from "mongoose";

import { tenantScopedPlugin } from "../../middleware/tenant-scope.plugin.js";
import { baseSchemaOptions, type Timestamps } from "../../utils/mongoose-helpers.js";
import { DISPLACEMENT_COMMISSION_MODES } from "../tenants/tenant.model.js";

export interface CommissionAllocationHolder {
  role: "PREVIOUS" | "REPLACEMENT";
  membershipId: Types.ObjectId;
  memberId: Types.ObjectId;
  eligibleCycles: number;
  eligibleContribution: number;
  percentageBps: number;
  amount: number;
}

export interface CommissionAllocationDoc extends Timestamps {
  tenantId: Types.ObjectId;
  chitGroupId: Types.ObjectId;
  ticketNumber: number;
  subTicket?: string;
  /** The commission-generating event: the ticket changing hands. One allocation per event. */
  commissionEventId: Types.ObjectId;
  previousMemberId: Types.ObjectId;
  replacementMemberId: Types.ObjectId;
  mode: (typeof DISPLACEMENT_COMMISSION_MODES)[number];
  totalCommission: number;
  holders: CommissionAllocationHolder[];
  previousMemberAmount: number;
  replacementMemberAmount: number;
  organizationAmount: number;
  previousMemberPercentageBps: number;
  replacementMemberPercentageBps: number;
  /** The organisation policy exactly as it was when this allocation ran. */
  policySnapshot: Record<string, unknown>;
  createdBy: Types.ObjectId;
}

export type CommissionAllocationDocument = HydratedDocument<CommissionAllocationDoc>;

const holderSchema = new Schema<CommissionAllocationHolder>(
  {
    role: { type: String, enum: ["PREVIOUS", "REPLACEMENT"], required: true },
    membershipId: { type: Schema.Types.ObjectId, ref: "ChitMembership", required: true },
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    eligibleCycles: { type: Number, required: true, min: 0 },
    eligibleContribution: { type: Number, required: true, min: 0 },
    percentageBps: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

/**
 * Immutable record of how a ticket's commission was divided at a replacement. Only ever created, never
 * updated or deleted, and never recalculated when the organisation's policy later changes.
 */
const commissionAllocationSchema = new Schema<CommissionAllocationDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    chitGroupId: { type: Schema.Types.ObjectId, ref: "ChitGroup", required: true },
    ticketNumber: { type: Number, required: true, min: 1 },
    subTicket: { type: String, trim: true },
    commissionEventId: { type: Schema.Types.ObjectId, ref: "MembershipReplacement", required: true },
    previousMemberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    replacementMemberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    mode: { type: String, enum: DISPLACEMENT_COMMISSION_MODES, required: true },
    totalCommission: { type: Number, required: true, min: 0 },
    holders: { type: [holderSchema], required: true },
    previousMemberAmount: { type: Number, required: true, min: 0 },
    replacementMemberAmount: { type: Number, required: true, min: 0 },
    organizationAmount: { type: Number, required: true, min: 0 },
    previousMemberPercentageBps: { type: Number, required: true, min: 0 },
    replacementMemberPercentageBps: { type: Number, required: true, min: 0 },
    policySnapshot: { type: Schema.Types.Mixed, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  baseSchemaOptions,
);

// Idempotency: a commission event can only ever be allocated once.
commissionAllocationSchema.index({ tenantId: 1, commissionEventId: 1 }, { unique: true });
commissionAllocationSchema.index({ tenantId: 1, chitGroupId: 1, ticketNumber: 1 });
commissionAllocationSchema.plugin(tenantScopedPlugin);

export const CommissionAllocation = model<CommissionAllocationDoc>("CommissionAllocation", commissionAllocationSchema);
