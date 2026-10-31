import { Router } from "express";
import rateLimit from "express-rate-limit";

import { env } from "../../config/env.js";

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
import { createSuperAdminCredentialsSchema } from "./super-admin.validators.js";

const router = Router();

// Public Super Admin routes — the highest-privilege account, so both are rate limited per IP.
const superAdminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/login", superAdminRateLimiter, superAdminLoginHandler);
router.post(
  "/create-credentials",
  superAdminRateLimiter,
  validate({ body: createSuperAdminCredentialsSchema }),
  createSuperAdminCredentialsHandler,
);

// Authenticated Super Admin routes
router.use(requireAuth, requireSuperAdmin);

router.post("/change-password", changeSuperAdminPasswordHandler);
router.get("/organizations", listOrganizationsHandler);
router.post("/organizations/:id/approve", approveOrganizationHandler);
router.post("/organizations/:id/reject", rejectOrganizationHandler);
router.patch("/organizations/:id/status", setOrganizationStatusHandler);
router.get("/stats", getPlatformStatisticsHandler);

export default router;
