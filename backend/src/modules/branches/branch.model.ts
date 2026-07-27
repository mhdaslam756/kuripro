import { Schema, model, Types, type HydratedDocument } from "mongoose";

import { tenantScopedPlugin } from "../../middleware/tenant-scope.plugin.js";
import { baseSchemaOptions, type Timestamps } from "../../utils/mongoose-helpers.js";
import type { TenantAddress } from "../tenants/tenant.model.js";

export const BRANCH_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type BranchStatus = (typeof BRANCH_STATUSES)[number];

export interface BranchDoc extends Timestamps {
  tenantId: Types.ObjectId;
  name: string;
  code: string;
  address: TenantAddress;
  managerId?: Types.ObjectId;
  status: BranchStatus;
}

export type BranchDocument = HydratedDocument<BranchDoc>;

const addressSchema = new Schema<TenantAddress>(
  {
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true, default: "India" },
  },
  { _id: false },
);

const branchSchema = new Schema<BranchDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    address: { type: addressSchema, required: true },
    managerId: { type: Schema.Types.ObjectId, ref: "User" },
    status: { type: String, enum: BRANCH_STATUSES, required: true, default: "ACTIVE" },
  },
  baseSchemaOptions,
);

branchSchema.index({ tenantId: 1, code: 1 }, { unique: true });
branchSchema.index({ tenantId: 1, status: 1 });

branchSchema.plugin(tenantScopedPlugin);

export const Branch = model<BranchDoc>("Branch", branchSchema);
