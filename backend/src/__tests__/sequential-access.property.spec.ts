import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Pure function modeling sequential lesson access logic.
 *
 * Rules:
 * - Lesson 0 (first lesson) is always accessible.
 * - Lesson N (N > 0) is accessible only if all lessons 0..N-1 are completed.
 */
function canAccessLesson(
  lessonIndex: number, // 0-based index in the module
  completedIndices: Set<number> // set of completed lesson indices
): boolean {
  if (lessonIndex === 0) return true;
  for (let i = 0; i < lessonIndex; i++) {
    if (!completedIndices.has(i)) return false;
  }
  return true;
}

/**
 * Returns all accessible lesson indices for a module with the given total
 * lessons and completion state.
 */
function getAccessibleLessons(
  totalLessons: number,
  completedIndices: Set<number>
): number[] {
  const accessible: number[] = [];
  for (let i = 0; i < totalLessons; i++) {
    if (canAccessLesson(i, completedIndices)) {
      accessible.push(i);
    }
  }
  return accessible;
}

// ---------- Arbitraries ----------

/** Number of lessons in a module (1–20) */
const totalLessonsArb = fc.integer({ min: 1, max: 20 });

/** Generate a random subset of lesson indices as completed */
function completedIndicesArb(totalLessons: number): fc.Arbitrary<Set<number>> {
  return fc.subarray(
    Array.from({ length: totalLessons }, (_, i) => i),
    { minLength: 0, maxLength: totalLessons }
  ).map((arr) => new Set(arr));
}

/** Generate a valid lesson index for a module */
function lessonIndexArb(totalLessons: number): fc.Arbitrary<number> {
  return fc.integer({ min: 0, max: totalLessons - 1 });
}

describe('Feature: m3-user-learning-experience, Property 8: Sequential Access Invariant', () => {
  /**
   * **Validates: Requirement 7.1**
   *
   * Property: The first lesson in a module is ALWAYS accessible,
   * regardless of which lessons are marked as completed.
   */
  it('first lesson is always accessible regardless of completion state', () => {
    fc.assert(
      fc.property(
        totalLessonsArb.chain((total) =>
          completedIndicesArb(total).map((completed) => ({ total, completed }))
        ),
        ({ completed }) => {
          expect(canAccessLesson(0, completed)).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirement 7.2**
   *
   * Property: If all lessons before index N are completed,
   * then lesson N is accessible.
   */
  it('lesson N is accessible when all prior lessons (0..N-1) are completed', () => {
    fc.assert(
      fc.property(
        totalLessonsArb.chain((total) =>
          lessonIndexArb(total).map((target) => ({ total, target }))
        ),
        ({ total, target }) => {
          // Create a completed set containing all indices before target
          const completedIndices = new Set<number>();
          for (let i = 0; i < target; i++) {
            completedIndices.add(i);
          }
          // May also include some additional completions beyond target
          const result = canAccessLesson(target, completedIndices);
          expect(result).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirement 7.3**
   *
   * Property: If any lesson K (where K < N) is NOT completed,
   * then lesson N is NOT accessible.
   */
  it('lesson N is NOT accessible if any prior lesson K < N is not completed', () => {
    fc.assert(
      fc.property(
        // Generate totalLessons >= 2 so there's at least one prior lesson
        fc.integer({ min: 2, max: 20 }).chain((total) =>
          // Target lesson index >= 1
          fc.integer({ min: 1, max: total - 1 }).chain((target) =>
            // Pick a gap index: some K in [0, target) that is NOT completed
            fc.integer({ min: 0, max: target - 1 }).chain((gapIndex) =>
              // Generate completions that exclude gapIndex
              fc.subarray(
                Array.from({ length: total }, (_, i) => i).filter((i) => i !== gapIndex),
                { minLength: 0 }
              ).map((completedArr) => ({
                total,
                target,
                gapIndex,
                completedIndices: new Set(completedArr),
              }))
            )
          )
        ),
        ({ target, gapIndex, completedIndices }) => {
          // Ensure the gap is truly not completed
          expect(completedIndices.has(gapIndex)).toBe(false);
          // Lesson at target should NOT be accessible
          const result = canAccessLesson(target, completedIndices);
          expect(result).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirement 7.6**
   *
   * Property: Accessible lessons always form a contiguous prefix starting
   * from lesson 0. If lesson K is accessible, all lessons 0..K must also
   * be accessible.
   */
  it('accessible lessons form a contiguous prefix from the first lesson', () => {
    fc.assert(
      fc.property(
        totalLessonsArb.chain((total) =>
          completedIndicesArb(total).map((completed) => ({ total, completed }))
        ),
        ({ total, completed }) => {
          const accessible = getAccessibleLessons(total, completed);

          // Accessible lessons should be a contiguous prefix: [0, 1, 2, ..., K]
          for (let i = 0; i < accessible.length; i++) {
            expect(accessible[i]).toBe(i);
          }

          // If there's a non-accessible lesson, all subsequent should also be non-accessible
          if (accessible.length < total) {
            for (let i = accessible.length; i < total; i++) {
              expect(canAccessLesson(i, completed)).toBe(false);
            }
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 7.1, 7.2**
   *
   * Property: A completed lesson is always accessible. If lesson K is in the
   * completed set and was validly completed (all prior lessons are also completed),
   * then it must be accessible.
   */
  it('a completed lesson with all priors completed is always accessible', () => {
    fc.assert(
      fc.property(
        totalLessonsArb.chain((total) =>
          // Generate a contiguous prefix of completions (valid completion state)
          fc.integer({ min: 0, max: total - 1 }).map((lastCompleted) => {
            const completed = new Set<number>();
            for (let i = 0; i <= lastCompleted; i++) {
              completed.add(i);
            }
            return { total, completed, lastCompleted };
          })
        ),
        ({ completed, lastCompleted }) => {
          // The last completed lesson should be accessible
          expect(canAccessLesson(lastCompleted, completed)).toBe(true);
          // All completed lessons should be accessible
          for (const idx of completed) {
            expect(canAccessLesson(idx, completed)).toBe(true);
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 7.2, 7.3**
   *
   * Property: The number of accessible lessons equals the length of the
   * longest contiguous completed prefix starting from 0, plus 1 (the next
   * unlocked lesson).
   */
  it('accessible count equals contiguous completed prefix length + 1 (next unlocked)', () => {
    fc.assert(
      fc.property(
        totalLessonsArb.chain((total) =>
          completedIndicesArb(total).map((completed) => ({ total, completed }))
        ),
        ({ total, completed }) => {
          // Find the length of the contiguous completed prefix from 0
          let prefixLength = 0;
          while (prefixLength < total && completed.has(prefixLength)) {
            prefixLength++;
          }

          // Expected accessible count: prefix + 1 (next lesson) unless all are completed
          const expectedAccessible = Math.min(prefixLength + 1, total);
          const accessible = getAccessibleLessons(total, completed);

          expect(accessible.length).toBe(expectedAccessible);
        }
      ),
      { numRuns: 200 }
    );
  });
});
