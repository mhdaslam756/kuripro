import { Schema, model, Types, type HydratedDocument } from "mongoose";

import { tenantScopedPlugin } from "../../middleware/tenant-scope.plugin.js";
import { baseSchemaOptions, type Timestamps } from "../../utils/mongoose-helpers.js";
import { PAYMENT_METHODS, type PaymentMethod } from "../payments/payment.model.js";

export const COLLECTION_STATUSES = ["COMPLETED", "PENDING_CLEARANCE", "BOUNCED", "CANCELLED"] as const;
export type CollectionStatus = (typeof COLLECTION_STATUSES)[number];

/** Re-exported so callers can validate against the same method list the installment uses. */
export { PAYMENT_METHODS };
export type CollectionMethod = PaymentMethod;

export interface CollectionDoc extends Timestamps {
  tenantId: Types.ObjectId;
  chitGroupId: Types.ObjectId;
  chitCycleId: Types.ObjectId;
  chitMembershipId: Types.ObjectId;
  /** The installment (Payment) this receipt is applied against. */
  paymentId: Types.ObjectId;
  /** Denormalized from the membership so history and receipts render without a join. */
  memberId: Types.ObjectId;

  /** Paise received in this single transaction. */
  amount: number;
  method: CollectionMethod;
  /** UPI txn id, cheque number, bank reference, card last-4 — free-form per method. */
  reference?: string;

  status: CollectionStatus;
  /** True when collected before the installment's due date (see "prepay future installments"). */
  isAdvance: boolean;
  /** True when captured offline on an agent's device and synced later. */
  isOffline: boolean;
  /** Client-generated idempotency key for offline sync — prevents duplicate receipts on re-sync. */
  clientReceiptId?: string;

  /** Sequential, human-readable — e.g. "RCP-000123". */
  receiptNumber: string;
  /** Opaque token embedded in the QR receipt for later verification. */
  receiptToken: string;

  collectedBy: Types.ObjectId;
  collectedAt: Date;
  notes?: string;
}

export type CollectionDocument = HydratedDocument<CollectionDoc>;

const collectionSchema = new Schema<CollectionDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    chitGroupId: { type: Schema.Types.ObjectId, ref: "ChitGroup", required: true },
    chitCycleId: { type: Schema.Types.ObjectId, ref: "ChitCycle", required: true },
    chitMembershipId: { type: Schema.Types.ObjectId, ref: "ChitMembership", required: true },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment", required: true },
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },

    amount: { type: Number, required: true, min: 1 },
    method: { type: String, enum: PAYMENT_METHODS, required: true },
    reference: { type: String, trim: true },

    status: { type: String, enum: COLLECTION_STATUSES, required: true, default: "COMPLETED" },
    isAdvance: { type: Boolean, required: true, default: false },
    isOffline: { type: Boolean, required: true, default: false },
    clientReceiptId: { type: String, trim: true },

    receiptNumber: { type: String, required: true },
    receiptToken: { type: String, required: true },

    collectedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    collectedAt: { type: Date, required: true, default: () => new Date() },
    notes: { type: String, trim: true },
  },
  baseSchemaOptions,
);

collectionSchema.index({ tenantId: 1, collectedAt: -1 });
collectionSchema.index({ tenantId: 1, memberId: 1, collectedAt: -1 });
collectionSchema.index({ tenantId: 1, chitGroupId: 1, collectedAt: -1 });
collectionSchema.index({ paymentId: 1 });
collectionSchema.index({ tenantId: 1, receiptNumber: 1 }, { unique: true });
collectionSchema.index({ receiptToken: 1 }, { unique: true });
/** Offline idempotency: at most one collection per (tenant, clientReceiptId). */
collectionSchema.index(
  { tenantId: 1, clientReceiptId: 1 },
  { unique: true, partialFilterExpression: { clientReceiptId: { $type: "string" } } },
);

collectionSchema.plugin(tenantScopedPlugin);

export const Collection = model<CollectionDoc>("Collection", collectionSchema);
