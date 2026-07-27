import type { Request, Response } from "express";

import { listPermissions } from "./permission.repository.js";

export async function list(_req: Request, res: Response): Promise<void> {
  const permissions = await listPermissions();
  res.status(200).json({ permissions });
}
