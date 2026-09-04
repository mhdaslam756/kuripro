import { z } from "zod";

export const createSuperAdminCredentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  name: z.string().trim().min(1, "Name cannot be empty").optional().default("Super Admin"),
  phone: z.string().trim().optional().default("+919999999999"),
  setupKey: z.string().optional(),
  autoLogin: z.boolean().optional().default(false),
});

export const createSuperAdminQuerySchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address").optional(),
  password: z.string().min(8, "Password must be at least 8 characters long").optional(),
  name: z.string().trim().min(1).optional(),
  phone: z.string().trim().optional(),
  setupKey: z.string().optional(),
  autoLogin: z.preprocess((val) => val === "true" || val === true, z.boolean()).optional(),
});

export type CreateSuperAdminCredentialsInput = z.infer<typeof createSuperAdminCredentialsSchema>;
export type CreateSuperAdminQueryInput = z.infer<typeof createSuperAdminQuerySchema>;

