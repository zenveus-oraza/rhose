import { Router, Request, Response, NextFunction } from 'express';
import { lessonService } from '../services/lesson.service.js';
import { createLessonSchema, updateLessonSchema, reorderLessonsSchema } from '../schemas/lesson.schemas.js';
import { sendSuccess } from '../utils/response.js';

/**
 * Lesson routes — nested under /api/admin/modules/:moduleId/lessons
 * and /api/admin/lessons/:id for direct lesson operations.
 */

/**
 * Module-scoped lesson routes.
 * Mounted at: /api/admin/modules/:moduleId/lessons
 */
export const moduleLessonRouter = Router({ mergeParams: true });

/**
 * POST /api/admin/modules/:moduleId/lessons
 * Create a new lesson within a module with auto-assigned sort_order.
 * Supports content_type-specific fields and estimated time.
 */
moduleLessonRouter.post(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const moduleId = req.params.moduleId as string;
      const data = createLessonSchema.parse(req.body);
      const lesson = await lessonService.create(moduleId, {
        title: data.title,
        content_type: data.content_type,
        content_body: data.content_body ?? undefined,
        video_url: data.video_url ?? undefined,
        video_asset: data.content_type === 'video' ? data.video_asset ?? undefined : undefined,
        slides_url: data.slides_url ?? undefined,
        slides_asset: data.content_type === 'slides' ? data.slides_asset ?? undefined : undefined,
        total_slides: data.total_slides ?? undefined,
        estimated_time_value: data.estimated_time_value ?? undefined,
        estimated_time_unit: data.estimated_time_unit ?? undefined,
      });
      sendSuccess(res, lesson, 201);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/admin/modules/:moduleId/lessons
 * List lessons in a module with pagination, ordered by sort_order ascending.
 * Includes estimated time fields.
 * Query params: page, limit
 */
moduleLessonRouter.get(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const moduleId = req.params.moduleId as string;
      const { page, limit } = req.query;
      const result = await lessonService.listByModule(moduleId, {
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
 * PUT /api/admin/modules/:moduleId/lessons/reorder
 * Reorder lessons within a module. Maintains contiguous sort_order from 1.
 */
moduleLessonRouter.put(
  '/reorder',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const moduleId = req.params.moduleId as string;
      const { orderedIds } = reorderLessonsSchema.parse(req.body);
      await lessonService.reorder(moduleId, orderedIds);
      sendSuccess(res, { message: 'Lessons reordered successfully' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Direct lesson routes (not module-scoped).
 * Mounted at: /api/admin/lessons
 */
export const lessonRouter = Router();

/**
 * GET /api/admin/lessons/:id
 * Get a single lesson with full content (content_body or video_url) and estimated time.
 */
lessonRouter.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const lesson = await lessonService.getById(id);
      sendSuccess(res, lesson);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/admin/lessons/:id
 * Update a lesson's fields including estimated time.
 */
lessonRouter.put(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const data = updateLessonSchema.parse(req.body);
      const lesson = await lessonService.update(id, data);
      sendSuccess(res, lesson);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/admin/lessons/:id
 * Delete a lesson and reorder remaining lessons.
 */
lessonRouter.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      await lessonService.delete(id);
      sendSuccess(res, { message: 'Lesson deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);
