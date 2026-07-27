import type { Request, Response } from "express";

import { AppError } from "../../utils/app-error.js";
import * as deviceService from "./device.service.js";
import type { RegisterPushTokenInput, UnregisterPushTokenInput } from "./device.validators.js";

export async function registerPushToken(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw AppError.unauthorized();
  await deviceService.registerPushToken(
    req.auth.tenantId,
    req.auth.userId,
    req.body as RegisterPushTokenInput,
    req.headers["user-agent"],
  );
  res.status(204).send();
}

export async function unregisterPushToken(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw AppError.unauthorized();
  await deviceService.unregisterPushToken(req.auth.userId, (req.body as UnregisterPushTokenInput).token);
  res.status(204).send();
}
