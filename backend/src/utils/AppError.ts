/**
 * Custom application error class with HTTP status code and machine-readable error code.
 * Use this to throw domain-specific errors that the global error handler can format consistently.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /** 400 — Validation error */
  static badRequest(message: string, details?: Record<string, unknown>): AppError {
    return new AppError(400, 'VALIDATION_ERROR', message, details);
  }

  /** 401 — Unauthorized */
  static unauthorized(message = 'Unauthorized'): AppError {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  /** 403 — Forbidden */
  static forbidden(message = 'Forbidden'): AppError {
    return new AppError(403, 'FORBIDDEN', message);
  }

  /** 404 — Not found */
  static notFound(message = 'Resource not found'): AppError {
    return new AppError(404, 'NOT_FOUND', message);
  }

  /** 409 — Conflict */
  static conflict(message: string): AppError {
    return new AppError(409, 'CONFLICT', message);
  }
}
