import { pgTable, uuid, varchar, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { segments } from './segments';

/**
 * Modules table — groups of Lessons within a Segment.
 * sort_order determines display ordering within a segment.
 */
export const modules = pgTable('modules', {
  id: uuid('id').primaryKey().defaultRandom(),
  segmentId: uuid('segment_id').notNull().references(() => segments.id, { onDelete: 'restrict' }),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
