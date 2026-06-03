import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, requireAdmin, generateToken, verifyToken } from '../auth.js';

// Mock the env module
vi.mock('../../config/env.js', () => ({
  env: {
    JWT_SECRET: 'test-secret-key-for-testing',
    JWT_EXPIRES_IN: '7d',
  },
}));

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

describe('auth middleware', () => {
  const mockNext = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateToken', () => {
    it('generates a valid JWT token with userId and role', () => {
      const payload = { userId: 'user-123', role: 'admin' };
      const token = generateToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      // Verify the token contains the correct payload
      const decoded = jwt.verify(token, 'test-secret-key-for-testing') as { userId: string; role: string };
      expect(decoded.userId).toBe('user-123');
      expect(decoded.role).toBe('admin');
    });

    it('generates a token for learner role', () => {
      const payload = { userId: 'user-456', role: 'learner' };
      const token = generateToken(payload);

      const decoded = jwt.verify(token, 'test-secret-key-for-testing') as { userId: string; role: string };
      expect(decoded.userId).toBe('user-456');
      expect(decoded.role).toBe('learner');
    });

    it('includes expiration in the token', () => {
      const payload = { userId: 'user-123', role: 'admin' };
      const token = generateToken(payload);

      const decoded = jwt.verify(token, 'test-secret-key-for-testing') as { exp: number; iat: number };
      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });
  });

  describe('verifyToken', () => {
    it('returns decoded payload for a valid token', () => {
      const token = jwt.sign({ userId: 'user-123', role: 'admin' }, 'test-secret-key-for-testing');
      const result = verifyToken(token);

      expect(result).not.toBeNull();
      expect(result!.userId).toBe('user-123');
      expect(result!.role).toBe('admin');
    });

    it('returns null for an invalid token', () => {
      const result = verifyToken('invalid-token-string');
      expect(result).toBeNull();
    });

    it('returns null for an expired token', () => {
      const token = jwt.sign(
        { userId: 'user-123', role: 'admin' },
        'test-secret-key-for-testing',
        { expiresIn: '-1s' }
      );
      const result = verifyToken(token);
      expect(result).toBeNull();
    });

    it('returns null for a token signed with a different secret', () => {
      const token = jwt.sign({ userId: 'user-123', role: 'admin' }, 'different-secret');
      const result = verifyToken(token);
      expect(result).toBeNull();
    });
  });

  describe('authenticate', () => {
    it('attaches user to request for a valid token', () => {
      const token = jwt.sign({ userId: 'user-123', role: 'admin' }, 'test-secret-key-for-testing');
      const req = createMockReq({ authorization: `Bearer ${token}` });
      const res = createMockRes();

      authenticate(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(req.user).toEqual({ userId: 'user-123', role: 'admin' });
    });

    it('returns 401 when Authorization header is missing', () => {
      const req = createMockReq({});
      const res = createMockRes();

      authenticate(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization token',
        },
      });
    });

    it('returns 401 when Authorization header does not start with Bearer', () => {
      const req = createMockReq({ authorization: 'Basic some-token' });
      const res = createMockRes();

      authenticate(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization token',
        },
      });
    });

    it('returns 401 with expired message for an expired token', () => {
      const token = jwt.sign(
        { userId: 'user-123', role: 'admin' },
        'test-secret-key-for-testing',
        { expiresIn: '-1s' }
      );
      const req = createMockReq({ authorization: `Bearer ${token}` });
      const res = createMockRes();

      authenticate(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token has expired',
        },
      });
    });

    it('returns 401 for a malformed token', () => {
      const req = createMockReq({ authorization: 'Bearer not-a-valid-jwt' });
      const res = createMockRes();

      authenticate(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid authorization token',
        },
      });
    });

    it('returns 401 for a token signed with wrong secret', () => {
      const token = jwt.sign({ userId: 'user-123', role: 'admin' }, 'wrong-secret');
      const req = createMockReq({ authorization: `Bearer ${token}` });
      const res = createMockRes();

      authenticate(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
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

  describe('requireAdmin', () => {
    it('calls next for admin users', () => {
      const req = createMockReq({});
      req.user = { userId: 'user-123', role: 'admin' };
      const res = createMockRes();

      requireAdmin(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('returns 403 for learner users', () => {
      const req = createMockReq({});
      req.user = { userId: 'user-456', role: 'learner' };
      const res = createMockRes();

      requireAdmin(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access required',
        },
      });
    });

    it('returns 403 when req.user is undefined', () => {
      const req = createMockReq({});
      const res = createMockRes();

      requireAdmin(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access required',
        },
      });
    });
  });
});
