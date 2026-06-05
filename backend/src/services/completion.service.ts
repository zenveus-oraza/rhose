import { eq, and, asc, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { lessons, modules, lessonCompletions } from '../db/schema/index.js';
import { segmentAccessService } from './segment-access.service.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CompletionResult {
  alreadyCompleted: boolean;
  nextLessonId: string | null;
  moduleComplete: boolean;
  segmentComplete: boolean;
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Completion Service — handles marking lessons as complete,
 * with idempotent behavior, access checks, and progress tracking.
 */
export const completionService = {
  /**
   * Mark a lesson as completed for a user.
   *
   * - Returns null if the lesson does not exist.
   * - Returns { granted: false, ... } result from segment access check if denied.
   * - Idempotent: duplicate completions return 200 with alreadyCompleted: true.
   * - Returns progress state: nextLessonId, moduleComplete, segmentComplete.
   */
  async completeLesson(
    userId: string,
    lessonId: string
  ): Promise<CompletionResult | null | { granted: false; code: string }> {
    // 1. Verify the lesson exists
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
      return null;
    }

    // 2. Get the module to find the segment
    const [module] = await db
      .select({
        id: modules.id,
        segmentId: modules.segmentId,
        sortOrder: modules.sortOrder,
      })
      .from(modules)
      .where(eq(modules.id, lesson.moduleId))
      .limit(1);

    if (!module) {
      return null;
    }

    // 3. Enforce segment access check
    const accessResult = await segmentAccessService.verifyAccess(userId, module.segmentId);
    if (!accessResult.granted) {
      return { granted: false as const, code: (accessResult as { granted: false; code: string }).code };
    }

    // 4. Check if already completed (idempotency)
    const [existing] = await db
      .select({ id: lessonCompletions.id })
      .from(lessonCompletions)
      .where(
        and(
          eq(lessonCompletions.userId, userId),
          eq(lessonCompletions.lessonId, lessonId)
        )
      )
      .limit(1);

    if (existing) {
      // Already completed — return current progress state
      const progressState = await this.getProgressState(userId, lesson, module);
      return {
        alreadyCompleted: true,
        ...progressState,
      };
    }

    // 5. Insert lesson_completion record with conflict safety net for race conditions
    await db
      .insert(lessonCompletions)
      .values({
        userId,
        lessonId,
      })
      .onConflictDoNothing();

    // 6. Return progress state
    const progressState = await this.getProgressState(userId, lesson, module);
    return {
      alreadyCompleted: false,
      ...progressState,
    };
  },

  /**
   * Determine progress state after a completion:
   * - nextLessonId: next lesson in sort_order (same module, or first in next module)
   * - moduleComplete: all lessons in the module completed
   * - segmentComplete: all lessons across all modules in the segment completed
   */
  async getProgressState(
    userId: string,
    lesson: { id: string; moduleId: string; sortOrder: number },
    module: { id: string; segmentId: string; sortOrder: number }
  ): Promise<{ nextLessonId: string | null; moduleComplete: boolean; segmentComplete: boolean }> {
    // Get all lessons in the current module ordered by sort_order
    const moduleLessons = await db
      .select({ id: lessons.id, sortOrder: lessons.sortOrder })
      .from(lessons)
      .where(eq(lessons.moduleId, lesson.moduleId))
      .orderBy(asc(lessons.sortOrder));

    // Get completions for this user in this module
    const moduleLessonIds = moduleLessons.map((l) => l.id);
    const moduleCompletions = moduleLessonIds.length > 0
      ? await db
          .select({ lessonId: lessonCompletions.lessonId })
          .from(lessonCompletions)
          .where(
            and(
              eq(lessonCompletions.userId, userId),
              inArray(lessonCompletions.lessonId, moduleLessonIds)
            )
          )
      : [];

    const completedSet = new Set(moduleCompletions.map((c) => c.lessonId));

    // Check if module is complete (all lessons in module completed)
    const moduleComplete = moduleLessons.every((l) => completedSet.has(l.id));

    // Find next lesson in same module (next by sort_order after current)
    let nextLessonId: string | null = null;
    const currentIndex = moduleLessons.findIndex((l) => l.id === lesson.id);
    if (currentIndex >= 0 && currentIndex < moduleLessons.length - 1) {
      nextLessonId = moduleLessons[currentIndex + 1].id;
    }

    // If no next lesson in same module, find first lesson in next module
    if (nextLessonId === null) {
      const nextModules = await db
        .select({ id: modules.id })
        .from(modules)
        .where(eq(modules.segmentId, module.segmentId))
        .orderBy(asc(modules.sortOrder));

      // Find the module after the current one
      const currentModuleIndex = nextModules.findIndex((m) => m.id === module.id);
      if (currentModuleIndex >= 0 && currentModuleIndex < nextModules.length - 1) {
        const nextModule = nextModules[currentModuleIndex + 1];
        const [firstLesson] = await db
          .select({ id: lessons.id })
          .from(lessons)
          .where(eq(lessons.moduleId, nextModule.id))
          .orderBy(asc(lessons.sortOrder))
          .limit(1);

        if (firstLesson) {
          nextLessonId = firstLesson.id;
        }
      }
    }

    // Check if segment is complete (all lessons across all modules completed)
    let segmentComplete = false;
    if (moduleComplete) {
      // Only check full segment if at least this module is complete
      const allSegmentModules = await db
        .select({ id: modules.id })
        .from(modules)
        .where(eq(modules.segmentId, module.segmentId));

      const allModuleIds = allSegmentModules.map((m) => m.id);

      // Get all lessons across all modules in the segment
      const allSegmentLessons = allModuleIds.length > 0
        ? await db
            .select({ id: lessons.id })
            .from(lessons)
            .where(inArray(lessons.moduleId, allModuleIds))
        : [];

      if (allSegmentLessons.length > 0) {
        const allLessonIds = allSegmentLessons.map((l) => l.id);
        const allCompletions = await db
          .select({ lessonId: lessonCompletions.lessonId })
          .from(lessonCompletions)
          .where(
            and(
              eq(lessonCompletions.userId, userId),
              inArray(lessonCompletions.lessonId, allLessonIds)
            )
          );

        const allCompletedSet = new Set(allCompletions.map((c) => c.lessonId));
        segmentComplete = allSegmentLessons.every((l) => allCompletedSet.has(l.id));
      } else {
        // No lessons in segment means it's trivially complete
        segmentComplete = true;
      }
    }

    return { nextLessonId, moduleComplete, segmentComplete };
  },
};
