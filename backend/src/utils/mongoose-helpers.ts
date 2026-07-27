import type { SchemaOptions, Types } from "mongoose";

/** Every model uses `baseSchemaOptions` (timestamps: true) — every Doc interface should extend this. */
export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Repository "create" input types reference this instead of `Types.ObjectId` directly — Mongoose
 * casts a string id at write time, and the id parameters flowing in from controllers/services are
 * always plain strings (route params, JWT claims), never pre-cast ObjectId instances.
 */
export type ObjectIdLike = Types.ObjectId | string;

/**
 * Shared schema options applied to every model: adds createdAt/updatedAt, and normalizes the
 * JSON representation (id instead of _id, no __v) so API responses are consistent everywhere.
 */
export const baseSchemaOptions: SchemaOptions = {
  timestamps: true,
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: (_doc: unknown, ret: Record<string, any>) => {
      ret["id"] = ret["_id"].toString();
      delete ret["_id"];
      return ret;
    },
  },
};
