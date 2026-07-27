import { Router } from "express";

import { requireAuth } from "../../middleware/jwt-auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { validate } from "../../middleware/validate.js";
import { mongoIdParamSchema, nestedMongoIdParamSchema } from "../../utils/common-validators.js";
import { paginationQuerySchema } from "../../utils/pagination.js";
import * as chitGroupController from "./chit-group.controller.js";
import {
  addChitDocumentSchema,
  assignMembersSchema,
  createChitGroupSchema,
  enrollMemberSchema,
  listChitGroupsQuerySchema,
  updateChitGroupSchema,
} from "./chit-group.validators.js";

export const chitGroupRouter: Router = Router();

chitGroupRouter.use(requireAuth);

chitGroupRouter.post(
  "/",
  requirePermission("chit_group.create"),
  validate({ body: createChitGroupSchema }),
  chitGroupController.create,
);

chitGroupRouter.get(
  "/",
  requirePermission("chit_group.view"),
  validate({ query: listChitGroupsQuerySchema }),
  chitGroupController.list,
);

chitGroupRouter.get(
  "/:id",
  requirePermission("chit_group.view"),
  validate({ params: mongoIdParamSchema }),
  chitGroupController.getById,
);

chitGroupRouter.patch(
  "/:id",
  requirePermission("chit_group.update"),
  validate({ params: mongoIdParamSchema, body: updateChitGroupSchema }),
  chitGroupController.update,
);

// --- Member assignment ---

chitGroupRouter.post(
  "/:id/members",
  requirePermission("chit_group.enroll_member"),
  validate({ params: mongoIdParamSchema, body: enrollMemberSchema }),
  chitGroupController.assignMember,
);

chitGroupRouter.post(
  "/:id/members/bulk",
  requirePermission("chit_group.enroll_member"),
  validate({ params: mongoIdParamSchema, body: assignMembersSchema }),
  chitGroupController.assignMembers,
);

chitGroupRouter.get(
  "/:id/members",
  requirePermission("chit_group.view"),
  validate({ params: mongoIdParamSchema, query: paginationQuerySchema }),
  chitGroupController.listMembers,
);

chitGroupRouter.delete(
  "/:id/members/:childId",
  requirePermission("chit_group.enroll_member"),
  validate({ params: nestedMongoIdParamSchema }),
  chitGroupController.removeMember,
);

// --- Activation ---

chitGroupRouter.post(
  "/:id/activate",
  requirePermission("chit_group.activate"),
  validate({ params: mongoIdParamSchema }),
  chitGroupController.activate,
);

// --- Schedule / installments / cycles ---

chitGroupRouter.get(
  "/:id/schedule",
  requirePermission("chit_group.view"),
  validate({ params: mongoIdParamSchema }),
  chitGroupController.schedule,
);

chitGroupRouter.get(
  "/:id/cycles",
  requirePermission("chit_group.view"),
  validate({ params: mongoIdParamSchema, query: paginationQuerySchema }),
  chitGroupController.listCycles,
);

// --- Documents ---

chitGroupRouter.post(
  "/:id/documents",
  requirePermission("chit_group.update"),
  validate({ params: mongoIdParamSchema, body: addChitDocumentSchema }),
  chitGroupController.addDocument,
);

chitGroupRouter.delete(
  "/:id/documents/:childId",
  requirePermission("chit_group.update"),
  validate({ params: nestedMongoIdParamSchema }),
  chitGroupController.removeDocument,
);

// --- Reports ---

chitGroupRouter.get(
  "/:id/report",
  requirePermission("chit_group.view"),
  validate({ params: mongoIdParamSchema }),
  chitGroupController.report,
);
