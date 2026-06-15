import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Access verification result — mirrors SegmentAccessResult from segment-access.service.ts
 */
type AccessDecision =
  | { granted: true }
  | { granted: false; code: 'ACCESS_DENIED' | 'ACCESS_EXPIRED' | 'SEGMENT_UNAVAILABLE' };

type SegmentStatus = 'draft' | 'active' | 'archived';

/**
 * Pure function replicating the access decision logic from SegmentAccessService.
 * This allows property-based testing without database dependencies.
 *
 * Decision order:
 * 1. No assignment → ACCESS_DENIED
 * 2. Assignment exists, segment status NOT 'active' → SEGMENT_UNAVAILABLE
 * 3. Assignment exists, segment active, duration null → granted (unlimited)
 * 4. Assignment exists, segment active, duration set, not expired → granted
 * 5. Assignment exists, segment active, duration set, expired → ACCESS_EXPIRED
 */
function determineAccess(params: {
  hasAssignment: boolean;
  segmentStatus: SegmentStatus;
  accessDurationDays: number | null;
  assignedAt: Date;
  referenceDate: Date;
}): AccessDecision {
  const { hasAssignment, segmentStatus, accessDurationDays, assignedAt, referenceDate } = params;

  // 1. No assignment → ACCESS_DENIED
  if (!hasAssignment) {
    return { granted: false, code: 'ACCESS_DENIED' };
  }

  // 2. Segment not active → SEGMENT_UNAVAILABLE
  if (segmentStatus !== 'active') {
    return { granted: false, code: 'SEGMENT_UNAVAILABLE' };
  }

  // 3. Null duration → unlimited access
  if (accessDurationDays === null) {
    return { granted: true };
  }

  // 4/5. Calculate expiry: assignedAt + accessDurationDays calendar days (UTC)
  const expiryDate = new Date(assignedAt);
  expiryDate.setUTCDate(expiryDate.getUTCDate() + accessDurationDays);

  if (referenceDate > expiryDate) {
    return { granted: false, code: 'ACCESS_EXPIRED' };
  }

  return { granted: true };
}

// ---------- Arbitraries ----------

const segmentStatusArb = fc.constantFrom<SegmentStatus>('draft', 'active', 'archived');
const inactiveSegmentStatusArb = fc.constantFrom<SegmentStatus>('draft', 'archived');

/** Generates a Date within a reasonable range (2020–2030) */
const dateArb = fc.date({ min: new Date('2020-01-01T00:00:00Z'), max: new Date('2030-12-31T23:59:59Z') });

/** Positive integer for access duration in days (1–3650) */
const durationArb = fc.integer({ min: 1, max: 3650 });

/** Nullable duration: either null (unlimited) or a positive integer */
const nullableDurationArb = fc.oneof(fc.constant(null), durationArb);

