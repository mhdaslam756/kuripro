import type { Request, Response } from "express";

import { requireTenantContext } from "../../middleware/rbac.js";
import type { MongoIdParam, NestedMongoIdParam } from "../../utils/common-validators.js";
import type { PaginationQuery } from "../../utils/pagination.js";
import * as chitGroupService from "./chit-group.service.js";
import type {
  AddChitDocumentInput,
  AssignMembersInput,
  CreateChitGroupInput,
  EnrollMemberInput,
  ListChitGroupsQuery,
  UpdateChitGroupInput,
} from "./chit-group.validators.js";

export async function create(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const chitGroup = await chitGroupService.createChitGroup(tenantId, req.auth!.userId, req.body as CreateChitGroupInput);
  res.status(201).json({ chitGroup });
}

export async function list(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const result = await chitGroupService.listChitGroups(tenantId, req.query as unknown as ListChitGroupsQuery);
  res.status(200).json(result);
}

export async function getById(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const chitGroup = await chitGroupService.getChitGroupById(tenantId, id);
  res.status(200).json({ chitGroup });
}

export async function update(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const chitGroup = await chitGroupService.updateChitGroup(tenantId, id, req.body as UpdateChitGroupInput);
  res.status(200).json({ chitGroup });
}

export async function assignMember(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const membership = await chitGroupService.assignMember(tenantId, id, req.body as EnrollMemberInput);
  res.status(201).json({ membership });
}

export async function assignMembers(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const result = await chitGroupService.assignMembers(tenantId, id, req.body as AssignMembersInput);
  res.status(200).json(result);
}

export async function removeMember(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id, childId } = req.params as unknown as NestedMongoIdParam;
  await chitGroupService.removeMember(tenantId, id, childId);
  res.status(204).send();
}

export async function activate(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const chitGroup = await chitGroupService.activateChitGroup(tenantId, id);
  res.status(200).json({ chitGroup });
}

export async function listMembers(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const result = await chitGroupService.listMembers(tenantId, id, req.query as unknown as PaginationQuery);
  res.status(200).json(result);
}

export async function listCycles(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const result = await chitGroupService.listCycles(tenantId, id, req.query as unknown as PaginationQuery);
  res.status(200).json(result);
}

export async function schedule(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const entries = await chitGroupService.getSchedule(tenantId, id);
  res.status(200).json({ schedule: entries });
}

export async function addDocument(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const chitGroup = await chitGroupService.addChitDocument(tenantId, id, req.body as AddChitDocumentInput, req.auth!.userId);
  res.status(201).json({ chitGroup });
}

export async function removeDocument(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id, childId } = req.params as unknown as NestedMongoIdParam;
  const chitGroup = await chitGroupService.removeChitDocument(tenantId, id, childId);
  res.status(200).json({ chitGroup });
}

export async function report(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const summary = await chitGroupService.getChitSummaryReport(tenantId, id);
  res.status(200).json({ report: summary });
}
