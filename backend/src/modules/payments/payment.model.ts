import { Schema, model, Types, type HydratedDocument } from "mongoose";

import { tenantScopedPlugin } from "../../middleware/tenant-scope.plugin.js";
import { baseSchemaOptions, type Timestamps } from "../../utils/mongoose-helpers.js";

export const PAYMENT_STATUSES = ["PENDING", "PARTIAL", "PAID", "OVERDUE", "WAIVED"] as const;
export const PAYMENT_METHODS = ["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "CARD", "OTHER"] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface PaymentDoc extends Timestamps {
  tenantId: Types.ObjectId;
  chitGroupId: Types.ObjectId;
  chitCycleId: Types.ObjectId;
  chitMembershipId: Types.ObjectId;

  amountDue: number;
  amountPaid: number;
  dueDate: Date;
  paidAt?: Date;

  status: PaymentStatus;
  method?: PaymentMethod;
  recordedBy?: Types.ObjectId;
  receiptUrl?: string;
  notes?: string;
}

export type PaymentDocument = HydratedDocument<PaymentDoc>;

const paymentSchema = new Schema<PaymentDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    chitGroupId: { type: Schema.Types.ObjectId, ref: "ChitGroup", required: true },
    chitCycleId: { type: Schema.Types.ObjectId, ref: "ChitCycle", required: true },
    chitMembershipId: { type: Schema.Types.ObjectId, ref: "ChitMembership", required: true },

    amountDue: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, required: true, default: 0, min: 0 },
    dueDate: { type: Date, required: true },
    paidAt: { type: Date },

    status: { type: String, enum: PAYMENT_STATUSES, required: true, default: "PENDING" },
    method: { type: String, enum: PAYMENT_METHODS },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User" },
    receiptUrl: { type: String },
    notes: { type: String, trim: true },
  },
  baseSchemaOptions,
);

paymentSchema.index({ chitCycleId: 1, chitMembershipId: 1 }, { unique: true });
paymentSchema.index({ tenantId: 1, status: 1, dueDate: 1 });

paymentSchema.plugin(tenantScopedPlugin);

export const Payment = model<PaymentDoc>("Payment", paymentSchema);
