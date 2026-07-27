import { Router } from "express";

import { requireAuth } from "../../middleware/jwt-auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { validate } from "../../middleware/validate.js";
import { mongoIdParamSchema } from "../../utils/common-validators.js";
import * as notificationController from "./notification.controller.js";
import {
  createTemplateSchema,
  listHistoryQuerySchema,
  listTemplatesQuerySchema,
  sendBulkSchema,
  sendSingleSchema,
  updateTemplateSchema,
} from "./notification.validators.js";

export const notificationRouter: Router = Router();

notificationRouter.use(requireAuth);

// --- Templates ---

notificationRouter.get(
  "/templates",
  requirePermission("notification.view"),
  validate({ query: listTemplatesQuerySchema }),
  notificationController.listTemplates,
);

notificationRouter.post(
  "/templates",
  requirePermission("notification.manage_templates"),
  validate({ body: createTemplateSchema }),
  notificationController.createTemplate,
);

notificationRouter.patch(
  "/templates/:id",
  requirePermission("notification.manage_templates"),
  validate({ params: mongoIdParamSchema, body: updateTemplateSchema }),
  notificationController.updateTemplate,
);

notificationRouter.delete(
  "/templates/:id",
  requirePermission("notification.manage_templates"),
  validate({ params: mongoIdParamSchema }),
  notificationController.deleteTemplate,
);

// --- Sending ---

notificationRouter.post(
  "/send",
  requirePermission("notification.send"),
  validate({ body: sendSingleSchema }),
  notificationController.send,
);

notificationRouter.post(
  "/send-bulk",
  requirePermission("notification.send"),
  validate({ body: sendBulkSchema }),
  notificationController.sendBulk,
);

// --- History & meta ---

notificationRouter.get(
  "/history",
  requirePermission("notification.view"),
  validate({ query: listHistoryQuerySchema }),
  notificationController.history,
);

notificationRouter.get("/meta", requirePermission("notification.view"), notificationController.meta);
