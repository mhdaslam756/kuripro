import { cert, initializeApp, type App } from "firebase-admin/app";

import { env } from "./env.js";
import { logger } from "./logger.js";

export const isFirebaseConfigured = Boolean(
  env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY,
);

let firebaseApp: App | undefined;

if (isFirebaseConfigured) {
  firebaseApp = initializeApp({
    credential: cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
} else {
  logger.warn("Firebase credentials not set — push notification sending will fail until configured");
}

export { firebaseApp };
