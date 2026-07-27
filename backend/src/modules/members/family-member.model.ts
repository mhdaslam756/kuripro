import { Schema, model, Types, type HydratedDocument } from "mongoose";

import { tenantScopedPlugin } from "../../middleware/tenant-scope.plugin.js";
import { baseSchemaOptions, type Timestamps } from "../../utils/mongoose-helpers.js";

export const FAMILY_RELATIONS = [
  "SPOUSE",
  "FATHER",
  "MOTHER",
  "SON",
  "DAUGHTER",
  "BROTHER",
  "SISTER",
  "GUARDIAN",
  "OTHER",
] as const;
export type FamilyRelation = (typeof FAMILY_RELATIONS)[number];

export interface FamilyMemberDoc extends Timestamps {
  tenantId: Types.ObjectId;
  memberId: Types.ObjectId;
  name: string;
  relation: FamilyRelation;
  dateOfBirth?: Date;
  occupation?: string;
  phone?: string;
  isDependent: boolean;
}

export type FamilyMemberDocument = HydratedDocument<FamilyMemberDoc>;

const familyMemberSchema = new Schema<FamilyMemberDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    name: { type: String, required: true, trim: true },
    relation: { type: String, enum: FAMILY_RELATIONS, required: true },
    dateOfBirth: { type: Date },
    occupation: { type: String, trim: true },
    phone: { type: String, trim: true },
    isDependent: { type: Boolean, required: true, default: true },
  },
  baseSchemaOptions,
);

familyMemberSchema.index({ tenantId: 1, memberId: 1 });

familyMemberSchema.plugin(tenantScopedPlugin);

export const FamilyMember = model<FamilyMemberDoc>("FamilyMember", familyMemberSchema);
