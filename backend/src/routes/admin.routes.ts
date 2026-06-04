import { Router, Request, Response, NextFunction } from 'express';
import { count, ne } from 'drizzle-orm';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { segments } from '../db/schema/segments.js';
import { modules } from '../db/schema/modules.js';
import { lessons } from '../db/schema/lessons.js';
import { users } from '../db/schema/users.js';
import { sendSuccess } from '../utils/response.js';

/**
 * Admin router — all routes registered on this router are protected by:
 * 1. authenticate — verifies JWT token, attaches user context (401 if missing/invalid)
 * 2. requireAdmin — verifies role === "admin" (403 if non-admin)
 *
 * Mount this router at `/api/admin` in the main app.
 */
const adminRouter = Router();

// Apply auth + admin guard to ALL admin routes
adminRouter.use(authenticate);
adminRouter.use(requireAdmin);

/**
 * GET /api/admin/dashboard/stats
 * Returns total counts for segments, modules, lessons, and users.
 */
adminRouter.get(
  '/dashboard/stats',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const [segmentCount] = await db.select({ count: count() }).from(segments).where(ne(segments.status, 'archived'));
      const [moduleCount] = await db.select({ count: count() }).from(modules);
      const [lessonCount] = await db.select({ count: count() }).from(lessons);
      const [userCount] = await db.select({ count: count() }).from(users);

      sendSuccess(res, {
        totalSegments: segmentCount.count,
        totalModules: moduleCount.count,
        totalLessons: lessonCount.count,
        totalUsers: userCount.count,
      });
    } catch (error) {
      next(error);
    }
  }
);

// --- Admin sub-routes ---
import segmentRoutes from './segment.routes.js';
import { segmentModuleRouter, moduleRouter } from './module.routes.js';
import { moduleLessonRouter, lessonRouter } from './lesson.routes.js';
import userManagementRoutes from './user-management.routes.js';
import { assignmentRouter, segmentAssignmentRouter, userAssignmentRouter } from './assignment.routes.js';

// Register more specific nested routes before generic ones
adminRouter.use('/modules/:moduleId/lessons', moduleLessonRouter);
adminRouter.use('/segments/:segmentId/modules', segmentModuleRouter);
adminRouter.use('/segments/:segmentId/assignments', segmentAssignmentRouter);
adminRouter.use('/users/:userId/assignments', userAssignmentRouter);
adminRouter.use('/segments', segmentRoutes);
adminRouter.use('/modules', moduleRouter);
adminRouter.use('/lessons', lessonRouter);
adminRouter.use('/users', userManagementRoutes);
adminRouter.use('/assignments', assignmentRouter);

export default adminRouter;
