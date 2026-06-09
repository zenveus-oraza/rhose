import { eq, and, inArray, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { lessons, modules, lessonCompletions, quizzes, quizAttempts, quizQuestions } from '../db/schema/index.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SegmentProgress {
  totalLessons: number;
  completedLessons: number;
  percentage: number; // 0-100, rounded integer
  quizzesAttempted: number; // 0 or 1 (one quiz per segment)
  quizBestScore: number | null; // best score if attempted, null otherwise
  quizTotalQuestions: number | null; // total questions in the quiz, null if no quiz exists
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

    // 3. Calculate lesson completions
    let completedLessons = 0;
    let percentage = 0;

    if (totalLessons > 0) {
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

      completedLessons = completions.length;
      percentage = Math.round((completedLessons / totalLessons) * 100);
    }

    // 4. Get quiz data for the segment (non-blocking, informational only)
    const [quiz] = await db
      .select({ id: quizzes.id })
      .from(quizzes)
      .where(eq(quizzes.segmentId, segmentId))
      .limit(1);

    let quizzesAttempted = 0;
    let quizBestScore: number | null = null;
    let quizTotalQuestions: number | null = null;

    if (quiz) {
      // Count total questions for this quiz
      const questions = await db
        .select({ id: quizQuestions.id })
        .from(quizQuestions)
        .where(eq(quizQuestions.quizId, quiz.id));

      quizTotalQuestions = questions.length;

      // Get user's attempts for this quiz, ordered by score descending to find best
      const attempts = await db
        .select({ score: quizAttempts.score })
        .from(quizAttempts)
        .where(
          and(
            eq(quizAttempts.quizId, quiz.id),
            eq(quizAttempts.userId, userId)
          )
        )
        .orderBy(desc(quizAttempts.score))
        .limit(1);

      if (attempts.length > 0) {
        quizzesAttempted = 1;
        quizBestScore = attempts[0].score;
      }
    }

    return {
      totalLessons,
      completedLessons,
      percentage,
      quizzesAttempted,
      quizBestScore,
      quizTotalQuestions,
    };
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
