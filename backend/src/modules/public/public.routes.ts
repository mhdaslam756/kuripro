import { Router } from "express";
import rateLimit from "express-rate-limit";

import { env } from "../../config/env.js";
import { validate } from "../../middleware/validate.js";
import * as publicController from "./public.controller.js";
import {
  publicMemberLoginSchema,
  publicMemberRegisterSchema,
  publicOrgSlugParamSchema,
} from "./public.validators.js";

export const publicRouter: Router = Router();

const publicRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.AUTH_RATE_LIMIT_MAX ?? 30,
  standardHeaders: true,
  legacyHeaders: false,
});

publicRouter.get(
  "/org/:slug",
  validate({ params: publicOrgSlugParamSchema }),
  publicController.getPublicOrg,
);

publicRouter.post(
  "/org/:slug/register-member",
  publicRateLimiter,
  validate({ params: publicOrgSlugParamSchema, body: publicMemberRegisterSchema }),
  publicController.registerMember,
);

publicRouter.post(
  "/org/:slug/login",
  publicRateLimiter,
  validate({ params: publicOrgSlugParamSchema, body: publicMemberLoginSchema }),
  publicController.loginMember,
);
