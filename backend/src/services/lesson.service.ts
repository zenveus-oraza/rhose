import { eq, asc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { lessons } from '../db/schema/lessons.js';
import { modules } from '../db/schema/modules.js';
import { AppError } from '../utils/AppError.js';
import type { PaginatedResult } from './user-management.service.js';

/**
 * Lesson Service — handles all business logic for lesson CRUD and sort order management.
 * Supports content_type conditional fields and estimated time fields.
 */
export const lessonService = {
  /**
   * Verify that a module exists. Throws 404 if not found.
   */
  async verifyModuleExists(moduleId: string) {
    const [module] = await db
      .select({ id: modules.id })
      .from(modules)
      .where(eq(modules.id, moduleId))
      .limit(1);

    if (!module) {
      throw AppError.notFound('Parent module does not exist');
    }

    return module;
  },

  /**
   * Create a new lesson within a module with auto-assigned sort_order.
   * sort_order is set to max(sort_order) + 1 within the module.
   */
  async create(moduleId: string, data: {
    title: string;
    content_type: 'text' | 'video';
    content_body?: string;
    video_url?: string;
    estimated_time_value?: number | null;
    estimated_time_unit?: 'minutes' | 'hours' | null;
  }) {
    // Verify parent module exists
    await this.verifyModuleExists(moduleId);

    // Get the next sort_order for this module
    const [maxResult] = await db
      .select({ maxOrder: sql<number>`coalesce(max(${lessons.sortOrder}), 0)` })
      .from(lessons)
      .where(eq(lessons.moduleId, moduleId));

    const nextSortOrder = (maxResult?.maxOrder ?? 0) + 1;

    const [lesson] = await db
      .insert(lessons)
      .values({
        moduleId,
        title: data.title,
        contentType: data.content_type,
        contentBody: data.content_body ?? null,
        videoUrl: data.video_url ?? null,
        estimatedTimeValue: data.estimated_time_value ?? null,
        estimatedTimeUnit: data.estimated_time_unit ?? null,
        sortOrder: nextSortOrder,
      })
      .returning();

    return lesson;
  },

  /**
   * List lessons for a module with pagination, ordered by sort_order ascending.
   * Includes estimated time fields in the response.
   * Throws 404 if the module does not exist.
   */
  async listByModule(moduleId: string, params?: { page?: number; limit?: number }): Promise<PaginatedResult<any>> {
    // Verify parent module exists
    await this.verifyModuleExists(moduleId);

    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const offset = (page - 1) * limit;

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(lessons)
      .where(eq(lessons.moduleId, moduleId));

    const total = countResult?.count ?? 0;

    // Get paginated results with estimated time fields
    const result = await db
      .select({
        id: lessons.id,
        title: lessons.title,
        contentType: lessons.contentType,
        estimatedTimeValue: lessons.estimatedTimeValue,
        estimatedTimeUnit: lessons.estimatedTimeUnit,
        sortOrder: lessons.sortOrder,
        moduleId: lessons.moduleId,
        createdAt: lessons.createdAt,
        updatedAt: lessons.updatedAt,
      })
      .from(lessons)
      .where(eq(lessons.moduleId, moduleId))
      .orderBy(asc(lessons.sortOrder))
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
   * Get a single lesson by ID with full content (content_body or video_url)
   * and estimated time fields.
   * Throws 404 if not found.
   */
  async getById(id: string) {
    const [lesson] = await db
      .select()
      .from(lessons)
      .where(eq(lessons.id, id))
      .limit(1);

    if (!lesson) {
      throw AppError.notFound('Lesson not found');
    }

    return lesson;
  },

  /**
   * Update a lesson's fields including estimated time.
   * Throws 404 if not found.
   */
  async update(id: string, data: {
    title?: string;
    content_type?: 'text' | 'video';
    content_body?: string;
    video_url?: string;
    estimated_time_value?: number | null;
    estimated_time_unit?: 'minutes' | 'hours' | null;
  }) {
    // Check lesson exists
    const [existing] = await db
      .select()
      .from(lessons)
      .where(eq(lessons.id, id))
      .limit(1);

    if (!existing) {
      throw AppError.notFound('Lesson not found');
    }

    // Build update payload
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content_type !== undefined) updateData.contentType = data.content_type;
    if (data.content_body !== undefined) updateData.contentBody = data.content_body;
    if (data.video_url !== undefined) updateData.videoUrl = data.video_url;
    if (data.estimated_time_value !== undefined) updateData.estimatedTimeValue = data.estimated_time_value;
    if (data.estimated_time_unit !== undefined) updateData.estimatedTimeUnit = data.estimated_time_unit;

    const [updated] = await db
      .update(lessons)
      .set(updateData)
      .where(eq(lessons.id, id))
      .returning();

    return updated;
  },

  /**
   * Reorder lessons within a module.
   * Accepts an array of lesson IDs in the desired order.
   * Assigns contiguous sort_order values starting from 1.
   * Throws 404 if the module does not exist.
   */
  async reorder(moduleId: string, orderedIds: string[]) {
    // Verify parent module exists
    await this.verifyModuleExists(moduleId);

    // Verify all IDs belong to this module
    const existingLessons = await db
      .select({ id: lessons.id })
      .from(lessons)
      .where(eq(lessons.moduleId, moduleId));

    const existingIds = new Set(existingLessons.map((l) => l.id));

    for (const id of orderedIds) {
      if (!existingIds.has(id)) {
        throw AppError.badRequest(`Lesson ID "${id}" does not belong to this module`);
      }
    }

    // Check that all lessons in the module are included
    if (orderedIds.length !== existingLessons.length) {
      throw AppError.badRequest(
        'orderedIds must include all lessons in the module',
        { expected: existingLessons.length, received: orderedIds.length }
      );
    }

    // Update sort_order for each lesson
    for (let i = 0; i < orderedIds.length; i++) {
      await db
        .update(lessons)
        .set({ sortOrder: i + 1, updatedAt: new Date() })
        .where(eq(lessons.id, orderedIds[i]));
    }
  },

  /**
   * Delete a lesson by ID.
   * After deletion, reorders remaining lessons to maintain contiguous sort_order.
   * Throws 404 if not found.
   */
  async delete(id: string) {
    // Check lesson exists
    const [existing] = await db
      .select()
      .from(lessons)
      .where(eq(lessons.id, id))
      .limit(1);

    if (!existing) {
      throw AppError.notFound('Lesson not found');
    }

    const moduleId = existing.moduleId;

    // Delete the lesson
    await db.delete(lessons).where(eq(lessons.id, id));

    // Reorder remaining lessons in the module to maintain contiguous sort_order
    const remainingLessons = await db
      .select({ id: lessons.id })
      .from(lessons)
      .where(eq(lessons.moduleId, moduleId))
      .orderBy(asc(lessons.sortOrder));

    for (let i = 0; i < remainingLessons.length; i++) {
      await db
        .update(lessons)
        .set({ sortOrder: i + 1 })
        .where(eq(lessons.id, remainingLessons[i].id));
    }
  },
};
