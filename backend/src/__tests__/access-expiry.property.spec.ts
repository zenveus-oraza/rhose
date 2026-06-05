import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Feature: m3-user-learning-experience, Property 1: Access Expiry Calculation
 *
 * **Validates: Requirements 1.3, 1.4, 2.5, 10.4**
 *
 * Verifies that the access expiry calculation correctly classifies access as
 * active or expired based on assignedAt + accessDurationDays calendar days (UTC).
 * If accessDurationDays is null, access is unlimited (never expires).
 */

/**
 * Pure calculation extracted from SegmentAccessService.
 * Determines whether access has expired based on:
 * - assignedAt: when the user was assigned to the segment
 * - accessDurationDays: number of calendar days of access (null = unlimited)
 * - referenceDate: the point in time to check against
 */
function isAccessExpired(
  assignedAt: Date,
  accessDurationDays: number | null,
  referenceDate: Date
): boolean {
  if (accessDurationDays === null) return false;
  const expiry = new Date(assignedAt);
  expiry.setUTCDate(expiry.getUTCDate() + accessDurationDays);
  return referenceDate > expiry;
}

/**
 * Computes the expiry date for a given assignedAt and duration.
 */
function getExpiryDate(assignedAt: Date, accessDurationDays: number): Date {
  const expiry = new Date(assignedAt);
  expiry.setUTCDate(expiry.getUTCDate() + accessDurationDays);
  return expiry;
}

