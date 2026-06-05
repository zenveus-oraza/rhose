import { eq, and, asc, inArray, lt } from 'drizzle-orm';
import { db } from '../db/index.js';
import { segments, modules, lessons, lessonCompletions } from '../db/schema/index.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ModuleSummary {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  lessonCount: number;
  completedCount: number;
}

export interface SegmentDetail {
  id: string;
  title: string;
  description: string | null;
  status: string;
  modules: ModuleSummary[];
}

export interface LessonWithStatus {
  id: string;
  title: string;
  contentType: string;
  sortOrder: number;
  estimatedTimeValue: number | null;
  estimatedTimeUnit: string | null;
  completed: boolean;
  accessible: boolean;
}

export interface LessonContent {
  id: string;
  title: string;
  contentType: string;
  contentBody: string | null;
  videoUrl: string | null;
}

export type AccessResult =
  | { accessible: true }
  | { accessible: false; code: 'LESSON_LOCKED'; prerequisiteLessonId: string };

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Navigation Service — handles lesson navigation, access checks,
 * and progress tracking for the user learning experience.
 */
export const navigationService = {
  /**
   * Get segment details with modules and completion counts.
   */
  async getSegmentDetail(segmentId: string, userId: string): Promise<SegmentDetail | null> {
    // Get the segment
    const [segment] = await db
      .select({
        id: segments.id,
        title: segments.title,
        description: segments.description,
        status: segments.status,
      })
      .from(segments)
      .where(eq(segments.id, segmentId))
      .limit(1);

    if (!segment) {
      return null;
    }

    // Get all modules for the segment
    const segmentModules = await db
      .select({
        id: modules.id,
        title: modules.title,
        description: modules.description,
        sortOrder: modules.sortOrder,
      })
      .from(modules)
      .where(eq(modules.segmentId, segmentId))
      .orderBy(asc(modules.sortOrder));

    // For each module, get lesson count and completed count
    const moduleSummaries: ModuleSummary[] = await Promise.all(
      segmentModules.map(async (mod) => {
        const moduleLessons = await db
          .select({ id: lessons.id })
          .from(lessons)
          .where(eq(lessons.moduleId, mod.id));

        const lessonIds = moduleLessons.map((l) => l.id);
        let completedCount = 0;

        if (lessonIds.length > 0) {
          const completions = await db
            .select({ id: lessonCompletions.id })
            .from(lessonCompletions)
            .where(
              and(
                eq(lessonCompletions.userId, userId),
                inArray(lessonCompletions.lessonId, lessonIds)
              )
            );
          completedCount = completions.length;
        }

        return {
          id: mod.id,
          title: mod.title,
          description: mod.description,
          sortOrder: mod.sortOrder,
          lessonCount: lessonIds.length,
          completedCount,
        };
      })
    );

    return {
      id: segment.id,
      title: segment.title,
      description: segment.description,
      status: segment.status,
      modules: moduleSummaries,
    };
  },

  /**
   * Get lessons for a module with completion status and accessibility.
   */
  async getModuleLessons(moduleId: string, userId: string): Promise<LessonWithStatus[]> {
    // Get all lessons in this module ordered by sort_order
    const moduleLessons = await db
      .select({
        id: lessons.id,
        title: lessons.title,
        contentType: lessons.contentType,
        sortOrder: lessons.sortOrder,
        estimatedTimeValue: lessons.estimatedTimeValue,
        estimatedTimeUnit: lessons.estimatedTimeUnit,
      })
      .from(lessons)
      .where(eq(lessons.moduleId, moduleId))
      .orderBy(asc(lessons.sortOrder));

    if (moduleLessons.length === 0) {
      return [];
    }

    // Get all completions for this user in this module's lessons
    const lessonIds = moduleLessons.map((l) => l.id);
    const completions = await db
      .select({ lessonId: lessonCompletions.lessonId })
      .from(lessonCompletions)
      .where(
        and(
          eq(lessonCompletions.userId, userId),
          inArray(lessonCompletions.lessonId, lessonIds)
        )
      );

    const completedSet = new Set(completions.map((c) => c.lessonId));

    // Build result with accessibility: a lesson is accessible if all prior lessons are completed
    const result: LessonWithStatus[] = moduleLessons.map((lesson, index) => {
      const completed = completedSet.has(lesson.id);

      // First lesson is always accessible
      // Subsequent lessons are accessible only if all prior lessons are completed
      let accessible = true;
      if (index > 0) {
        for (let i = 0; i < index; i++) {
          if (!completedSet.has(moduleLessons[i].id)) {
            accessible = false;
            break;
          }
        }
      }

      return {
        id: lesson.id,
        title: lesson.title,
        contentType: lesson.contentType,
        sortOrder: lesson.sortOrder,
        estimatedTimeValue: lesson.estimatedTimeValue,
        estimatedTimeUnit: lesson.estimatedTimeUnit,
        completed,
        accessible,
      };
    });

    return result;
  },

  /**
   * Get full lesson content (text or video).
   */
  async getLessonContent(lessonId: string): Promise<LessonContent | null> {
    const [lesson] = await db
      .select({
        id: lessons.id,
        title: lessons.title,
        contentType: lessons.contentType,
        contentBody: lessons.contentBody,
        videoUrl: lessons.videoUrl,
      })
      .from(lessons)
      .where(eq(lessons.id, lessonId))
      .limit(1);

    if (!lesson) {
      return null;
    }

    return lesson;
  },

  /**
   * Get the current lesson — first incomplete lesson in sort_order
   * within the first incomplete module.
   */
  async getCurrentLesson(
    segmentId: string,
    userId: string
  ): Promise<{ moduleId: string; lessonId: string } | null> {
    // Get all modules for the segment ordered by sort_order
    const segmentModules = await db
      .select({ id: modules.id })
      .from(modules)
      .where(eq(modules.segmentId, segmentId))
      .orderBy(asc(modules.sortOrder));

    for (const mod of segmentModules) {
      // Get lessons for this module ordered by sort_order
      const moduleLessons = await db
        .select({ id: lessons.id })
        .from(lessons)
        .where(eq(lessons.moduleId, mod.id))
        .orderBy(asc(lessons.sortOrder));

      if (moduleLessons.length === 0) {
        continue;
      }

      const lessonIds = moduleLessons.map((l) => l.id);

      // Get completions for this user in this module
      const completions = await db
        .select({ lessonId: lessonCompletions.lessonId })
        .from(lessonCompletions)
        .where(
          and(
            eq(lessonCompletions.userId, userId),
            inArray(lessonCompletions.lessonId, lessonIds)
          )
        );

      const completedSet = new Set(completions.map((c) => c.lessonId));

      // Find first incomplete lesson
      for (const lesson of moduleLessons) {
        if (!completedSet.has(lesson.id)) {
          return { moduleId: mod.id, lessonId: lesson.id };
        }
      }
      // All lessons in this module are completed, continue to next module
    }

    // All lessons in all modules are completed
    return null;
  },

  /**
   * Check if a lesson is accessible.
   * A lesson is accessible if all prior lessons (lower sort_order) in the same module
   * are completed by the user. The first lesson is always accessible.
   * Returns LESSON_LOCKED with the prerequisite lesson ID when access is denied.
   */
  async canAccessLesson(lessonId: string, userId: string): Promise<AccessResult> {
    // Get the lesson's module and sort_order
    const [lesson] = await db
      .select({
        id: lessons.id,
        moduleId: lessons.moduleId,
        sortOrder: lessons.sortOrder,
      })
      .from(lessons)
      .where(eq(lessons.id, lessonId))
      .limit(1);

    if (!lesson) {
      return { accessible: true };
    }

    // Get all lessons in the same module with sort_order less than this lesson
    const priorLessons = await db
      .select({ id: lessons.id, sortOrder: lessons.sortOrder })
      .from(lessons)
      .where(
        and(
          eq(lessons.moduleId, lesson.moduleId),
          lt(lessons.sortOrder, lesson.sortOrder)
        )
      )
      .orderBy(asc(lessons.sortOrder));

    // First lesson (no prior lessons) is always accessible
    if (priorLessons.length === 0) {
      return { accessible: true };
    }

    // Check which prior lessons are completed
    const priorLessonIds = priorLessons.map((l) => l.id);
    const completions = await db
      .select({ lessonId: lessonCompletions.lessonId })
      .from(lessonCompletions)
      .where(
        and(
          eq(lessonCompletions.userId, userId),
          inArray(lessonCompletions.lessonId, priorLessonIds)
        )
      );

    const completedSet = new Set(completions.map((c) => c.lessonId));

    // Find the first uncompleted prior lesson
    for (const prior of priorLessons) {
      if (!completedSet.has(prior.id)) {
        return {
          accessible: false,
          code: 'LESSON_LOCKED',
          prerequisiteLessonId: prior.id,
        };
      }
    }

    return { accessible: true };
  },
};
