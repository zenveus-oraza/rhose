import { pgTable, uuid, varchar, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Activity Events table — stores user activity events for the admin dashboard.
 * Events are append-only (never modified or deleted) for an immutable audit log.
 * Examples: lesson_completed, quiz_passed, quiz_failed, segment_assigned, user_created.
 */
export const activityEvents = pgTable('activity_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  action: varchar('action', { length: 50 }).notNull(),
  description: text('description').notNull(),
  detail: text('detail'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  createdAtIdx: index('activity_events_created_at_idx').on(table.createdAt),
  userIdIdx: index('activity_events_user_id_idx').on(table.userId),
}));
