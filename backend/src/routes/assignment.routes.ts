import { Router, Request, Response, NextFunction } from 'express';
import { assignmentService } from '../services/assignment.service.js';
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
 * List users assigned to a segment.
 */
segmentAssignmentRouter.get(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const segmentId = req.params.segmentId as string;
      const assignments = await assignmentService.listBySegment(segmentId);
      sendSuccess(res, assignments);
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
 * List segments assigned to a user.
 */
userAssignmentRouter.get(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.params.userId as string;
      const assignments = await assignmentService.listByUser(userId);
      sendSuccess(res, assignments);
    } catch (error) {
      next(error);
    }
  }
);
