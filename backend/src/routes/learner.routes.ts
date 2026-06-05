import { Router, Request, Response, NextFunction } from 'express';
import { eq, desc, ilike, and, count } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { segmentAssignments, segments } from '../db/schema/index.js';
import { authenticate } from '../middleware/auth.js';
import { requireLearner, requireSegmentAccess } from '../middleware/segment-access.js';
import { progressService } from '../services/progress.service.js';
import { navigationService } from '../services/navigation.service.js';
import { completionService } from '../services/completion.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LearnerSegment {
  segmentId: string;
  title: string;
  description: string | null;
  progress_percentage: number;
  completed_lessons: number;
  total_lessons: number;
  access_status: 'active' | 'expired';
  assigned_at: string;
}

// ─── Validation ───────────────────────────────────────────────────────────────

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Determine whether access is still active based on assignment date and duration.
 * If accessDurationDays is null, access is unlimited (always active).
 */
function computeAccessStatus(assignedAt: Date, accessDurationDays: number | null): 'active' | 'expired' {
  if (accessDurationDays === null) {
    return 'active';
  }

  const expiryDate = new Date(assignedAt);
  expiryDate.setUTCDate(expiryDate.getUTCDate() + accessDurationDays);

  return new Date() > expiryDate ? 'expired' : 'active';
}

// ─── Router ───────────────────────────────────────────────────────────────────

const learnerRouter = Router();

// Apply auth middleware to all learner routes
learnerRouter.use(authenticate, requireLearner);

/**
 * GET /api/learner/segments
 * Returns assigned segments with progress and access status for the authenticated learner.
 * Supports pagination (page, limit) and search by segment title.
 * Ordered by assigned_at descending (most recent first).
 * Returns empty array when no assignments exist.
 */
