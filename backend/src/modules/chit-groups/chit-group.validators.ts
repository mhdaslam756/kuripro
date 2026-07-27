import { z } from "zod";

import { paginationQuerySchema } from "../../utils/pagination.js";
import { ALLOTMENT_METHODS, CHIT_GROUP_FREQUENCIES, CHIT_GROUP_STATUSES } from "./chit-group.model.js";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

const auctionRulesSchema = z.object({
  allotmentMethod: z.enum(ALLOTMENT_METHODS).default("AUCTION"),
  /** Optional — falls back to the tenant's default at the service boundary. */
  foremanCommissionPercent: z.number().min(0).max(100).optional(),
  minBidDiscountPercent: z.number().min(0).max(100).default(0),
  maxBidDiscountPercent: z.number().min(0).max(100).optional(),
  bidIncrementPercent: z.number().min(0).max(100).default(1),
});

export const createChitGroupSchema = z
  .object({
    name: z.string().min(2),
    registrationNumber: z.string().min(3),
    /** Rupees, not paise — converted to paise at the service boundary. */
    chitValueRupees: z.number().positive(),
    totalMembers: z.number().int().min(2).max(100),
    frequency: z.enum(CHIT_GROUP_FREQUENCIES).default("MONTHLY"),
    customIntervalDays: z.number().int().min(1).max(365).optional(),
    startDate: z.coerce.date(),
    auctionRules: auctionRulesSchema.default({ allotmentMethod: "AUCTION", minBidDiscountPercent: 0, bidIncrementPercent: 1 }),
    termsAndConditions: z.string().optional(),
  })
  .refine((data) => data.frequency !== "CUSTOM" || data.customIntervalDays !== undefined, {
    message: "customIntervalDays is required when frequency is CUSTOM",
    path: ["customIntervalDays"],
  });

export type CreateChitGroupInput = z.infer<typeof createChitGroupSchema>;

export const updateChitGroupSchema = z.object({
  name: z.string().min(2).optional(),
  frequency: z.enum(CHIT_GROUP_FREQUENCIES).optional(),
  customIntervalDays: z.number().int().min(1).max(365).optional(),
  startDate: z.coerce.date().optional(),
  auctionRules: z
    .object({
      allotmentMethod: z.enum(ALLOTMENT_METHODS),
      foremanCommissionPercent: z.number().min(0).max(100),
      minBidDiscountPercent: z.number().min(0).max(100),
      maxBidDiscountPercent: z.number().min(0).max(100),
      bidIncrementPercent: z.number().min(0).max(100),
    })
    .optional(),
  termsAndConditions: z.string().optional(),
});

export type UpdateChitGroupInput = z.infer<typeof updateChitGroupSchema>;

export const enrollMemberSchema = z.object({
  memberId: objectIdSchema,
  ticketNumber: z.number().int().min(1).optional(),
});

export type EnrollMemberInput = z.infer<typeof enrollMemberSchema>;

export const assignMembersSchema = z.object({
  memberIds: z.array(objectIdSchema).min(1).max(100),
});

export type AssignMembersInput = z.infer<typeof assignMembersSchema>;

export const addChitDocumentSchema = z.object({
  label: z.string().min(1),
  url: z.string().url(),
  publicId: z.string().min(1),
});

export type AddChitDocumentInput = z.infer<typeof addChitDocumentSchema>;

export const listChitGroupsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(CHIT_GROUP_STATUSES).optional(),
});

export type ListChitGroupsQuery = z.infer<typeof listChitGroupsQuerySchema>;
