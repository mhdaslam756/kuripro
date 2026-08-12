import { Router } from "express";

import { requireAuth } from "../../middleware/jwt-auth.js";
import { requireSuperAdmin } from "../../middleware/rbac.js";
import {
  approveOrganizationHandler,
  getPlatformStatisticsHandler,
  getSuperAdminSetupStatusHandler,
  listOrganizationsHandler,
  rejectOrganizationHandler,
  setOrganizationStatusHandler,
  setupSuperAdminHandler,
  superAdminLoginHandler,
} from "./super-admin.controller.js";

const router = Router();

// Public Super Admin routes (Setup & Login)
router.get("/setup-status", getSuperAdminSetupStatusHandler);
router.post("/setup", setupSuperAdminHandler);
router.post("/login", superAdminLoginHandler);

// Authenticated Super Admin routes
router.use(requireAuth, requireSuperAdmin);

router.get("/organizations", listOrganizationsHandler);
router.post("/organizations/:id/approve", approveOrganizationHandler);
router.post("/organizations/:id/reject", rejectOrganizationHandler);
router.patch("/organizations/:id/status", setOrganizationStatusHandler);
router.get("/stats", getPlatformStatisticsHandler);

export default router;
