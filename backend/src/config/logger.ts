import pino from "pino";

import { env } from "./env.js";

const isProductionOrCloud = env.NODE_ENV === "production" || Boolean(process.env.RENDER);

export const logger = pino({
  level: isProductionOrCloud ? "info" : "debug",
  transport: isProductionOrCloud
    ? undefined
    : {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
      },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.passwordHash",
      "*.refreshToken",
      // Member KYC — the raw Aadhaar number must never reach a log sink. Only aadhaarLast4 and a
      // one-way hash are ever persisted (see member.model.ts); this redacts the transient raw value.
      "*.aadhaarNumber",
      "*.aadhaarHash",
    ],
    censor: "[REDACTED]",
  },
});
