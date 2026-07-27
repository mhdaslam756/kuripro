import { Router } from "express";

import { requireAuth } from "../../middleware/jwt-auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import * as permissionController from "./permission.controller.js";

export const permissionRouter: Router = Router();

// Same gate as role management — the catalog is only useful when building/editing a role.
permissionRouter.get("/", requireAuth, requirePermission("role.manage"), permissionController.list);
