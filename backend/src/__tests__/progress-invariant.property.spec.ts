import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Pure model for user learning progress state.
 * Tracks how many lessons a user has completed out of the total available.
 */
interface ProgressState {
  totalLessons: number;
  completedLessons: number;
}

/**
 * Validates that a progress state satisfies all invariants:
 * - completedLessons >= 0
 * - totalLessons >= 0
 * - completedLessons <= totalLessons
 */
function isValidProgressState(state: ProgressState): boolean {
  return (
    state.completedLessons >= 0 &&
    state.totalLessons >= 0 &&
    state.completedLessons <= state.totalLessons
  );
}

/**
 * Derives a percentage (0-100) from a valid progress state.
 */
function calculatePercentage(state: ProgressState): number {
  if (state.totalLessons === 0) return 0;
  return (state.completedLessons / state.totalLessons) * 100;
}

/**
 * Completes one lesson, incrementing completedLessons if below total.
 * Returns a new state (does not mutate).
 */
function completeLesson(state: ProgressState): ProgressState {
  if (state.completedLessons >= state.totalLessons) {
    return state;
  }
  return {
    ...state,
    completedLessons: state.completedLessons + 1,
  };
}

// ---------- Arbitraries ----------

/**
 * Generates a valid ProgressState where completedLessons <= totalLessons.
 */
const validProgressStateArb = fc
  .nat({ max: 500 })
  .chain((total) =>
    fc.nat({ max: total }).map((completed) => ({
      totalLessons: total,
      completedLessons: completed,
    }))
  );

describe('Feature: m3-user-learning-experience, Property 4: Progress Invariant', () => {
  /**
   * **Validates: Requirements 8.5**
   *
   * Property: completedLessons is always <= totalLessons for any valid progress state.
   */
  it('completedLessons is always <= totalLessons', () => {
    fc.assert(
      fc.property(validProgressStateArb, (state) => {
        expect(state.completedLessons).toBeLessThanOrEqual(state.totalLessons);
      }),
      { numRuns: 300 }
    );
  });

  /**
   * **Validates: Requirements 8.5**
   *
   * Property: completedLessons is always >= 0.
   */
  it('completedLessons is always >= 0', () => {
    fc.assert(
      fc.property(validProgressStateArb, (state) => {
        expect(state.completedLessons).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 300 }
    );
  });

  /**
   * **Validates: Requirements 8.5**
   *
   * Property: totalLessons is always >= 0.
   */
  it('totalLessons is always >= 0', () => {
    fc.assert(
      fc.property(validProgressStateArb, (state) => {
        expect(state.totalLessons).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 300 }
    );
  });

  /**
   * **Validates: Requirements 8.5**
   *
   * Property: isValidProgressState correctly identifies valid states.
   */
  it('isValidProgressState returns true for any well-formed progress state', () => {
    fc.assert(
      fc.property(validProgressStateArb, (state) => {
        expect(isValidProgressState(state)).toBe(true);
      }),
      { numRuns: 300 }
    );
  });

  /**
   * **Validates: Requirements 8.5**
   *
   * Property: percentage derived from a valid state is always in [0, 100].
   */
  it('percentage derived from valid state is always between 0 and 100', () => {
    fc.assert(
      fc.property(validProgressStateArb, (state) => {
        const percentage = calculatePercentage(state);
        expect(percentage).toBeGreaterThanOrEqual(0);
        expect(percentage).toBeLessThanOrEqual(100);
      }),
      { numRuns: 300 }
    );
  });

  /**
   * **Validates: Requirements 8.5**
   *
   * Property: completing a lesson (incrementing completed) preserves the invariant
   * when completed < total.
   */
  it('completing a lesson preserves the progress invariant', () => {
    fc.assert(
      fc.property(validProgressStateArb, (state) => {
        const nextState = completeLesson(state);

        // The invariant must still hold after completing a lesson
        expect(isValidProgressState(nextState)).toBe(true);
        expect(nextState.completedLessons).toBeLessThanOrEqual(nextState.totalLessons);
        expect(nextState.completedLessons).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 300 }
    );
  });

  /**
   * **Validates: Requirements 8.5**
   *
   * Property: completing a lesson when already at max does not exceed totalLessons.
   */
  it('completing a lesson at max capacity does not exceed totalLessons', () => {
    fc.assert(
      fc.property(fc.nat({ max: 500 }), (total) => {
        const fullyCompleted: ProgressState = {
          totalLessons: total,
          completedLessons: total,
        };

        const nextState = completeLesson(fullyCompleted);

        expect(nextState.completedLessons).toBe(total);
        expect(nextState.completedLessons).toBeLessThanOrEqual(nextState.totalLessons);
      }),
      { numRuns: 300 }
    );
  });

  /**
   * **Validates: Requirements 8.5**
   *
   * Property: applying completeLesson repeatedly (up to totalLessons times)
   * always maintains the invariant at each step.
   */
  it('sequential lesson completions always maintain the invariant', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 100 }),
        fc.nat({ max: 50 }),
        (total, completionAttempts) => {
          let state: ProgressState = {
            totalLessons: total,
            completedLessons: 0,
          };

          for (let i = 0; i < completionAttempts; i++) {
            state = completeLesson(state);

            // Invariant must hold at every step
            expect(isValidProgressState(state)).toBe(true);
            expect(state.completedLessons).toBeLessThanOrEqual(state.totalLessons);
            expect(state.completedLessons).toBeGreaterThanOrEqual(0);
          }

          // Final completed count should be min(completionAttempts, total)
          const expectedCompleted = Math.min(completionAttempts, total);
          expect(state.completedLessons).toBe(expectedCompleted);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 8.5**
   *
   * Property: states with completedLessons > totalLessons are always invalid.
   */
  it('states where completed > total are always invalid', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 500 }),
        fc.integer({ min: 1, max: 500 }),
        (total, excess) => {
          const invalidState: ProgressState = {
            totalLessons: total,
            completedLessons: total + excess,
          };

          expect(isValidProgressState(invalidState)).toBe(false);
        }
      ),
      { numRuns: 300 }
    );
  });
});
