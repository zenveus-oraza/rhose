import { pgTable, uuid, varchar, text, integer, timestamp, pgEnum, jsonb } from 'drizzle-orm/pg-core';
import { modules } from './modules';

/**
 * Lesson content type enum: text, video, or slides.
 */
export const lessonContentTypeEnum = pgEnum('lesson_content_type', ['text', 'video', 'slides']);

export interface UploadedLessonAssetMetadata {
  key: string;
  originalName: string;
  size: number;
  mimeType: string;
}

/**
 * Lessons table — individual learning units within a Module.
 * Contains text content (content_body), a video link (video_url), or slides (slides_url).
 * sort_order determines display ordering within a module.
 * estimated_time_value + estimated_time_unit store the time estimate per lesson.
 */
export const lessons = pgTable('lessons', {
  id: uuid('id').primaryKey().defaultRandom(),
  moduleId: uuid('module_id').notNull().references(() => modules.id, { onDelete: 'restrict' }),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  contentType: lessonContentTypeEnum('content_type').notNull(),
  contentBody: text('content_body'),
  videoUrl: varchar('video_url', { length: 2048 }),
  videoAsset: jsonb('video_asset').$type<UploadedLessonAssetMetadata | null>(),
  slidesUrl: varchar('slides_url', { length: 2048 }),
  slidesAsset: jsonb('slides_asset').$type<UploadedLessonAssetMetadata | null>(),
  totalSlides: integer('total_slides'),
  estimatedTimeValue: integer('estimated_time_value'), // e.g., 15, 30, 1, 2
  estimatedTimeUnit: varchar('estimated_time_unit', { length: 10 }), // 'minutes' | 'hours'
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
