import { Router } from "express";

import { requireAuth } from "../../middleware/jwt-auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { validate } from "../../middleware/validate.js";
import { paginationQuerySchema } from "../../utils/pagination.js";
import * as activityLogController from "./activity-log.controller.js";

export const activityLogRouter: Router = Router();

activityLogRouter.use(requireAuth);

activityLogRouter.get("/me", validate({ query: paginationQuerySchema }), activityLogController.listMine);

activityLogRouter.get(
  "/",
  requirePermission("activity_log.view_tenant"),
  validate({ query: paginationQuerySchema }),
  activityLogController.listForTenant,
);
