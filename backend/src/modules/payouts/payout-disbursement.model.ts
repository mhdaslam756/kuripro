import { Schema, model, Types, type HydratedDocument } from "mongoose";

import { tenantScopedPlugin } from "../../middleware/tenant-scope.plugin.js";
import { baseSchemaOptions, type Timestamps } from "../../utils/mongoose-helpers.js";
import { PAYMENT_METHODS, type PaymentMethod } from "../payments/payment.model.js";

export { PAYMENT_METHODS };
export type DisbursementMethod = PaymentMethod;

/**
 * A single tranche of a prize payout — the "installments" a prize can be paid in. Each carries its
 * own method, optional proof-of-payment upload, and a sequential voucher/receipt number + QR token.
 * The parent Payout aggregates these into amountPaid / status.
 */
export interface PayoutDisbursementDoc extends Timestamps {
  tenantId: Types.ObjectId;
  payoutId: Types.ObjectId;
  chitGroupId: Types.ObjectId;
  chitCycleId: Types.ObjectId;
  chitMembershipId: Types.ObjectId;
  memberId: Types.ObjectId;

  amount: number;
  method: DisbursementMethod;
  reference?: string;
  notes?: string;

  /** Proof of payment (bank screenshot, signed voucher, etc.) via the shared /uploads pipeline. */
  proofUrl?: string;
  proofPublicId?: string;

  /** Sequential, human-readable payment voucher — e.g. "PV-000123". */
  receiptNumber: string;
  /** Opaque token embedded in the voucher QR for later verification. */
  receiptToken: string;

  disbursedBy: Types.ObjectId;
  disbursedAt: Date;
}

export type PayoutDisbursementDocument = HydratedDocument<PayoutDisbursementDoc>;

const disbursementSchema = new Schema<PayoutDisbursementDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    payoutId: { type: Schema.Types.ObjectId, ref: "Payout", required: true },
    chitGroupId: { type: Schema.Types.ObjectId, ref: "ChitGroup", required: true },
    chitCycleId: { type: Schema.Types.ObjectId, ref: "ChitCycle", required: true },
    chitMembershipId: { type: Schema.Types.ObjectId, ref: "ChitMembership", required: true },
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },

    amount: { type: Number, required: true, min: 1 },
    method: { type: String, enum: PAYMENT_METHODS, required: true },
    reference: { type: String, trim: true },
    notes: { type: String, trim: true },

    proofUrl: { type: String },
    proofPublicId: { type: String },

    receiptNumber: { type: String, required: true },
    receiptToken: { type: String, required: true },

    disbursedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    disbursedAt: { type: Date, required: true, default: () => new Date() },
  },
  baseSchemaOptions,
);

disbursementSchema.index({ tenantId: 1, payoutId: 1, disbursedAt: 1 });
disbursementSchema.index({ tenantId: 1, memberId: 1, disbursedAt: -1 });
disbursementSchema.index({ receiptNumber: 1 }, { unique: true });
disbursementSchema.index({ receiptToken: 1 }, { unique: true });

disbursementSchema.plugin(tenantScopedPlugin);

export const PayoutDisbursement = model<PayoutDisbursementDoc>("PayoutDisbursement", disbursementSchema);
