import type { Request, Response } from "express";

import { requireTenantContext } from "../../middleware/rbac.js";
import type { MongoIdParam, NestedMongoIdParam } from "../../utils/common-validators.js";
import * as auctionService from "./auction.service.js";
import type { RecordBidInput, RepickInput, SettleInput } from "./auction.validators.js";

export async function getState(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const state = await auctionService.getAuctionState(tenantId, id);
  res.status(200).json({ auction: state });
}

export async function listBids(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const bids = await auctionService.listCycleBids(tenantId, id);
  res.status(200).json({ bids });
}

export async function recordBid(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const bid = await auctionService.recordBid(tenantId, id, req.auth!.userId, req.body as RecordBidInput);
  res.status(201).json({ bid });
}

export async function withdrawBid(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id, childId } = req.params as unknown as NestedMongoIdParam;
  await auctionService.withdrawBid(tenantId, id, childId, req.auth!.userId);
  res.status(204).send();
}

export async function openBidding(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const cycle = await auctionService.openBidding(tenantId, id, req.auth!.userId);
  res.status(200).json({ cycle });
}

export async function closeBidding(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const cycle = await auctionService.closeBidding(tenantId, id, req.auth!.userId);
  res.status(200).json({ cycle });
}

export async function settle(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const summary = await auctionService.settleCycle(tenantId, id, req.auth!.userId, req.body as SettleInput);
  res.status(200).json({ settlement: summary });
}

export async function repick(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const cycle = await auctionService.repickWinner(tenantId, id, req.auth!.userId, (req.body as RepickInput).reason);
  res.status(200).json({ cycle });
}

export async function auditTrail(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const events = await auctionService.getAuditTrail(tenantId, id);
  res.status(200).json({ events });
}

export async function minutes(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const pdf = await auctionService.buildMinutesPdf(tenantId, id, req.auth!.userId);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="auction-minutes-${id}.pdf"`);
  res.status(200).send(pdf);
}

export async function voucher(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const pdf = await auctionService.buildWinnerVoucherPdf(tenantId, id);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="winner-voucher-${id}.pdf"`);
  res.status(200).send(pdf);
}
