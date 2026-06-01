import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, requireAdmin } from '../auth.js';

// Mock the env module
vi.mock('../../config/env.js', () => ({
  env: {
    JWT_SECRET: 'test-secret-key-for-testing',
    JWT_EXPIRES_IN: '7d',
  },
}));

const TEST_SECRET = 'test-secret-key-for-testing';

function createMockReq(headers: Record<string, string> = {}): Request {
  return {
    headers,
    user: undefined,
  } as unknown as Request;
}

function createMockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

/**
 * Simulates the admin route guard chain: authenticate → requireAdmin.
 * This mirrors how admin routes are protected in admin.routes.ts.
 */
function runAdminGuard(req: Request, res: Response): Promise<boolean> {
  return new Promise((resolve) => {
    const next: NextFunction = () => {
      // authenticate passed, now run requireAdmin
      requireAdmin(req, res, () => {
        resolve(true); // Both middleware passed
      });
    };

    authenticate(req, res, next);

    // If res.status was called, the chain was interrupted
    if ((res.status as ReturnType<typeof vi.fn>).mock.calls.length > 0) {
      resolve(false);
    }
  });
}

describe('Admin Auth Guard (authenticate + requireAdmin combined)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('valid admin token passes through', () => {
    it('allows request with valid admin JWT to proceed', async () => {
      const token = jwt.sign({ userId: 'admin-001', role: 'admin' }, TEST_SECRET);
      const req = createMockReq({ authorization: `Bearer ${token}` });
      const res = createMockRes();

      const passed = await runAdminGuard(req, res);

      expect(passed).toBe(true);
      expect(req.user).toEqual({ userId: 'admin-001', role: 'admin' });
      expect(res.status).not.toHaveBeenCalled();
    });

    it('attaches correct user context from token payload', async () => {
      const token = jwt.sign({ userId: 'admin-xyz-123', role: 'admin' }, TEST_SECRET);
      const req = createMockReq({ authorization: `Bearer ${token}` });
      const res = createMockRes();

      await runAdminGuard(req, res);

      expect(req.user).toBeDefined();
      expect(req.user!.userId).toBe('admin-xyz-123');
      expect(req.user!.role).toBe('admin');
    });
  });

  describe('non-admin role returns 403', () => {
    it('returns 403 Forbidden for learner role', async () => {
      const token = jwt.sign({ userId: 'learner-001', role: 'learner' }, TEST_SECRET);
      const req = createMockReq({ authorization: `Bearer ${token}` });
      const res = createMockRes();

      const passed = await runAdminGuard(req, res);

      expect(passed).toBe(false);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access required',
        },
      });
    });

    it('does not call next for non-admin authenticated users', async () => {
      const token = jwt.sign({ userId: 'user-999', role: 'learner' }, TEST_SECRET);
      const req = createMockReq({ authorization: `Bearer ${token}` });
      const res = createMockRes();

      const passed = await runAdminGuard(req, res);

      expect(passed).toBe(false);
    });
  });

  describe('missing/invalid token returns 401', () => {
    it('returns 401 when no Authorization header is present', async () => {
      const req = createMockReq({});
      const res = createMockRes();

      const passed = await runAdminGuard(req, res);

      expect(passed).toBe(false);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization token',
        },
      });
    });

    it('returns 401 when Authorization header is not Bearer format', async () => {
      const req = createMockReq({ authorization: 'Basic abc123' });
      const res = createMockRes();

      const passed = await runAdminGuard(req, res);

      expect(passed).toBe(false);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization token',
        },
      });
    });

    it('returns 401 for an invalid/malformed JWT token', async () => {
      const req = createMockReq({ authorization: 'Bearer not-a-real-jwt-token' });
      const res = createMockRes();

      const passed = await runAdminGuard(req, res);

      expect(passed).toBe(false);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid authorization token',
        },
      });
    });

    it('returns 401 for an expired JWT token', async () => {
      const token = jwt.sign(
        { userId: 'admin-001', role: 'admin' },
        TEST_SECRET,
        { expiresIn: '-1s' }
      );
      const req = createMockReq({ authorization: `Bearer ${token}` });
      const res = createMockRes();

      const passed = await runAdminGuard(req, res);

      expect(passed).toBe(false);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token has expired',
        },
      });
    });

    it('returns 401 for a token signed with wrong secret', async () => {
      const token = jwt.sign({ userId: 'admin-001', role: 'admin' }, 'wrong-secret');
      const req = createMockReq({ authorization: `Bearer ${token}` });
      const res = createMockRes();

      const passed = await runAdminGuard(req, res);

      expect(passed).toBe(false);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid authorization token',
        },
      });
    });
  });
});
