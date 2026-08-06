import { Types, type SchemaOptions } from "mongoose";

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

/** Converts a string to Types.ObjectId safely without throwing BSONError on invalid/ALL inputs. */
export function safeObjectId(id: unknown): Types.ObjectId | null {
  if (!id || id === "ALL") return null;
  if (id instanceof Types.ObjectId) return id;
  if (typeof id === "string" && Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id.trim())) {
    return new Types.ObjectId(id.trim());
  }
  return null;
}
