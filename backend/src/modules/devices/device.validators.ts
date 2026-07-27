import { z } from "zod";

import { DEVICE_PLATFORMS } from "./device-token.model.js";

export const registerPushTokenSchema = z.object({
  token: z.string().min(1).max(4096),
  platform: z.enum(DEVICE_PLATFORMS).default("web"),
});

export type RegisterPushTokenInput = z.infer<typeof registerPushTokenSchema>;

export const unregisterPushTokenSchema = z.object({
  token: z.string().min(1).max(4096),
});

export type UnregisterPushTokenInput = z.infer<typeof unregisterPushTokenSchema>;
