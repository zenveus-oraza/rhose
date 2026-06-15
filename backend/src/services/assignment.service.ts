import { eq, and, sql, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { segmentAssignments } from '../db/schema/segment-assignments.js';
import { users } from '../db/schema/users.js';
import { segments } from '../db/schema/segments.js';
import { AppError } from '../utils/AppError.js';
import type { PaginatedResult } from './user-management.service.js';

/**
 * Assignment Service — handles assigning and removing users from segments.
 */
export const assignmentService = {
  /**
   * Assign a user to a segment.
   * Throws 404 if user or segment does not exist.
   * Throws 409 if assignment already exists.
   */
  async assign(data: { userId: string; segmentId: string; accessDurationDays?: number | null }) {
    // Verify user exists
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, data.userId))
      .limit(1);

    if (!user) {
      throw AppError.notFound('User not found');
    }

    // Verify segment exists
    const [segment] = await db
      .select({ id: segments.id })
      .from(segments)
      .where(eq(segments.id, data.segmentId))
      .limit(1);

    if (!segment) {
      throw AppError.notFound('Segment not found');
    }

    // Check for duplicate assignment
    const [duplicateAssignment] = await db
      .select({ id: segmentAssignments.id, assignedAt: segmentAssignments.assignedAt })
      .from(segmentAssignments)
      .where(
        and(
          eq(segmentAssignments.userId, data.userId),
          eq(segmentAssignments.segmentId, data.segmentId)
        )
      )
      .limit(1);

    if (duplicateAssignment) {
      throw new AppError(
        409,
        'CONFLICT',
        'Assignment already exists',
        { assignedAt: duplicateAssignment.assignedAt }
      );
    }

    // Create assignment
    const [assignment] = await db
      .insert(segmentAssignments)
      .values({
        userId: data.userId,
        segmentId: data.segmentId,
        accessDurationDays: data.accessDurationDays ?? null,
      })
      .returning();

    return assignment;
  },

  /**
   * Remove an assignment by ID.
   * Throws 404 if assignment does not exist.
   */
  async remove(id: string) {
    const [existing] = await db
      .select({ id: segmentAssignments.id })
      .from(segmentAssignments)
      .where(eq(segmentAssignments.id, id))
      .limit(1);

    if (!existing) {
      throw AppError.notFound('Assignment not found');
    }

    await db.delete(segmentAssignments).where(eq(segmentAssignments.id, id));
  },

  /**
   * List users assigned to a specific segment with pagination.
   * Returns user profiles with assignment metadata.
   * Ordered by assignedAt descending.
   */
  async listBySegment(
    segmentId: string,
    params?: { page?: number; limit?: number }
  ): Promise<PaginatedResult<any>> {
    // Verify segment exists
    const [segment] = await db
      .select({ id: segments.id })
      .from(segments)
      .where(eq(segments.id, segmentId))
      .limit(1);

    if (!segment) {
      throw AppError.notFound('Segment not found');
    }

    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const offset = (page - 1) * limit;

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(segmentAssignments)
      .where(eq(segmentAssignments.segmentId, segmentId));

    const total = countResult?.count ?? 0;

    // Get paginated results
    const results = await db
      .select({
        id: segmentAssignments.id,
        userId: users.id,
        name: users.name,
        email: users.email,
        jobTitle: users.jobTitle,
        role: users.role,
        status: users.status,
        assignedAt: segmentAssignments.assignedAt,
        accessDurationDays: segmentAssignments.accessDurationDays,
      })
      .from(segmentAssignments)
      .innerJoin(users, eq(segmentAssignments.userId, users.id))
      .where(eq(segmentAssignments.segmentId, segmentId))
      .orderBy(desc(segmentAssignments.assignedAt))
      .limit(limit)
      .offset(offset);

    return {
      data: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * List segments assigned to a specific user with pagination.
   * Returns segment info with assignment metadata.
   * Ordered by assignedAt descending.
   */
  async listByUser(
    userId: string,
    params?: { page?: number; limit?: number }
  ): Promise<PaginatedResult<any>> {
    // Verify user exists
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw AppError.notFound('User not found');
    }

    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const offset = (page - 1) * limit;

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(segmentAssignments)
      .where(eq(segmentAssignments.userId, userId));

    const total = countResult?.count ?? 0;

    // Get paginated results
    const results = await db
      .select({
        id: segmentAssignments.id,
        segmentId: segments.id,
        title: segments.title,
        status: segments.status,
        assignedAt: segmentAssignments.assignedAt,
        accessDurationDays: segmentAssignments.accessDurationDays,
      })
      .from(segmentAssignments)
      .innerJoin(segments, eq(segmentAssignments.segmentId, segments.id))
      .where(eq(segmentAssignments.userId, userId))
      .orderBy(desc(segmentAssignments.assignedAt))
      .limit(limit)
      .offset(offset);

    return {
      data: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },
};
