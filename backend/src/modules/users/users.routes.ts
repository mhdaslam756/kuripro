import { Router } from "express";

import { requireAuth } from "../../middleware/jwt-auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { validate } from "../../middleware/validate.js";
import { mongoIdParamSchema } from "../../utils/common-validators.js";
import * as usersController from "./users.controller.js";
import { createTenantUserSchema, listUsersQuerySchema } from "./users.validators.js";

export const usersRouter: Router = Router();

usersRouter.use(requireAuth);

usersRouter.post(
  "/members",
  requirePermission("users.create_member"),
  validate({ body: createTenantUserSchema }),
  usersController.createMember,
);

usersRouter.post(
  "/staff",
  requirePermission("users.create_staff"),
  validate({ body: createTenantUserSchema }),
  usersController.createStaff,
);

usersRouter.get(
  "/",
  requirePermission("users.view"),
  validate({ query: listUsersQuerySchema }),
  usersController.list,
);

usersRouter.post(
  "/:id/approve",
  requirePermission("users.approve"),
  validate({ params: mongoIdParamSchema }),
  usersController.approve,
);
