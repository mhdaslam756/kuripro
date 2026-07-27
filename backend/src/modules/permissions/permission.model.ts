import { Schema, model, type HydratedDocument } from "mongoose";

import { baseSchemaOptions, type Timestamps } from "../../utils/mongoose-helpers.js";

export const PERMISSION_CATEGORIES = [
  "Chit Groups",
  "Users",
  "Activity",
  "Organization",
  "Roles",
  "Uploads",
  "Members",
  "Collections",
  "Auctions",
  "Payouts",
  "Reports",
  "Notifications",
  "Dashboard",
] as const;
export type PermissionCategory = (typeof PERMISSION_CATEGORIES)[number];

export interface PermissionDoc extends Timestamps {
  /** Stable dotted key, e.g. "chit_group.create" — referenced by Role.permissionKeys, never renamed. */
  key: string;
  label: string;
  category: PermissionCategory;
}

export type PermissionDocument = HydratedDocument<PermissionDoc>;

const permissionSchema = new Schema<PermissionDoc>(
  {
    key: { type: String, required: true, unique: true, trim: true },
    label: { type: String, required: true, trim: true },
    category: { type: String, enum: PERMISSION_CATEGORIES, required: true },
  },
  baseSchemaOptions,
);

// `key` is already uniquely indexed via its field-level `unique: true`.
permissionSchema.index({ category: 1 });

export const Permission = model<PermissionDoc>("Permission", permissionSchema);
