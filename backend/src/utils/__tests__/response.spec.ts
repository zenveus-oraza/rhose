import { describe, it, expect, vi } from 'vitest';
import { Response } from 'express';
import { sendSuccess, sendError } from '../response.js';

function createMockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe('response utilities', () => {
  describe('sendSuccess', () => {
    it('sends { success: true, data } with default 200 status', () => {
      const res = createMockRes();
      sendSuccess(res, { id: '123', name: 'Test' });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { id: '123', name: 'Test' },
      });
    });

    it('allows custom status code', () => {
      const res = createMockRes();
      sendSuccess(res, { id: '456' }, 201);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { id: '456' },
      });
    });
  });

  describe('sendError', () => {
    it('sends { success: false, error: { code, message } }', () => {
      const res = createMockRes();
      sendError(res, 401, 'UNAUTHORIZED', 'Invalid credentials');

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
      const res = createMockRes();
      sendError(res, 400, 'VALIDATION_ERROR', 'Validation failed', {
        email: 'Invalid email format',
      });

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: { email: 'Invalid email format' },
        },
      });
    });

    it('omits details field when not provided', () => {
      const res = createMockRes();
      sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');

      const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(jsonCall.error).not.toHaveProperty('details');
    });
  });
});
