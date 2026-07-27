import { Router } from "express";

import { requireAuth } from "../../middleware/jwt-auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { validate } from "../../middleware/validate.js";
import * as dashboardController from "./dashboard.controller.js";
import { activityQuerySchema, trendsQuerySchema } from "./dashboard.validators.js";

export const dashboardRouter: Router = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get("/summary", requirePermission("dashboard.view"), dashboardController.summary);

dashboardRouter.get(
  "/trends",
  requirePermission("dashboard.view"),
  validate({ query: trendsQuerySchema }),
  dashboardController.trends,
);

dashboardRouter.get(
  "/activity",
  requirePermission("dashboard.view"),
  validate({ query: activityQuerySchema }),
  dashboardController.activity,
);
