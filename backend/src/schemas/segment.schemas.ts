import { z } from 'zod';

/**
 * Valid segment statuses.
 */
export const segmentStatusValues = ['draft', 'active', 'archived'] as const;
export type SegmentStatus = (typeof segmentStatusValues)[number];

/**
 * Schema for creating a segment.
 * Title is required; description is optional; duration is required (positive integer).
 */
export const createSegmentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  duration: z.number({ required_error: 'Duration is required', invalid_type_error: 'Duration must be a number' })
    .int('Duration must be an integer')
    .positive('Duration must be a positive integer'),
});

/**
 * Schema for updating a segment.
 * All fields are optional; status must be a valid enum value if provided.
 * Duration, if provided, must be a positive integer.
 */
export const updateSegmentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255).optional(),
  description: z.string().optional(),
  duration: z.number({ invalid_type_error: 'Duration must be a number' })
    .int('Duration must be an integer')
    .positive('Duration must be a positive integer')
    .optional(),
  status: z.enum(segmentStatusValues).optional(),
});

export type CreateSegmentInput = z.infer<typeof createSegmentSchema>;
export type UpdateSegmentInput = z.infer<typeof updateSegmentSchema>;
