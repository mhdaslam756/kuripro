import type { MongooseDefaultQueryMiddleware, Query, Schema } from "mongoose";

const SCOPED_QUERY_METHODS: MongooseDefaultQueryMiddleware[] = [
  "find",
  "findOne",
  "findOneAndUpdate",
  "findOneAndDelete",
  "findOneAndReplace",
  "updateOne",
  "updateMany",
  "deleteOne",
  "deleteMany",
  "countDocuments",
];

/**
 * Defense-in-depth guard for multi-tenant collections: refuses to execute any query that
 * does not filter by `tenantId`. Application code must always pass `tenantId` explicitly from
 * the authenticated request context — this plugin exists so a forgotten filter fails loudly
 * instead of silently leaking one tenant's data (money, members, bids) to another.
 *
 * For genuine cross-tenant/admin operations, opt in explicitly with
 * `{ tenantId: { $exists: true } }` rather than omitting the field.
 */
export function tenantScopedPlugin(schema: Schema): void {
  schema.pre(SCOPED_QUERY_METHODS, function guardUnscopedQuery(this: Query<unknown, unknown>) {
    const filter = this.getFilter();
    if (!Object.hasOwn(filter, "tenantId")) {
      throw new Error(
        `Refusing to execute an unscoped query on "${this.model.modelName}": ` +
          "filter is missing tenantId. Pass tenantId explicitly, or use " +
          "{ tenantId: { $exists: true } } for an intentional cross-tenant query.",
      );
    }
  });
}
