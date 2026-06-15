import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Feature: m2-admin-content-management, Property 3: Lesson Sort Order Contiguity Invariant
 *
 * **Validates: Requirements 4.1, 4.2, 4.10, 4.11, 4.12, 7.7**
 *
 * For any Module, after any sequence of lesson creation, deletion, or reorder operations,
 * the sort_order values of all Lessons within that Module SHALL form a contiguous sequence
 * starting from 1 with no duplicates and no gaps.
 */

// --- In-memory model of the Lesson Service sort order logic ---

interface LessonModel {
  id: string;
  sortOrder: number;
}

/**
 * Represents the state of lessons within a single module.
 */
interface ModuleLessonState {
  lessons: LessonModel[];
  nextId: number;
}

function createInitialState(): ModuleLessonState {
  return { lessons: [], nextId: 1 };
}

/**
 * Create a new lesson — assigns next available sort_order (max + 1).
 * Mirrors lessonService.create logic.
 */
function createLesson(state: ModuleLessonState): ModuleLessonState {
  const maxOrder = state.lessons.reduce((max, l) => Math.max(max, l.sortOrder), 0);
  const newLesson: LessonModel = {
    id: `lesson-${state.nextId}`,
    sortOrder: maxOrder + 1,
  };
  return {
    lessons: [...state.lessons, newLesson],
    nextId: state.nextId + 1,
  };
}

/**
 * Delete a lesson by index and reorder remaining lessons to maintain contiguity.
 * Mirrors lessonService.delete logic (reorders remaining after deletion).
 */
function deleteLesson(state: ModuleLessonState, index: number): ModuleLessonState {
  if (state.lessons.length === 0 || index < 0 || index >= state.lessons.length) {
    return state; // No-op for invalid index
  }

  const remaining = state.lessons.filter((_, i) => i !== index);

  // Sort by current sortOrder then reassign contiguous values from 1
  const sorted = [...remaining].sort((a, b) => a.sortOrder - b.sortOrder);
  const reordered = sorted.map((l, i) => ({ ...l, sortOrder: i + 1 }));

  return { ...state, lessons: reordered };
}

/**
 * Reorder lessons given a permutation of indices.
 * Assigns contiguous sort_order values starting from 1 in the new order.
 * Mirrors lessonService.reorder logic.
 */
function reorderLessons(state: ModuleLessonState, permutation: number[]): ModuleLessonState {
  if (state.lessons.length === 0) return state;

  // Sort by current order first
  const sortedByOrder = [...state.lessons].sort((a, b) => a.sortOrder - b.sortOrder);

  // Apply permutation: permutation[i] = index in sortedByOrder that goes to position i
  const reordered = permutation.map((sourceIdx, newPosition) => ({
    ...sortedByOrder[sourceIdx],
    sortOrder: newPosition + 1,
  }));

  return { ...state, lessons: reordered };
}

// --- Operation type for generating random sequences ---

type OperationType = 'create' | 'delete' | 'reorder';

const arbOperationType = fc.constantFrom<OperationType>('create', 'delete', 'reorder');

const arbOperationTypeSequence = fc.array(arbOperationType, { minLength: 1, maxLength: 30 });

/**
 * Checks the contiguity invariant:
 * sort_order values form a contiguous sequence from 1 to N with no duplicates and no gaps.
 */
function checkContiguityInvariant(lessons: LessonModel[]): void {
  const n = lessons.length;

  if (n === 0) return; // Empty is trivially valid

  const sortOrders = lessons.map((l) => l.sortOrder).sort((a, b) => a - b);

  // Must start from 1
  expect(sortOrders[0]).toBe(1);

  // Must end at N
  expect(sortOrders[n - 1]).toBe(n);

  // Must be contiguous (no gaps, no duplicates)
  for (let i = 0; i < n; i++) {
    expect(sortOrders[i]).toBe(i + 1);
  }

  // Verify uniqueness explicitly
  const uniqueOrders = new Set(sortOrders);
  expect(uniqueOrders.size).toBe(n);
}

/**
 * Applies an operation type to the current state, resolving any needed parameters
 * from a random seed value.
 */
