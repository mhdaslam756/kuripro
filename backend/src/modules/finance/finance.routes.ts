import { Router } from "express";

import { requireAuth } from "../../middleware/jwt-auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { validate } from "../../middleware/validate.js";
import { mongoIdParamSchema } from "../../utils/common-validators.js";
import * as financeController from "./finance.controller.js";
import { createFinanceEntrySchema, listFinanceEntriesQuerySchema } from "./finance.validators.js";

export const financeRouter: Router = Router();

financeRouter.use(requireAuth);

financeRouter.get(
  "/entries",
  requirePermission("report.view"),
  validate({ query: listFinanceEntriesQuerySchema }),
  financeController.list,
);

financeRouter.post(
  "/entries",
  requirePermission("report.manage_finance"),
  validate({ body: createFinanceEntrySchema }),
  financeController.create,
);

financeRouter.delete(
  "/entries/:id",
  requirePermission("report.manage_finance"),
  validate({ params: mongoIdParamSchema }),
  financeController.remove,
);
