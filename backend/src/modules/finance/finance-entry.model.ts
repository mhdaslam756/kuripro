import { Schema, model, Types, type HydratedDocument } from "mongoose";

import { tenantScopedPlugin } from "../../middleware/tenant-scope.plugin.js";
import { baseSchemaOptions, type Timestamps } from "../../utils/mongoose-helpers.js";

export const FINANCE_ENTRY_TYPES = ["INCOME", "EXPENSE"] as const;
/** Cash vs bank — so the Cashbook and Bank reports can split these movements. */
export const FINANCE_CHANNELS = ["CASH", "BANK"] as const;

export type FinanceEntryType = (typeof FINANCE_ENTRY_TYPES)[number];
export type FinanceChannel = (typeof FINANCE_CHANNELS)[number];

/**
 * A manually-recorded income or expense that is NOT a chit installment or prize payout — rent,
 * salaries, stationery, miscellaneous income, etc. This is the one financial data source the chit
 * operations don't already provide; the Reports module derives cashbook/bank/income/expense/profit
 * from these plus the existing collection and payout flows.
 */
export interface FinanceEntryDoc extends Timestamps {
  tenantId: Types.ObjectId;
  type: FinanceEntryType;
  /** Free-text bucket, e.g. "Salaries", "Rent", "Bank interest". */
  category: string;
  amount: number;
  channel: FinanceChannel;
  date: Date;
  description?: string;
  chitGroupId?: Types.ObjectId;
  createdBy: Types.ObjectId;
}

export type FinanceEntryDocument = HydratedDocument<FinanceEntryDoc>;

const financeEntrySchema = new Schema<FinanceEntryDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    type: { type: String, enum: FINANCE_ENTRY_TYPES, required: true },
    category: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 1 },
    channel: { type: String, enum: FINANCE_CHANNELS, required: true, default: "CASH" },
    date: { type: Date, required: true },
    description: { type: String, trim: true },
    chitGroupId: { type: Schema.Types.ObjectId, ref: "ChitGroup" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  baseSchemaOptions,
);

financeEntrySchema.index({ tenantId: 1, type: 1, date: -1 });
financeEntrySchema.index({ tenantId: 1, date: -1 });

financeEntrySchema.plugin(tenantScopedPlugin);

export const FinanceEntry = model<FinanceEntryDoc>("FinanceEntry", financeEntrySchema);
