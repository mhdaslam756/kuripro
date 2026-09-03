import type { Request, Response } from "express";

import type { DeviceContext } from "../auth/auth.service.js";
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
    res.cookie("refreshToken", result.auth.refreshToken, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
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
    res.cookie("refreshToken", auth.refreshToken, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  res.status(200).json({ auth });
}
