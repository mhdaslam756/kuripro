import { Schema, model, Types, type HydratedDocument } from "mongoose";

import { tenantScopedPlugin } from "../../middleware/tenant-scope.plugin.js";
import { baseSchemaOptions, type Timestamps } from "../../utils/mongoose-helpers.js";
import { SYSTEM_ROLE_SLUGS, type SystemRoleSlug } from "../../types/auth.js";

export { SYSTEM_ROLE_SLUGS };
export type { SystemRoleSlug };

export interface RoleDoc extends Timestamps {
  /** Null only for the global SUPER_ADMIN template — every other role belongs to one organization. */
  tenantId: Types.ObjectId | null;
  name: string;
  slug?: SystemRoleSlug;
  isSystemRole: boolean;
  permissionKeys: string[];
}

export type RoleDocument = HydratedDocument<RoleDoc>;

const roleSchema = new Schema<RoleDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", default: null },
    name: { type: String, required: true, trim: true },
    slug: { type: String, enum: SYSTEM_ROLE_SLUGS },
    isSystemRole: { type: Boolean, required: true, default: false },
    permissionKeys: { type: [String], required: true, default: [] },
  },
  baseSchemaOptions,
);

roleSchema.index({ tenantId: 1, name: 1 }, { unique: true });
roleSchema.index({ tenantId: 1, slug: 1 });

roleSchema.plugin(tenantScopedPlugin);

export const Role = model<RoleDoc>("Role", roleSchema);
