import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireLearner, requireSegmentAccess } from '../middleware/segment-access.js';
import { progressService } from '../services/progress.service.js';
import { sendSuccess } from '../utils/response.js';

// ─── Router ───────────────────────────────────────────────────────────────────

const progressRouter = Router();

// Apply auth middleware to all progress routes
progressRouter.use(authenticate, requireLearner);

/**
 * GET /api/progress/segments/:segmentId
 * Returns segment progress including quiz summary data.
 * Quiz data is informational only — module completion is based solely on lesson completions.
 *
 * Response includes:
 * - totalLessons, completedLessons, percentage (lesson-based progress)
 * - quizzesAttempted: 0 or 1 (one quiz per segment)
 * - quizBestScore: best score if attempted, null otherwise
 * - quizTotalQuestions: total questions in the segment's quiz, null if no quiz exists
 */
progressRouter.get(
  '/segments/:segmentId',
  requireSegmentAccess,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const segmentId = req.params.segmentId as string;
      const userId = req.user!.userId;

      const progress = await progressService.getSegmentProgress(segmentId, userId);

      sendSuccess(res, { progress });
    } catch (error) {
      next(error);
    }
  }
);

export default progressRouter;
