import { z } from "zod";
import { mobileNumberSchema } from "../../utils/common-validators.js";

const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 10 characters and include an uppercase letter, a lowercase letter, and a digit";

export const passwordSchema = z
  .string()
  .min(10, PASSWORD_POLICY_MESSAGE)
  .refine((value) => /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value), {
    message: PASSWORD_POLICY_MESSAGE,
  });

const addressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().min(1),
  country: z.string().min(1).default("India"),
});

/** Shared across every login-shaped endpoint (password, OTP, register) so "remember this device" works everywhere. */
export const deviceContextSchema = z.object({
  deviceId: z.string().min(1).max(200).optional(),
  deviceLabel: z.string().min(1).max(120).optional(),
  rememberDevice: z.boolean().optional(),
});
export type DeviceContextInput = z.infer<typeof deviceContextSchema>;

export const selectOrganizationSchema = z
  .object({
    selectionToken: z.string().min(1),
    tenantId: z.string().min(1),
  })
  .merge(deviceContextSchema);
export type SelectOrganizationInput = z.infer<typeof selectOrganizationSchema>;

export const switchOrganizationSchema = z
  .object({
    tenantId: z.string().min(1),
  })
  .merge(deviceContextSchema);
export type SwitchOrganizationInput = z.infer<typeof switchOrganizationSchema>;

export const registerOrganizerSchema = z
  .object({
    tenantName: z.string().min(2),
    registrationNumber: z.string().min(3),
    contactEmail: z.string().email(),
    contactPhone: z.string().min(7),
    address: addressSchema,

    organizerName: z.string().min(2),
    organizerEmail: z.string().email(),
    organizerPhone: mobileNumberSchema,
    organizerPassword: passwordSchema,
  })
  .merge(deviceContextSchema);

export type RegisterOrganizerInput = z.infer<typeof registerOrganizerSchema>;

export const loginSchema = z
  .object({
    email: z.string().min(1, "Email or phone number is required").trim(),
    password: z.string().min(1, "Password is required"),
  })
  .merge(deviceContextSchema);

export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
    /** Forced first-login change: return a fresh session instead of signing the person out. */
    keepSignedIn: z.boolean().optional(),
  })
  .merge(deviceContextSchema);

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

const otpCodeSchema = z
  .string()
  .length(6, "Code must be 6 digits")
  .regex(/^\d{6}$/, "Code must be 6 digits");

export const requestOtpSchema = z.object({
  email: z.string().min(1, "Email or phone number is required").trim(),
});
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;

export const verifyOtpSchema = z
  .object({
    email: z.string().min(1, "Email or phone number is required").trim(),
    code: otpCodeSchema,
  })
  .merge(deviceContextSchema);
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email or phone number is required").trim(),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  email: z.string().min(1, "Email or phone number is required").trim(),
  code: otpCodeSchema,
  newPassword: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// --- Member self-registration ---

const memberAddressSchema = z.object({
  line1: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be 6 digits"),
});

export const registerMemberSchema = z
  .object({
    tenantSlug: z.string().min(1, "Tenant slug is required"),
    name: z.string().min(2, "Full name must be at least 2 characters"),
    phone: mobileNumberSchema,
    email: z.string().email("Enter a valid email address"),
    password: passwordSchema,
    address: memberAddressSchema,
  })
  .merge(deviceContextSchema);

export type RegisterMemberInput = z.infer<typeof registerMemberSchema>;

export const verifyEmailSchema = z
  .object({
    email: z.string().email("Enter a valid email address").trim(),
    code: otpCodeSchema,
  })
  .merge(deviceContextSchema);
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const resendVerificationEmailSchema = z.object({
  email: z.string().email("Enter a valid email address").trim(),
});
export type ResendVerificationEmailInput = z.infer<typeof resendVerificationEmailSchema>;
