import { Permission, type PermissionDocument } from "./permission.model.js";
import { PERMISSION_CATALOG } from "./permission.catalog.js";

export async function listPermissions(): Promise<PermissionDocument[]> {
  return Permission.find().sort({ category: 1, key: 1 });
}

/** Idempotent — safe to call on every boot. Upserts each catalog entry, never deletes. */
export async function seedPermissionCatalog(): Promise<void> {
  await Promise.all(
    PERMISSION_CATALOG.map((entry) =>
      Permission.updateOne(
        { key: entry.key },
        { $set: { label: entry.label, category: entry.category } },
        { upsert: true },
      ),
    ),
  );
}
