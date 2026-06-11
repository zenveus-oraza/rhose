import { Router, Request, Response, NextFunction } from 'express';
import { userManagementService } from '../services/user-management.service.js';
import { activityService } from '../services/activity.service.js';
import {
  adminCreateUserSchema,
  adminUpdateUserSchema,
  userListQuerySchema,
} from '../schemas/user-management.schemas.js';
import { sendSuccess } from '../utils/response.js';

const router = Router();

/**
 * POST /api/admin/users
 * Create a new user with name, email, role.
 * Generates temporary password, hashes and stores it.
 * Returns profile without password hash; includes temporary password shown once.
 */
router.post(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = adminCreateUserSchema.parse(req.body);
      const { user, temporaryPassword } = await userManagementService.create(data);

      // Fire-and-forget: track user_created activity event
      activityService.trackEvent({
        userId: user.id,
        action: 'user_created',
        description: `New user "${user.name}" created`,
        detail: user.role,
      }).catch(() => {
        // Activity tracking failures must not affect the main flow
      });

      sendSuccess(res, { ...user, temporaryPassword }, 201);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/admin/users
 * List users paginated, searchable by name/email (case-insensitive),
 * ordered by created_at descending.
 */
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = userListQuerySchema.parse(req.query);
      const result = await userManagementService.list(query);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/admin/users/slug/:slug
 * Get a single user profile by unique slug.
 */
router.get(
  '/slug/:slug',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const slug = req.params.slug as string;
      const user = await userManagementService.getBySlug(slug);
      sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/admin/users/:id
 * Update user name or role.
 */
router.put(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const data = adminUpdateUserSchema.parse(req.body);
      const user = await userManagementService.update(id, data);
      sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/admin/users/:id/deactivate
 * Set user status to "deactivated".
 */
router.put(
  '/:id/deactivate',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const user = await userManagementService.deactivate(id);
      sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/admin/users/:id/reset-password
 * Generate new temporary password, hash and store.
 * Returns confirmation with temp password shown once.
 */
router.post(
  '/:id/reset-password',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const result = await userManagementService.resetPassword(id);
      sendSuccess(res, {
        message: 'Password reset successfully',
        temporaryPassword: result.temporaryPassword,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
