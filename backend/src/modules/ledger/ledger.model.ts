import { Schema, model, Types, type HydratedDocument } from "mongoose";

import { tenantScopedPlugin } from "../../middleware/tenant-scope.plugin.js";
import { baseSchemaOptions, type Timestamps } from "../../utils/mongoose-helpers.js";

export const LEDGER_ENTRY_TYPES = [
  "INSTALLMENT_COLLECTED",
  "PAYOUT_DISBURSED",
  "COMMISSION_EARNED",
  "ADJUSTMENT",
] as const;
export const LEDGER_DIRECTIONS = ["CREDIT", "DEBIT"] as const;

export type LedgerEntryType = (typeof LEDGER_ENTRY_TYPES)[number];
export type LedgerDirection = (typeof LEDGER_DIRECTIONS)[number];

export interface LedgerDoc extends Timestamps {
  tenantId: Types.ObjectId;
  chitGroupId?: Types.ObjectId;

  type: LedgerEntryType;
  direction: LedgerDirection;
  amount: number;

  relatedCycleId?: Types.ObjectId;
  relatedPaymentId?: Types.ObjectId;
  relatedPayoutId?: Types.ObjectId;

  description: string;
  createdBy: Types.ObjectId;
}

export type LedgerDocument = HydratedDocument<LedgerDoc>;

/**
 * Append-only financial audit trail: every rupee movement (collection, payout, commission,
 * manual adjustment) writes one entry here, independent of the mutable Payment/Payout rows.
 * This collection must only ever be written via `.create()` — never updated or deleted — so it
 * remains the reconciliation source of truth.
 */
const ledgerSchema = new Schema<LedgerDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    chitGroupId: { type: Schema.Types.ObjectId, ref: "ChitGroup" },

    type: { type: String, enum: LEDGER_ENTRY_TYPES, required: true },
    direction: { type: String, enum: LEDGER_DIRECTIONS, required: true },
    amount: { type: Number, required: true, min: 1 },

    relatedCycleId: { type: Schema.Types.ObjectId, ref: "ChitCycle" },
    relatedPaymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
    relatedPayoutId: { type: Schema.Types.ObjectId, ref: "Payout" },

    description: { type: String, required: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  baseSchemaOptions,
);

ledgerSchema.index({ tenantId: 1, chitGroupId: 1, createdAt: -1 });
ledgerSchema.index({ tenantId: 1, type: 1 });

ledgerSchema.plugin(tenantScopedPlugin);

export const Ledger = model<LedgerDoc>("Ledger", ledgerSchema);
