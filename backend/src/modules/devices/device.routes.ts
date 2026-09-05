import { Router } from "express";

import { requireAuth } from "../../middleware/jwt-auth.js";
import { validate } from "../../middleware/validate.js";
import * as deviceController from "./device.controller.js";
import { registerPushTokenSchema, unregisterPushTokenSchema } from "./device.validators.js";

export const deviceRouter: Router = Router();

// Public: any client can retrieve the VAPID public key needed to subscribe to Web Push
deviceRouter.get("/vapid-public-key", deviceController.getVapidPublicKey);

deviceRouter.use(requireAuth);

// Any authenticated user can register their own device for push — it's a personal capability, not a
// permissioned action. Delivery still respects each recipient's channel availability.
deviceRouter.post(
  "/push-tokens",
  validate({ body: registerPushTokenSchema }),
  deviceController.registerPushToken,
);

deviceRouter.delete(
  "/push-tokens",
  validate({ body: unregisterPushTokenSchema }),
  deviceController.unregisterPushToken,
);

deviceRouter.post(
  "/test-push",
  deviceController.sendTestPush,
);
