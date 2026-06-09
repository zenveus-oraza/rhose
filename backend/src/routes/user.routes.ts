import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema/users.js';
import { userCreationSchema, profileUpdateSchema } from '../schemas/user.schemas.js';
import { hashPassword } from '../utils/password.js';
import { sendSuccess } from '../utils/response.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { AppError } from '../utils/AppError.js';
import { generateUniqueUserSlug } from '../services/user-management.service.js';

const router = Router();

/**
 * GET /api/users/profile
 * Returns the authenticated user's profile (never the password hash).
 */
router.get(
  '/profile',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.userId;

      const [profile] = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          slug: users.slug,
          role: users.role,
          status: users.status,
          jobTitle: users.jobTitle,
          phone: users.phone,
          profileImage: users.profileImage,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!profile) {
        throw AppError.notFound('User not found');
      }

      sendSuccess(res, profile);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/users/profile
 * Updates the authenticated user's profile fields (name, email, profileImage).
 */
router.patch(
  '/profile',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.userId;
      const { name, email, profileImage, jobTitle, phone } = profileUpdateSchema.parse(req.body);

      // Check email uniqueness if email is being changed
      if (email) {
        const [existing] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (existing && existing.id !== userId) {
          throw AppError.conflict('Email already in use');
        }
      }

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (profileImage !== undefined) updateData.profileImage = profileImage;
      if (jobTitle !== undefined) updateData.jobTitle = jobTitle;
      if (phone !== undefined) updateData.phone = phone;

      const [updated] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          slug: users.slug,
          role: users.role,
          status: users.status,
          jobTitle: users.jobTitle,
          phone: users.phone,
          profileImage: users.profileImage,
          createdAt: users.createdAt,
        });

      sendSuccess(res, updated);
    } catch (error) {
      next(error);
    }
  }
);

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
      const slug = await generateUniqueUserSlug(name);

      // 4. Hash the temporary password with bcrypt
      const passwordHash = await hashPassword(temporaryPassword);

      // 5. Insert user with status 'active' and specified role
      const [createdUser] = await db
        .insert(users)
        .values({
          name,
          slug,
          email,
          passwordHash,
          role,
          status: 'active',
        })
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          slug: users.slug,
          role: users.role,
          status: users.status,
        });

      // 6. Return created user data with temporary password (never the hash)
      sendSuccess(res, {
        id: createdUser.id,
        email: createdUser.email,
        name: createdUser.name,
        slug: createdUser.slug,
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
