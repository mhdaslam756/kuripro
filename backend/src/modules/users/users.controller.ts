import type { Request, Response } from "express";

import { requireTenantContext } from "../../middleware/rbac.js";
import { AppError } from "../../utils/app-error.js";
import type { MongoIdParam } from "../../utils/common-validators.js";
import { buildPaginatedResult } from "../../utils/pagination.js";
import * as usersService from "./users.service.js";
import { toPublicUser } from "./user.serializer.js";
import type { CreateTenantUserInput, ListUsersQuery } from "./users.validators.js";

export async function createMember(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const input = req.body as CreateTenantUserInput;

  const { user, role, temporaryPassword } = await usersService.createTenantUser(
    tenantId,
    "MEMBER",
    req.auth!.permissions,
    input,
  );
  res.status(201).json({ user: toPublicUser(user, role), temporaryPassword });
}

export async function createStaff(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const input = req.body as CreateTenantUserInput;

  const { user, role, temporaryPassword } = await usersService.createTenantUser(
    tenantId,
    "STAFF",
    req.auth!.permissions,
    input,
  );
  res.status(201).json({ user: toPublicUser(user, role), temporaryPassword });
}

export async function approve(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  if (!req.auth) {
    throw AppError.unauthorized();
  }
  const { id } = req.params as unknown as MongoIdParam;

  const { user, role } = await usersService.approveUser(tenantId, id, req.auth.userId);
  res.status(200).json({ user: toPublicUser(user, role) });
}

export async function list(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const query = req.query as unknown as ListUsersQuery;

  const result = await usersService.listTenantUsers(tenantId, query);
  res.status(200).json(
    buildPaginatedResult(
      result.items.map(({ user, role }) => toPublicUser(user, role)),
      result.total,
      query,
    ),
  );
}
