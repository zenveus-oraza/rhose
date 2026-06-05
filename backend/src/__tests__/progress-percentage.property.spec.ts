import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Pure calculation function for progress percentage.
 *
 * Models the progress formula used throughout the application:
 * - Returns 0 when totalLessons is 0 (no division by zero)
 * - Returns a rounded integer percentage between 0 and 100
 */
function calculateProgressPercentage(completedLessons: number, totalLessons: number): number {
  if (totalLessons === 0) return 0;
  return Math.round((completedLessons / totalLessons) * 100);
}

// ---------- Arbitraries ----------

/** Total lessons: at least 1 to avoid division by zero in most tests */
const totalLessonsArb = fc.integer({ min: 1, max: 1000 });

/** Generate a valid completed/total pair where completed <= total */
const validPairArb = totalLessonsArb.chain((total) =>
  fc.integer({ min: 0, max: total }).map((completed) => ({ completed, total }))
);

/**
 * Generate a pair where completed > 0 and total > 0, with completed <= total,
 * and completed is large enough that Math.round((completed/total)*100) >= 1.
 * This means completed/total >= 0.005, so completed >= ceil(total * 0.005).
 */
const positivePairArb = fc.integer({ min: 1, max: 1000 }).chain((total) => {
  const minCompleted = Math.max(1, Math.ceil(total * 0.005));
  return fc.integer({ min: minCompleted, max: total }).map((completed) => ({ completed, total }));
});

describe('Feature: m3-user-learning-experience, Property 3: Progress Percentage Calculation', () => {
  /**
   * **Validates: Requirement 8.1**
   *
   * Property: The progress percentage is always between 0 and 100 (inclusive)
   * for any valid completed/total pair where completed <= total.
   */
  it('result is always between 0 and 100 inclusive', () => {
    fc.assert(
      fc.property(validPairArb, ({ completed, total }) => {
        const result = calculateProgressPercentage(completed, total);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(100);
      }),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirement 8.3**
   *
   * Property: When 0 lessons are completed, the result is always 0%.
   */
  it('0 completed lessons always returns 0%', () => {
    fc.assert(
      fc.property(totalLessonsArb, (total) => {
        const result = calculateProgressPercentage(0, total);
        expect(result).toBe(0);
      }),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirement 8.4**
   *
   * Property: When all lessons are completed (completed === total), the result is 100%.
   */
  it('all lessons completed always returns 100%', () => {
    fc.assert(
      fc.property(totalLessonsArb, (total) => {
        const result = calculateProgressPercentage(total, total);
        expect(result).toBe(100);
      }),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirement 1.5**
   *
   * Property: When totalLessons is 0, the result is always 0%
   * regardless of the completedLessons value. This prevents division by zero.
   */
  it('zero total lessons always returns 0%', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1000 }), (completed) => {
        const result = calculateProgressPercentage(completed, 0);
        expect(result).toBe(0);
      }),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirement 8.1**
   *
   * Property: The result is always a whole number (integer).
   * Math.round ensures no fractional percentages are returned.
   */
  it('result is always an integer', () => {
    fc.assert(
      fc.property(validPairArb, ({ completed, total }) => {
        const result = calculateProgressPercentage(completed, total);
        expect(Number.isInteger(result)).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 8.1, 8.3**
   *
   * Property: When completed > 0 and total > 0 (with completed <= total),
   * the result is strictly greater than 0.
   */
  it('positive completed and total always yields result > 0', () => {
    fc.assert(
      fc.property(positivePairArb, ({ completed, total }) => {
        const result = calculateProgressPercentage(completed, total);
        expect(result).toBeGreaterThan(0);
      }),
      { numRuns: 200 }
    );
  });
});
