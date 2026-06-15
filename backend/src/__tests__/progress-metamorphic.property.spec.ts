import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Pure model for progress calculation.
 * Given a number of completed lessons and a total, computes the percentage and count.
 */
function calculateProgress(completed: number, total: number): { percentage: number; completedLessons: number } {
  if (total === 0) return { percentage: 0, completedLessons: 0 };
  return { percentage: Math.round((completed / total) * 100), completedLessons: completed };
}

// ---------- Arbitraries ----------

/**
 * Generates a valid state where completed < total (so one more lesson can be completed).
 * total is at least 1, completed is in [0, total - 1].
 */
const progressStateArb = fc.integer({ min: 1, max: 200 }).chain((total) =>
  fc.integer({ min: 0, max: total - 1 }).map((completed) => ({ completed, total }))
);

describe('Feature: m3-user-learning-experience, Property 5: Progress Metamorphic Property', () => {
  /**
   * **Validates: Requirements 8.6**
   *
   * Property: Completing one lesson increments completedLessons by exactly 1.
   */
  it('completing one lesson increments completedLessons by exactly 1', () => {
    fc.assert(
      fc.property(progressStateArb, ({ completed, total }) => {
        const before = calculateProgress(completed, total);
        const after = calculateProgress(completed + 1, total);

        expect(after.completedLessons).toBe(before.completedLessons + 1);
      }),
      { numRuns: 500 }
    );
  });

  /**
   * **Validates: Requirements 8.6**
   *
   * Property: New percentage >= old percentage (progress never decreases when completing lessons).
   */
  it('new percentage >= old percentage (progress never decreases)', () => {
    fc.assert(
      fc.property(progressStateArb, ({ completed, total }) => {
        const before = calculateProgress(completed, total);
        const after = calculateProgress(completed + 1, total);

        expect(after.percentage).toBeGreaterThanOrEqual(before.percentage);
      }),
      { numRuns: 500 }
    );
  });

  /**
   * **Validates: Requirements 8.6**
   *
   * Property: New percentage equals Math.round(((completed + 1) / total) * 100).
   */
  it('new percentage === Math.round(((completed + 1) / total) * 100)', () => {
    fc.assert(
      fc.property(progressStateArb, ({ completed, total }) => {
        const after = calculateProgress(completed + 1, total);
        const expected = Math.round(((completed + 1) / total) * 100);

        expect(after.percentage).toBe(expected);
      }),
      { numRuns: 500 }
    );
  });

  /**
   * **Validates: Requirements 8.6**
   *
   * Property: If completed === total - 1, completing the last lesson yields 100%.
   */
  it('completing the last lesson yields 100%', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 200 }),
        (total) => {
          const completed = total - 1;
          const after = calculateProgress(completed + 1, total);

          expect(after.percentage).toBe(100);
          expect(after.completedLessons).toBe(total);
        }
      ),
      { numRuns: 500 }
    );
  });
});
