import { Router, Request, Response, NextFunction } from 'express';
import { quizAdminService } from '../services/quiz-admin.service.js';
import { createQuizSchema } from '../schemas/quiz.schemas.js';
import { sendSuccess } from '../utils/response.js';

/**
 * Admin Quiz Router — handles CRUD for per-segment quizzes.
 * All routes are mounted under `/api/admin/segments/:segmentId/quiz`
 * and are already protected by admin auth middleware (via the parent adminRouter).
 */
const quizAdminRouter = Router({ mergeParams: true });

/**
 * POST /api/admin/segments/:segmentId/quiz
 * Create or update the quiz for a segment.
 * If a quiz already exists, replaces it entirely.
 */
quizAdminRouter.post(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const segmentId = req.params.segmentId as string;
      const data = createQuizSchema.parse(req.body);
      const quiz = await quizAdminService.createOrUpdateQuiz(segmentId, data);
      sendSuccess(res, quiz, 201);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/admin/segments/:segmentId/quiz
 * Get the quiz with all questions and options for a segment.
 * Returns 200 with null data if no quiz exists.
 */
quizAdminRouter.get(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const segmentId = req.params.segmentId as string;
      const quiz = await quizAdminService.getQuizForSegment(segmentId);
      sendSuccess(res, quiz);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/admin/segments/:segmentId/quiz
 * Delete the quiz for a segment (cascades to questions, options, and attempts).
 */
quizAdminRouter.delete(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const segmentId = req.params.segmentId as string;
      await quizAdminService.deleteQuiz(segmentId);
      sendSuccess(res, { message: 'Quiz deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

export default quizAdminRouter;
