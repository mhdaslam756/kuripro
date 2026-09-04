import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendEnvPath = path.resolve(__dirname, "../../.env");

dotenv.config({ path: backendEnvPath });
dotenv.config(); // fallback to process.cwd() .env if present

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),

  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL_SECONDS: z.coerce.number().int().positive().default(2_592_000),

  CORS_ORIGIN: z.string().min(1).default("http://localhost:5173"),

  // Rate-limit ceilings per 15-minute window. Configurable so tests (and trusted internal callers)
  // can raise them without code changes; the production defaults are the security-relevant values.
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  OTP_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),

  // Web Push (VAPID) keys for standard browser push notifications
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default("mailto:admin@kuripro.com"),

  // Notification channel providers — all optional. When a channel's vars are unset it stays
  // dormant and the dev console channel logs the message instead (see modules/notifications/channels).
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_SMS_FROM: z.string().optional(),
  TWILIO_WHATSAPP_FROM: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  // WebAuthn (passkey / biometric login). RP_ID must be the site's registrable domain (no scheme/port);
  // ORIGIN is the full origin the browser sends. Dev defaults work for localhost out of the box.
  WEBAUTHN_RP_ID: z.string().default("localhost"),
  WEBAUTHN_RP_NAME: z.string().default("KuriPro"),
  WEBAUTHN_ORIGIN: z.string().default("http://localhost:5173"),

  // Super Admin bootstrap credentials from environment variables
  SUPER_ADMIN_EMAIL: z.string().optional(),
  SUPER_ADMIN_PASSWORD: z.string().optional(),
  SUPER_ADMIN_NAME: z.string().optional(),
  SUPER_ADMIN_PHONE: z.string().optional(),
  SUPER_ADMIN_SETUP_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  ❌ ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    console.error("\n============================================================");
    console.error("💥 RENDER / PRODUCTION STARTUP FAILURE: MISSING ENVIRONMENT VARIABLES");
    console.error("============================================================");
    console.error(issues);
    console.error("\n👉 FIX: Go to Render Dashboard -> Your Service -> Environment,");
    console.error("   and add the missing variables shown above.\n");
    console.error("============================================================\n");

    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  return parsed.data;
}

export const env = loadEnv();

// Parsed, trimmed array of allowed CORS origins derived from CORS_ORIGIN.
export const corsOrigins: string[] = env.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean);
