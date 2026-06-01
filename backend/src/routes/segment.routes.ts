import { Router, Request, Response, NextFunction } from 'express';
import { segmentService } from '../services/segment.service.js';
import { createSegmentSchema, updateSegmentSchema } from '../schemas/segment.schemas.js';
import { sendSuccess } from '../utils/response.js';

const router = Router();

/**
 * POST /api/admin/segments
 * Create a new segment with title and optional description.
 * Status defaults to "draft".
 */
router.post(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = createSegmentSchema.parse(req.body);
      const segment = await segmentService.create(data);
      sendSuccess(res, segment, 201);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/admin/segments
 * List all segments ordered by created_at descending.
 */
router.get(
  '/',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const segments = await segmentService.list();
      sendSuccess(res, segments);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/admin/segments/:id
 * Get a single segment with its module count.
 */
router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const segment = await segmentService.getById(id);
      sendSuccess(res, segment);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/admin/segments/:id
 * Update segment title, description, or status with transition validation.
 */
router.put(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const data = updateSegmentSchema.parse(req.body);
      const segment = await segmentService.update(id, data);
      sendSuccess(res, segment);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/admin/segments/:id
 * Delete a segment only if no modules exist.
 * Returns 400 with child count if modules are present.
 */
router.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      await segmentService.delete(id);
      sendSuccess(res, { message: 'Segment deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
