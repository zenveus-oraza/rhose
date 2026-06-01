import { Router, Request, Response, NextFunction } from 'express';
import { userManagementService } from '../services/user-management.service.js';
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
