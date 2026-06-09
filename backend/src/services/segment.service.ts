import { eq, desc, sql, and, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { segments } from '../db/schema/segments.js';
import { modules } from '../db/schema/modules.js';
import { AppError } from '../utils/AppError.js';
import type { SegmentStatus } from '../schemas/segment.schemas.js';
import type { PaginatedResult } from './user-management.service.js';
import { generateUniqueSlug, isUuid } from './slug.service.js';

/**
 * Valid status transitions for segments.
 * Key = current status, Value = array of allowed target statuses.
 */
const VALID_TRANSITIONS: Record<SegmentStatus, SegmentStatus[]> = {
  draft: ['active', 'archived'],
  active: ['archived'],
  archived: [],
};

/**
 * Segment Service — handles all business logic for segment CRUD and status management.
 */
export const segmentService = {
  async resolveIdentifier(identifier: string) {
    const condition = isUuid(identifier)
      ? or(eq(segments.id, identifier), eq(segments.slug, identifier))
      : eq(segments.slug, identifier);

    const [segment] = await db
      .select()
      .from(segments)
      .where(condition)
      .limit(1);

    if (!segment) {
      throw AppError.notFound('Segment not found');
    }

    return segment;
  },

  /**
   * Create a new segment with default status "draft".
   */
  async create(data: { title: string; description?: string; duration: number }) {
    const slug = await generateUniqueSlug(segments, segments.id, segments.slug, data.title, 'segment');
    const [segment] = await db
      .insert(segments)
      .values({
        title: data.title,
        slug,
        description: data.description ?? null,
        duration: data.duration,
      })
      .returning();

    return segment;
  },

  /**
   * List segments with pagination and optional search and status filter.
   * Search is case-insensitive partial match on title or description.
   * Ordered by created_at descending.
   */
  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: SegmentStatus | 'all';
  }): Promise<PaginatedResult<any>> {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];

    if (params?.search) {
      conditions.push(
        sql`(${segments.title} ILIKE ${`%${params.search}%`} OR ${segments.description} ILIKE ${`%${params.search}%`})`
      );
    }

    if (params?.status && params.status !== 'all') {
      conditions.push(eq(segments.status, params.status));
    }

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(segments)
      .where(whereCondition);

    const total = countResult?.count ?? 0;

    // Get paginated results with module count per segment
    const result = await db
      .select({
        id: segments.id,
        slug: segments.slug,
        title: segments.title,
        description: segments.description,
        duration: segments.duration,
        status: segments.status,
        createdAt: segments.createdAt,
        updatedAt: segments.updatedAt,
        moduleCount: sql<number>`(SELECT count(*)::int FROM "modules" WHERE "modules"."segment_id" = "segments"."id")`,
      })
      .from(segments)
      .where(whereCondition)
      .orderBy(desc(segments.createdAt))
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
   * Get a single segment by ID with its module count.
   * Throws 404 if not found.
   */
  async getById(id: string) {
    const segment = await this.resolveIdentifier(id);

    // Get module count for this segment
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(modules)
      .where(eq(modules.segmentId, segment.id));

    return {
      ...segment,
      moduleCount: countResult?.count ?? 0,
    };
  },

  /**
   * Update a segment's title, description, duration, and/or status.
   * If status is provided, validates the transition.
   * Throws 404 if not found.
   */
  async update(id: string, data: { title?: string; description?: string; duration?: number; status?: SegmentStatus }) {
    const existing = await this.resolveIdentifier(id);

    // Validate status transition if status is being changed
    if (data.status && data.status !== existing.status) {
      const currentStatus = existing.status as SegmentStatus;
      const allowedTransitions = VALID_TRANSITIONS[currentStatus];

      if (!allowedTransitions.includes(data.status)) {
        if (currentStatus === 'archived') {
          throw new AppError(
            400,
            'INVALID_STATUS_TRANSITION',
            'Archived segments cannot change status',
            { currentStatus, requestedStatus: data.status, validTransitions: allowedTransitions }
          );
        }
        throw new AppError(
          400,
          'INVALID_STATUS_TRANSITION',
          `Cannot transition from "${currentStatus}" to "${data.status}"`,
          { currentStatus, requestedStatus: data.status, validTransitions: allowedTransitions }
        );
      }
    }

    // Build update payload
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.title !== undefined) {
      updateData.title = data.title;
      updateData.slug = await generateUniqueSlug(segments, segments.id, segments.slug, data.title, 'segment', existing.id);
    }
    if (data.description !== undefined) updateData.description = data.description;
    if (data.duration !== undefined) updateData.duration = data.duration;
    if (data.status !== undefined) updateData.status = data.status;

    const [updated] = await db
      .update(segments)
      .set(updateData)
      .where(eq(segments.id, existing.id))
      .returning();

    return updated;
  },

  /**
   * Delete a segment by ID.
   * Throws 400 if the segment has associated modules.
   * Throws 404 if not found.
   */
  async delete(id: string) {
    const existing = await this.resolveIdentifier(id);

    // Check for child modules
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(modules)
      .where(eq(modules.segmentId, existing.id));

    const moduleCount = countResult?.count ?? 0;

    if (moduleCount > 0) {
      throw new AppError(
        400,
        'HAS_CHILDREN',
        'Cannot delete segment with existing modules. Remove all modules first.',
        { moduleCount }
      );
    }

    await db.delete(segments).where(eq(segments.id, existing.id));
  },
};
