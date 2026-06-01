import { z } from 'zod';

/**
 * Valid user roles for admin user management.
 */
export const userRoleValues = ['admin', 'learner'] as const;
export type UserRole = (typeof userRoleValues)[number];

/**
 * Schema for creating a user via admin panel.
 * Name and email are required; role must be admin or learner.
 */
export const adminCreateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email format'),
  role: z.enum(userRoleValues, {
    errorMap: () => ({ message: 'Role must be "admin" or "learner"' }),
  }),
});

/**
 * Schema for updating a user via admin panel.
 * Only name and role can be updated.
 */
export const adminUpdateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).optional(),
  role: z.enum(userRoleValues, {
    errorMap: () => ({ message: 'Role must be "admin" or "learner"' }),
  }).optional(),
});

/**
 * Schema for user list query parameters.
 */
export const userListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
export type UserListQueryInput = z.infer<typeof userListQuerySchema>;
