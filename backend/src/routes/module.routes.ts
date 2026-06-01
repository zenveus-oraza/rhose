import { Router, Request, Response, NextFunction } from 'express';
import { moduleService } from '../services/module.service.js';
import { createModuleSchema, updateModuleSchema, reorderModulesSchema } from '../schemas/module.schemas.js';
import { sendSuccess } from '../utils/response.js';

/**
 * Module routes — nested under /api/admin/segments/:segmentId/modules
 * and /api/admin/modules/:id for direct module operations.
 */

/**
 * Segment-scoped module routes.
 * Mounted at: /api/admin/segments/:segmentId/modules
 */
export const segmentModuleRouter = Router({ mergeParams: true });

/**
 * POST /api/admin/segments/:segmentId/modules
 * Create a new module within a segment with auto-assigned sort_order.
 */
segmentModuleRouter.post(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const segmentId = req.params.segmentId as string;
      const data = createModuleSchema.parse(req.body);
      const module = await moduleService.create(segmentId, data);
      sendSuccess(res, module, 201);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/admin/segments/:segmentId/modules
 * List all modules in a segment ordered by sort_order ascending with lesson count.
 */
segmentModuleRouter.get(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const segmentId = req.params.segmentId as string;
      const modules = await moduleService.listBySegment(segmentId);
      sendSuccess(res, modules);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/admin/segments/:segmentId/modules/reorder
 * Reorder modules within a segment. Maintains contiguous sort_order from 1.
 */
segmentModuleRouter.put(
  '/reorder',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const segmentId = req.params.segmentId as string;
      const { orderedIds } = reorderModulesSchema.parse(req.body);
      await moduleService.reorder(segmentId, orderedIds);
      sendSuccess(res, { message: 'Modules reordered successfully' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Direct module routes (not segment-scoped).
 * Mounted at: /api/admin/modules
 */
export const moduleRouter = Router();

/**
 * PUT /api/admin/modules/:id
 * Update a module's title and/or description.
 */
moduleRouter.put(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const data = updateModuleSchema.parse(req.body);
      const module = await moduleService.update(id, data);
      sendSuccess(res, module);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/admin/modules/:id
 * Delete a module only if no lessons exist. Reorders remaining modules.
 */
moduleRouter.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      await moduleService.delete(id);
      sendSuccess(res, { message: 'Module deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);
