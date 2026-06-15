import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Represents a module with its lessons and completion state.
 */
interface ModuleData {
  moduleIndex: number;
  lessonCount: number;
  completedLessonIndices: Set<number>;
}

/**
 * Pure function replicating the current lesson determination logic.
 * 
 * Rules:
 * - Current lesson = first incomplete lesson (by sort_order) within the first incomplete module
 * - If all lessons in a module are complete, move to the next module
 * - If all lessons in all modules are complete, return null (segment fully completed)
 */
function determineCurrentLesson(
  modules: ModuleData[] // ordered by moduleIndex/sortOrder
): { moduleIndex: number; lessonIndex: number } | null {
  for (const mod of modules) {
    for (let i = 0; i < mod.lessonCount; i++) {
      if (!mod.completedLessonIndices.has(i)) {
        return { moduleIndex: mod.moduleIndex, lessonIndex: i };
      }
    }
  }
  return null;
}

// ---------- Arbitraries ----------

/**
 * Generates a ModuleData with a given moduleIndex.
 * lessonCount: 1-10 lessons per module.
 * completedLessonIndices: random subset of [0, lessonCount).
 */
function moduleDataArb(moduleIndex: number): fc.Arbitrary<ModuleData> {
  return fc.integer({ min: 1, max: 10 }).chain((lessonCount) =>
    fc.subarray(
      Array.from({ length: lessonCount }, (_, i) => i),
      { minLength: 0, maxLength: lessonCount }
    ).map((completedArr) => ({
      moduleIndex,
      lessonCount,
      completedLessonIndices: new Set(completedArr),
    }))
  );
}

/**
 * Generates an array of 1-5 modules ordered by moduleIndex.
 */
const modulesArb: fc.Arbitrary<ModuleData[]> = fc
  .integer({ min: 1, max: 5 })
  .chain((numModules) =>
    fc.tuple(...Array.from({ length: numModules }, (_, i) => moduleDataArb(i)))
  );

/**
 * Generates modules where ALL lessons in ALL modules are complete.
 */
const fullyCompletedModulesArb: fc.Arbitrary<ModuleData[]> = fc
  .integer({ min: 1, max: 5 })
  .chain((numModules) =>
    fc.tuple(
      ...Array.from({ length: numModules }, (_, moduleIdx) =>
        fc.integer({ min: 1, max: 10 }).map((lessonCount) => ({
          moduleIndex: moduleIdx,
          lessonCount,
          completedLessonIndices: new Set(Array.from({ length: lessonCount }, (_, i) => i)),
        }))
      )
    )
  );

/**
 * Generates modules where at least one lesson is incomplete.
 */
const partiallyCompletedModulesArb: fc.Arbitrary<ModuleData[]> = modulesArb.filter((modules) =>
  modules.some((mod) => mod.completedLessonIndices.size < mod.lessonCount)
);

describe('Feature: m3-user-learning-experience, Property 9: Current Lesson Determination', () => {
  /**
   * **Validates: Requirements 7.7, 7.5**
   *
   * Property: If all lessons across all modules are complete, current lesson is null.
   */
  it('returns null when all lessons in all modules are complete', () => {
    fc.assert(
      fc.property(fullyCompletedModulesArb, (modules) => {
        const result = determineCurrentLesson(modules);
        expect(result).toBeNull();
      }),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 7.7, 7.5**
   *
   * Property: If some lessons are incomplete, current lesson is never null
   * and points to the first incomplete lesson in the first incomplete module.
   */
  it('returns the first incomplete lesson in the first incomplete module', () => {
    fc.assert(
      fc.property(partiallyCompletedModulesArb, (modules) => {
        const result = determineCurrentLesson(modules);

        // Must not be null since there's at least one incomplete lesson
        expect(result).not.toBeNull();

        if (result) {
          const targetModule = modules[result.moduleIndex];

          // The identified lesson must actually be incomplete
          expect(targetModule.completedLessonIndices.has(result.lessonIndex)).toBe(false);

          // All modules before the current one must be fully complete
          for (let m = 0; m < result.moduleIndex; m++) {
            const priorMod = modules[m];
            expect(priorMod.completedLessonIndices.size).toBe(priorMod.lessonCount);
          }

          // All lessons before the current lesson within the same module must be complete
          for (let l = 0; l < result.lessonIndex; l++) {
            expect(targetModule.completedLessonIndices.has(l)).toBe(true);
          }
        }
      }),
      { numRuns: 300 }
    );
  });

  /**
   * **Validates: Requirements 7.7, 7.5**
   *
   * Property: The current lesson is always "accessible" — meaning all prior lessons
   * (in the same module) are complete. This validates the sequential unlock logic.
   */
  it('current lesson is always accessible (all prior lessons in module are complete)', () => {
    fc.assert(
      fc.property(modulesArb, (modules) => {
        const result = determineCurrentLesson(modules);

        if (result !== null) {
          const currentModule = modules[result.moduleIndex];

          // Every lesson index before current must be in the completed set
          for (let i = 0; i < result.lessonIndex; i++) {
            expect(currentModule.completedLessonIndices.has(i)).toBe(true);
          }
        }
      }),
      { numRuns: 300 }
    );
  });

  /**
   * **Validates: Requirements 7.7, 7.5**
   *
   * Property: Completing the current lesson advances to the next lesson or next module
   * (or returns null if it was the very last lesson).
   */
  it('completing the current lesson advances to the next incomplete lesson', () => {
    fc.assert(
      fc.property(partiallyCompletedModulesArb, (modules) => {
        const current = determineCurrentLesson(modules);

        // We know current is not null because modules have at least one incomplete lesson
        expect(current).not.toBeNull();
        if (!current) return;

        // Simulate completing the current lesson
        const updatedModules = modules.map((mod) => ({
          ...mod,
          completedLessonIndices: new Set(mod.completedLessonIndices),
        }));
        updatedModules[current.moduleIndex].completedLessonIndices.add(current.lessonIndex);

        const next = determineCurrentLesson(updatedModules);

        if (next === null) {
          // All lessons are now complete — the completed lesson was the last one
          for (const mod of updatedModules) {
            expect(mod.completedLessonIndices.size).toBe(mod.lessonCount);
          }
        } else {
          // Next lesson must be strictly after current in ordering
          const currentGlobalPos =
            current.moduleIndex * 1000 + current.lessonIndex;
          const nextGlobalPos =
            next.moduleIndex * 1000 + next.lessonIndex;
          expect(nextGlobalPos).toBeGreaterThan(currentGlobalPos);
        }
      }),
      { numRuns: 300 }
    );
  });

  /**
   * **Validates: Requirements 7.7, 7.5**
   *
   * Property: The current lesson result is always valid — moduleIndex and lessonIndex
   * are within the bounds of the provided data.
   */
  it('current lesson result is always within valid bounds', () => {
    fc.assert(
      fc.property(modulesArb, (modules) => {
        const result = determineCurrentLesson(modules);

        if (result !== null) {
          // moduleIndex must be a valid index
          expect(result.moduleIndex).toBeGreaterThanOrEqual(0);
          expect(result.moduleIndex).toBeLessThan(modules.length);

          // lessonIndex must be within the module's lesson count
          const mod = modules[result.moduleIndex];
          expect(result.lessonIndex).toBeGreaterThanOrEqual(0);
          expect(result.lessonIndex).toBeLessThan(mod.lessonCount);
        }
      }),
      { numRuns: 200 }
    );
  });
});
