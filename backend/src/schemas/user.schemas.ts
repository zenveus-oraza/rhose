import { z } from 'zod';

export const profileUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  jobTitle: z.string().max(100).optional(),
  phone: z.string().regex(/^\+?[\d\s\-()]{7,20}$/, 'Invalid phone number format').optional(),
  profileImage: z.string().optional(),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export const userCreationSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['admin', 'learner']),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
export type UserCreationInput = z.infer<typeof userCreationSchema>;
