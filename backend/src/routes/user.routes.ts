import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema/users.js';
import { userCreationSchema } from '../schemas/user.schemas.js';
import { hashPassword } from '../utils/password.js';
import { sendSuccess } from '../utils/response.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { AppError } from '../utils/AppError.js';

const router = Router();

/**
 * POST /api/users
 * Admin-only endpoint to create a new user account.
 * Generates a temporary password, hashes it, and stores the user with status "active".
 * Returns the created user profile (including temporary password) but NEVER the hash.
 */
router.post(
  '/',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. Validate request body (throws ZodError on failure → caught by error handler)
      const { name, email, role } = userCreationSchema.parse(req.body);

      // 2. Check for duplicate email
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existing) {
        throw AppError.conflict('Email already in use');
      }

      // 3. Generate a temporary password
      const temporaryPassword = crypto.randomBytes(8).toString('hex');

      // 4. Hash the temporary password with bcrypt
      const passwordHash = await hashPassword(temporaryPassword);

      // 5. Insert user with status 'active' and specified role
      const [createdUser] = await db
        .insert(users)
        .values({
          name,
          email,
          passwordHash,
          role,
          status: 'active',
        })
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          status: users.status,
        });

      // 6. Return created user data with temporary password (never the hash)
      sendSuccess(res, {
        id: createdUser.id,
        email: createdUser.email,
        name: createdUser.name,
        role: createdUser.role,
        status: createdUser.status,
        temporaryPassword,
      }, 201);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
