import { pgTable, uuid, integer, timestamp, unique } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { segments } from './segments.js';

/**
 * Segment Assignments table — tracks which users are assigned to which segments.
 * Includes access_duration_days (nullable) for M3 compatibility.
 * Unique constraint on (user_id, segment_id) prevents duplicate assignments.
 */
export const segmentAssignments = pgTable('segment_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  segmentId: uuid('segment_id').notNull().references(() => segments.id, { onDelete: 'restrict' }),
  accessDurationDays: integer('access_duration_days'),
  assignedAt: timestamp('assigned_at').notNull().defaultNow(),
}, (table) => ({
  uniqueAssignment: unique().on(table.userId, table.segmentId),
}));
