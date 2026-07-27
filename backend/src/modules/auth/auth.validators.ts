import { z } from "zod";

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

export const registerOrganizerSchema = z
  .object({
    tenantName: z.string().min(2),
    registrationNumber: z.string().min(3),
    contactEmail: z.string().email(),
    contactPhone: z.string().min(7),
    address: addressSchema,

    organizerName: z.string().min(2),
    organizerEmail: z.string().email(),
    organizerPhone: z.string().min(7),
    organizerPassword: passwordSchema,
  })
  .merge(deviceContextSchema);

export type RegisterOrganizerInput = z.infer<typeof registerOrganizerSchema>;

export const loginSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
  })
  .merge(deviceContextSchema);

export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

const otpCodeSchema = z
  .string()
  .length(6, "Code must be 6 digits")
  .regex(/^\d{6}$/, "Code must be 6 digits");

export const requestOtpSchema = z.object({ email: z.string().email() });
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;

export const verifyOtpSchema = z
  .object({
    email: z.string().email(),
    code: otpCodeSchema,
  })
  .merge(deviceContextSchema);
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

export const forgotPasswordSchema = requestOtpSchema;
export type ForgotPasswordInput = RequestOtpInput;

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: otpCodeSchema,
  newPassword: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