describe('Feature: m3-user-learning-experience, Property 2: Access Control Invariant', () => {
  /**
   * **Validates: Requirement 2.1**
   *
   * Property: No assignment always yields ACCESS_DENIED regardless of segment status,
   * duration settings, or date values.
   */
  it('no assignment always yields ACCESS_DENIED regardless of other params', () => {
    fc.assert(
      fc.property(
        segmentStatusArb,
        nullableDurationArb,
        dateArb,
        dateArb,
        (segmentStatus, accessDurationDays, assignedAt, referenceDate) => {
          const result = determineAccess({
            hasAssignment: false,
            segmentStatus,
            accessDurationDays,
            assignedAt,
            referenceDate,
          });

          expect(result.granted).toBe(false);
          if (!result.granted) {
            expect(result.code).toBe('ACCESS_DENIED');
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 2.2, 2.7**
   *
   * Property: When assigned but segment status is NOT 'active' (draft or archived),
   * the result is always SEGMENT_UNAVAILABLE regardless of duration or dates.
   */
  it('inactive segment (draft/archived) always yields SEGMENT_UNAVAILABLE when assigned', () => {
    fc.assert(
      fc.property(
        inactiveSegmentStatusArb,
        nullableDurationArb,
        dateArb,
        dateArb,
        (segmentStatus, accessDurationDays, assignedAt, referenceDate) => {
          const result = determineAccess({
            hasAssignment: true,
            segmentStatus,
            accessDurationDays,
            assignedAt,
            referenceDate,
          });

          expect(result.granted).toBe(false);
          if (!result.granted) {
            expect(result.code).toBe('SEGMENT_UNAVAILABLE');
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 2.3, 2.4**
   *
   * Property: Active segment + assigned + null duration (unlimited) always yields granted,
   * regardless of the assigned date or reference date.
   */
  it('active segment + assigned + null duration always yields granted', () => {
    fc.assert(
      fc.property(
        dateArb,
        dateArb,
        (assignedAt, referenceDate) => {
          const result = determineAccess({
            hasAssignment: true,
            segmentStatus: 'active',
            accessDurationDays: null,
            assignedAt,
            referenceDate,
          });

          expect(result.granted).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 2.3, 2.4**
   *
   * Property: Active segment + assigned + expired duration always yields ACCESS_EXPIRED.
   * We generate dates where referenceDate is strictly after assignedAt + durationDays.
   */
  it('active segment + assigned + expired duration always yields ACCESS_EXPIRED', () => {
    fc.assert(
      fc.property(
        dateArb,
        durationArb,
        fc.integer({ min: 1, max: 3650 }),
        (assignedAt, accessDurationDays, extraDays) => {
          // referenceDate is assignedAt + durationDays + extraDays (guaranteed expired)
          const referenceDate = new Date(assignedAt);
          referenceDate.setUTCDate(referenceDate.getUTCDate() + accessDurationDays + extraDays);
          // Add 1ms to ensure strictly after expiry boundary
          referenceDate.setTime(referenceDate.getTime() + 1);

          const result = determineAccess({
            hasAssignment: true,
            segmentStatus: 'active',
            accessDurationDays,
            assignedAt,
            referenceDate,
          });

          expect(result.granted).toBe(false);
          if (!result.granted) {
            expect(result.code).toBe('ACCESS_EXPIRED');
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 2.3, 2.4**
   *
   * Property: Active segment + assigned + non-expired duration always yields granted.
   * We generate dates where referenceDate is at or before assignedAt + durationDays.
   */
  it('active segment + assigned + non-expired duration always yields granted', () => {
    fc.assert(
      fc.property(
        dateArb,
        durationArb,
        fc.integer({ min: 0, max: 3650 }),
        (assignedAt, accessDurationDays, daysBeforeExpiry) => {
          // referenceDate is assignedAt + (durationDays - daysBeforeExpiry), clamped to not go before assignedAt
          const effectiveOffset = Math.min(accessDurationDays, daysBeforeExpiry);
          const referenceDate = new Date(assignedAt);
          referenceDate.setUTCDate(referenceDate.getUTCDate() + accessDurationDays - effectiveOffset);

          const result = determineAccess({
            hasAssignment: true,
            segmentStatus: 'active',
            accessDurationDays,
            assignedAt,
            referenceDate,
          });

          expect(result.granted).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.7**
   *
   * Exhaustiveness property: For any combination of inputs, the result code is always
   * one of the defined valid codes (granted, ACCESS_DENIED, ACCESS_EXPIRED, SEGMENT_UNAVAILABLE).
   */
  it('result is always one of the defined access decision codes (exhaustiveness)', () => {
    const validCodes = ['ACCESS_DENIED', 'ACCESS_EXPIRED', 'SEGMENT_UNAVAILABLE'] as const;

    fc.assert(
      fc.property(
        fc.boolean(),
        segmentStatusArb,
        nullableDurationArb,
        dateArb,
        dateArb,
        (hasAssignment, segmentStatus, accessDurationDays, assignedAt, referenceDate) => {
          const result = determineAccess({
            hasAssignment,
            segmentStatus,
            accessDurationDays,
            assignedAt,
            referenceDate,
          });

          if (result.granted) {
            expect(result.granted).toBe(true);
          } else {
            expect(result.granted).toBe(false);
            expect(validCodes).toContain(result.code);
          }
        }
      ),
      { numRuns: 500 }
    );
  });
});
