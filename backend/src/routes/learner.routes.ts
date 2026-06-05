import { Router, Request, Response, NextFunction } from 'express';
import { eq, desc, ilike, and, count, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { segmentAssignments, segments, lessonProgress } from '../db/schema/index.js';
import { authenticate } from '../middleware/auth.js';
import { requireLearner, requireSegmentAccess } from '../middleware/segment-access.js';
import { progressService } from '../services/progress.service.js';
import { navigationService } from '../services/navigation.service.js';
import { completionService } from '../services/completion.service.js';
import type { CompletionResult } from '../services/completion.service.js';
import { reportProgressSchema } from '../schemas/lesson.schemas.js';
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
 * Get lesson content (text, video, or slides) for a specific lesson.
 * Enforces segment access and module-level sequential access.
 * Lessons within a module are all accessible, but the module itself must be unlocked
 * (all lessons in preceding modules must be completed).
 * Returns 403 if the module is locked. Returns 404 if the lesson does not exist.
 */
learnerRouter.get(
  '/segments/:segmentId/modules/:moduleId/lessons/:lessonId',
  requireSegmentAccess,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const segmentId = req.params.segmentId as string;
      const moduleId = req.params.moduleId as string;
      const lessonId = req.params.lessonId as string;
      const userId = req.user!.userId;

      // Check module-level access: is this module unlocked?
      const segmentDetail = await navigationService.getSegmentDetail(segmentId, userId);
      if (segmentDetail) {
        const targetModule = segmentDetail.modules.find((m) => m.id === moduleId);
        if (targetModule && !targetModule.accessible) {
          sendError(res, 403, 'MODULE_LOCKED', 'Complete the previous module to access this one.');
          return;
        }
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
          slidesUrl: lesson.slidesUrl,
          totalSlides: lesson.totalSlides,
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
 * Requires at least 75% progress evidence to be recorded before completion.
 * Segment access is enforced internally by the completion service.
 * Returns completion result with next lesson info and progress flags.
 */
learnerRouter.post(
  '/lessons/:lessonId/complete',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lessonId = req.params.lessonId as string;
      const userId = req.user!.userId;

      // Check progress evidence — require at least 75% engagement
      const [progressRecord] = await db
        .select({ progressPercent: lessonProgress.progressPercent })
        .from(lessonProgress)
        .where(
          and(
            eq(lessonProgress.userId, userId),
            eq(lessonProgress.lessonId, lessonId)
          )
        )
        .limit(1);

      const currentProgress = progressRecord?.progressPercent ?? 0;
      if (currentProgress < 75) {
        sendError(res, 403, 'INSUFFICIENT_PROGRESS', 
          `You must engage with at least 75% of the content before marking as complete. Current progress: ${currentProgress}%`,
          { currentProgress, requiredProgress: 75 }
        );
        return;
      }

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
      const completionResult = result as CompletionResult;
      sendSuccess(res, {
        alreadyCompleted: completionResult.alreadyCompleted,
        nextLessonId: completionResult.nextLessonId,
        moduleComplete: completionResult.moduleComplete,
        segmentComplete: completionResult.segmentComplete,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/learner/lessons/:lessonId/progress
 * Report progress evidence for a lesson (e.g., video watch %, slides viewed %, scroll %).
 * Only updates if the new progress is higher than the existing record (max-wins).
 * Returns the current progress percentage.
 */
learnerRouter.post(
  '/lessons/:lessonId/progress',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lessonId = req.params.lessonId as string;
      const userId = req.user!.userId;
      const { progress_percent } = reportProgressSchema.parse(req.body);

      // Upsert: insert or update only if new progress is higher
      // Atomic upsert: insert or update with max-wins (only store if new value is higher)
      // This avoids race conditions from rapid progress reports
      const [result] = await db
        .insert(lessonProgress)
        .values({
          userId,
          lessonId,
          progressPercent: progress_percent,
        })
        .onConflictDoUpdate({
          target: [lessonProgress.userId, lessonProgress.lessonId],
          set: {
            progressPercent: sql`GREATEST(${lessonProgress.progressPercent}, ${progress_percent})`,
            updatedAt: new Date(),
          },
        })
        .returning({ progressPercent: lessonProgress.progressPercent });

      const finalProgress = result?.progressPercent ?? progress_percent;

      sendSuccess(res, {
        progressPercent: finalProgress,
        canComplete: finalProgress >= 75,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/learner/lessons/:lessonId/progress
 * Get current progress evidence for a lesson.
 */
learnerRouter.get(
  '/lessons/:lessonId/progress',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const lessonId = req.params.lessonId as string;
      const userId = req.user!.userId;

      const [record] = await db
        .select({ progressPercent: lessonProgress.progressPercent })
        .from(lessonProgress)
        .where(
          and(
            eq(lessonProgress.userId, userId),
            eq(lessonProgress.lessonId, lessonId)
          )
        )
        .limit(1);

      sendSuccess(res, {
        progressPercent: record?.progressPercent ?? 0,
        canComplete: (record?.progressPercent ?? 0) >= 75,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default learnerRouter;
