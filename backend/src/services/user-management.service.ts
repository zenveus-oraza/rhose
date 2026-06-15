import crypto from 'crypto';
import { eq, desc, sql, or, ilike } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema/users.js';
import { hashPassword } from '../utils/password.js';
import { AppError } from '../utils/AppError.js';
import type { UserRole } from '../schemas/user-management.schemas.js';
import { generateUniqueSlug, isUuid } from './slug.service.js';

/**
 * Shape of a user profile returned by the API.
 * Never includes password hash.
 */
export interface UserProfile {
  id: string;
  slug: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Paginated result shape.
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Generate a random temporary password (16 hex characters).
 */
function generateTemporaryPassword(): string {
  return crypto.randomBytes(8).toString('hex');
}

export async function generateUniqueUserSlug(name: string): Promise<string> {
  return generateUniqueSlug(users, users.id, users.slug, name, 'user');
}

/**
 * User Management Service — handles admin-initiated user account operations.
 * Never exposes password hashes in any response.
 */
export const userManagementService = {
  /**
   * Create a new user account with a system-generated temporary password.
   * Returns the user profile and the temporary password (shown once).
   * Throws 409 if email is already in use.
   */
  async create(data: { name: string; email: string; role: UserRole }): Promise<{ user: UserProfile; temporaryPassword: string }> {
    // Check for duplicate email
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (existing) {
      throw AppError.conflict('Email already in use');
    }

    // Generate and hash temporary password
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    const slug = await generateUniqueUserSlug(data.name);

    // Insert user
    const [createdUser] = await db
      .insert(users)
      .values({
        name: data.name,
        slug,
        email: data.email,
        passwordHash,
        role: data.role,
        status: 'active',
      })
      .returning({
        id: users.id,
        slug: users.slug,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        jobTitle: users.jobTitle,
        phone: users.phone,
        profileImage: users.profileImage,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    return {
      user: createdUser,
      temporaryPassword,
    };
  },

  /**
   * List users with pagination and optional search.
   * Search is case-insensitive partial match on name or email.
   * Ordered by created_at descending.
   */
  async list(params: { page?: number; limit?: number; search?: string }): Promise<PaginatedResult<UserProfile>> {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const offset = (page - 1) * limit;

    // Build where condition for search
    const searchCondition = params.search
      ? or(
          ilike(users.name, `%${params.search}%`),
          ilike(users.email, `%${params.search}%`)
        )
      : undefined;

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(searchCondition);

    const total = countResult?.count ?? 0;

    // Get paginated results
    const result = await db
      .select({
        id: users.id,
        slug: users.slug,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        jobTitle: users.jobTitle,
        phone: users.phone,
        profileImage: users.profileImage,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(searchCondition)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      data: result,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Update a user's name, role, phone, jobTitle, or profileImage.
   * Throws 404 if user not found.
   */
  async update(id: string, data: { name?: string; role?: UserRole; phone?: string | null; jobTitle?: string | null; profileImage?: string | null }): Promise<UserProfile> {
    // Check user exists
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!existing) {
      throw AppError.notFound('User not found');
    }

    // Build update payload
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.jobTitle !== undefined) updateData.jobTitle = data.jobTitle;
    if (data.profileImage !== undefined) updateData.profileImage = data.profileImage;

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        slug: users.slug,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        jobTitle: users.jobTitle,
        phone: users.phone,
        profileImage: users.profileImage,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    return updated;
  },

  /**
   * Get a single user profile by slug. Throws 404 if not found.
   */
  async getBySlug(slug: string): Promise<UserProfile> {
    const [profile] = await db
      .select({
        id: users.id,
        slug: users.slug,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        jobTitle: users.jobTitle,
        phone: users.phone,
        profileImage: users.profileImage,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.slug, slug))
      .limit(1);

    if (profile) {
      return profile;
    }

    if (isUuid(slug)) {
      const [profileById] = await db
        .select({
          id: users.id,
          slug: users.slug,
          name: users.name,
          email: users.email,
          role: users.role,
          status: users.status,
          jobTitle: users.jobTitle,
          phone: users.phone,
          profileImage: users.profileImage,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(eq(users.id, slug))
        .limit(1);

      if (profileById) {
        return profileById;
      }
    }

    throw AppError.notFound('User not found');
  },

  /**
   * Deactivate a user account by setting status to "deactivated".
   * Prevents deactivating the last active admin user.
   * Throws 404 if user not found, 400 if last admin.
   */
  async deactivate(id: string): Promise<UserProfile> {
    // Check user exists
    const [existing] = await db
      .select({ id: users.id, role: users.role, status: users.status })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!existing) {
      throw AppError.notFound('User not found');
    }

    // Check if user is admin
    if (existing.role === 'admin' && existing.status !== 'deactivated') {
      // Count active admins (excluding this user)
      const [adminCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(sql`${users.role} = 'admin' AND ${users.status} != 'deactivated' AND ${users.id} != ${id}`);

      if ((adminCount?.count ?? 0) === 0) {
        throw AppError.badRequest('Cannot deactivate the last active admin user');
      }
    }

    const [updated] = await db
      .update(users)
      .set({ status: 'deactivated', updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        slug: users.slug,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        jobTitle: users.jobTitle,
        phone: users.phone,
        profileImage: users.profileImage,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    return updated;
  },

  /**
   * Reset a user's password by generating a new temporary password.
   * Returns the temporary password (shown once to admin).
   * Throws 404 if user not found.
   */
  async resetPassword(id: string): Promise<{ temporaryPassword: string }> {
    // Check user exists
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!existing) {
      throw AppError.notFound('User not found');
    }

    // Generate and hash new temporary password
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);

    // Update password hash
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, id));

    return { temporaryPassword };
  },
};
