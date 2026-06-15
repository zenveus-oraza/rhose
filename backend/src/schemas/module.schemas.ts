import { z } from 'zod';

/**
 * Schema for creating a module.
 * Title is required; description is optional.
 * segment_id is provided via route params, not body.
 */
export const createModuleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
});

/**
 * Schema for updating a module.
 * All fields are optional.
 */
export const updateModuleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255).optional(),
  description: z.string().optional(),
});

/**
 * Schema for reordering modules within a segment.
 * orderedIds is an array of module UUIDs in the desired order.
 */
export const reorderModulesSchema = z.object({
  orderedIds: z.array(z.string().uuid('Each ID must be a valid UUID')).min(1, 'orderedIds must not be empty'),
});

export type CreateModuleInput = z.infer<typeof createModuleSchema>;
export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;
export type ReorderModulesInput = z.infer<typeof reorderModulesSchema>;
