import { Router } from "express";

import { requireAuth } from "../../middleware/jwt-auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { validate } from "../../middleware/validate.js";
import { mongoIdParamSchema, nestedMongoIdParamSchema } from "../../utils/common-validators.js";
import * as auctionController from "./auction.controller.js";
import { recordBidSchema, repickSchema, settleSchema } from "./auction.validators.js";

export const auctionRouter: Router = Router();

auctionRouter.use(requireAuth);

// --- Bids ---

auctionRouter.get(
  "/cycles/:id/bids",
  requirePermission("auction.view"),
  validate({ params: mongoIdParamSchema }),
  auctionController.listBids,
);

auctionRouter.post(
  "/cycles/:id/bids",
  requirePermission("auction.record_bid"),
  validate({ params: mongoIdParamSchema, body: recordBidSchema }),
  auctionController.recordBid,
);

auctionRouter.delete(
  "/cycles/:id/bids/:childId",
  requirePermission("auction.record_bid"),
  validate({ params: nestedMongoIdParamSchema }),
  auctionController.withdrawBid,
);

// --- Bidding lifecycle ---

auctionRouter.post(
  "/cycles/:id/open",
  requirePermission("auction.manage"),
  validate({ params: mongoIdParamSchema }),
  auctionController.openBidding,
);

auctionRouter.post(
  "/cycles/:id/close",
  requirePermission("auction.manage"),
  validate({ params: mongoIdParamSchema }),
  auctionController.closeBidding,
);

auctionRouter.post(
  "/cycles/:id/settle",
  requirePermission("auction.manage"),
  validate({ params: mongoIdParamSchema, body: settleSchema }),
  auctionController.settle,
);

auctionRouter.post(
  "/cycles/:id/repick",
  requirePermission("auction.manage"),
  validate({ params: mongoIdParamSchema, body: repickSchema }),
  auctionController.repick,
);

// --- Reads & documents ---

auctionRouter.get(
  "/cycles/:id/audit",
  requirePermission("auction.view"),
  validate({ params: mongoIdParamSchema }),
  auctionController.auditTrail,
);

auctionRouter.get(
  "/cycles/:id/minutes",
  requirePermission("auction.view"),
  validate({ params: mongoIdParamSchema }),
  auctionController.minutes,
);

auctionRouter.get(
  "/cycles/:id/voucher",
  requirePermission("auction.view"),
  validate({ params: mongoIdParamSchema }),
  auctionController.voucher,
);

auctionRouter.get(
  "/cycles/:id",
  requirePermission("auction.view"),
  validate({ params: mongoIdParamSchema }),
  auctionController.getState,
);
