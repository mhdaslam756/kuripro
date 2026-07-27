import { Schema, model, Types, type HydratedDocument } from "mongoose";

import { tenantScopedPlugin } from "../../middleware/tenant-scope.plugin.js";
import { baseSchemaOptions, type Timestamps } from "../../utils/mongoose-helpers.js";

export const NOMINEE_RELATIONS = [
  "SPOUSE",
  "SON",
  "DAUGHTER",
  "FATHER",
  "MOTHER",
  "BROTHER",
  "SISTER",
  "OTHER",
] as const;
export type NomineeRelation = (typeof NOMINEE_RELATIONS)[number];

export interface NomineeDoc extends Timestamps {
  tenantId: Types.ObjectId;
  memberId: Types.ObjectId;
  name: string;
  relation: NomineeRelation;
  dateOfBirth?: Date;
  phone?: string;
  address?: string;
  idProofType?: string;
  idProofNumber?: string;
  /** % of the payout this nominee is entitled to. Active nominees for a member must sum to <=100. */
  sharePercent: number;
  isActive: boolean;
}

export type NomineeDocument = HydratedDocument<NomineeDoc>;

const nomineeSchema = new Schema<NomineeDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    name: { type: String, required: true, trim: true },
    relation: { type: String, enum: NOMINEE_RELATIONS, required: true },
    dateOfBirth: { type: Date },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    idProofType: { type: String, trim: true },
    idProofNumber: { type: String, trim: true },
    sharePercent: { type: Number, required: true, default: 100, min: 1, max: 100 },
    isActive: { type: Boolean, required: true, default: true },
  },
  baseSchemaOptions,
);

nomineeSchema.index({ tenantId: 1, memberId: 1 });

nomineeSchema.plugin(tenantScopedPlugin);

export const Nominee = model<NomineeDoc>("Nominee", nomineeSchema);
