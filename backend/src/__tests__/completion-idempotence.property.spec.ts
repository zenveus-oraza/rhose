import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Pure model simulating the lesson completion store.
 *
 * This models the behavior of a unique constraint on (userId, lessonId)
 * in the database — completing the same pair multiple times is idempotent.
 */
interface CompletionStore {
  records: Map<string, { userId: string; lessonId: string; completedAt: Date }>;
}

function createStore(): CompletionStore {
  return { records: new Map() };
}

/**
 * Attempts to complete a lesson for a user.
 * Returns `alreadyCompleted: false` on first completion, `true` on subsequent.
 * Only one record is ever stored per user-lesson pair.
 */
function completeLesson(
  store: CompletionStore,
  userId: string,
  lessonId: string
): { alreadyCompleted: boolean } {
  const key = `${userId}:${lessonId}`;
  if (store.records.has(key)) {
    return { alreadyCompleted: true };
  }
  store.records.set(key, { userId, lessonId, completedAt: new Date() });
  return { alreadyCompleted: false };
}

/**
 * Returns the number of completion records for a specific user-lesson pair.
 */
function countRecords(store: CompletionStore, userId: string, lessonId: string): number {
  const key = `${userId}:${lessonId}`;
  return store.records.has(key) ? 1 : 0;
}

// ---------- Arbitraries ----------

/** UUID-like string arbitrary */
const uuidArb = fc.uuid();

/** Number of times to attempt completion (1–10) */
const completionCountArb = fc.integer({ min: 1, max: 10 });

/** Generate a user-lesson pair */
const userLessonPairArb = fc.record({
  userId: uuidArb,
  lessonId: uuidArb,
});

/** Generate multiple distinct user-lesson pairs */
const distinctPairsArb = fc.uniqueArray(
  fc.record({ userId: uuidArb, lessonId: uuidArb }),
  {
    minLength: 2,
    maxLength: 10,
    comparator: (a, b) => a.userId === b.userId && a.lessonId === b.lessonId,
  }
);

describe('Feature: m3-user-learning-experience, Property 6: Lesson Completion Idempotence', () => {
  /**
   * **Validates: Requirement 6.2**
   *
   * Property: The first completion of any user-lesson pair always
   * returns alreadyCompleted: false.
   */
  it('first completion always returns alreadyCompleted: false', () => {
    fc.assert(
      fc.property(userLessonPairArb, ({ userId, lessonId }) => {
        const store = createStore();
        const result = completeLesson(store, userId, lessonId);
        expect(result.alreadyCompleted).toBe(false);
      }),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirement 6.7**
   *
   * Property: All subsequent completions (2nd, 3rd, ..., Nth) of the same
   * user-lesson pair always return alreadyCompleted: true.
   */
  it('subsequent completions always return alreadyCompleted: true', () => {
    fc.assert(
      fc.property(
        userLessonPairArb,
        fc.integer({ min: 2, max: 10 }),
        ({ userId, lessonId }, n) => {
          const store = createStore();

          // First completion
          completeLesson(store, userId, lessonId);

          // All subsequent completions should indicate already completed
          for (let i = 1; i < n; i++) {
            const result = completeLesson(store, userId, lessonId);
            expect(result.alreadyCompleted).toBe(true);
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirement 10.6**
   *
   * Property: After completing the same user-lesson pair N times (N >= 1),
   * the store contains exactly 1 record for that pair.
   */
  it('after N completions, store contains exactly 1 record for the pair', () => {
    fc.assert(
      fc.property(
        userLessonPairArb,
        completionCountArb,
        ({ userId, lessonId }, n) => {
          const store = createStore();

          for (let i = 0; i < n; i++) {
            completeLesson(store, userId, lessonId);
          }

          expect(countRecords(store, userId, lessonId)).toBe(1);
          expect(store.records.size).toBe(1);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirement 10.9**
   *
   * Property: Completing one user-lesson pair does not affect the records
   * of other pairs. Each pair is independent.
   */
  it('completing one pair does not affect other pairs', () => {
    fc.assert(
      fc.property(
        distinctPairsArb,
        completionCountArb,
        (pairs, n) => {
          const store = createStore();

          // Complete the first pair N times
          const target = pairs[0];
          for (let i = 0; i < n; i++) {
            completeLesson(store, target.userId, target.lessonId);
          }

          // Other pairs should have no records
          for (let i = 1; i < pairs.length; i++) {
            const pair = pairs[i];
            expect(countRecords(store, pair.userId, pair.lessonId)).toBe(0);
          }

          // Store should contain exactly 1 record total (just the target pair)
          expect(store.records.size).toBe(1);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 6.2, 6.7**
   *
   * Property: The completion status after N completions is identical to
   * the status after 1 completion — the store state is the same.
   */
  it('completion state after N completions equals state after 1 completion', () => {
    fc.assert(
      fc.property(
        userLessonPairArb,
        fc.integer({ min: 2, max: 10 }),
        ({ userId, lessonId }, n) => {
          // Store with 1 completion
          const storeSingle = createStore();
          completeLesson(storeSingle, userId, lessonId);

          // Store with N completions
          const storeMultiple = createStore();
          for (let i = 0; i < n; i++) {
            completeLesson(storeMultiple, userId, lessonId);
          }

          // Both stores should have the same number of records
          expect(storeMultiple.records.size).toBe(storeSingle.records.size);

          // Both should have the same key
          const key = `${userId}:${lessonId}`;
          expect(storeMultiple.records.has(key)).toBe(true);
          expect(storeSingle.records.has(key)).toBe(true);

          // The record data should match (userId and lessonId)
          const recordSingle = storeSingle.records.get(key)!;
          const recordMultiple = storeMultiple.records.get(key)!;
          expect(recordMultiple.userId).toBe(recordSingle.userId);
          expect(recordMultiple.lessonId).toBe(recordSingle.lessonId);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 10.6, 10.9**
   *
   * Property: Completing multiple distinct pairs each N times results
   * in exactly one record per pair (total records = number of distinct pairs).
   */
  it('multiple distinct pairs each completed N times results in one record per pair', () => {
    fc.assert(
      fc.property(
        distinctPairsArb,
        completionCountArb,
        (pairs, n) => {
          const store = createStore();

          // Complete each pair N times
          for (const pair of pairs) {
            for (let i = 0; i < n; i++) {
              completeLesson(store, pair.userId, pair.lessonId);
            }
          }

          // Store should have exactly one record per distinct pair
          expect(store.records.size).toBe(pairs.length);

          // Each pair should have exactly 1 record
          for (const pair of pairs) {
            expect(countRecords(store, pair.userId, pair.lessonId)).toBe(1);
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});
