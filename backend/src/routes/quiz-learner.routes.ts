import { Router, Request, Response, NextFunction } from 'express';
import { quizService } from '../services/quiz.service.js';
import { submitQuizAttemptSchema } from '../schemas/quiz.schemas.js';
import { sendSuccess } from '../utils/response.js';

/**
 * Learner Quiz Router — handles quiz-taking operations for learners.
 * All routes are mounted under `/api/learner/segments/:segmentId/quiz`
 * and are already protected by authenticate + requireLearner + requireSegmentAccess
 * middleware (applied by the parent learner router).
 */
const quizLearnerRouter = Router({ mergeParams: true });

/**
 * GET /api/learner/segments/:segmentId/quiz
 * Get quiz for taking — excludes is_correct flag from options.
 * Returns null data if no quiz exists for the segment.
 */
quizLearnerRouter.get(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const segmentId = req.params.segmentId as string;
      const userId = req.user!.userId;
      const quiz = await quizService.getQuizForLearner(segmentId, userId);
      sendSuccess(res, quiz);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/learner/segments/:segmentId/quiz/attempts
 * Submit a quiz attempt. Validates answers, calculates score, stores results.
 */
quizLearnerRouter.post(
  '/attempts',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const segmentId = req.params.segmentId as string;
      const userId = req.user!.userId;
      const data = submitQuizAttemptSchema.parse(req.body);
      const result = await quizService.submitAttempt(segmentId, userId, data);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/learner/segments/:segmentId/quiz/attempts
 * Get attempt history for the authenticated learner on this segment's quiz.
 * Returns attempts ordered by most recent first.
 */
quizLearnerRouter.get(
  '/attempts',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const segmentId = req.params.segmentId as string;
      const userId = req.user!.userId;
      const attempts = await quizService.getAttemptHistory(segmentId, userId);
      sendSuccess(res, { attempts });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/learner/segments/:segmentId/quiz/attempts/:attemptId
 * Get detailed breakdown for a specific attempt.
 * Shows per-question results with learner's selection and correct answers.
 */
quizLearnerRouter.get(
  '/attempts/:attemptId',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const attemptId = req.params.attemptId as string;
      const userId = req.user!.userId;
      const detail = await quizService.getAttemptDetail(attemptId, userId);
      sendSuccess(res, detail);
    } catch (error) {
      next(error);
    }
  }
);

export default quizLearnerRouter;
