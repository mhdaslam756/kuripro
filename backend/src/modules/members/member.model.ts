import { Schema, model, Types, type HydratedDocument } from "mongoose";

import { tenantScopedPlugin } from "../../middleware/tenant-scope.plugin.js";
import { baseSchemaOptions, type Timestamps } from "../../utils/mongoose-helpers.js";

export const MEMBER_STATUSES = ["ACTIVE", "INACTIVE", "BLACKLISTED"] as const;
export const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;
export const OCCUPATION_TYPES = [
  "SALARIED",
  "SELF_EMPLOYED",
  "BUSINESS_OWNER",
  "HOMEMAKER",
  "STUDENT",
  "RETIRED",
  "UNEMPLOYED",
  "OTHER",
] as const;
export const KYC_STATUSES = ["NOT_SUBMITTED", "PENDING", "VERIFIED", "REJECTED"] as const;
export const DOCUMENT_CATEGORIES = ["KYC", "AGREEMENT", "BANK_PROOF", "PHOTO", "OTHER"] as const;
export const RISK_BANDS = ["LOW", "MEDIUM", "HIGH"] as const;

export type MemberStatus = (typeof MEMBER_STATUSES)[number];
export type Gender = (typeof GENDERS)[number];
export type OccupationType = (typeof OCCUPATION_TYPES)[number];
export type KycStatus = (typeof KYC_STATUSES)[number];
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];
export type RiskBand = (typeof RISK_BANDS)[number];

export interface MemberAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  /** Populated by Google Places Autocomplete/Geocoding on the frontend when a Maps API key is configured. */
  lat?: number;
  lng?: number;
  placeId?: string;
  formattedAddress?: string;
}

export interface MemberOccupation {
  type: OccupationType;
  employerOrBusinessName?: string;
  /** Paise, like every other monetary field in this codebase. */
  monthlyIncome?: number;
  workAddress?: string;
}

export interface MemberDocumentEntry {
  /** Present on persisted subdocuments (schema uses `_id: true`) so a single document can be deleted by id. */
  _id?: Types.ObjectId;
  category: DocumentCategory;
  /** Free-form within its category, e.g. "AADHAAR_FRONT", "PAN_CARD", "SIGNED_AGREEMENT". */
  type: string;
  url: string;
  publicId: string;
  uploadedAt: Date;
  uploadedBy: Types.ObjectId;
}

export interface MemberKyc {
  status: KycStatus;
  submittedAt?: Date;
  verifiedAt?: Date;
  verifiedBy?: Types.ObjectId;
  rejectionReason?: string;
  /**
   * Only the last 4 digits and a SHA-256 hash of the full Aadhaar number are ever persisted (for
   * masked display and duplicate detection). The raw number is used transiently in the request
   * that submits it and is never written to the database or logged — see `member.service.ts`.
   */
  aadhaarLast4?: string;
  aadhaarHash?: string;
  panNumber?: string;
}

export interface MemberRiskScoreFactor {
  label: string;
  points: number;
}

export interface MemberRiskScore {
  /** 0-100, higher = riskier. See `risk-score.ts` for the deterministic formula. */
  value: number;
  band: RiskBand;
  computedAt: Date;
  factors: MemberRiskScoreFactor[];
}

export interface MemberDoc extends Timestamps {
  tenantId: Types.ObjectId;
  /**
   * Optional — a Member is a full business record on its own (KYC, occupation, address) and does
   * not require a login account. Set once the member is invited to the self-service portal (see
   * `inviteMemberToPortal`), at which point it links to the `User` created for them.
   */
  userId?: Types.ObjectId | null;
  branchId?: Types.ObjectId;
  /** Unique per tenant, human-readable — e.g. "KP-000123". Generated via the Counter sequence. */
  memberCode: string;
  name: string;
  phone: string;
  email?: string;
  photoUrl?: string;
  dateOfBirth?: Date;
  gender?: Gender;
  occupation: MemberOccupation;
  address: MemberAddress;
  kyc: MemberKyc;
  documents: MemberDocumentEntry[];
  riskScore?: MemberRiskScore;
  /** Opaque, unguessable token embedded in the member's QR code for staff-side lookup. */
  qrToken: string;
  status: MemberStatus;
  notes?: string;
  createdBy: Types.ObjectId;
}

export type MemberDocument = HydratedDocument<MemberDoc>;

const addressSchema = new Schema<MemberAddress>(
  {
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true, default: "India" },
    lat: { type: Number, min: -90, max: 90 },
    lng: { type: Number, min: -180, max: 180 },
    placeId: { type: String },
    formattedAddress: { type: String },
  },
  { _id: false },
);

const occupationSchema = new Schema<MemberOccupation>(
  {
    type: { type: String, enum: OCCUPATION_TYPES, required: true },
    employerOrBusinessName: { type: String, trim: true },
    monthlyIncome: { type: Number, min: 0 },
    workAddress: { type: String, trim: true },
  },
  { _id: false },
);

export const memberDocumentSchema = new Schema<MemberDocumentEntry>(
  {
    category: { type: String, enum: DOCUMENT_CATEGORIES, required: true },
    type: { type: String, required: true, trim: true },
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    uploadedAt: { type: Date, required: true, default: () => new Date() },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { _id: true },
);

const kycSchema = new Schema<MemberKyc>(
  {
    status: { type: String, enum: KYC_STATUSES, required: true, default: "NOT_SUBMITTED" },
    submittedAt: { type: Date },
    verifiedAt: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    rejectionReason: { type: String, trim: true },
    aadhaarLast4: { type: String },
    aadhaarHash: { type: String, select: false },
    panNumber: { type: String, uppercase: true, trim: true },
  },
  { _id: false },
);

const riskScoreFactorSchema = new Schema<MemberRiskScoreFactor>(
  { label: { type: String, required: true }, points: { type: Number, required: true } },
  { _id: false },
);

const riskScoreSchema = new Schema<MemberRiskScore>(
  {
    value: { type: Number, required: true, min: 0, max: 100 },
    band: { type: String, enum: RISK_BANDS, required: true },
    computedAt: { type: Date, required: true },
    factors: { type: [riskScoreFactorSchema], required: true, default: [] },
  },
  { _id: false },
);

const memberSchema = new Schema<MemberDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    memberCode: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    photoUrl: { type: String },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: GENDERS },
    occupation: { type: occupationSchema, required: true },
    address: { type: addressSchema, required: true },
    kyc: { type: kycSchema, required: true, default: () => ({}) },
    documents: { type: [memberDocumentSchema], required: true, default: [] },
    riskScore: { type: riskScoreSchema },
    qrToken: { type: String, required: true },
    status: { type: String, enum: MEMBER_STATUSES, required: true, default: "ACTIVE" },
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  baseSchemaOptions,
);

memberSchema.index({ tenantId: 1, memberCode: 1 }, { unique: true });
/**
 * Partial rather than sparse: `userId` defaults to an explicit `null` (not missing), and a sparse
 * index still indexes nulls — so every unlinked member in a tenant would collide with the first one.
 * The partial filter keeps only members actually linked to a portal account in the index.
 */
memberSchema.index(
  { tenantId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $type: "objectId" } } },
);
memberSchema.index({ qrToken: 1 }, { unique: true });
memberSchema.index({ tenantId: 1, phone: 1 });
memberSchema.index({ tenantId: 1, status: 1 });
memberSchema.index({ tenantId: 1, name: 1 });
memberSchema.index({ tenantId: 1, "kyc.aadhaarHash": 1 }, { sparse: true });

memberSchema.plugin(tenantScopedPlugin);

export const Member = model<MemberDoc>("Member", memberSchema);
