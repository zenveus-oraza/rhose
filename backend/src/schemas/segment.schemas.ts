import { z } from 'zod';

/**
 * Valid segment statuses.
 */
export const segmentStatusValues = ['draft', 'active', 'archived'] as const;
export type SegmentStatus = (typeof segmentStatusValues)[number];

/**
 * Schema for creating a segment.
 * Title is required; description is optional.
 */
export const createSegmentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
});

/**
 * Schema for updating a segment.
 * All fields are optional; status must be a valid enum value if provided.
 */
export const updateSegmentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255).optional(),
  description: z.string().optional(),
  status: z.enum(segmentStatusValues).optional(),
});

export type CreateSegmentInput = z.infer<typeof createSegmentSchema>;
export type UpdateSegmentInput = z.infer<typeof updateSegmentSchema>;
