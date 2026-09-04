import { Router } from "express";

import { requireAuth } from "../../middleware/jwt-auth.js";
import { requireSuperAdmin } from "../../middleware/rbac.js";
import { validate } from "../../middleware/validate.js";
import {
  approveOrganizationHandler,
  changeSuperAdminPasswordHandler,
  createSuperAdminCredentialsHandler,
  getPlatformStatisticsHandler,
  listOrganizationsHandler,
  rejectOrganizationHandler,
  setOrganizationStatusHandler,
  superAdminLoginHandler,
} from "./super-admin.controller.js";
import {
  createSuperAdminQuerySchema,
} from "./super-admin.validators.js";

const router = Router();

// Public Super Admin routes
router.post("/login", superAdminLoginHandler);
router.get("/create-credentials", validate({ query: createSuperAdminQuerySchema }), createSuperAdminCredentialsHandler);

// Authenticated Super Admin routes
router.use(requireAuth, requireSuperAdmin);

router.post("/change-password", changeSuperAdminPasswordHandler);
router.get("/organizations", listOrganizationsHandler);
router.post("/organizations/:id/approve", approveOrganizationHandler);
router.post("/organizations/:id/reject", rejectOrganizationHandler);
router.patch("/organizations/:id/status", setOrganizationStatusHandler);
router.get("/stats", getPlatformStatisticsHandler);

export default router;
