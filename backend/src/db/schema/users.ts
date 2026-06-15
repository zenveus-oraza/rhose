import { pgTable, uuid, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';

/**
 * User role enum: admin or learner.
 */
export const userRoleEnum = pgEnum('user_role', ['admin', 'learner']);

/**
 * User status enum: active, inactive, or deactivated.
 */
export const userStatusEnum = pgEnum('user_status', ['active', 'inactive', 'deactivated']);

/**
 * Users table — stores all platform user accounts.
 * Accounts are created by admins; no self-registration.
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  jobTitle: varchar('job_title', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  profileImage: text('profile_image'),
  role: userRoleEnum('role').notNull().default('learner'),
  status: userStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
