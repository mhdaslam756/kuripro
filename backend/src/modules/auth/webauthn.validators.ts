import { z } from "zod";

/**
 * The register/verify and login/verify bodies carry the raw WebAuthn ceremony JSON produced by the
 * browser (`@simplewebauthn/browser`). Its exact shape is validated by `@simplewebauthn/server`, so
 * here we only assert the envelope: a non-empty object plus our own fields.
 */
const ceremonyResponse = z.object({}).passthrough();

export const webauthnLoginOptionsSchema = z.object({
  email: z.string().email(),
});

export type WebauthnLoginOptionsInput = z.infer<typeof webauthnLoginOptionsSchema>;

export const webauthnRegisterVerifySchema = z.object({
  response: ceremonyResponse,
  deviceLabel: z.string().max(120).optional(),
});

export type WebauthnRegisterVerifyInput = z.infer<typeof webauthnRegisterVerifySchema>;

export const webauthnLoginVerifySchema = z.object({
  email: z.string().email(),
  response: ceremonyResponse,
  deviceId: z.string().optional(),
  deviceLabel: z.string().max(120).optional(),
  rememberDevice: z.boolean().optional(),
});

export type WebauthnLoginVerifyInput = z.infer<typeof webauthnLoginVerifySchema>;
