import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema/users.js';
import { passwordResetTokens } from '../db/schema/password-reset-tokens.js';
import { loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../schemas/auth.schemas.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { sendPasswordResetEmail } from '../services/email.service.js';
import { generateToken } from '../middleware/auth.js';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';

const router = Router();

/**
 * POST /api/auth/login
 * Authenticate user with email and password, return signed JWT.
 * Returns generic 401 for non-existent email or wrong password (no email enumeration).
 */
router.post(
  '/login',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. Validate request body with loginSchema (throws ZodError on failure → caught by error handler)
      const { email, password } = loginSchema.parse(req.body);

      // 2. Look up user by email in the database
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      // 3. If user not found → return 401 with generic message (no email enumeration)
      if (!user) {
        throw AppError.unauthorized('Invalid email or password');
      }

      // Verify password
      const passwordValid = await verifyPassword(password, user.passwordHash);
      if (!passwordValid) {
        throw AppError.unauthorized('Invalid email or password');
      }

      // 4. If user status is not 'active' → return 401
      if (user.status !== 'active') {
        throw AppError.unauthorized('Account is not active');
      }

      // 5. On success → generate JWT and return user data
      const token = generateToken({ userId: user.id, role: user.role });

      sendSuccess(res, {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          slug: user.slug,
          role: user.role,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/forgot-password
 *
 * Generates a secure reset token, stores its hash with 60-min expiry,
 * and sends a reset email via Nodemailer.
 * Always returns 200 regardless of whether the email exists (no enumeration).
 */
router.post(
  '/forgot-password',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body
      const parseResult = forgotPasswordSchema.safeParse(req.body);
      if (!parseResult.success) {
        sendError(res, 400, 'VALIDATION_ERROR', 'Invalid request body', {
          fields: parseResult.error.flatten().fieldErrors,
        });
        return;
      }

      const { email } = parseResult.data;

      // Look up user by email
      const [user] = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (user) {
        // Generate 32-byte cryptographically secure random token
        const tokenBytes = crypto.randomBytes(32);
        const tokenHex = tokenBytes.toString('hex');

        // Hash the token with SHA-256 for storage
        const tokenHash = crypto.createHash('sha256').update(tokenHex).digest('hex');

        // Store token hash with 60-minute expiry
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        await db.insert(passwordResetTokens).values({
          userId: user.id,
          tokenHash,
          expiresAt,
        });

        // Send reset email with the raw token in the URL
        const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${tokenHex}`;
        await sendPasswordResetEmail(user.email, resetUrl);
      }

      // Always return success (no email enumeration)
      sendSuccess(res, {
        message: 'If an account exists, a reset email has been sent',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/reset-password
 *
 * Validates the reset token, hashes the new password, updates the user,
 * and invalidates the token. Rejects expired or already-used tokens with 400.
 */
router.post(
  '/reset-password',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body
      const parseResult = resetPasswordSchema.safeParse(req.body);
      if (!parseResult.success) {
        sendError(res, 400, 'VALIDATION_ERROR', 'Invalid request body', {
          fields: parseResult.error.flatten().fieldErrors,
        });
        return;
      }

      const { token, newPassword } = parseResult.data;

      // Hash the provided token with SHA-256
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Look up token in password_reset_tokens by token_hash
      const [resetToken] = await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.tokenHash, tokenHash))
        .limit(1);

      // Reject if not found, expired, or already used
      if (!resetToken) {
        sendError(res, 400, 'VALIDATION_ERROR', 'Invalid or expired reset token');
        return;
      }

      if (resetToken.usedAt !== null) {
        sendError(res, 400, 'VALIDATION_ERROR', 'Invalid or expired reset token');
        return;
      }

      if (new Date(resetToken.expiresAt) < new Date()) {
        sendError(res, 400, 'VALIDATION_ERROR', 'Invalid or expired reset token');
        return;
      }

      // Hash new password with bcrypt
      const newPasswordHash = await hashPassword(newPassword);

      // Update user's password_hash
      await db
        .update(users)
        .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
        .where(eq(users.id, resetToken.userId));

      // Mark token as used
      await db
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokens.id, resetToken.id));

      sendSuccess(res, {
        message: 'Password has been reset successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
