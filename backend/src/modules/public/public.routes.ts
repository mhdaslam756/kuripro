import { Router } from "express";
import rateLimit from "express-rate-limit";

import { env } from "../../config/env.js";
import { validate } from "../../middleware/validate.js";
import * as publicController from "./public.controller.js";
import {
  publicJoinSchema,
  publicMemberLoginSchema,
  publicMemberRegisterSchema,
  publicOrgSlugParamSchema,
  publicPhoneCheckSchema,
  publicVerifyAccountSchema,
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

// Registration starts with the mobile number: an existing account can join with a password instead of
// filling in the whole form again.
publicRouter.post(
  "/org/:slug/check-phone",
  publicRateLimiter,
  validate({ params: publicOrgSlugParamSchema, body: publicPhoneCheckSchema }),
  publicController.checkPhone,
);

publicRouter.post(
  "/org/:slug/join",
  publicRateLimiter,
  validate({ params: publicOrgSlugParamSchema, body: publicJoinSchema }),
  publicController.joinOrganization,
);


// Step two: confirm the existing account's password before the Join button is offered.
publicRouter.post(
  "/org/:slug/verify-account",
  publicRateLimiter,
  validate({ params: publicOrgSlugParamSchema, body: publicVerifyAccountSchema }),
  publicController.verifyAccount,
);
