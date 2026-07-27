import { Router } from "express";

import { requireAuth } from "../../middleware/jwt-auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { validate } from "../../middleware/validate.js";
import { mongoIdParamSchema } from "../../utils/common-validators.js";
import * as branchController from "./branch.controller.js";
import { createBranchSchema, listBranchesQuerySchema, updateBranchSchema } from "./branch.validators.js";

export const branchRouter: Router = Router();

branchRouter.use(requireAuth, requirePermission("branch.manage"));

branchRouter.post("/", validate({ body: createBranchSchema }), branchController.create);

branchRouter.get("/", validate({ query: listBranchesQuerySchema }), branchController.list);

branchRouter.get("/:id", validate({ params: mongoIdParamSchema }), branchController.getById);

branchRouter.patch(
  "/:id",
  validate({ params: mongoIdParamSchema, body: updateBranchSchema }),
  branchController.update,
);
