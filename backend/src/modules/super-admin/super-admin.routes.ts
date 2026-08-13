import { Router } from "express";

import { requireAuth } from "../../middleware/jwt-auth.js";
import { requireSuperAdmin } from "../../middleware/rbac.js";
import {
  approveOrganizationHandler,
  changeSuperAdminPasswordHandler,
  getPlatformStatisticsHandler,
  getSuperAdminSetupStatusHandler,
  listOrganizationsHandler,
  rejectOrganizationHandler,
  setOrganizationStatusHandler,
  setupSuperAdminHandler,
  superAdminLoginHandler,
} from "./super-admin.controller.js";

const router = Router();

// Public Super Admin routes (Setup from .env & Login)
router.get("/setup-status", getSuperAdminSetupStatusHandler);
router.get("/setup", setupSuperAdminHandler);
router.post("/setup", setupSuperAdminHandler);
router.get("/seed-env", setupSuperAdminHandler);
router.get("/init-env", setupSuperAdminHandler);
router.post("/seed-env", setupSuperAdminHandler);
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
