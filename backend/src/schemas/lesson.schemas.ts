import { z } from 'zod';

/**
 * Valid estimated time unit values.
 */
export const estimatedTimeUnitValues = ['minutes', 'hours'] as const;
export type EstimatedTimeUnit = (typeof estimatedTimeUnitValues)[number];

const uploadedAssetSchema = z.object({
  key: z.string().min(1, 'asset key is required'),
  originalName: z.string().min(1, 'asset originalName is required'),
  size: z.number().int().nonnegative('asset size must be non-negative'),
  mimeType: z.string().min(1, 'asset mimeType is required'),
});

/**
 * Schema for creating a lesson.
 * Uses discriminated union on content_type to enforce:
 * - text lessons require content_body
 * - video lessons require video_url with valid URL format
 * - slides lessons require slides_url with valid URL format and total_slides count
 * All types support optional estimated_time_value and estimated_time_unit.
 */
export const createLessonSchema = z.discriminatedUnion('content_type', [
  z.object({
    title: z.string().min(1, 'Title is required').max(255),
    content_type: z.literal('text'),
    content_body: z.string().min(1, 'content_body is required for text lessons'),
    video_url: z.string().optional().nullable(),
    video_asset: uploadedAssetSchema.optional().nullable(),
    slides_url: z.string().optional().nullable(),
    slides_asset: uploadedAssetSchema.optional().nullable(),
    total_slides: z.number().int().positive().optional().nullable(),
    estimated_time_value: z.number({ invalid_type_error: 'estimated_time_value must be a number' })
      .int('estimated_time_value must be an integer')
      .positive('estimated_time_value must be a positive integer')
      .optional()
      .nullable(),
    estimated_time_unit: z.enum(estimatedTimeUnitValues, {
      errorMap: () => ({ message: 'estimated_time_unit must be "minutes" or "hours"' }),
    })
      .optional()
      .nullable(),
  }),
  z.object({
    title: z.string().min(1, 'Title is required').max(255),
    content_type: z.literal('video'),
    video_url: z.string().min(1, 'video_url is required for video lessons'),
    video_asset: uploadedAssetSchema.optional().nullable(),
    content_body: z.string().optional().nullable(),
    slides_url: z.string().optional().nullable(),
    slides_asset: uploadedAssetSchema.optional().nullable(),
    total_slides: z.number().int().positive().optional().nullable(),
    estimated_time_value: z.number({ invalid_type_error: 'estimated_time_value must be a number' })
      .int('estimated_time_value must be an integer')
      .positive('estimated_time_value must be a positive integer')
      .optional()
      .nullable(),
    estimated_time_unit: z.enum(estimatedTimeUnitValues, {
      errorMap: () => ({ message: 'estimated_time_unit must be "minutes" or "hours"' }),
    })
      .optional()
      .nullable(),
  }),
  z.object({
    title: z.string().min(1, 'Title is required').max(255),
    content_type: z.literal('slides'),
    slides_url: z.string().min(1, 'slides_url is required for slides lessons'),
    slides_asset: uploadedAssetSchema.optional().nullable(),
    total_slides: z.number({ invalid_type_error: 'total_slides must be a number' })
      .int('total_slides must be an integer')
      .positive('total_slides must be a positive integer'),
    content_body: z.string().optional().nullable(),
    video_url: z.string().optional().nullable(),
    video_asset: uploadedAssetSchema.optional().nullable(),
    estimated_time_value: z.number({ invalid_type_error: 'estimated_time_value must be a number' })
      .int('estimated_time_value must be an integer')
      .positive('estimated_time_value must be a positive integer')
      .optional()
      .nullable(),
    estimated_time_unit: z.enum(estimatedTimeUnitValues, {
      errorMap: () => ({ message: 'estimated_time_unit must be "minutes" or "hours"' }),
    })
      .optional()
      .nullable(),
  }),
]);

/**
 * Schema for updating a lesson.
 * All fields are optional. When content_type is changed, the corresponding
 * content field must be provided via refinement.
 * Includes optional estimated_time_value and estimated_time_unit fields.
 */
export const updateLessonSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255).optional(),
  content_type: z.enum(['text', 'video', 'slides']).optional(),
  content_body: z.string().min(1, 'content_body is required for text lessons').optional().nullable(),
  video_url: z.string().min(1, 'video_url is required').optional().nullable(),
  video_asset: uploadedAssetSchema.optional().nullable(),
  slides_url: z.string().min(1, 'slides_url is required').optional().nullable(),
  slides_asset: uploadedAssetSchema.optional().nullable(),
  total_slides: z.number().int().positive().optional().nullable(),
  estimated_time_value: z.number({ invalid_type_error: 'estimated_time_value must be a number' })
    .int('estimated_time_value must be an integer')
    .positive('estimated_time_value must be a positive integer')
    .optional()
    .nullable(),
  estimated_time_unit: z.enum(estimatedTimeUnitValues, {
    errorMap: () => ({ message: 'estimated_time_unit must be "minutes" or "hours"' }),
  })
    .optional()
    .nullable(),
}).refine(
  (data) => {
    if (data.content_type === 'text' && !data.content_body) {
      return false;
    }
    return true;
  },
  { message: 'content_body is required for text lessons', path: ['content_body'] }
).refine(
  (data) => {
    if (data.content_type === 'video' && !data.video_url) {
      return false;
    }
    return true;
  },
  { message: 'video_url is required for video lessons', path: ['video_url'] }
).refine(
  (data) => {
    if (data.content_type === 'slides' && !data.slides_url) {
      return false;
    }
    return true;
  },
  { message: 'slides_url is required for slides lessons', path: ['slides_url'] }
).refine(
  (data) => {
    if (data.content_type === 'slides' && !data.total_slides) {
      return false;
    }
    return true;
  },
  { message: 'total_slides is required for slides lessons', path: ['total_slides'] }
);

/**
 * Schema for reordering lessons within a module.
 * orderedIds is an array of lesson UUIDs in the desired order.
 */
export const reorderLessonsSchema = z.object({
  orderedIds: z.array(z.string().uuid('Each ID must be a valid UUID')).min(1, 'orderedIds must not be empty'),
});

/**
 * Schema for reporting lesson progress evidence.
 * progress_percent must be 0-100.
 */
export const reportProgressSchema = z.object({
  progress_percent: z.number()
    .int('progress_percent must be an integer')
    .min(0, 'progress_percent must be at least 0')
    .max(100, 'progress_percent must be at most 100'),
});

export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
export type ReorderLessonsInput = z.infer<typeof reorderLessonsSchema>;
export type ReportProgressInput = z.infer<typeof reportProgressSchema>;
