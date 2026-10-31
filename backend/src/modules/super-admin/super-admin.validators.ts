import { z } from "zod";

/** Body only: credentials never travel in a URL (they end up in logs, history and Referer headers). */
export const createSuperAdminCredentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(12, "Password must be at least 12 characters long").max(128),
  name: z.string().trim().min(1, "Name cannot be empty").max(100).optional().default("Super Admin"),
  phone: z.string().trim().max(20).optional().default("+919999999999"),
});

export type CreateSuperAdminCredentialsInput = z.infer<typeof createSuperAdminCredentialsSchema>;
