import { Schema, model, Types, type HydratedDocument } from "mongoose";

import { tenantScopedPlugin } from "../../middleware/tenant-scope.plugin.js";
import { baseSchemaOptions, type Timestamps } from "../../utils/mongoose-helpers.js";
import { memberDocumentSchema, type MemberDocumentEntry } from "./member.model.js";

export const GUARANTOR_TYPES = ["EXISTING_MEMBER", "EXTERNAL"] as const;
export const GUARANTOR_STATUSES = ["ACTIVE", "REMOVED"] as const;
export type GuarantorType = (typeof GUARANTOR_TYPES)[number];
export type GuarantorStatus = (typeof GUARANTOR_STATUSES)[number];

export interface ExternalGuarantorDetails {
  name: string;
  phone: string;
  address?: string;
  occupation?: string;
  idProofType?: string;
  idProofNumber?: string;
}

export interface GuarantorDoc extends Timestamps {
  tenantId: Types.ObjectId;
  /** The member being vouched for. */
  memberId: Types.ObjectId;
  guarantorType: GuarantorType;
  /** Required when guarantorType is EXISTING_MEMBER — another Member in this tenant. */
  guarantorMemberId?: Types.ObjectId;
  /** Required when guarantorType is EXTERNAL — someone with no Member record of their own. */
  external?: ExternalGuarantorDetails;
  relationToMember?: string;
  documents: MemberDocumentEntry[];
  status: GuarantorStatus;
  addedAt: Date;
}

export type GuarantorDocument = HydratedDocument<GuarantorDoc>;

const externalGuarantorSchema = new Schema<ExternalGuarantorDetails>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    occupation: { type: String, trim: true },
    idProofType: { type: String, trim: true },
    idProofNumber: { type: String, trim: true },
  },
  { _id: false },
);

const guarantorSchema = new Schema<GuarantorDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    guarantorType: { type: String, enum: GUARANTOR_TYPES, required: true },
    guarantorMemberId: { type: Schema.Types.ObjectId, ref: "Member" },
    external: { type: externalGuarantorSchema },
    relationToMember: { type: String, trim: true },
    documents: { type: [memberDocumentSchema], required: true, default: [] },
    status: { type: String, enum: GUARANTOR_STATUSES, required: true, default: "ACTIVE" },
    addedAt: { type: Date, required: true, default: () => new Date() },
  },
  baseSchemaOptions,
);

guarantorSchema.index({ tenantId: 1, memberId: 1 });
guarantorSchema.index({ tenantId: 1, guarantorMemberId: 1 }, { sparse: true });

guarantorSchema.plugin(tenantScopedPlugin);

export const Guarantor = model<GuarantorDoc>("Guarantor", guarantorSchema);
