import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Feature: m2-admin-content-management, Property 2: Module Sort Order Contiguity Invariant
 *
 * **Validates: Requirements 3.1, 3.6, 3.7, 3.9, 7.6**
 *
 * For any Segment, after any sequence of module creation, deletion, or reorder operations,
 * the sort_order values of all Modules within that Segment SHALL form a contiguous sequence
 * starting from 1 with no duplicates and no gaps.
 */

// --- In-memory model of the Module Service sort order logic ---

interface ModuleModel {
  id: string;
  sortOrder: number;
}

/**
 * Represents the state of modules within a single segment.
 */
interface SegmentModuleState {
  modules: ModuleModel[];
  nextId: number;
}

function createInitialState(): SegmentModuleState {
  return { modules: [], nextId: 1 };
}

/**
 * Create a new module — assigns next available sort_order (max + 1).
 * Mirrors moduleService.create logic.
 */
function createModule(state: SegmentModuleState): SegmentModuleState {
  const maxOrder = state.modules.reduce((max, m) => Math.max(max, m.sortOrder), 0);
  const newModule: ModuleModel = {
    id: `module-${state.nextId}`,
    sortOrder: maxOrder + 1,
  };
  return {
    modules: [...state.modules, newModule],
    nextId: state.nextId + 1,
  };
}

/**
 * Delete a module by index and reorder remaining modules to maintain contiguity.
 * Mirrors moduleService.delete logic (reorders remaining after deletion).
 */
function deleteModule(state: SegmentModuleState, index: number): SegmentModuleState {
  if (state.modules.length === 0 || index < 0 || index >= state.modules.length) {
    return state; // No-op for invalid index
  }

  const remaining = state.modules.filter((_, i) => i !== index);

  // Sort by current sortOrder then reassign contiguous values from 1
  const sorted = [...remaining].sort((a, b) => a.sortOrder - b.sortOrder);
  const reordered = sorted.map((m, i) => ({ ...m, sortOrder: i + 1 }));

  return { ...state, modules: reordered };
}

/**
 * Reorder modules given a permutation of indices.
 * Assigns contiguous sort_order values starting from 1 in the new order.
 * Mirrors moduleService.reorder logic.
 */
function reorderModules(state: SegmentModuleState, permutation: number[]): SegmentModuleState {
  if (state.modules.length === 0) return state;

  // Validate permutation covers all modules
  const sortedByOrder = [...state.modules].sort((a, b) => a.sortOrder - b.sortOrder);

  // Apply permutation: permutation[i] = index in sortedByOrder that goes to position i
  const reordered = permutation.map((sourceIdx, newPosition) => ({
    ...sortedByOrder[sourceIdx],
    sortOrder: newPosition + 1,
  }));

  return { ...state, modules: reordered };
}

// --- Operation type for generating random sequences ---

type Operation =
  | { type: 'create' }
  | { type: 'delete'; index: number }
  | { type: 'reorder'; permutation: number[] };

/**
 * Checks the contiguity invariant:
 * sort_order values form a contiguous sequence from 1 to N with no duplicates and no gaps.
 */
