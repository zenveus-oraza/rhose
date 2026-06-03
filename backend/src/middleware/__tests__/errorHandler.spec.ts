import { describe, it, expect, vi } from 'vitest';
import { Request, Response } from 'express';
import { ZodError, ZodIssueCode } from 'zod';
import { errorHandler } from '../errorHandler.js';
import { AppError } from '../../utils/AppError.js';

function createMockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

const mockReq = {} as Request;
const mockNext = vi.fn();

describe('errorHandler middleware', () => {
  describe('ZodError handling', () => {
    it('returns 400 with VALIDATION_ERROR code and field-specific details', () => {
      const zodError = new ZodError([
        {
          code: ZodIssueCode.too_small,
          minimum: 1,
          type: 'string',
          inclusive: true,
          exact: false,
          message: 'Email is required',
          path: ['email'],
        },
        {
          code: ZodIssueCode.too_small,
          minimum: 8,
          type: 'string',
          inclusive: true,
          exact: false,
          message: 'Password must be at least 8 characters',
          path: ['password'],
        },
      ]);

      const res = createMockRes();
      errorHandler(zodError, mockReq, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: {
            email: 'Email is required',
            password: 'Password must be at least 8 characters',
          },
        },
      });
    });

    it('handles nested field paths with dot notation', () => {
      const zodError = new ZodError([
        {
          code: ZodIssueCode.invalid_type,
          expected: 'string',
          received: 'number',
          message: 'Expected string',
          path: ['address', 'street'],
        },
      ]);

      const res = createMockRes();
      errorHandler(zodError, mockReq, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: {
            'address.street': 'Expected string',
          },
        },
      });
    });
  });

  describe('AppError handling', () => {
    it('returns the correct status code and error code', () => {
      const appError = AppError.unauthorized('Invalid credentials');
      const res = createMockRes();

      errorHandler(appError, mockReq, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials',
        },
      });
    });

    it('includes details when provided', () => {
      const appError = AppError.badRequest('Validation failed', { field: 'email' });
      const res = createMockRes();

      errorHandler(appError, mockReq, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: { field: 'email' },
        },
      });
    });

    it('handles 404 not found errors', () => {
      const appError = AppError.notFound('User not found');
      const res = createMockRes();

      errorHandler(appError, mockReq, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
      });
    });

    it('handles 403 forbidden errors', () => {
      const appError = AppError.forbidden('Admin access required');
      const res = createMockRes();

      errorHandler(appError, mockReq, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access required',
        },
      });
    });

    it('handles 409 conflict errors', () => {
      const appError = AppError.conflict('Email already in use');
      const res = createMockRes();

      errorHandler(appError, mockReq, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'Email already in use',
        },
      });
    });
  });

  describe('Unknown error handling', () => {
    it('returns 500 with INTERNAL_ERROR and does not expose stack trace', () => {
      const unknownError = new Error('Something broke internally');
      const res = createMockRes();

      errorHandler(unknownError, mockReq, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      });
    });

    it('does not expose the original error message for unknown errors', () => {
      const unknownError = new Error('Database connection failed at /internal/path');
      const res = createMockRes();

      errorHandler(unknownError, mockReq, res, mockNext);

      const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(jsonCall.error.message).not.toContain('Database');
      expect(jsonCall.error.message).not.toContain('/internal/path');
    });
  });
});
