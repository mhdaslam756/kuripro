import { Router } from "express";

import { requireAuth } from "../../middleware/jwt-auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { validate } from "../../middleware/validate.js";
import { mongoIdParamSchema } from "../../utils/common-validators.js";
import * as roleController from "./role.controller.js";
import { createRoleSchema, updateRoleSchema } from "./role.validators.js";

export const roleRouter: Router = Router();

roleRouter.use(requireAuth, requirePermission("role.manage"));

roleRouter.get("/", roleController.list);

roleRouter.post("/", validate({ body: createRoleSchema }), roleController.create);

roleRouter.patch(
  "/:id",
  validate({ params: mongoIdParamSchema, body: updateRoleSchema }),
  roleController.update,
);

roleRouter.delete("/:id", validate({ params: mongoIdParamSchema }), roleController.remove);
