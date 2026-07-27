import { z } from "zod";

import { REPORT_TYPES } from "./report.service.js";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

export const reportTypeParamSchema = z.object({
  type: z.enum(REPORT_TYPES),
});

export type ReportTypeParam = z.infer<typeof reportTypeParamSchema>;

export const reportParamsQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  chitGroupId: objectId.optional(),
});

export type ReportParamsQuery = z.infer<typeof reportParamsQuerySchema>;

export const reportExportQuerySchema = reportParamsQuerySchema.extend({
  format: z.enum(["csv", "excel", "pdf"]),
});

export type ReportExportQuery = z.infer<typeof reportExportQuerySchema>;
