import type { Request, Response } from "express";

import { requireTenantContext } from "../../middleware/rbac.js";
import type { MongoIdParam, NestedMongoIdParam } from "../../utils/common-validators.js";
import type { PaginationQuery } from "../../utils/pagination.js";
import { resolveMemberForUser } from "../members/member.service.js";
import { AppError } from "../../utils/app-error.js";
import * as chitGroupService from "./chit-group.service.js";
import * as replacementService from "./membership-replacement.service.js";
import { listMemberChitGroups } from "./member-chit-groups.service.js";
import { listChitMembershipsByMemberId } from "./chit-membership.repository.js";
import {
  replacementPreviewQuerySchema,
  type CompleteReplacementSettlementInput,
  type GroupReplacementSettingsInput,
  type ReplaceMemberInput,
  type UpdateReplacementSettlementInput,
} from "./membership-replacement.validators.js";
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
  let query = { ...(req.query as unknown as ListChitGroupsQuery) };

  if (req.auth?.roleSlug === "MEMBER") {
    const member = await resolveMemberForUser(req.auth.userId, tenantId);
    if (member) {
      const memberships = await listChitMembershipsByMemberId(tenantId, member._id.toString());
      const groupIds = memberships.map((m) => {
        const ref = m.chitGroupId as any;
        return ref?._id ? ref._id.toString() : ref.toString();
      });
      query = { ...query, groupIds } as any;
    } else {
      query = { ...query, groupIds: [] } as any;
    }
  }

  const result = await chitGroupService.listChitGroups(tenantId, query);
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

  let requestingMemberId: string | undefined;
  if (req.auth?.roleSlug === "MEMBER") {
    const member = await resolveMemberForUser(req.auth.userId, tenantId);
    requestingMemberId = member ? member._id.toString() : "none";
  }

  const result = await chitGroupService.listMembers(
    tenantId,
    id,
    req.query as unknown as PaginationQuery,
    requestingMemberId,
  );
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

// --- Member replacement & exit settlement ---

export async function replacementPreview(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id, childId } = req.params as unknown as NestedMongoIdParam;
  const preview = await replacementService.previewReplacement(
    tenantId,
    id,
    childId,
    // Parse here rather than trusting req.query: Express 5 re-derives it on every read, so the validate
    // middleware cannot write coerced values back and `split` would stay the string "true".
    replacementPreviewQuerySchema.parse(req.query),
  );
  res.status(200).json({ preview });
}

export async function replaceMember(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id, childId } = req.params as unknown as NestedMongoIdParam;
  const result = await replacementService.replaceMember(tenantId, id, childId, req.auth!.userId, req.body as ReplaceMemberInput);
  res.status(201).json(result);
}

export async function memberChitGroups(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  // A member may only look at their own groups; staff can look at any member in their organisation.
  if (req.auth?.roleSlug === "MEMBER") {
    const own = await resolveMemberForUser(req.auth.userId, tenantId);
    if (!own || own._id.toString() !== id) throw AppError.forbidden("You can only view your own chit groups");
  }
  res.status(200).json(await listMemberChitGroups(tenantId, id));
}

export async function getReplacementSettings(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  res.status(200).json(await replacementService.getGroupReplacementSettings(tenantId, id));
}

export async function updateReplacementSettings(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  res.status(200).json(await replacementService.updateGroupReplacementSettings(tenantId, id, req.body as GroupReplacementSettingsInput));
}

export async function membershipHistory(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  res.status(200).json(await replacementService.getMembershipHistory(tenantId, id));
}

export async function updateReplacementSettlement(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id, childId } = req.params as unknown as NestedMongoIdParam;
  const replacement = await replacementService.updateReplacementSettlement(
    tenantId,
    id,
    childId,
    req.body as UpdateReplacementSettlementInput,
  );
  res.status(200).json({ replacement });
}

export async function completeReplacementSettlement(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id, childId } = req.params as unknown as NestedMongoIdParam;
  const replacement = await replacementService.completeReplacementSettlement(
    tenantId,
    id,
    childId,
    req.auth!.userId,
    req.body as CompleteReplacementSettlementInput,
  );
  res.status(200).json({ replacement });
}
