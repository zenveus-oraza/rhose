import { pgTable, uuid, varchar, text, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { modules } from './modules';

/**
 * Lesson content type enum: text or video.
 */
export const lessonContentTypeEnum = pgEnum('lesson_content_type', ['text', 'video']);

/**
 * Lessons table — individual learning units within a Module.
 * Contains either text content (content_body) or a video link (video_url).
 * sort_order determines display ordering within a module.
 */
export const lessons = pgTable('lessons', {
  id: uuid('id').primaryKey().defaultRandom(),
  moduleId: uuid('module_id').notNull().references(() => modules.id),
  title: varchar('title', { length: 255 }).notNull(),
  contentType: lessonContentTypeEnum('content_type').notNull(),
  contentBody: text('content_body'),
  videoUrl: varchar('video_url', { length: 2048 }),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
