import type { Request, Response } from "express";

import { requireTenantContext } from "../../middleware/rbac.js";
import type { MongoIdParam } from "../../utils/common-validators.js";
import * as roleService from "./role.service.js";
import type { CreateRoleInput, UpdateRoleInput } from "./role.validators.js";

export async function list(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const roles = await roleService.listOrganizationRoles(tenantId);
  res.status(200).json({ roles });
}

export async function create(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const input = req.body as CreateRoleInput;

  const role = await roleService.createCustomRole(tenantId, input.name, input.permissionKeys);
  res.status(201).json({ role });
}

export async function update(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;
  const input = req.body as UpdateRoleInput;

  const role = await roleService.updateRolePermissions(tenantId, id, input);
  res.status(200).json({ role });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const tenantId = requireTenantContext(req);
  const { id } = req.params as unknown as MongoIdParam;

  await roleService.deleteCustomRole(tenantId, id);
  res.status(204).send();
}
