import { Router, Request, Response, NextFunction } from 'express';
import { activityService } from '../services/activity.service.js';
import { sendSuccess } from '../utils/response.js';

/**
 * Activity routes — mounted under `/api/admin/activity`.
 * Admin auth is already enforced by the parent adminRouter middleware.
 */
const activityRouter = Router();

/**
 * GET /api/admin/activity
 * Query params:
 *   - limit (number, default 10) — max items to return
 *   - filter (string, default "all") — action type filter
 *
 * Returns recent activity events for the admin dashboard.
 */
activityRouter.get(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 10));
      const filter = (req.query.filter as string) || 'all';

      const activity = await activityService.getRecentActivity({ limit, filter });

      sendSuccess(res, activity);
    } catch (error) {
      next(error);
    }
  }
);

export default activityRouter;
