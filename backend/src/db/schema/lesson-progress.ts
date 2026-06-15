import { pgTable, uuid, integer, timestamp, unique } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { lessons } from './lessons.js';

/**
 * Lesson Progress table — tracks user engagement evidence per lesson.
 * Records the maximum progress percentage (0-100) the user has achieved.
 * For video: percentage of video duration watched.
 * For slides: percentage of slides viewed (slides viewed / total slides * 100).
 * For text: percentage of content scrolled.
 * Unique constraint on (user_id, lesson_id) — one row per user per lesson.
 * Completion is only allowed when progress >= 75%.
 */
export const lessonProgress = pgTable('lesson_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  lessonId: uuid('lesson_id').notNull().references(() => lessons.id, { onDelete: 'restrict' }),
  progressPercent: integer('progress_percent').notNull().default(0),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueUserLesson: unique().on(table.userId, table.lessonId),
}));
