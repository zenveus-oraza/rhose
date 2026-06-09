import { eq, and, asc, inArray, lt, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { segments, modules, lessons, lessonCompletions } from '../db/schema/index.js';
import { isUuid } from './slug.service.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ModuleSummary {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  lessonCount: number;
  completedCount: number;
  accessible: boolean;
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
  slidesUrl: string | null;
  totalSlides: number | null;
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
  async resolveSegmentIdentifier(identifier: string) {
    const condition = isUuid(identifier)
      ? or(eq(segments.id, identifier), eq(segments.slug, identifier))
      : eq(segments.slug, identifier);

    const [segment] = await db
      .select({ id: segments.id, slug: segments.slug })
      .from(segments)
      .where(condition)
      .limit(1);

    return segment ?? null;
  },

  async resolveModuleIdentifier(identifier: string) {
    const condition = isUuid(identifier)
      ? or(eq(modules.id, identifier), eq(modules.slug, identifier))
      : eq(modules.slug, identifier);

    const [module] = await db
      .select({ id: modules.id, slug: modules.slug, segmentId: modules.segmentId })
      .from(modules)
      .where(condition)
      .limit(1);

    return module ?? null;
  },

  async resolveLessonIdentifier(identifier: string) {
    const condition = isUuid(identifier)
      ? or(eq(lessons.id, identifier), eq(lessons.slug, identifier))
      : eq(lessons.slug, identifier);

    const [lesson] = await db
      .select({ id: lessons.id, slug: lessons.slug, moduleId: lessons.moduleId })
      .from(lessons)
      .where(condition)
      .limit(1);

    return lesson ?? null;
  },

  /**
   * Get segment details with modules and completion counts.
   */
  async getSegmentDetail(segmentId: string, userId: string): Promise<SegmentDetail | null> {
    const resolvedSegment = await this.resolveSegmentIdentifier(segmentId);
    if (!resolvedSegment) {
      return null;
    }

    // Get the segment
    const [segment] = await db
      .select({
        id: segments.slug,
        title: segments.title,
        description: segments.description,
        status: segments.status,
      })
      .from(segments)
      .where(eq(segments.id, resolvedSegment.id))
      .limit(1);

    if (!segment) {
      return null;
    }

    // Get all modules for the segment
    const segmentModules = await db
      .select({
        id: modules.id,
        slug: modules.slug,
        title: modules.title,
        description: modules.description,
        sortOrder: modules.sortOrder,
      })
      .from(modules)
      .where(eq(modules.segmentId, resolvedSegment.id))
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
          id: mod.slug,
          title: mod.title,
          description: mod.description,
          sortOrder: mod.sortOrder,
          lessonCount: lessonIds.length,
          completedCount,
          accessible: false, // will be computed below
        };
      })
    );

    // Compute module accessibility: sequential unlock
    // First module is always accessible. Subsequent modules unlock when ALL preceding
    // modules are complete. Empty modules (0 lessons) are treated as complete.
    const sortedSummaries = [...moduleSummaries].sort((a, b) => a.sortOrder - b.sortOrder);
    for (let i = 0; i < sortedSummaries.length; i++) {
      if (i === 0) {
        sortedSummaries[i].accessible = true;
      } else {
        // Check all previous modules are done
        let allPrevDone = true;
        for (let j = 0; j < i; j++) {
          const prev = sortedSummaries[j];
          const prevDone = prev.lessonCount === 0 || prev.completedCount === prev.lessonCount;
          if (!prevDone) {
            allPrevDone = false;
            break;
          }
        }
        sortedSummaries[i].accessible = allPrevDone;
      }
    }

    return {
      id: segment.id,
      title: segment.title,
      description: segment.description,
      status: segment.status,
      modules: sortedSummaries,
    };
  },

  /**
   * Get lessons for a module with completion status and accessibility.
   */
  async getModuleLessons(moduleId: string, userId: string): Promise<LessonWithStatus[]> {
    const resolvedModule = await this.resolveModuleIdentifier(moduleId);
    if (!resolvedModule) {
      return [];
    }

    // Get all lessons in this module ordered by sort_order
    const moduleLessons = await db
      .select({
        id: lessons.slug,
        lessonId: lessons.id,
        title: lessons.title,
        contentType: lessons.contentType,
        sortOrder: lessons.sortOrder,
        estimatedTimeValue: lessons.estimatedTimeValue,
        estimatedTimeUnit: lessons.estimatedTimeUnit,
      })
      .from(lessons)
      .where(eq(lessons.moduleId, resolvedModule.id))
      .orderBy(asc(lessons.sortOrder));

    if (moduleLessons.length === 0) {
      return [];
    }

    // Get all completions for this user in this module's lessons
    const lessonIds = moduleLessons.map((l) => l.lessonId);
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

    // Build result with accessibility: all lessons are accessible (no locking)
    const result: LessonWithStatus[] = moduleLessons.map((lesson) => {
      const completed = completedSet.has(lesson.lessonId);

      return {
        id: lesson.id,
        title: lesson.title,
        contentType: lesson.contentType,
        sortOrder: lesson.sortOrder,
        estimatedTimeValue: lesson.estimatedTimeValue,
        estimatedTimeUnit: lesson.estimatedTimeUnit,
        completed,
        accessible: true,
      };
    });

    return result;
  },

  /**
   * Get full lesson content (text or video).
   */
  async getLessonContent(lessonId: string): Promise<LessonContent | null> {
    const resolvedLesson = await this.resolveLessonIdentifier(lessonId);
    if (!resolvedLesson) {
      return null;
    }

    const [lesson] = await db
      .select({
        id: lessons.slug,
        title: lessons.title,
        contentType: lessons.contentType,
        contentBody: lessons.contentBody,
        videoUrl: lessons.videoUrl,
        slidesUrl: lessons.slidesUrl,
        totalSlides: lessons.totalSlides,
      })
      .from(lessons)
      .where(eq(lessons.id, resolvedLesson.id))
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
    const resolvedSegment = await this.resolveSegmentIdentifier(segmentId);
    if (!resolvedSegment) {
      return null;
    }

    // Get all modules for the segment ordered by sort_order
    const segmentModules = await db
      .select({ id: modules.id, slug: modules.slug })
      .from(modules)
      .where(eq(modules.segmentId, resolvedSegment.id))
      .orderBy(asc(modules.sortOrder));

    for (const mod of segmentModules) {
      // Get lessons for this module ordered by sort_order
      const moduleLessons = await db
        .select({ id: lessons.id, slug: lessons.slug })
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
          return { moduleId: mod.slug, lessonId: lesson.slug };
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
    const resolvedLesson = await this.resolveLessonIdentifier(lessonId);
    if (!resolvedLesson) {
      return { accessible: true };
    }

    // Get the lesson's module and sort_order
    const [lesson] = await db
      .select({
        id: lessons.id,
        moduleId: lessons.moduleId,
        sortOrder: lessons.sortOrder,
      })
      .from(lessons)
      .where(eq(lessons.id, resolvedLesson.id))
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
