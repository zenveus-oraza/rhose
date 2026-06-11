import { eq, asc, sql, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { modules } from '../db/schema/modules.js';
import { segments } from '../db/schema/segments.js';
import { lessons } from '../db/schema/lessons.js';
import { AppError } from '../utils/AppError.js';
import type { PaginatedResult } from './user-management.service.js';
import { generateUniqueSlug, isUuid } from './slug.service.js';

/**
 * Module Service — handles all business logic for module CRUD and sort order management.
 */
export const moduleService = {
  async resolveIdentifier(identifier: string) {
    const condition = isUuid(identifier)
      ? or(eq(modules.id, identifier), eq(modules.slug, identifier))
      : eq(modules.slug, identifier);

    const [module] = await db
      .select()
      .from(modules)
      .where(condition)
      .limit(1);

    if (!module) {
      throw AppError.notFound('Module not found');
    }

    return module;
  },

  /**
   * Verify that a segment exists. Throws 404 if not found.
   */
  async verifySegmentExists(segmentIdentifier: string) {
    const condition = isUuid(segmentIdentifier)
      ? or(eq(segments.id, segmentIdentifier), eq(segments.slug, segmentIdentifier))
      : eq(segments.slug, segmentIdentifier);

    const [segment] = await db
      .select({ id: segments.id, slug: segments.slug })
      .from(segments)
      .where(condition)
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
    const segment = await this.verifySegmentExists(segmentId);

    // Get the next sort_order for this segment
    const [maxResult] = await db
      .select({ maxOrder: sql<number>`coalesce(max(${modules.sortOrder}), 0)` })
      .from(modules)
      .where(eq(modules.segmentId, segment.id));

    const nextSortOrder = (maxResult?.maxOrder ?? 0) + 1;
    const slug = await generateUniqueSlug(modules, modules.id, modules.slug, data.title, 'module');

    const [module] = await db
      .insert(modules)
      .values({
        segmentId: segment.id,
        title: data.title,
        slug,
        description: data.description ?? null,
        sortOrder: nextSortOrder,
      })
      .returning();

    return module;
  },

  /**
   * List modules for a segment with pagination, ordered by sort_order ascending.
   * Throws 404 if the segment does not exist.
   */
  async listBySegment(
    segmentId: string,
    params?: { page?: number; limit?: number }
  ): Promise<PaginatedResult<any>> {
    // Verify parent segment exists
    const segment = await this.verifySegmentExists(segmentId);

    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const offset = (page - 1) * limit;

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(modules)
      .where(eq(modules.segmentId, segment.id));

    const total = countResult?.count ?? 0;

    // Get paginated results
    const result = await db
      .select({
        id: modules.id,
        slug: modules.slug,
        title: modules.title,
        description: modules.description,
        segmentId: modules.segmentId,
        sortOrder: modules.sortOrder,
        createdAt: modules.createdAt,
        updatedAt: modules.updatedAt,
        lessonCount: sql<number>`(SELECT count(*)::int FROM "lessons" WHERE "lessons"."module_id" = "modules"."id")`,
      })
      .from(modules)
      .where(eq(modules.segmentId, segment.id))
      .orderBy(asc(modules.sortOrder))
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
   * Update a module's title and/or description.
   * Throws 404 if not found.
   */
  async update(id: string, data: { title?: string; description?: string }) {
    const existing = await this.resolveIdentifier(id);

    // Build update payload
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.title !== undefined) {
      updateData.title = data.title;
      updateData.slug = await generateUniqueSlug(modules, modules.id, modules.slug, data.title, 'module', existing.id);
    }
    if (data.description !== undefined) updateData.description = data.description;

    const [updated] = await db
      .update(modules)
      .set(updateData)
      .where(eq(modules.id, existing.id))
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
    const segment = await this.verifySegmentExists(segmentId);

    // Verify all IDs belong to this segment
    const existingModules = await db
      .select({ id: modules.id })
      .from(modules)
      .where(eq(modules.segmentId, segment.id));

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
    const existing = await this.resolveIdentifier(id);

    // Check for child lessons
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(lessons)
      .where(eq(lessons.moduleId, existing.id));

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
    await db.delete(modules).where(eq(modules.id, existing.id));

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
