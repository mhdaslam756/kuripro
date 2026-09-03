import { z } from "zod";
import { NOTIFICATION_CHANNELS } from "../notifications/notification.constants.js";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

export const sendDueRemindersSchema = z.object({
  chitGroupId: objectId.optional(),
  chitCycleId: objectId.optional(),
  paymentIds: z.array(objectId).min(1).max(200).optional(),
  channel: z.enum(NOTIFICATION_CHANNELS).default("PUSH"),
  subject: z.string().max(120).optional(),
  body: z.string().max(500).optional(),
  onlyOverdue: z.boolean().optional().default(false),
});

export type SendDueRemindersInput = z.infer<typeof sendDueRemindersSchema>;
