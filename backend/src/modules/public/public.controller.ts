import type { Request, Response } from "express";

import type { DeviceContext } from "../auth/auth.service.js";
import { setRefreshCookie } from "../auth/cookie.helper.js";
import * as publicService from "./public.service.js";
import type { PublicMemberLoginInput, PublicMemberRegisterInput } from "./public.validators.js";

function extractDeviceContext(req: Request): DeviceContext {
  const deviceId = req.headers["x-device-id"] as string | undefined;
  const userAgent = req.headers["user-agent"];
  const ipAddress = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.ip;

  return {
    deviceId,
    userAgent,
    ipAddress,
  };
}

export async function getPublicOrg(req: Request, res: Response): Promise<void> {
  const { slug } = req.params as { slug: string };
  const org = await publicService.getPublicOrg(slug);
  res.status(200).json({ org });
}

export async function registerMember(req: Request, res: Response): Promise<void> {
  const { slug } = req.params as { slug: string };
  const input = req.body as PublicMemberRegisterInput;
  const deviceContext = extractDeviceContext(req);

  const result = await publicService.registerPublicMember(slug, input, deviceContext);

  if (!result.requireEmailVerification && result.auth.refreshToken) {
    setRefreshCookie(res, result.auth.refreshToken);
  }

  res.status(201).json({
    message: result.requireEmailVerification ? result.message : "Registration successful",
    ...result,
  });
}

export async function loginMember(req: Request, res: Response): Promise<void> {
  const { slug } = req.params as { slug: string };
  const input = req.body as PublicMemberLoginInput;
  const deviceContext = extractDeviceContext(req);

  const auth = await publicService.publicMemberLogin(slug, input, deviceContext);

  if (auth.refreshToken) {
    setRefreshCookie(res, auth.refreshToken);
  }

  res.status(200).json({ auth });
}