learnerRouter.get(
  '/segments',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;

      // Validate and parse query params
      const params = paginationSchema.parse(req.query);
      const { page, limit, search } = params;
      const offset = (page - 1) * limit;

      // Build WHERE conditions
      const conditions = [eq(segmentAssignments.userId, userId)];
      if (search) {
        conditions.push(ilike(segments.title, `%${search}%`));
      }

      // Count total matching assignments for pagination metadata
      const [{ total: totalCount }] = await db
        .select({ total: count() })
        .from(segmentAssignments)
        .innerJoin(segments, eq(segmentAssignments.segmentId, segments.id))
        .where(and(...conditions));

      const total = Number(totalCount);
      const totalPages = Math.ceil(total / limit);

      // Return empty result if no assignments
      if (total === 0) {
        sendSuccess(res, {
          segments: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        });
        return;
      }

      // Fetch paginated assignments joined with segment data
      const assignments = await db
        .select({
          segmentId: segmentAssignments.segmentId,
          accessDurationDays: segmentAssignments.accessDurationDays,
          assignedAt: segmentAssignments.assignedAt,
          title: segments.title,
          description: segments.description,
        })
        .from(segmentAssignments)
        .innerJoin(segments, eq(segmentAssignments.segmentId, segments.id))
        .where(and(...conditions))
        .orderBy(desc(segmentAssignments.assignedAt))
        .limit(limit)
        .offset(offset);

      // Build response with progress for each assignment
      const learnerSegments: LearnerSegment[] = await Promise.all(
        assignments.map(async (assignment) => {
          const progress = await progressService.getSegmentProgress(assignment.segmentId, userId);
          const accessStatus = computeAccessStatus(assignment.assignedAt, assignment.accessDurationDays);

          return {
            segmentId: assignment.segmentId,
            title: assignment.title,
            description: assignment.description,
            progress_percentage: progress.percentage,
            completed_lessons: progress.completedLessons,
            total_lessons: progress.totalLessons,
            access_status: accessStatus,
            assigned_at: assignment.assignedAt.toISOString(),
          };
        })
      );

      sendSuccess(res, {
        segments: learnerSegments,
        pagination: { page, limit, total, totalPages },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/learner/segments/:segmentId
 * Get segment details with modules and per-user progress.
 * Returns segment title, description, status, and ordered modules with lesson count and completed count.
 * Requires authenticated learner with valid segment access.
 */
learnerRouter.get(
  '/segments/:segmentId',
  requireSegmentAccess,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const segmentId = req.params.segmentId as string;
      const userId = req.user!.userId;

      const segment = await navigationService.getSegmentDetail(segmentId, userId);

      if (!segment) {
        sendError(res, 404, 'NOT_FOUND', 'Segment not found');
        return;
      }

      sendSuccess(res, { segment });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/learner/segments/:segmentId/current-lesson
 * Returns the current lesson for the authenticated user within the segment.
 * If all lessons are complete, returns segmentComplete: true with currentLesson: null.
 * Requires authenticated learner with valid segment access (includes duration check).
 */
learnerRouter.get(
  '/segments/:segmentId/current-lesson',
  requireSegmentAccess,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const segmentId = req.params.segmentId as string;
      const userId = req.user!.userId;

      const currentLesson = await navigationService.getCurrentLesson(segmentId, userId);

      if (!currentLesson) {
        sendSuccess(res, { currentLesson: null, segmentComplete: true });
        return;
      }

      sendSuccess(res, {
        currentLesson: { moduleId: currentLesson.moduleId, lessonId: currentLesson.lessonId },
        segmentComplete: false,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/learner/segments/:segmentId/modules/:moduleId/lessons
 * Returns ordered lessons with completion status for the requesting user.
 * Requires authenticated learner with valid segment access.
 */
learnerRouter.get(
  '/segments/:segmentId/modules/:moduleId/lessons',
  requireSegmentAccess,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const moduleId = req.params.moduleId as string;
      const userId = req.user!.userId;

      const lessons = await navigationService.getModuleLessons(moduleId, userId);

      sendSuccess(res, { lessons });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/learner/segments/:segmentId/modules/:moduleId/lessons/:lessonId
 * Get lesson content (text or video) for a specific lesson.
 * Enforces segment access and sequential progression checks.
 * Returns 403 if the lesson is locked (prerequisite not completed).
 * Returns 404 if the lesson does not exist.
 */
learnerRouter.get(
  '/segments/:segmentId/modules/:moduleId/lessons/:lessonId',
  requireSegmentAccess,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lessonId = req.params.lessonId as string;
      const userId = req.user!.userId;

      // Check sequential progression — lesson must be accessible
      const accessResult = await navigationService.canAccessLesson(lessonId, userId);

      if (!accessResult.accessible) {
        sendError(res, 403, 'LESSON_LOCKED', 'Lesson is locked. Complete the prerequisite lesson first.', {
          prerequisiteLessonId: accessResult.prerequisiteLessonId,
        });
        return;
      }

      // Fetch lesson content
      const lesson = await navigationService.getLessonContent(lessonId);

      if (!lesson) {
        sendError(res, 404, 'NOT_FOUND', 'Lesson not found');
        return;
      }

      sendSuccess(res, {
        lesson: {
          id: lesson.id,
          title: lesson.title,
          contentType: lesson.contentType,
          contentBody: lesson.contentBody,
          videoUrl: lesson.videoUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/learner/lessons/:lessonId/complete
 * Mark a lesson as completed for the authenticated learner.
 * Segment access is enforced internally by the completion service.
 * Returns completion result with next lesson info and progress flags.
 */
learnerRouter.post(
  '/lessons/:lessonId/complete',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lessonId = req.params.lessonId as string;
      const userId = req.user!.userId;

      const result = await completionService.completeLesson(userId, lessonId);

      // Lesson not found
      if (result === null) {
        sendError(res, 404, 'NOT_FOUND', 'Lesson not found');
        return;
      }

      // Segment access denied
      if ('granted' in result && result.granted === false) {
        sendError(res, 403, result.code, result.code);
        return;
      }

      // Success — return completion data
      const { alreadyCompleted, nextLessonId, moduleComplete, segmentComplete } = result;
      sendSuccess(res, {
        alreadyCompleted,
        nextLessonId,
        moduleComplete,
        segmentComplete,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default learnerRouter;
