import { Router } from "express";

import { requireAuth } from "../../middleware/jwt-auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { validate } from "../../middleware/validate.js";
import { mongoIdParamSchema } from "../../utils/common-validators.js";
import * as collectionController from "./collection.controller.js";
import {
  bulkCollectionSchema,
  flagOverdueSchema,
  listCollectionsQuerySchema,
  listDuesQuerySchema,
  raiseDuesSchema,
  recordCollectionSchema,
  syncOfflineSchema,
} from "./collection.validators.js";

export const collectionRouter: Router = Router();

collectionRouter.use(requireAuth);

// --- Auto Due (literal paths declared before "/:id/..." param routes) ---

collectionRouter.post(
  "/dues/raise",
  requirePermission("collection.manage_dues"),
  validate({ body: raiseDuesSchema }),
  collectionController.raiseDues,
);

collectionRouter.post(
  "/dues/flag-overdue",
  requirePermission("collection.manage_dues"),
  validate({ body: flagOverdueSchema }),
  collectionController.flagOverdue,
);

collectionRouter.get(
  "/dues",
  requirePermission("collection.view"),
  validate({ query: listDuesQuerySchema }),
  collectionController.listDues,
);

collectionRouter.get("/dues/summary", requirePermission("collection.view"), collectionController.cycleSummary);

// --- Recording ---

collectionRouter.post(
  "/bulk",
  requirePermission("collection.record"),
  validate({ body: bulkCollectionSchema }),
  collectionController.bulk,
);

collectionRouter.post(
  "/sync",
  requirePermission("collection.record"),
  validate({ body: syncOfflineSchema }),
  collectionController.sync,
);

collectionRouter.get("/verify", requirePermission("collection.view"), collectionController.verify);

collectionRouter.post(
  "/",
  requirePermission("collection.record"),
  validate({ body: recordCollectionSchema }),
  collectionController.record,
);

collectionRouter.get(
  "/",
  requirePermission("collection.view"),
  validate({ query: listCollectionsQuerySchema }),
  collectionController.list,
);

// --- Reconciliation & receipts ---

collectionRouter.post(
  "/:id/clear",
  requirePermission("collection.manage_dues"),
  validate({ params: mongoIdParamSchema }),
  collectionController.clear,
);

collectionRouter.post(
  "/:id/bounce",
  requirePermission("collection.manage_dues"),
  validate({ params: mongoIdParamSchema }),
  collectionController.bounce,
);

collectionRouter.get(
  "/:id/receipt",
  requirePermission("collection.view"),
  validate({ params: mongoIdParamSchema }),
  collectionController.receipt,
);
