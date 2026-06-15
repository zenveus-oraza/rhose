import { pgTable, uuid, varchar, text, timestamp, pgEnum, integer } from 'drizzle-orm/pg-core';

/**
 * Segment status enum: draft, active, or archived.
 */
export const segmentStatusEnum = pgEnum('segment_status', ['draft', 'active', 'archived']);

/**
 * Segments table — top-level learning programme containers
 * that group related Modules.
 */
export const segments = pgTable('segments', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  duration: integer('duration'), // Duration in days, per Figma segment form
  status: segmentStatusEnum('status').notNull().default('draft'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
