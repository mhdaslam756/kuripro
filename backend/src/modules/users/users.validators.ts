import { z } from "zod";

import { paginationQuerySchema } from "../../utils/pagination.js";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

export const createTenantUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(7),
  /** Assign a specific (custom or system) role instead of the default for this endpoint. */
  roleId: objectIdSchema.optional(),
});

export type CreateTenantUserInput = z.infer<typeof createTenantUserSchema>;

export const listUsersQuerySchema = paginationQuerySchema.extend({
  roleId: objectIdSchema.optional(),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
