import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Pure model for lesson completion tracking.
 * Models a store that records which (userId, lessonId) pairs are completed.
 */
interface CompletionStore {
  records: Set<string>; // key: "userId:lessonId"
}

function createStore(): CompletionStore {
  return { records: new Set() };
}

function complete(store: CompletionStore, userId: string, lessonId: string): void {
  store.records.add(`${userId}:${lessonId}`);
}

function isCompleted(store: CompletionStore, userId: string, lessonId: string): boolean {
  return store.records.has(`${userId}:${lessonId}`);
}

// ---------- Arbitraries ----------

/**
 * Generates a valid user ID (non-empty, no colons to avoid key collision).
 */
const userIdArb = fc.string({ minLength: 1, maxLength: 20 })
  .filter((s) => !s.includes(':') && s.trim().length > 0);

/**
 * Generates a valid lesson ID (non-empty, no colons to avoid key collision).
 */
const lessonIdArb = fc.string({ minLength: 1, maxLength: 20 })
  .filter((s) => !s.includes(':') && s.trim().length > 0);

/**
 * Generates a list of (userId, lessonId) completion pairs.
 */
const completionListArb = fc.array(
  fc.tuple(userIdArb, lessonIdArb),
  { minLength: 0, maxLength: 20 }
);

describe('Feature: m3-user-learning-experience, Property 7: Lesson Completion Round-Trip', () => {
  /**
   * **Validates: Requirements 6.6**
   *
   * Property: After completing a lesson, querying the status returns "completed" (true).
   */
  it('after complete(userId, lessonId), isCompleted(userId, lessonId) returns true', () => {
    fc.assert(
      fc.property(userIdArb, lessonIdArb, (userId, lessonId) => {
        const store = createStore();

        complete(store, userId, lessonId);

        expect(isCompleted(store, userId, lessonId)).toBe(true);
      }),
      { numRuns: 300 }
    );
  });

  /**
   * **Validates: Requirements 6.6**
   *
   * Property: Before any completion for (userId, lessonId), isCompleted returns false.
   */
  it('before any completion, isCompleted(userId, lessonId) returns false', () => {
    fc.assert(
      fc.property(userIdArb, lessonIdArb, (userId, lessonId) => {
        const store = createStore();

        expect(isCompleted(store, userId, lessonId)).toBe(false);
      }),
      { numRuns: 300 }
    );
  });

  /**
   * **Validates: Requirements 6.6**
   *
   * Property: Completing (userA, lessonX) does not affect isCompleted(userB, lessonX)
   * when userA !== userB. Each user's completion state is independent.
   */
  it('completing lesson for userA does not affect userB completion status', () => {
    fc.assert(
      fc.property(
        userIdArb,
        userIdArb,
        lessonIdArb,
        (userA, userB, lessonId) => {
          fc.pre(userA !== userB);

          const store = createStore();

          // Verify userB is not completed before
          expect(isCompleted(store, userB, lessonId)).toBe(false);

          // Complete for userA
          complete(store, userA, lessonId);

          // userB should still not be completed
          expect(isCompleted(store, userB, lessonId)).toBe(false);

          // userA should be completed
          expect(isCompleted(store, userA, lessonId)).toBe(true);
        }
      ),
      { numRuns: 300 }
    );
  });

  /**
   * **Validates: Requirements 6.6**
   *
   * Property: Completing (userA, lessonX) does not affect isCompleted(userA, lessonY)
   * when lessonX !== lessonY. Each lesson's completion state is independent.
   */
  it('completing lessonX does not affect lessonY completion status for the same user', () => {
    fc.assert(
      fc.property(
        userIdArb,
        lessonIdArb,
        lessonIdArb,
        (userId, lessonX, lessonY) => {
          fc.pre(lessonX !== lessonY);

          const store = createStore();

          // Verify lessonY is not completed before
          expect(isCompleted(store, userId, lessonY)).toBe(false);

          // Complete lessonX
          complete(store, userId, lessonX);

          // lessonY should still not be completed
          expect(isCompleted(store, userId, lessonY)).toBe(false);

          // lessonX should be completed
          expect(isCompleted(store, userId, lessonX)).toBe(true);
        }
      ),
      { numRuns: 300 }
    );
  });

  /**
   * **Validates: Requirements 6.6**
   *
   * Property: Completing a lesson is idempotent — completing the same lesson multiple
   * times still results in isCompleted returning true, and doesn't corrupt state.
   */
  it('completing the same lesson multiple times is idempotent', () => {
    fc.assert(
      fc.property(
        userIdArb,
        lessonIdArb,
        fc.integer({ min: 2, max: 10 }),
        (userId, lessonId, times) => {
          const store = createStore();

          for (let i = 0; i < times; i++) {
            complete(store, userId, lessonId);
          }

          expect(isCompleted(store, userId, lessonId)).toBe(true);
          // The store should only have one record despite multiple completions
          expect(store.records.size).toBe(1);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 6.6**
   *
   * Property: After a batch of completions, each completed pair reports true
   * and any pair NOT in the batch reports false.
   */
  it('batch completions: all completed pairs return true, others return false', () => {
    fc.assert(
      fc.property(
        completionListArb,
        userIdArb,
        lessonIdArb,
        (completions, queryUser, queryLesson) => {
          const store = createStore();

          // Apply all completions
          for (const [userId, lessonId] of completions) {
            complete(store, userId, lessonId);
          }

          // Every completed pair should return true
          for (const [userId, lessonId] of completions) {
            expect(isCompleted(store, userId, lessonId)).toBe(true);
          }

          // A random query pair that was NOT completed should return false
          const wasCompleted = completions.some(
            ([u, l]) => u === queryUser && l === queryLesson
          );
          expect(isCompleted(store, queryUser, queryLesson)).toBe(wasCompleted);
        }
      ),
      { numRuns: 300 }
    );
  });
});
