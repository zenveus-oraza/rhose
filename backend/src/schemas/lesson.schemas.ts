import { z } from 'zod';

/**
 * Schema for creating a lesson.
 * Uses discriminated union on content_type to enforce:
 * - text lessons require content_body
 * - video lessons require video_url with valid URL format
 */
export const createLessonSchema = z.discriminatedUnion('content_type', [
  z.object({
    title: z.string().min(1, 'Title is required').max(255),
    content_type: z.literal('text'),
    content_body: z.string().min(1, 'content_body is required for text lessons'),
    video_url: z.string().optional(),
  }),
  z.object({
    title: z.string().min(1, 'Title is required').max(255),
    content_type: z.literal('video'),
    video_url: z.string().url('video_url must be a valid URL'),
    content_body: z.string().optional(),
  }),
]);

/**
 * Schema for updating a lesson.
 * All fields are optional. When content_type is changed, the corresponding
 * content field must be provided via refinement.
 */
export const updateLessonSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255).optional(),
  content_type: z.enum(['text', 'video']).optional(),
  content_body: z.string().min(1, 'content_body is required for text lessons').optional(),
  video_url: z.string().url('video_url must be a valid URL').optional(),
}).refine(
  (data) => {
    // If content_type is being set to 'text', content_body must be provided
    if (data.content_type === 'text' && !data.content_body) {
      return false;
    }
    return true;
  },
  { message: 'content_body is required for text lessons', path: ['content_body'] }
).refine(
  (data) => {
    // If content_type is being set to 'video', video_url must be provided
    if (data.content_type === 'video' && !data.video_url) {
      return false;
    }
    return true;
  },
  { message: 'video_url is required for video lessons', path: ['video_url'] }
);

/**
 * Schema for reordering lessons within a module.
 * orderedIds is an array of lesson UUIDs in the desired order.
 */
export const reorderLessonsSchema = z.object({
  orderedIds: z.array(z.string().uuid('Each ID must be a valid UUID')).min(1, 'orderedIds must not be empty'),
});

export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
export type ReorderLessonsInput = z.infer<typeof reorderLessonsSchema>;
