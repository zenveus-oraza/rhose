import { eq, asc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { modules } from '../db/schema/modules.js';
import { segments } from '../db/schema/segments.js';
import { lessons } from '../db/schema/lessons.js';
import { AppError } from '../utils/AppError.js';

/**
 * Module Service — handles all business logic for module CRUD and sort order management.
 */
export const moduleService = {
  /**
   * Verify that a segment exists. Throws 404 if not found.
   */
  async verifySegmentExists(segmentId: string) {
    const [segment] = await db
      .select({ id: segments.id })
      .from(segments)
      .where(eq(segments.id, segmentId))
      .limit(1);

    if (!segment) {
      throw AppError.notFound('Parent segment does not exist');
    }

    return segment;
  },

  /**
   * Create a new module within a segment with auto-assigned sort_order.
   * sort_order is set to max(sort_order) + 1 within the segment.
   */
  async create(segmentId: string, data: { title: string; description?: string }) {
    // Verify parent segment exists
    await this.verifySegmentExists(segmentId);

    // Get the next sort_order for this segment
    const [maxResult] = await db
      .select({ maxOrder: sql<number>`coalesce(max(${modules.sortOrder}), 0)` })
      .from(modules)
      .where(eq(modules.segmentId, segmentId));

    const nextSortOrder = (maxResult?.maxOrder ?? 0) + 1;

    const [module] = await db
      .insert(modules)
      .values({
        segmentId,
        title: data.title,
        description: data.description ?? null,
        sortOrder: nextSortOrder,
      })
      .returning();

    return module;
  },

  /**
   * List all modules for a segment ordered by sort_order ascending, with lesson count.
   * Throws 404 if the segment does not exist.
   */
  async listBySegment(segmentId: string) {
    // Verify parent segment exists
    await this.verifySegmentExists(segmentId);

    const result = await db
      .select({
        id: modules.id,
        title: modules.title,
        description: modules.description,
        segmentId: modules.segmentId,
        sortOrder: modules.sortOrder,
        createdAt: modules.createdAt,
        updatedAt: modules.updatedAt,
        lessonCount: sql<number>`(
          SELECT count(*)::int FROM lessons WHERE lessons.module_id = ${modules.id}
        )`,
      })
      .from(modules)
      .where(eq(modules.segmentId, segmentId))
      .orderBy(asc(modules.sortOrder));

    return result;
  },

  /**
   * Update a module's title and/or description.
   * Throws 404 if not found.
   */
  async update(id: string, data: { title?: string; description?: string }) {
    // Check module exists
    const [existing] = await db
      .select()
      .from(modules)
      .where(eq(modules.id, id))
      .limit(1);

    if (!existing) {
      throw AppError.notFound('Module not found');
    }

    // Build update payload
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;

    const [updated] = await db
      .update(modules)
      .set(updateData)
      .where(eq(modules.id, id))
      .returning();

    return updated;
  },

  /**
   * Reorder modules within a segment.
   * Accepts an array of module IDs in the desired order.
   * Assigns contiguous sort_order values starting from 1.
   * Throws 404 if the segment does not exist.
   */
  async reorder(segmentId: string, orderedIds: string[]) {
    // Verify parent segment exists
    await this.verifySegmentExists(segmentId);

    // Verify all IDs belong to this segment
    const existingModules = await db
      .select({ id: modules.id })
      .from(modules)
      .where(eq(modules.segmentId, segmentId));

    const existingIds = new Set(existingModules.map((m) => m.id));

    for (const id of orderedIds) {
      if (!existingIds.has(id)) {
        throw AppError.badRequest(`Module ID "${id}" does not belong to this segment`);
      }
    }

    // Check that all modules in the segment are included
    if (orderedIds.length !== existingModules.length) {
      throw AppError.badRequest(
        'orderedIds must include all modules in the segment',
        { expected: existingModules.length, received: orderedIds.length }
      );
    }

    // Update sort_order for each module
    for (let i = 0; i < orderedIds.length; i++) {
      await db
        .update(modules)
        .set({ sortOrder: i + 1, updatedAt: new Date() })
        .where(eq(modules.id, orderedIds[i]));
    }
  },

  /**
   * Delete a module by ID.
   * Throws 400 if the module has associated lessons.
   * Throws 404 if not found.
   * After deletion, reorders remaining modules to maintain contiguous sort_order.
   */
  async delete(id: string) {
    // Check module exists
    const [existing] = await db
      .select()
      .from(modules)
      .where(eq(modules.id, id))
      .limit(1);

    if (!existing) {
      throw AppError.notFound('Module not found');
    }

    // Check for child lessons
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(lessons)
      .where(eq(lessons.moduleId, id));

    const lessonCount = countResult?.count ?? 0;

    if (lessonCount > 0) {
      throw new AppError(
        400,
        'HAS_CHILDREN',
        'Cannot delete module with existing lessons. Remove all lessons first.',
        { lessonCount }
      );
    }

    const segmentId = existing.segmentId;

    // Delete the module
    await db.delete(modules).where(eq(modules.id, id));

    // Reorder remaining modules in the segment to maintain contiguous sort_order
    const remainingModules = await db
      .select({ id: modules.id })
      .from(modules)
      .where(eq(modules.segmentId, segmentId))
      .orderBy(asc(modules.sortOrder));

    for (let i = 0; i < remainingModules.length; i++) {
      await db
        .update(modules)
        .set({ sortOrder: i + 1 })
        .where(eq(modules.id, remainingModules[i].id));
    }
  },
};
