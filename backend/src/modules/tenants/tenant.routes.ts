import { Router } from "express";

import { requireAuth } from "../../middleware/jwt-auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { validate } from "../../middleware/validate.js";
import { uploadSingleFile } from "../../uploads/upload.middleware.js";
import * as tenantController from "./tenant.controller.js";
import { updateBusinessHoursSchema, updateCompanyProfileSchema, updateSettingsSchema } from "./tenant.validators.js";

export const tenantRouter: Router = Router();

tenantRouter.use(requireAuth);

tenantRouter.get("/", requirePermission("organization.manage"), tenantController.getProfile);

tenantRouter.patch(
  "/profile",
  requirePermission("organization.manage"),
  validate({ body: updateCompanyProfileSchema }),
  tenantController.updateProfile,
);

tenantRouter.patch(
  "/settings",
  requirePermission("organization.manage"),
  validate({ body: updateSettingsSchema }),
  tenantController.updateSettings,
);

tenantRouter.patch(
  "/business-hours",
  requirePermission("organization.manage"),
  validate({ body: updateBusinessHoursSchema }),
  tenantController.updateBusinessHours,
);

tenantRouter.post(
  "/logo",
  requirePermission("organization.manage"),
  uploadSingleFile,
  tenantController.uploadLogo,
);

tenantRouter.get(
  "/subscription",
  requirePermission("subscription.view"),
  tenantController.getSubscription,
);
