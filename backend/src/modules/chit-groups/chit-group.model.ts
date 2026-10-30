import { Schema, model, Types, type HydratedDocument } from "mongoose";

import { tenantScopedPlugin } from "../../middleware/tenant-scope.plugin.js";
import { attachmentSchema, type AttachmentEntry } from "../../utils/attachment.js";
import { baseSchemaOptions, type Timestamps } from "../../utils/mongoose-helpers.js";

export const CHIT_GROUP_FREQUENCIES = ["WEEKLY", "MONTHLY", "TWICE_MONTHLY", "THREE_TIMES_MONTHLY", "CUSTOM"] as const;
export const CHIT_GROUP_STATUSES = ["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"] as const;
export const ALLOTMENT_METHODS = ["AUCTION", "LOTTERY"] as const;

export const COMMISSION_MODES = ["PERCENT", "AMOUNT"] as const;

export type ChitGroupFrequency = (typeof CHIT_GROUP_FREQUENCIES)[number];
export type ChitGroupStatus = (typeof CHIT_GROUP_STATUSES)[number];
export type AllotmentMethod = (typeof ALLOTMENT_METHODS)[number];
export type CommissionMode = (typeof COMMISSION_MODES)[number];

/** Rules governing how each cycle's winner is decided and priced. Bid fields apply only to AUCTION. */
export interface AuctionRules {
  /** AUCTION = members bid a discount; LOTTERY = random draw, no bidding. */
  allotmentMethod: AllotmentMethod;
  /** PERCENT = commission is `foremanCommissionPercent` of the pot; AMOUNT = a fixed `foremanCommissionAmount` per cycle. */
  foremanCommissionMode: CommissionMode;
  /** Foreman's commission on the pot each cycle (used when mode is PERCENT). */
  foremanCommissionPercent: number;
  /** Fixed commission per cycle in paise (used when mode is AMOUNT). */
  foremanCommissionAmount: number;
  /** Floor on the winning discount (AUCTION only). */
  minBidDiscountPercent: number;
  /** Statutory cap on the discount (AUCTION only) — under the Chit Funds Act, typically 30–40%. */
  maxBidDiscountPercent: number;
  /** Minimum increment between successive bids, as % of the pot (AUCTION only). */
  bidIncrementPercent: number;
}

export interface ChitGroupDoc extends Timestamps {
  tenantId: Types.ObjectId;
  name: string;
  registrationNumber: string;

  /** Total pot value in paise. The number of cycles equals totalMembers (everyone wins once). */
  chitValue: number;
  totalMembers: number;
  installmentAmount: number;

  frequency: ChitGroupFrequency;
  /** Days between cycles when frequency is CUSTOM; ignored otherwise. */
  customIntervalDays?: number;
  startDate: Date;
  /** Last cycle's date, derived from the schedule at creation — the scheme's effective end. */
  endDate: Date;

  auctionRules: AuctionRules;

  documents: AttachmentEntry[];
  termsAndConditions?: string;

  status: ChitGroupStatus;
  currentCycleNumber: number;
  createdBy: Types.ObjectId;
}

export type ChitGroupDocument = HydratedDocument<ChitGroupDoc>;

const auctionRulesSchema = new Schema<AuctionRules>(
  {
    allotmentMethod: { type: String, enum: ALLOTMENT_METHODS, required: true, default: "AUCTION" },
    foremanCommissionMode: { type: String, enum: COMMISSION_MODES, required: true, default: "PERCENT" },
    foremanCommissionPercent: { type: Number, required: true, min: 0, max: 100, default: 0 },
    foremanCommissionAmount: { type: Number, required: true, min: 0, default: 0 },
    minBidDiscountPercent: { type: Number, required: true, min: 0, max: 100, default: 0 },
    maxBidDiscountPercent: { type: Number, required: true, min: 0, max: 100 },
    bidIncrementPercent: { type: Number, required: true, min: 0, max: 100, default: 1 },
  },
  { _id: false },
);

const chitGroupSchema = new Schema<ChitGroupDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    name: { type: String, required: true, trim: true },
    registrationNumber: { type: String, required: true, trim: true },

    chitValue: { type: Number, required: true, min: 1 },
    totalMembers: { type: Number, required: true, min: 2 },
    installmentAmount: { type: Number, required: true, min: 1 },

    frequency: { type: String, enum: CHIT_GROUP_FREQUENCIES, required: true, default: "MONTHLY" },
    customIntervalDays: { type: Number, min: 1 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    auctionRules: { type: auctionRulesSchema, required: true },

    documents: { type: [attachmentSchema], required: true, default: [] },
    termsAndConditions: { type: String, trim: true },

    status: { type: String, enum: CHIT_GROUP_STATUSES, required: true, default: "DRAFT" },
    currentCycleNumber: { type: Number, required: true, default: 0, min: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  baseSchemaOptions,
);

chitGroupSchema.index({ tenantId: 1, status: 1 });
chitGroupSchema.index({ tenantId: 1, registrationNumber: 1 }, { unique: true });

chitGroupSchema.plugin(tenantScopedPlugin);

export const ChitGroup = model<ChitGroupDoc>("ChitGroup", chitGroupSchema);
