import { Router } from "express";

import { requireAuth } from "../../middleware/jwt-auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { validate } from "../../middleware/validate.js";
import { mongoIdParamSchema } from "../../utils/common-validators.js";
import * as payoutController from "./payout.controller.js";
import { listPayoutsQuerySchema, recordDisbursementSchema } from "./payout.validators.js";

export const payoutRouter: Router = Router();

payoutRouter.use(requireAuth);

// Literal routes before "/:id".
payoutRouter.get("/disbursements/verify", requirePermission("payout.view"), payoutController.verify);

payoutRouter.get(
  "/disbursements/:id/receipt",
  requirePermission("payout.view"),
  validate({ params: mongoIdParamSchema }),
  payoutController.receipt,
);

payoutRouter.get(
  "/",
  requirePermission("payout.view"),
  validate({ query: listPayoutsQuerySchema }),
  payoutController.list,
);

payoutRouter.get(
  "/:id",
  requirePermission("payout.view"),
  validate({ params: mongoIdParamSchema }),
  payoutController.getById,
);

payoutRouter.post(
  "/:id/disbursements",
  requirePermission("payout.disburse"),
  validate({ params: mongoIdParamSchema, body: recordDisbursementSchema }),
  payoutController.disburse,
);
