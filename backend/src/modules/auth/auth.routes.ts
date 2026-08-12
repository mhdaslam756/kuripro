import { Router } from "express";
import rateLimit from "express-rate-limit";

import { env } from "../../config/env.js";
import { requireAuth } from "../../middleware/jwt-auth.js";
import { validate } from "../../middleware/validate.js";
import { mongoIdParamSchema } from "../../utils/common-validators.js";
import * as authController from "./auth.controller.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerMemberSchema,
  registerOrganizerSchema,
  requestOtpSchema,
  resetPasswordSchema,
  verifyOtpSchema,
} from "./auth.validators.js";

export const authRouter: Router = Router();

// Tighter limit on credential-guessing-prone endpoints than the global API limiter.
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});

// OTP requests are cheaper to abuse (no password to guess) and cost real money once a real
// SMS/email provider is wired in — a stricter limit than plain login/password attempts.
const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.OTP_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});

authRouter.post(
  "/register-organizer",
  authRateLimiter,
  validate({ body: registerOrganizerSchema }),
  authController.registerOrganizer,
);

authRouter.post(
  "/register-member",
  authRateLimiter,
  validate({ body: registerMemberSchema }),
  authController.registerMemberSelf,
);

authRouter.post("/login", authRateLimiter, validate({ body: loginSchema }), authController.login);

authRouter.post(
  "/otp/request",
  otpRateLimiter,
  validate({ body: requestOtpSchema }),
  authController.requestOtp,
);

authRouter.post(
  "/otp/verify",
  authRateLimiter,
  validate({ body: verifyOtpSchema }),
  authController.verifyOtp,
);

authRouter.post(
  "/forgot-password",
  otpRateLimiter,
  validate({ body: forgotPasswordSchema }),
  authController.forgotPassword,
);

authRouter.post(
  "/reset-password",
  authRateLimiter,
  validate({ body: resetPasswordSchema }),
  authController.resetPassword,
);

authRouter.post("/refresh", authController.refresh);

authRouter.post(
  "/change-password",
  requireAuth,
  validate({ body: changePasswordSchema }),
  authController.changePassword,
);

authRouter.post("/logout", authController.logout);



authRouter.get("/sessions", requireAuth, authController.listSessions);

authRouter.delete(
  "/sessions/:id",
  requireAuth,
  validate({ params: mongoIdParamSchema }),
  authController.revokeSession,
);

authRouter.delete("/sessions", requireAuth, authController.revokeOtherSessions);
