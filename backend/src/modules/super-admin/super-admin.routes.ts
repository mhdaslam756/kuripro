import { Router } from "express";

import { requireAuth } from "../../middleware/jwt-auth.js";
import { requireSuperAdmin } from "../../middleware/rbac.js";
import {
  approveOrganizationHandler,
  changeSuperAdminPasswordHandler,
  getPlatformStatisticsHandler,
  listOrganizationsHandler,
  rejectOrganizationHandler,
  setOrganizationStatusHandler,
  superAdminLoginHandler,
} from "./super-admin.controller.js";

const router = Router();

// Public Super Admin routes (Login only)
router.post("/login", superAdminLoginHandler);

// Authenticated Super Admin routes
router.use(requireAuth, requireSuperAdmin);

router.post("/change-password", changeSuperAdminPasswordHandler);
router.get("/organizations", listOrganizationsHandler);
router.post("/organizations/:id/approve", approveOrganizationHandler);
router.post("/organizations/:id/reject", rejectOrganizationHandler);
router.patch("/organizations/:id/status", setOrganizationStatusHandler);
router.get("/stats", getPlatformStatisticsHandler);

export default router;
