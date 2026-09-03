import type { ErrorRequestHandler, RequestHandler } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";

import { logger } from "../config/logger.js";
import { AppError } from "../utils/app-error.js";

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: `Route ${req.method} ${req.path} not found` },
  });
};

/**
 * Duck-typed rather than `instanceof MongoServerError` — the mongodb driver is a transitive
 * dependency (bundled inside mongoose's own node_modules), not one we depend on directly,
 * so importing its class here would be fragile across mongoose version bumps.
 */
function isMongoDuplicateKeyError(
  err: unknown,
): err is { code: number; keyPattern?: Record<string, unknown> } {
  return (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    err.name === "MongoServerError" &&
    "code" in err &&
    err.code === 11000
  );
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...((err as any).details ? { details: (err as any).details } : {}),
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: err.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      },
    });
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: Object.values(err.errors).map((fieldError) => ({
          path: fieldError.path,
          message: fieldError.message,
        })),
      },
    });
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ error: { code: "INVALID_ID", message: `Invalid value for ${err.path}` } });
    return;
  }

  if (err && typeof err === "object" && "name" in err && (err.name === "BSONError" || err.name === "BSONTypeError")) {
    res.status(400).json({ error: { code: "INVALID_ID", message: "Invalid ID format" } });
    return;
  }

  if (isMongoDuplicateKeyError(err)) {
    const field = Object.keys(err.keyPattern ?? {}).join(", ") || "field";
    res.status(409).json({ error: { code: "DUPLICATE", message: `${field} already exists` } });
    return;
  }

  logger.error({ err, path: req.path, method: req.method }, "Unhandled error");
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } });
};
