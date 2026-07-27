import { Router } from "express";

import { requireAuth } from "../../middleware/jwt-auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { validate } from "../../middleware/validate.js";
import * as reportController from "./report.controller.js";
import { reportExportQuerySchema, reportParamsQuerySchema, reportTypeParamSchema } from "./report.validators.js";

export const reportRouter: Router = Router();

reportRouter.use(requireAuth);

reportRouter.get(
  "/:type/export",
  requirePermission("report.export"),
  validate({ params: reportTypeParamSchema, query: reportExportQuerySchema }),
  reportController.exportReport,
);

reportRouter.get(
  "/:type",
  requirePermission("report.view"),
  validate({ params: reportTypeParamSchema, query: reportParamsQuerySchema }),
  reportController.getReport,
);