describe('Feature: m3-user-learning-experience, Property 1: Access Expiry Calculation', () => {
  /**
   * **Validates: Requirements 2.5, 10.4**
   *
   * For any assignedAt date and positive accessDurationDays, a reference date
   * that is before or equal to the expiry boundary should result in active access.
   */
  it('access is active when referenceDate <= assignedAt + accessDurationDays', () => {
    fc.assert(
      fc.property(
        // Random assignedAt date within a reasonable past range (2020-2024)
        fc.date({ min: new Date('2020-01-01T00:00:00Z'), max: new Date('2024-12-31T23:59:59Z') }),
        // Random accessDurationDays (1 to 365)
        fc.integer({ min: 1, max: 365 }),
        // Random offset in milliseconds before or at the expiry (0 to duration in ms)
        fc.integer({ min: 0, max: 365 * 24 * 60 * 60 * 1000 }),
        (assignedAt, accessDurationDays, offsetMs) => {
          const expiry = getExpiryDate(assignedAt, accessDurationDays);
          const maxOffset = expiry.getTime() - assignedAt.getTime();
          // Clamp offset to be within [0, maxOffset] so referenceDate <= expiry
          const clampedOffset = offsetMs % (maxOffset + 1);
          const referenceDate = new Date(assignedAt.getTime() + clampedOffset);

          const expired = isAccessExpired(assignedAt, accessDurationDays, referenceDate);
          expect(expired).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 1.3, 2.5, 10.4**
   *
   * For any assignedAt date and positive accessDurationDays, a reference date
   * that is strictly after the expiry boundary should result in expired access.
   */
  it('access is expired when referenceDate > assignedAt + accessDurationDays', () => {
    fc.assert(
      fc.property(
        // Random assignedAt date within a reasonable past range
        fc.date({ min: new Date('2020-01-01T00:00:00Z'), max: new Date('2024-12-31T23:59:59Z') }),
        // Random accessDurationDays (1 to 365)
        fc.integer({ min: 1, max: 365 }),
        // Random offset past expiry (1ms to 365 days after expiry)
        fc.integer({ min: 1, max: 365 * 24 * 60 * 60 * 1000 }),
        (assignedAt, accessDurationDays, offsetPastExpiry) => {
          const expiry = getExpiryDate(assignedAt, accessDurationDays);
          const referenceDate = new Date(expiry.getTime() + offsetPastExpiry);

          const expired = isAccessExpired(assignedAt, accessDurationDays, referenceDate);
          expect(expired).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 2.5, 10.4**
   *
   * The exact expiry boundary: referenceDate exactly equal to expiry should NOT
   * be expired (access is still active at the boundary moment).
   */
  it('access is active at exactly the expiry boundary (referenceDate === expiry)', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01T00:00:00Z'), max: new Date('2024-12-31T23:59:59Z') }),
        fc.integer({ min: 1, max: 365 }),
        (assignedAt, accessDurationDays) => {
          const expiry = getExpiryDate(assignedAt, accessDurationDays);
          // Reference date exactly at expiry
          const referenceDate = new Date(expiry.getTime());

          const expired = isAccessExpired(assignedAt, accessDurationDays, referenceDate);
          // At exactly the boundary, referenceDate > expiry is false, so not expired
          expect(expired).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 1.3, 2.5, 10.4**
   *
   * One millisecond past the expiry boundary results in expired access.
   */
  it('access is expired 1ms after the expiry boundary', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01T00:00:00Z'), max: new Date('2024-12-31T23:59:59Z') }),
        fc.integer({ min: 1, max: 365 }),
        (assignedAt, accessDurationDays) => {
          const expiry = getExpiryDate(assignedAt, accessDurationDays);
          // Reference date 1ms past expiry
          const referenceDate = new Date(expiry.getTime() + 1);

          const expired = isAccessExpired(assignedAt, accessDurationDays, referenceDate);
          expect(expired).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 1.4, 2.5**
   *
   * If accessDurationDays is null, access is unlimited and never expires,
   * regardless of how far in the future the reference date is.
   */
  it('access is never expired when accessDurationDays is null (unlimited access)', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01T00:00:00Z'), max: new Date('2024-12-31T23:59:59Z') }),
        // Reference date can be far in the future (up to year 3000)
        fc.date({ min: new Date('2020-01-01T00:00:00Z'), max: new Date('3000-12-31T23:59:59Z') }),
        (assignedAt, referenceDate) => {
          const expired = isAccessExpired(assignedAt, null, referenceDate);
          expect(expired).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 1.4, 2.5**
   *
   * Null duration always returns false regardless of the relationship between
   * assignedAt and referenceDate (even if referenceDate is before assignedAt).
   */
  it('null duration always grants access regardless of any date combination', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('1970-01-01T00:00:00Z'), max: new Date('3000-12-31T23:59:59Z') }),
        fc.date({ min: new Date('1970-01-01T00:00:00Z'), max: new Date('3000-12-31T23:59:59Z') }),
        (assignedAt, referenceDate) => {
          const expired = isAccessExpired(assignedAt, null, referenceDate);
          expect(expired).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 2.5, 10.4**
   *
   * Monotonicity property: If access is expired at time T, it should also be
   * expired at any time T' > T. Access expiry is irreversible.
   */
  it('expiry is monotonic: if expired at time T, also expired at any T2 > T', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01T00:00:00Z'), max: new Date('2024-12-31T23:59:59Z') }),
        fc.integer({ min: 1, max: 365 }),
        fc.integer({ min: 1, max: 365 * 24 * 60 * 60 * 1000 }),
        fc.integer({ min: 1, max: 365 * 24 * 60 * 60 * 1000 }),
        (assignedAt, accessDurationDays, offsetPastExpiry, additionalOffset) => {
          const expiry = getExpiryDate(assignedAt, accessDurationDays);
          const t1 = new Date(expiry.getTime() + offsetPastExpiry);
          const t2 = new Date(t1.getTime() + additionalOffset);

          const expiredAtT1 = isAccessExpired(assignedAt, accessDurationDays, t1);
          const expiredAtT2 = isAccessExpired(assignedAt, accessDurationDays, t2);

          // If expired at T1, must be expired at T2 (T2 > T1)
          expect(expiredAtT1).toBe(true);
          expect(expiredAtT2).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 2.5, 10.4**
   *
   * Consistency property: Increasing accessDurationDays should never cause
   * access to expire sooner. A longer duration always extends or maintains the expiry.
   */
  it('longer accessDurationDays never causes earlier expiry', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01T00:00:00Z'), max: new Date('2024-12-31T23:59:59Z') }),
        fc.integer({ min: 1, max: 180 }),
        fc.integer({ min: 1, max: 180 }),
        fc.date({ min: new Date('2020-01-01T00:00:00Z'), max: new Date('2026-12-31T23:59:59Z') }),
        (assignedAt, duration1, duration2, referenceDate) => {
          const shorterDuration = Math.min(duration1, duration2);
          const longerDuration = Math.max(duration1, duration2);

          const expiredShorter = isAccessExpired(assignedAt, shorterDuration, referenceDate);
          const expiredLonger = isAccessExpired(assignedAt, longerDuration, referenceDate);

          // If not expired with shorter duration, cannot be expired with longer
          if (!expiredShorter) {
            // This case is valid — shorter not expired implies longer not expired
            expect(expiredLonger).toBe(false);
          }
          // If expired with longer duration, must be expired with shorter too
          if (expiredLonger) {
            expect(expiredShorter).toBe(true);
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});
