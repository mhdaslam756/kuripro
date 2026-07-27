import { Schema, model, Types, type HydratedDocument } from "mongoose";

import { tenantScopedPlugin } from "../../middleware/tenant-scope.plugin.js";
import { baseSchemaOptions, type Timestamps } from "../../utils/mongoose-helpers.js";

export interface CounterDoc extends Timestamps {
  tenantId: Types.ObjectId;
  /** Sequence name, e.g. "memberCode" — one document per (tenantId, name) pair. */
  name: string;
  value: number;
}

export type CounterDocument = HydratedDocument<CounterDoc>;

const counterSchema = new Schema<CounterDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    name: { type: String, required: true, trim: true },
    value: { type: Number, required: true, default: 0 },
  },
  baseSchemaOptions,
);

counterSchema.index({ tenantId: 1, name: 1 }, { unique: true });

counterSchema.plugin(tenantScopedPlugin);

export const Counter = model<CounterDoc>("Counter", counterSchema);
