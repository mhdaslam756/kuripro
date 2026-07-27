import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodType } from "zod";

interface ValidationSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

/**
 * Parses and replaces req.body/query/params with the schema's output, so downstream handlers
 * receive typed, coerced, defaulted data. Throws ZodError on failure, caught by errorHandler.
 */
export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (schemas.body) {
      req.body = schemas.body.parse(req.body);
    }
    if (schemas.query) {
      Object.assign(req.query, schemas.query.parse(req.query));
    }
    if (schemas.params) {
      Object.assign(req.params, schemas.params.parse(req.params));
    }
    next();
  };
}
