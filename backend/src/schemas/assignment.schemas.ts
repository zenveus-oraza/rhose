import { z } from 'zod';

/**
 * Schema for creating an assignment (assigning a user to a segment).
 */
export const createAssignmentSchema = z.object({
  user_id: z.string().uuid('user_id must be a valid UUID'),
  segment_id: z.string().uuid('segment_id must be a valid UUID'),
  access_duration_days: z.number().int().positive().nullable().optional(),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
