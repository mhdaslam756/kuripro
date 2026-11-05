import { z } from "zod";

import { mobileNumberSchema } from "../../utils/common-validators.js";
import { OCCUPATION_TYPES } from "../members/member.model.js";

export const publicOrgSlugParamSchema = z.object({
  slug: z.string().min(1, "Organization slug is required").trim().toLowerCase(),
});

const phoneSchema = mobileNumberSchema;

/** Step one of joining: does this number already belong to a KuriPro account? */
export const publicPhoneCheckSchema = z.object({ phone: phoneSchema });

/**
 * Join this organisation with an account the person already has. The password proves it is theirs.
 * Address and occupation are only needed when the account has no existing member profile to reuse.
 */
export const publicJoinSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, "Password is required"),
  address: z
    .object({
      line1: z.string().min(1, "Address line 1 is required").trim(),
      line2: z.string().trim().optional(),
      city: z.string().min(1, "City is required").trim(),
      state: z.string().min(1, "State is required").trim(),
      pincode: z.string().min(1, "Pincode is required").trim(),
      country: z.string().trim().default("India"),
    })
    .optional(),
  occupationType: z.enum(OCCUPATION_TYPES).optional(),
});

/** Confirm the password of an existing account before offering the Join button. */
export const publicVerifyAccountSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, "Password is required"),
});

export const publicMemberRegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100).trim(),
  phone: phoneSchema,
  email: z.string().email("Invalid email address").toLowerCase().trim().optional().or(z.literal("")),
  password: z.string().min(6, "Password must be at least 6 characters"),
  address: z.object({
    line1: z.string().min(1, "Address line 1 is required").trim(),
    line2: z.string().trim().optional(),
    city: z.string().min(1, "City is required").trim(),
    state: z.string().min(1, "State is required").trim(),
    pincode: z.string().min(1, "Pincode is required").trim(),
    country: z.string().trim().default("India"),
  }),
  occupation: z.object({
    type: z.enum(OCCUPATION_TYPES),
    employerOrBusinessName: z.string().trim().optional(),
    monthlyIncome: z.coerce.number().min(0).optional(),
    workAddress: z.string().trim().optional(),
  }),
});

export const publicMemberLoginSchema = z.object({
  identifier: z.string().min(1, "Phone or Email is required").trim(),
  password: z.string().min(1, "Password is required"),
});

export type PublicMemberRegisterInput = z.infer<typeof publicMemberRegisterSchema>;
export type PublicPhoneCheckInput = z.infer<typeof publicPhoneCheckSchema>;
export type PublicVerifyAccountInput = z.infer<typeof publicVerifyAccountSchema>;
export type PublicJoinInput = z.infer<typeof publicJoinSchema>;
export type PublicMemberLoginInput = z.infer<typeof publicMemberLoginSchema>;
