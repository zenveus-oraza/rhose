import { Response } from 'express';

/**
 * Standard success response shape: { success: true, data }
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
}

/**
 * Standard error response shape: { success: false, error: { code, message, details? } }
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Send a consistent success response.
 * @param res Express response object
 * @param data Response payload
 * @param statusCode HTTP status code (defaults to 200)
 */
export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json({
    success: true,
    data,
  } satisfies SuccessResponse<T>);
}

/**
 * Send a consistent error response.
 * @param res Express response object
 * @param statusCode HTTP status code
 * @param code Machine-readable error code
 * @param message Human-readable error message
 * @param details Optional field-specific details
 */
export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, unknown>
): void {
  const body: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
  res.status(statusCode).json(body);
}
