import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Pure model for a learning segment assigned to a user.
 * Segments are displayed in reverse chronological order (most recent first).
 */
interface Segment {
  id: string;
  assignedAt: Date;
}

/**
 * Pure model for a module within a segment.
 * Modules are displayed in ascending sort_order (lowest first).
 */
interface Module {
  id: string;
  sortOrder: number;
}

/**
 * Sorts segments by assignedAt descending (most recent first).
 * Returns a new array without mutating the input.
 */
function sortSegments(segments: Segment[]): Segment[] {
  return [...segments].sort((a, b) => b.assignedAt.getTime() - a.assignedAt.getTime());
}

/**
 * Sorts modules by sortOrder ascending (lowest first).
 * Returns a new array without mutating the input.
 */
function sortModules(modules: Module[]): Module[] {
  return [...modules].sort((a, b) => a.sortOrder - b.sortOrder);
}

// ---------- Arbitraries ----------

/**
 * Generates a random Segment with a unique ID and a random date.
 */
const segmentArb: fc.Arbitrary<Segment> = fc.record({
  id: fc.uuid(),
  assignedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
});

/**
 * Generates a random Module with a unique ID and a random sort order.
 */
const moduleArb: fc.Arbitrary<Module> = fc.record({
  id: fc.uuid(),
  sortOrder: fc.integer({ min: 0, max: 10000 }),
});

describe('Feature: m3-user-learning-experience, Property 10: Ordering Invariant', () => {
  /**
   * **Validates: Requirements 1.8, 3.2**
   *
   * Property: Sorted segments are in descending order by assignedAt
   * (each element's date >= next element's date).
   */
  it('segments are sorted in descending order by assignedAt', () => {
    fc.assert(
      fc.property(fc.array(segmentArb, { minLength: 0, maxLength: 50 }), (segments) => {
        const sorted = sortSegments(segments);

        for (let i = 0; i < sorted.length - 1; i++) {
          expect(sorted[i].assignedAt.getTime()).toBeGreaterThanOrEqual(
            sorted[i + 1].assignedAt.getTime()
          );
        }
      }),
      { numRuns: 300 }
    );
  });

  /**
   * **Validates: Requirements 1.8, 3.2**
   *
   * Property: Sorted modules are in ascending order by sortOrder
   * (each element's sortOrder <= next element's sortOrder).
   */
  it('modules are sorted in ascending order by sortOrder', () => {
    fc.assert(
      fc.property(fc.array(moduleArb, { minLength: 0, maxLength: 50 }), (modules) => {
        const sorted = sortModules(modules);

        for (let i = 0; i < sorted.length - 1; i++) {
          expect(sorted[i].sortOrder).toBeLessThanOrEqual(sorted[i + 1].sortOrder);
        }
      }),
      { numRuns: 300 }
    );
  });

  /**
   * **Validates: Requirements 1.8, 3.2**
   *
   * Property: Sorting segments is stable — repeated sorting gives the same result.
   */
  it('sorting segments is idempotent (stable under repeated application)', () => {
    fc.assert(
      fc.property(fc.array(segmentArb, { minLength: 0, maxLength: 50 }), (segments) => {
        const sortedOnce = sortSegments(segments);
        const sortedTwice = sortSegments(sortedOnce);

        expect(sortedTwice).toEqual(sortedOnce);
      }),
      { numRuns: 300 }
    );
  });

  /**
   * **Validates: Requirements 1.8, 3.2**
   *
   * Property: Sorting modules is stable — repeated sorting gives the same result.
   */
  it('sorting modules is idempotent (stable under repeated application)', () => {
    fc.assert(
      fc.property(fc.array(moduleArb, { minLength: 0, maxLength: 50 }), (modules) => {
        const sortedOnce = sortModules(modules);
        const sortedTwice = sortModules(sortedOnce);

        expect(sortedTwice).toEqual(sortedOnce);
      }),
      { numRuns: 300 }
    );
  });

  /**
   * **Validates: Requirements 1.8, 3.2**
   *
   * Property: Sorting segments preserves all elements (same length, same IDs).
   */
  it('sorting segments preserves all elements', () => {
    fc.assert(
      fc.property(fc.array(segmentArb, { minLength: 0, maxLength: 50 }), (segments) => {
        const sorted = sortSegments(segments);

        // Same length
        expect(sorted.length).toBe(segments.length);

        // Same set of IDs (order-independent comparison)
        const inputIds = segments.map((s) => s.id).sort();
        const sortedIds = sorted.map((s) => s.id).sort();
        expect(sortedIds).toEqual(inputIds);
      }),
      { numRuns: 300 }
    );
  });

  /**
   * **Validates: Requirements 1.8, 3.2**
   *
   * Property: Sorting modules preserves all elements (same length, same IDs).
   */
  it('sorting modules preserves all elements', () => {
    fc.assert(
      fc.property(fc.array(moduleArb, { minLength: 0, maxLength: 50 }), (modules) => {
        const sorted = sortModules(modules);

        // Same length
        expect(sorted.length).toBe(modules.length);

        // Same set of IDs (order-independent comparison)
        const inputIds = modules.map((m) => m.id).sort();
        const sortedIds = sorted.map((m) => m.id).sort();
        expect(sortedIds).toEqual(inputIds);
      }),
      { numRuns: 300 }
    );
  });

  /**
   * **Validates: Requirements 1.8, 3.2**
   *
   * Property: An empty list sorted remains empty.
   */
  it('sorting an empty segment list returns an empty list', () => {
    const sorted = sortSegments([]);
    expect(sorted).toEqual([]);
  });

  /**
   * **Validates: Requirements 1.8, 3.2**
   *
   * Property: An empty list sorted remains empty.
   */
  it('sorting an empty module list returns an empty list', () => {
    const sorted = sortModules([]);
    expect(sorted).toEqual([]);
  });

  /**
   * **Validates: Requirements 1.8, 3.2**
   *
   * Property: A single-element list is already sorted (identity case).
   */
  it('a single segment is trivially sorted', () => {
    fc.assert(
      fc.property(segmentArb, (segment) => {
        const sorted = sortSegments([segment]);
        expect(sorted).toEqual([segment]);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 1.8, 3.2**
   *
   * Property: A single-element list is already sorted (identity case).
   */
  it('a single module is trivially sorted', () => {
    fc.assert(
      fc.property(moduleArb, (mod) => {
        const sorted = sortModules([mod]);
        expect(sorted).toEqual([mod]);
      }),
      { numRuns: 100 }
    );
  });
});
