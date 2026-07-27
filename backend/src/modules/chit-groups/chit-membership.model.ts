import { Schema, model, Types, type HydratedDocument } from "mongoose";

import { tenantScopedPlugin } from "../../middleware/tenant-scope.plugin.js";
import { baseSchemaOptions, type Timestamps } from "../../utils/mongoose-helpers.js";

export const CHIT_MEMBERSHIP_STATUSES = ["ACTIVE", "DEFAULTED", "EXITED"] as const;
export type ChitMembershipStatus = (typeof CHIT_MEMBERSHIP_STATUSES)[number];

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
    status: { type: String, enum: CHIT_MEMBERSHIP_STATUSES, required: true, default: "ACTIVE" },

    hasWon: { type: Boolean, required: true, default: false },
    wonInCycleId: { type: Schema.Types.ObjectId, ref: "ChitCycle" },

    joinedAt: { type: Date, required: true, default: () => new Date() },
  },
  baseSchemaOptions,
);

chitMembershipSchema.index({ chitGroupId: 1, ticketNumber: 1 }, { unique: true });
chitMembershipSchema.index({ tenantId: 1, memberId: 1 });
chitMembershipSchema.index({ tenantId: 1, chitGroupId: 1 });
chitMembershipSchema.index({ chitGroupId: 1, memberId: 1 });

chitMembershipSchema.plugin(tenantScopedPlugin);

export const ChitMembership = model<ChitMembershipDoc>("ChitMembership", chitMembershipSchema);
