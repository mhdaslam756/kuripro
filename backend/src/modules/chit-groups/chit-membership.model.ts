import { Schema, model, Types, type HydratedDocument } from "mongoose";

import { tenantScopedPlugin } from "../../middleware/tenant-scope.plugin.js";
import { baseSchemaOptions, type Timestamps } from "../../utils/mongoose-helpers.js";

export const CHIT_MEMBERSHIP_STATUSES = ["ACTIVE", "DEFAULTED", "EXITED"] as const;
export type ChitMembershipStatus = (typeof CHIT_MEMBERSHIP_STATUSES)[number];

export const CHIT_SHARE_TYPES = ["FULL", "HALF"] as const;
export type ChitShareType = (typeof CHIT_SHARE_TYPES)[number];

export interface ChitMembershipDoc extends Timestamps {
  tenantId: Types.ObjectId;
  chitGroupId: Types.ObjectId;
  /**
   * The Member (business profile) occupying this seat — see modules/members. A Member does not need
   * a login account to be enrolled, which is why this references Member, not User. (Before the
   * Member module existed this keyed on userId; it was migrated when member records became the
   * canonical person-in-a-chit-fund record.)
   */
  memberId: Types.ObjectId;

  ticketNumber: number;
  /**
   * FULL = whole ticket (share 1.0, pays 100% installment)
   * HALF = half ticket (share 0.5, pays 50% installment)
   */
  shareType: ChitShareType;
  /** Numeric share multiplier: 1.0 for FULL, 0.5 for HALF. */
  share: number;
  /** "A" or "B" for half-share slots sharing a ticketNumber; null/undefined for full tickets. */
  subTicket?: string;

  status: ChitMembershipStatus;

  hasWon: boolean;
  wonInCycleId?: Types.ObjectId;

  joinedAt: Date;
}

export type ChitMembershipDocument = HydratedDocument<ChitMembershipDoc>;

const chitMembershipSchema = new Schema<ChitMembershipDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    chitGroupId: { type: Schema.Types.ObjectId, ref: "ChitGroup", required: true },
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },

    ticketNumber: { type: Number, required: true, min: 1 },
    shareType: { type: String, enum: CHIT_SHARE_TYPES, required: true, default: "FULL" },
    share: { type: Number, required: true, default: 1, min: 0.1, max: 1 },
    subTicket: { type: String, trim: true },

    status: { type: String, enum: CHIT_MEMBERSHIP_STATUSES, required: true, default: "ACTIVE" },

    hasWon: { type: Boolean, required: true, default: false },
    wonInCycleId: { type: Schema.Types.ObjectId, ref: "ChitCycle" },

    joinedAt: { type: Date, required: true, default: () => new Date() },
  },
  baseSchemaOptions,
);

chitMembershipSchema.index({ chitGroupId: 1, ticketNumber: 1, subTicket: 1 }, { unique: true });
chitMembershipSchema.index({ tenantId: 1, memberId: 1 });
chitMembershipSchema.index({ tenantId: 1, chitGroupId: 1 });
chitMembershipSchema.index({ chitGroupId: 1, memberId: 1 });

chitMembershipSchema.plugin(tenantScopedPlugin);

export const ChitMembership = model<ChitMembershipDoc>("ChitMembership", chitMembershipSchema);
