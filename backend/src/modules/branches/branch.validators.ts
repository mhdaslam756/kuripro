import { z } from "zod";

import { paginationQuerySchema } from "../../utils/pagination.js";
import { BRANCH_STATUSES } from "./branch.model.js";

const addressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().min(1),
  country: z.string().min(1).default("India"),
});

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

export const createBranchSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(10),
  address: addressSchema,
  managerId: objectIdSchema.optional(),
});
export type CreateBranchInput = z.infer<typeof createBranchSchema>;

export const updateBranchSchema = z.object({
  name: z.string().min(2).optional(),
  address: addressSchema.optional(),
  managerId: objectIdSchema.nullable().optional(),
  status: z.enum(BRANCH_STATUSES).optional(),
});
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;

export const listBranchesQuerySchema = paginationQuerySchema.extend({
  status: z.enum(BRANCH_STATUSES).optional(),
});
export type ListBranchesQuery = z.infer<typeof listBranchesQuerySchema>;
