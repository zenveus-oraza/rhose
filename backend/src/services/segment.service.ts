import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { segments } from '../db/schema/segments.js';
import { modules } from '../db/schema/modules.js';
import { AppError } from '../utils/AppError.js';
import type { SegmentStatus } from '../schemas/segment.schemas.js';

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
  /**
   * Create a new segment with default status "draft".
   */
  async create(data: { title: string; description?: string }) {
    const [segment] = await db
      .insert(segments)
      .values({
        title: data.title,
        description: data.description ?? null,
      })
      .returning();

    return segment;
  },

  /**
   * List all segments ordered by created_at descending.
   */
  async list() {
    const result = await db
      .select()
      .from(segments)
      .orderBy(desc(segments.createdAt));

    return result;
  },

  /**
   * Get a single segment by ID with its module count.
   * Throws 404 if not found.
   */
  async getById(id: string) {
    const [segment] = await db
      .select()
      .from(segments)
      .where(eq(segments.id, id))
      .limit(1);

    if (!segment) {
      throw AppError.notFound('Segment not found');
    }

    // Get module count for this segment
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(modules)
      .where(eq(modules.segmentId, id));

    return {
      ...segment,
      moduleCount: countResult?.count ?? 0,
    };
  },

  /**
   * Update a segment's title, description, and/or status.
   * If status is provided, validates the transition.
   * Throws 404 if not found.
   */
  async update(id: string, data: { title?: string; description?: string; status?: SegmentStatus }) {
    // Fetch existing segment
    const [existing] = await db
      .select()
      .from(segments)
      .where(eq(segments.id, id))
      .limit(1);

    if (!existing) {
      throw AppError.notFound('Segment not found');
    }

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
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;

    const [updated] = await db
      .update(segments)
      .set(updateData)
      .where(eq(segments.id, id))
      .returning();

    return updated;
  },

  /**
   * Delete a segment by ID.
   * Throws 400 if the segment has associated modules.
   * Throws 404 if not found.
   */
  async delete(id: string) {
    // Check segment exists
    const [existing] = await db
      .select()
      .from(segments)
      .where(eq(segments.id, id))
      .limit(1);

    if (!existing) {
      throw AppError.notFound('Segment not found');
    }

    // Check for child modules
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(modules)
      .where(eq(modules.segmentId, id));

    const moduleCount = countResult?.count ?? 0;

    if (moduleCount > 0) {
      throw new AppError(
        400,
        'HAS_CHILDREN',
        'Cannot delete segment with existing modules. Remove all modules first.',
        { moduleCount }
      );
    }

    await db.delete(segments).where(eq(segments.id, id));
  },
};
