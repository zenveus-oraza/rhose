import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { env } from '../config/env.js';

export interface JwtPayload {
  userId: string;
  role: 'admin' | 'learner';
}

/**
 * Generate a signed JWT token containing the user's id and role.
 * Uses JWT_SECRET and JWT_EXPIRES_IN from environment configuration.
 */
export function generateToken(payload: { userId: string; role: string }): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as StringValue,
  });
}

/**
 * Verify and decode a JWT token.
 * Returns the decoded payload or null if invalid/expired.
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Express middleware that validates the JWT from the Authorization header.
 * Extracts Bearer token, verifies with JWT_SECRET, and attaches { userId, role } to req.user.
 * Returns 401 with { success: false, error: { code: "UNAUTHORIZED", message } } for
 * missing, invalid, or expired tokens.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid authorization token',
      },
    });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    const message =
      error instanceof jwt.TokenExpiredError
        ? 'Token has expired'
        : 'Invalid authorization token';

    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message,
      },
    });
  }
}

/**
 * Express middleware that restricts access to admin users only.
 * Must be used after the `authenticate` middleware.
 * Returns 403 with { success: false, error: { code: "FORBIDDEN", message } } if not admin.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Admin access required',
      },
    });
    return;
  }

  next();
}