function applyOperationType(
  state: ModuleLessonState,
  opType: OperationType,
  seed: number
): ModuleLessonState {
  switch (opType) {
    case 'create':
      return createLesson(state);

    case 'delete': {
      if (state.lessons.length === 0) {
        // Can't delete from empty, treat as create instead
        return createLesson(state);
      }
      const deleteIndex = seed % state.lessons.length;
      return deleteLesson(state, deleteIndex);
    }

    case 'reorder': {
      if (state.lessons.length <= 1) {
        // Can't meaningfully reorder 0 or 1 lessons, treat as create
        return createLesson(state);
      }
      // Generate a deterministic permutation from seed
      const n = state.lessons.length;
      const indices = Array.from({ length: n }, (_, i) => i);
      // Simple Fisher-Yates with seed
      let s = Math.abs(seed);
      for (let i = n - 1; i > 0; i--) {
        const j = s % (i + 1);
        s = Math.floor(s / (i + 1)) + 1;
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      return reorderLessons(state, indices);
    }
  }
}

describe('Feature: m2-admin-content-management, Property 3: Lesson Sort Order Contiguity Invariant', () => {
  /**
   * **Validates: Requirements 4.1, 4.2, 4.10, 4.11, 4.12, 7.7**
   *
   * For any random sequence of create/delete/reorder operations,
   * the sort_order values form a contiguous sequence from 1 after every operation.
   */
  it('sort_order forms contiguous sequence from 1 after any sequence of create/delete/reorder operations', () => {
    fc.assert(
      fc.property(
        arbOperationTypeSequence,
        fc.array(fc.nat({ max: 1000 }), { minLength: 30, maxLength: 30 }),
        (opTypes, seeds) => {
          let state = createInitialState();

          for (let i = 0; i < opTypes.length; i++) {
            const seed = seeds[i % seeds.length];
            state = applyOperationType(state, opTypes[i], seed);

            // Invariant must hold after every operation
            checkContiguityInvariant(state.lessons);
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 4.1, 4.2**
   *
   * Creating lessons always assigns the next contiguous sort_order.
   * After N creates, sort_orders should be exactly [1, 2, ..., N].
   */
  it('creating N lessons produces sort_orders [1..N]', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 50 }), (n) => {
        let state = createInitialState();

        for (let i = 0; i < n; i++) {
          state = createLesson(state);
        }

        expect(state.lessons.length).toBe(n);
        checkContiguityInvariant(state.lessons);

        // Each lesson should have sort_order equal to its creation position
        for (let i = 0; i < n; i++) {
          expect(state.lessons[i].sortOrder).toBe(i + 1);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 4.11, 4.12**
   *
   * Deleting any lesson from a module always results in contiguous sort_order
   * for the remaining lessons.
   */
  it('deleting any lesson maintains contiguous sort_order for remaining lessons', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 20 }),
        fc.nat(),
        (numLessons, deleteSeed) => {
          // Create N lessons
          let state = createInitialState();
          for (let i = 0; i < numLessons; i++) {
            state = createLesson(state);
          }

          // Delete one at a random valid index
          const deleteIndex = deleteSeed % state.lessons.length;
          state = deleteLesson(state, deleteIndex);

          // Should have N-1 lessons with contiguous sort_order
          expect(state.lessons.length).toBe(numLessons - 1);
          checkContiguityInvariant(state.lessons);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 4.10, 4.12**
   *
   * Reordering lessons always maintains contiguous sort_order from 1.
   */
  it('reordering lessons always maintains contiguous sort_order from 1', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 15 }),
        fc.nat(),
        (numLessons, reorderSeed) => {
          // Create N lessons
          let state = createInitialState();
          for (let i = 0; i < numLessons; i++) {
            state = createLesson(state);
          }

          // Generate a permutation from seed
          const n = state.lessons.length;
          const indices = Array.from({ length: n }, (_, i) => i);
          let s = Math.abs(reorderSeed);
          for (let i = n - 1; i > 0; i--) {
            const j = s % (i + 1);
            s = Math.floor(s / (i + 1)) + 1;
            [indices[i], indices[j]] = [indices[j], indices[i]];
          }

          state = reorderLessons(state, indices);

          // Should still have N lessons with contiguous sort_order
          expect(state.lessons.length).toBe(numLessons);
          checkContiguityInvariant(state.lessons);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 7.7**
   *
   * No two lessons within a module ever share the same sort_order value
   * (uniqueness invariant) after any sequence of operations.
   */
  it('no two lessons share the same sort_order after any operations', () => {
    fc.assert(
      fc.property(
        arbOperationTypeSequence,
        fc.array(fc.nat({ max: 1000 }), { minLength: 30, maxLength: 30 }),
        (opTypes, seeds) => {
          let state = createInitialState();

          for (let i = 0; i < opTypes.length; i++) {
            const seed = seeds[i % seeds.length];
            state = applyOperationType(state, opTypes[i], seed);

            // Uniqueness invariant: no duplicates
            const sortOrders = state.lessons.map((l) => l.sortOrder);
            const uniqueOrders = new Set(sortOrders);
            expect(uniqueOrders.size).toBe(sortOrders.length);
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 4.11, 4.12**
   *
   * Multiple sequential deletions maintain contiguity after each deletion.
   */
  it('multiple sequential deletions maintain contiguity after each deletion', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 15 }),
        fc.array(fc.nat(), { minLength: 1, maxLength: 10 }),
        (numLessons, deleteSeeds) => {
          // Create N lessons
          let state = createInitialState();
          for (let i = 0; i < numLessons; i++) {
            state = createLesson(state);
          }

          // Perform multiple deletions
          for (const seed of deleteSeeds) {
            if (state.lessons.length === 0) break;
            const deleteIndex = seed % state.lessons.length;
            state = deleteLesson(state, deleteIndex);

            // Invariant must hold after each deletion
            checkContiguityInvariant(state.lessons);
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});
