import { Router, Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { segments } from '../db/schema/segments.js';
import { assignmentService } from '../services/assignment.service.js';
import { activityService } from '../services/activity.service.js';
import { createAssignmentSchema } from '../schemas/assignment.schemas.js';
import { sendSuccess } from '../utils/response.js';

/**
 * Assignment routes — handles user-to-segment assignment operations.
 *
 * Direct assignment routes (create, delete by id):
 * Mounted at: /api/admin/assignments
 */
export const assignmentRouter = Router();

/**
 * POST /api/admin/assignments
 * Assign a user to a segment with assigned_at timestamp.
 */
assignmentRouter.post(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = createAssignmentSchema.parse(req.body);
      const assignment = await assignmentService.assign({
        userId: data.user_id,
        segmentId: data.segment_id,
        accessDurationDays: data.access_duration_days,
      });

      // Fire-and-forget: track segment_assigned activity event
      (async () => {
        try {
          const [segmentRecord] = await db
            .select({ title: segments.title })
            .from(segments)
            .where(eq(segments.id, data.segment_id))
            .limit(1);

          const segmentTitle = segmentRecord?.title ?? 'a segment';
          // Track from admin perspective (req.user is the admin performing the action)
          const adminUserId = req.user!.userId;
          await activityService.trackEvent({
            userId: adminUserId,
            action: 'segment_assigned',
            description: `Assigned ${segmentTitle}`,
            detail: segmentTitle,
          });
        } catch {
          // Activity tracking failures must not affect the main flow
        }
      })();

      sendSuccess(res, assignment, 201);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/admin/assignments/:id
 * Remove an assignment.
 */
assignmentRouter.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      await assignmentService.remove(id);
      sendSuccess(res, { message: 'Assignment removed successfully' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Segment-scoped assignment routes.
 * Mounted at: /api/admin/segments/:segmentId/assignments
 */
export const segmentAssignmentRouter = Router({ mergeParams: true });

/**
 * GET /api/admin/segments/:segmentId/assignments
 * List users assigned to a segment with pagination.
 * Query params: page, limit
 */
segmentAssignmentRouter.get(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const segmentId = req.params.segmentId as string;
      const { page, limit } = req.query;
      const result = await assignmentService.listBySegment(segmentId, {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * User-scoped assignment routes.
 * Mounted at: /api/admin/users/:userId/assignments
 */
export const userAssignmentRouter = Router({ mergeParams: true });

/**
 * GET /api/admin/users/:userId/assignments
 * List segments assigned to a user with pagination.
 * Query params: page, limit
 */
userAssignmentRouter.get(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.params.userId as string;
      const { page, limit } = req.query;
      const result = await assignmentService.listByUser(userId, {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
);
