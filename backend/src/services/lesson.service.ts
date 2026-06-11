import { eq, asc, sql, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { lessons } from '../db/schema/lessons.js';
import { lessonCompletions } from '../db/schema/lesson-completions.js';
import { lessonProgress } from '../db/schema/lesson-progress.js';
import { modules } from '../db/schema/modules.js';
import { AppError } from '../utils/AppError.js';
import type { PaginatedResult } from './user-management.service.js';
import { generateUniqueSlug, isUuid } from './slug.service.js';

/**
 * Lesson Service — handles all business logic for lesson CRUD and sort order management.
 * Supports content_type conditional fields and estimated time fields.
 */
export const lessonService = {
  async resolveIdentifier(identifier: string) {
    const condition = isUuid(identifier)
      ? or(eq(lessons.id, identifier), eq(lessons.slug, identifier))
      : eq(lessons.slug, identifier);

    const [lesson] = await db
      .select()
      .from(lessons)
      .where(condition)
      .limit(1);

    if (!lesson) {
      throw AppError.notFound('Lesson not found');
    }

    return lesson;
  },

  /**
   * Verify that a module exists. Throws 404 if not found.
   */
  async verifyModuleExists(moduleIdentifier: string) {
    const condition = isUuid(moduleIdentifier)
      ? or(eq(modules.id, moduleIdentifier), eq(modules.slug, moduleIdentifier))
      : eq(modules.slug, moduleIdentifier);

    const [module] = await db
      .select({ id: modules.id, slug: modules.slug })
      .from(modules)
      .where(condition)
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
    content_type: 'text' | 'video' | 'slides';
    content_body?: string;
    video_url?: string;
    slides_url?: string;
    total_slides?: number | null;
    estimated_time_value?: number | null;
    estimated_time_unit?: 'minutes' | 'hours' | null;
  }) {
    // Verify parent module exists
    const module = await this.verifyModuleExists(moduleId);

    // Get the next sort_order for this module
    const [maxResult] = await db
      .select({ maxOrder: sql<number>`coalesce(max(${lessons.sortOrder}), 0)` })
      .from(lessons)
      .where(eq(lessons.moduleId, module.id));

    const nextSortOrder = (maxResult?.maxOrder ?? 0) + 1;
    const slug = await generateUniqueSlug(lessons, lessons.id, lessons.slug, data.title, 'lesson');

    const [lesson] = await db
      .insert(lessons)
      .values({
        moduleId: module.id,
        title: data.title,
        slug,
        contentType: data.content_type,
        contentBody: data.content_body ?? null,
        videoUrl: data.video_url ?? null,
        slidesUrl: data.slides_url ?? null,
        totalSlides: data.total_slides ?? null,
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
    const module = await this.verifyModuleExists(moduleId);

    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const offset = (page - 1) * limit;

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(lessons)
      .where(eq(lessons.moduleId, module.id));

    const total = countResult?.count ?? 0;

    // Get paginated results with estimated time fields
    const result = await db
      .select({
        id: lessons.id,
        slug: lessons.slug,
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
      .where(eq(lessons.moduleId, module.id))
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
    return this.resolveIdentifier(id);
  },

  /**
   * Update a lesson's fields including estimated time.
   * Throws 404 if not found.
   */
  async update(id: string, data: {
    title?: string;
    content_type?: 'text' | 'video' | 'slides';
    content_body?: string;
    video_url?: string;
    slides_url?: string;
    total_slides?: number | null;
    estimated_time_value?: number | null;
    estimated_time_unit?: 'minutes' | 'hours' | null;
  }) {
    // Check lesson exists
    const existing = await this.resolveIdentifier(id);

    // Build update payload
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.title !== undefined) {
      updateData.title = data.title;
      updateData.slug = await generateUniqueSlug(lessons, lessons.id, lessons.slug, data.title, 'lesson', existing.id);
    }
    if (data.content_type !== undefined) updateData.contentType = data.content_type;
    if (data.content_body !== undefined) updateData.contentBody = data.content_body;
    if (data.video_url !== undefined) updateData.videoUrl = data.video_url;
    if (data.slides_url !== undefined) updateData.slidesUrl = data.slides_url;
    if (data.total_slides !== undefined) updateData.totalSlides = data.total_slides;
    if (data.estimated_time_value !== undefined) updateData.estimatedTimeValue = data.estimated_time_value;
    if (data.estimated_time_unit !== undefined) updateData.estimatedTimeUnit = data.estimated_time_unit;

    const [updated] = await db
      .update(lessons)
      .set(updateData)
      .where(eq(lessons.id, existing.id))
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
    const module = await this.verifyModuleExists(moduleId);

    // Verify all IDs belong to this module
    const existingLessons = await db
      .select({ id: lessons.id })
      .from(lessons)
      .where(eq(lessons.moduleId, module.id));

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
    const existing = await this.resolveIdentifier(id);

    const moduleId = existing.moduleId;

    // Delete associated completion and progress records first (FK restrict)
    await db.delete(lessonCompletions).where(eq(lessonCompletions.lessonId, existing.id));
    await db.delete(lessonProgress).where(eq(lessonProgress.lessonId, existing.id));

    // Delete the lesson
    await db.delete(lessons).where(eq(lessons.id, existing.id));

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
