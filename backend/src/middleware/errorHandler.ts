import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';

/**
 * Formats a ZodError into a field-specific details object.
 * Each key is the field path (dot-separated for nested fields) and the value is the error message.
 */
function formatZodError(error: ZodError): Record<string, string> {
  const details: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    // Use the field name or 'root' for top-level errors
    const key = path || '_root';
    details[key] = issue.message;
  }
  return details;
}

/**
 * Global error handling middleware.
 * Must be registered AFTER all routes in the Express app.
 *
 * Handles:
 * - ZodError → 400 VALIDATION_ERROR with field-specific details
 * - AppError → custom status code and error code
 * - Unknown errors → 500 INTERNAL_ERROR (no stack trace exposed)
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: formatZodError(err),
      },
    });
    return;
  }

  // Custom application errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
    });
    return;
  }

  // Unknown / unhandled errors — never expose internals
  console.error('Unhandled error:', err);

  // Postgres-specific errors with user-friendly messages
  if (err && typeof err === 'object' && 'code' in err) {
    const pgCode = (err as any).code;
    if (pgCode === '22001') {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'The uploaded data is too large. Please try a smaller file.',
        },
      });
      return;
    }
    if (pgCode === '23505') {
      res.status(409).json({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'A record with that value already exists.',
        },
      });
      return;
    }
  }

  // PayloadTooLargeError
  if (err && (err as any).type === 'entity.too.large') {
    res.status(413).json({
      success: false,
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'The request is too large. Please reduce the file size.',
      },
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred. Please try again.',
    },
  });
};
