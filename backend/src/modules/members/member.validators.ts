import { z } from "zod";

import { emailSchema } from "../../utils/common-validators.js";
import { paginationQuerySchema } from "../../utils/pagination.js";
import { FAMILY_RELATIONS } from "./family-member.model.js";
import { GUARANTOR_TYPES } from "./guarantor.model.js";
import {
  DOCUMENT_CATEGORIES,
  GENDERS,
  KYC_STATUSES,
  MEMBER_STATUSES,
  OCCUPATION_TYPES,
  RISK_BANDS,
} from "./member.model.js";
import { NOMINEE_RELATIONS } from "./nominee.model.js";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

export const memberAddressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().regex(/^\d{6}$/, "pincode must be 6 digits"),
  country: z.string().min(1).default("India"),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  placeId: z.string().optional(),
  formattedAddress: z.string().optional(),
});

export const memberOccupationSchema = z.object({
  type: z.enum(OCCUPATION_TYPES),
  employerOrBusinessName: z.string().optional(),
  /** Rupees, not paise — converted at the service boundary, same convention as chit groups. */
  monthlyIncomeRupees: z.number().min(0).optional(),
  workAddress: z.string().optional(),
});

export const createMemberSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(7),
  email: z.string().email().optional(),
  dateOfBirth: z.coerce.date().optional(),
  gender: z.enum(GENDERS).optional(),
  branchId: objectIdSchema.optional(),
  occupation: memberOccupationSchema,
  address: memberAddressSchema,
  notes: z.string().optional(),
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>;

export const updateMemberSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(7).optional(),
  email: z.string().email().optional(),
  dateOfBirth: z.coerce.date().optional(),
  gender: z.enum(GENDERS).optional(),
  branchId: objectIdSchema.optional(),
  occupation: memberOccupationSchema.optional(),
  address: memberAddressSchema.optional(),
  notes: z.string().optional(),
  status: z.enum(MEMBER_STATUSES).optional(),
});

export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;

export const listMembersQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  status: z.enum(MEMBER_STATUSES).optional(),
  branchId: objectIdSchema.optional(),
  kycStatus: z.enum(KYC_STATUSES).optional(),
  riskBand: z.enum(RISK_BANDS).optional(),
});

export type ListMembersQuery = z.infer<typeof listMembersQuerySchema>;

export const submitKycIdentitySchema = z.object({
  aadhaarNumber: z
    .string()
    .regex(/^\d{12}$/, "Aadhaar number must be exactly 12 digits")
    .optional(),
  panNumber: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "PAN must be in the format ABCDE1234F")
    .optional(),
});

export type SubmitKycIdentityInput = z.infer<typeof submitKycIdentitySchema>;

export const rejectKycSchema = z.object({
  reason: z.string().min(3),
});

export type RejectKycInput = z.infer<typeof rejectKycSchema>;

export const inviteMemberSchema = z.object({
  email: emailSchema,
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const addMemberDocumentSchema = z.object({
  category: z.enum(DOCUMENT_CATEGORIES),
  type: z.string().min(2),
  url: z.string().url(),
  publicId: z.string().min(1),
});

export type AddMemberDocumentInput = z.infer<typeof addMemberDocumentSchema>;

export const createNomineeSchema = z.object({
  name: z.string().min(2),
  relation: z.enum(NOMINEE_RELATIONS),
  dateOfBirth: z.coerce.date().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  idProofType: z.string().optional(),
  idProofNumber: z.string().optional(),
  sharePercent: z.number().min(1).max(100).default(100),
});

export type CreateNomineeInput = z.infer<typeof createNomineeSchema>;

export const updateNomineeSchema = createNomineeSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type UpdateNomineeInput = z.infer<typeof updateNomineeSchema>;

const externalGuarantorSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(7),
  address: z.string().optional(),
  occupation: z.string().optional(),
  idProofType: z.string().optional(),
  idProofNumber: z.string().optional(),
});

export const createGuarantorSchema = z.discriminatedUnion("guarantorType", [
  z.object({
    guarantorType: z.literal(GUARANTOR_TYPES[0]),
    guarantorMemberId: objectIdSchema,
    relationToMember: z.string().optional(),
  }),
  z.object({
    guarantorType: z.literal(GUARANTOR_TYPES[1]),
    external: externalGuarantorSchema,
    relationToMember: z.string().optional(),
  }),
]);

export type CreateGuarantorInput = z.infer<typeof createGuarantorSchema>;

export const createFamilyMemberSchema = z.object({
  name: z.string().min(2),
  relation: z.enum(FAMILY_RELATIONS),
  dateOfBirth: z.coerce.date().optional(),
  occupation: z.string().optional(),
  phone: z.string().optional(),
  isDependent: z.boolean().default(true),
});

export type CreateFamilyMemberInput = z.infer<typeof createFamilyMemberSchema>;

export const updateFamilyMemberSchema = createFamilyMemberSchema.partial();

export type UpdateFamilyMemberInput = z.infer<typeof updateFamilyMemberSchema>;

import { normalizeGender, normalizeOccupationType, parseFlexibleDate } from "./csv.util.js";

const blankToUndefined = (value: unknown): unknown =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const cleanPhone = (val: unknown): unknown => {
  if (typeof val !== "string") return val;
  const digits = val.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : val.trim();
};

const cleanPincode = (val: unknown): unknown => {
  if (typeof val !== "string") return val;
  const digits = val.replace(/\D/g, "");
  return digits.length === 6 ? digits : "600001";
};

const defaultIfBlank = (fallback: string) => (val: unknown): unknown =>
  typeof val === "string" && val.trim() !== "" ? val.trim() : fallback;

export const memberCsvRowSchema = z.object({
  name: z.preprocess(blankToUndefined, z.string().min(2, "Name must be at least 2 characters")),
  phone: z.preprocess(cleanPhone, z.string().min(7, "Phone must be a valid number")),
  email: z.preprocess(blankToUndefined, z.string().email().optional()),
  gender: z.preprocess(normalizeGender, z.enum(GENDERS).optional()),
  dateOfBirth: z.preprocess(parseFlexibleDate, z.date().optional()),
  occupationType: z.preprocess(normalizeOccupationType, z.enum(OCCUPATION_TYPES)),
  employerOrBusinessName: z.preprocess(blankToUndefined, z.string().optional()),
  monthlyIncomeRupees: z.preprocess(blankToUndefined, z.string().optional()),
  addressLine1: z.preprocess(defaultIfBlank("Main Street"), z.string().min(1)),
  addressLine2: z.preprocess(blankToUndefined, z.string().optional()),
  city: z.preprocess(defaultIfBlank("Kozhikode"), z.string().min(1)),
  state: z.preprocess(defaultIfBlank("Kerala"), z.string().min(1)),
  pincode: z.preprocess(cleanPincode, z.string().regex(/^\d{6}$/, "pincode must be 6 digits")),
  branchCode: z.preprocess(blankToUndefined, z.string().optional()),
});

export type MemberCsvRowInput = z.infer<typeof memberCsvRowSchema>;
