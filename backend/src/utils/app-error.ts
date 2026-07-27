export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  /** Operational errors are expected (bad input, not found, etc.) and safe to expose to the client. */
  readonly isOperational = true;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, code = "BAD_REQUEST"): AppError {
    return new AppError(400, code, message);
  }

  static unauthorized(message = "Authentication required", code = "UNAUTHORIZED"): AppError {
    return new AppError(401, code, message);
  }

  static forbidden(message = "You do not have permission to perform this action", code = "FORBIDDEN"): AppError {
    return new AppError(403, code, message);
  }

  static notFound(message = "Resource not found", code = "NOT_FOUND"): AppError {
    return new AppError(404, code, message);
  }

  static conflict(message: string, code = "CONFLICT"): AppError {
    return new AppError(409, code, message);
  }

  static unprocessable(message: string, code = "UNPROCESSABLE"): AppError {
    return new AppError(422, code, message);
  }

  static internal(message = "Something went wrong", code = "INTERNAL_ERROR"): AppError {
    return new AppError(500, code, message);
  }
}