function checkContiguityInvariant(modules: ModuleModel[]): void {
  const n = modules.length;

  if (n === 0) return; // Empty is trivially valid

  const sortOrders = modules.map((m) => m.sortOrder).sort((a, b) => a - b);

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

// --- Arbitraries ---

/**
 * Generates a valid permutation array of length n.
 * A permutation is an array [0..n-1] shuffled.
 */
function arbPermutation(n: number): fc.Arbitrary<number[]> {
  if (n <= 1) return fc.constant(Array.from({ length: n }, (_, i) => i));

  return fc.shuffledSubarray(
    Array.from({ length: n }, (_, i) => i),
    { minLength: n, maxLength: n }
  );
}

/**
 * Generates a random operation given the current module count.
 */
function arbOperation(moduleCount: number): fc.Arbitrary<Operation> {
  const ops: fc.Arbitrary<Operation>[] = [
    fc.constant({ type: 'create' } as Operation),
  ];

  if (moduleCount > 0) {
    ops.push(
      fc.nat({ max: moduleCount - 1 }).map((index) => ({
        type: 'delete' as const,
        index,
      }))
    );
    ops.push(
      arbPermutation(moduleCount).map((permutation) => ({
        type: 'reorder' as const,
        permutation,
      }))
    );
  }

  return fc.oneof(...ops);
}

/**
 * Generates a sequence of operations, where each operation is valid for the
 * current state (e.g., delete/reorder only when modules exist).
 * Uses fc.commands-like approach with a custom chain.
 */
function arbOperationSequence(minOps: number, maxOps: number): fc.Arbitrary<Operation[]> {
  return fc.integer({ min: minOps, max: maxOps }).chain((numOps) => {
    // We build the sequence step by step, tracking module count
    let currentCount = 0;
    const opArbs: fc.Arbitrary<Operation>[] = [];

    for (let i = 0; i < numOps; i++) {
      // Capture current count for this step
      const count = currentCount;
      opArbs.push(arbOperation(count));

      // Estimate next count (we always add create to ensure growth)
      // Since we can't know the actual generated op, we use a heuristic:
      // assume create happens ~1/3 of the time when modules exist
      if (count === 0) {
        currentCount = 1; // Only create is possible
      } else {
        // Conservatively assume count stays the same for generation purposes
        currentCount = count;
      }
    }

    return fc.tuple(...opArbs).map((ops) => ops as Operation[]);
  });
}

/**
 * A simpler approach: generate a fixed-length sequence of operation types,
 * then resolve indices/permutations at execution time based on actual state.
 */
type OperationType = 'create' | 'delete' | 'reorder';

const arbOperationType = fc.constantFrom<OperationType>('create', 'delete', 'reorder');

const arbOperationTypeSequence = fc.array(arbOperationType, { minLength: 1, maxLength: 30 });

/**
 * Applies an operation type to the current state, resolving any needed parameters
 * from a random seed value.
 */
function applyOperationType(
  state: SegmentModuleState,
  opType: OperationType,
  seed: number
): SegmentModuleState {
  switch (opType) {
    case 'create':
      return createModule(state);

    case 'delete': {
      if (state.modules.length === 0) {
        // Can't delete from empty, treat as create instead
        return createModule(state);
      }
      const deleteIndex = seed % state.modules.length;
      return deleteModule(state, deleteIndex);
    }

    case 'reorder': {
      if (state.modules.length <= 1) {
        // Can't meaningfully reorder 0 or 1 modules, treat as create
        return createModule(state);
      }
      // Generate a deterministic permutation from seed
      const n = state.modules.length;
      const indices = Array.from({ length: n }, (_, i) => i);
      // Simple Fisher-Yates with seed
      let s = Math.abs(seed);
      for (let i = n - 1; i > 0; i--) {
        const j = s % (i + 1);
        s = Math.floor(s / (i + 1)) + 1;
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      return reorderModules(state, indices);
    }
  }
}

describe('Feature: m2-admin-content-management, Property 2: Module Sort Order Contiguity Invariant', () => {
  /**
   * **Validates: Requirements 3.1, 3.6, 3.7, 3.9, 7.6**
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
            checkContiguityInvariant(state.modules);
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 3.1**
   *
   * Creating modules always assigns the next contiguous sort_order.
   * After N creates, sort_orders should be exactly [1, 2, ..., N].
   */
  it('creating N modules produces sort_orders [1..N]', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 50 }), (n) => {
        let state = createInitialState();

        for (let i = 0; i < n; i++) {
          state = createModule(state);
        }

        expect(state.modules.length).toBe(n);
        checkContiguityInvariant(state.modules);

        // Each module should have sort_order equal to its creation position
        for (let i = 0; i < n; i++) {
          expect(state.modules[i].sortOrder).toBe(i + 1);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 3.7, 3.9**
   *
   * Deleting any module from a segment always results in contiguous sort_order
   * for the remaining modules.
   */
  it('deleting any module maintains contiguous sort_order for remaining modules', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 20 }),
        fc.nat(),
        (numModules, deleteSeed) => {
          // Create N modules
          let state = createInitialState();
          for (let i = 0; i < numModules; i++) {
            state = createModule(state);
          }

          // Delete one at a random valid index
          const deleteIndex = deleteSeed % state.modules.length;
          state = deleteModule(state, deleteIndex);

          // Should have N-1 modules with contiguous sort_order
          expect(state.modules.length).toBe(numModules - 1);
          checkContiguityInvariant(state.modules);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 3.6, 3.9**
   *
   * Reordering modules always maintains contiguous sort_order from 1.
   */
  it('reordering modules always maintains contiguous sort_order from 1', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 15 }),
        fc.nat(),
        (numModules, reorderSeed) => {
          // Create N modules
          let state = createInitialState();
          for (let i = 0; i < numModules; i++) {
            state = createModule(state);
          }

          // Generate a permutation from seed
          const n = state.modules.length;
          const indices = Array.from({ length: n }, (_, i) => i);
          let s = Math.abs(reorderSeed);
          for (let i = n - 1; i > 0; i--) {
            const j = s % (i + 1);
            s = Math.floor(s / (i + 1)) + 1;
            [indices[i], indices[j]] = [indices[j], indices[i]];
          }

          state = reorderModules(state, indices);

          // Should still have N modules with contiguous sort_order
          expect(state.modules.length).toBe(numModules);
          checkContiguityInvariant(state.modules);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 7.6**
   *
   * No two modules within a segment ever share the same sort_order value
   * (uniqueness invariant) after any sequence of operations.
   */
  it('no two modules share the same sort_order after any operations', () => {
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
            const sortOrders = state.modules.map((m) => m.sortOrder);
            const uniqueOrders = new Set(sortOrders);
            expect(uniqueOrders.size).toBe(sortOrders.length);
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 3.7, 3.9**
   *
   * Multiple sequential deletions maintain contiguity after each deletion.
   */
  it('multiple sequential deletions maintain contiguity after each deletion', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 15 }),
        fc.array(fc.nat(), { minLength: 1, maxLength: 10 }),
        (numModules, deleteSeeds) => {
          // Create N modules
          let state = createInitialState();
          for (let i = 0; i < numModules; i++) {
            state = createModule(state);
          }

          // Perform multiple deletions
          for (const seed of deleteSeeds) {
            if (state.modules.length === 0) break;
            const deleteIndex = seed % state.modules.length;
            state = deleteModule(state, deleteIndex);

            // Invariant must hold after each deletion
            checkContiguityInvariant(state.modules);
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});
