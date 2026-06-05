import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { lessons, modules, lessonCompletions } from '../db/schema/index.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SegmentProgress {
  totalLessons: number;
  completedLessons: number;
  percentage: number; // 0-100, rounded integer
}

export interface ModuleProgress {
  moduleId: string;
  totalLessons: number;
  completedLessons: number;
  status: 'complete' | 'in-progress';
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Progress Service — calculates learning progress for segments and modules.
 */
export const progressService = {
  /**
   * Get progress for a segment: total lessons across all modules,
   * how many the user has completed, and the percentage.
   *
   * Returns 0% when the segment has zero lessons.
   */
  async getSegmentProgress(segmentId: string, userId: string): Promise<SegmentProgress> {
    // 1. Get all modules for the segment
    const segmentModules = await db
      .select({ id: modules.id })
      .from(modules)
      .where(eq(modules.segmentId, segmentId));

    const moduleIds = segmentModules.map((m) => m.id);

    // 2. Get all lessons across those modules
    const allLessons = moduleIds.length > 0
      ? await db
          .select({ id: lessons.id })
          .from(lessons)
          .where(inArray(lessons.moduleId, moduleIds))
      : [];

    const totalLessons = allLessons.length;

    // 3. If no lessons, return 0%
    if (totalLessons === 0) {
      return { totalLessons: 0, completedLessons: 0, percentage: 0 };
    }

    // 4. Count completions for this user
    const lessonIds = allLessons.map((l) => l.id);
    const completions = await db
      .select({ lessonId: lessonCompletions.lessonId })
      .from(lessonCompletions)
      .where(
        and(
          eq(lessonCompletions.userId, userId),
          inArray(lessonCompletions.lessonId, lessonIds)
        )
      );

    const completedLessons = completions.length;

    // 5. Calculate percentage: round((completed / total) * 100)
    const percentage = Math.round((completedLessons / totalLessons) * 100);

    return { totalLessons, completedLessons, percentage };
  },

  /**
   * Get progress for a single module: total lessons, completed lessons,
   * and whether the module is complete or in-progress.
   */
  async getModuleProgress(moduleId: string, userId: string): Promise<ModuleProgress> {
    // 1. Get all lessons in the module
    const moduleLessons = await db
      .select({ id: lessons.id })
      .from(lessons)
      .where(eq(lessons.moduleId, moduleId));

    const totalLessons = moduleLessons.length;

    // 2. If no lessons, module is trivially complete
    if (totalLessons === 0) {
      return { moduleId, totalLessons: 0, completedLessons: 0, status: 'complete' };
    }

    // 3. Count completions for this user
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

    const completedLessons = completions.length;

    // 4. Determine status
    const status: 'complete' | 'in-progress' = completedLessons === totalLessons ? 'complete' : 'in-progress';

    return { moduleId, totalLessons, completedLessons, status };
  },
};
