import { z } from "zod";

export const trendsQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(24).default(6),
});

export type TrendsQuery = z.infer<typeof trendsQuerySchema>;

export const activityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type ActivityQuery = z.infer<typeof activityQuerySchema>;
