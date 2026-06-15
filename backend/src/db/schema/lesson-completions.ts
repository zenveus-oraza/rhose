import { pgTable, uuid, timestamp, unique } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { lessons } from './lessons.js';

/**
 * Lesson Completions table — records when a user completes a lesson.
 * Unique constraint on (user_id, lesson_id) ensures no duplicate completions (idempotence).
 * Foreign keys reference users and lessons tables.
 */
export const lessonCompletions = pgTable('lesson_completions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  lessonId: uuid('lesson_id').notNull().references(() => lessons.id, { onDelete: 'restrict' }),
  completedAt: timestamp('completed_at').notNull().defaultNow(),
}, (table) => ({
  uniqueUserLesson: unique().on(table.userId, table.lessonId),
}));
