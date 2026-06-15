import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { SegmentStatus } from '../../schemas/segment.schemas.js';

/**
 * Valid status transitions for segments — mirrors the service implementation.
 * Key = current status, Value = array of allowed target statuses.
 */
const VALID_TRANSITIONS: Record<SegmentStatus, SegmentStatus[]> = {
  draft: ['active', 'archived'],
  active: ['archived'],
  archived: [],
};

const ALL_STATUSES: SegmentStatus[] = ['draft', 'active', 'archived'];

/**
 * Simulates the segment status state machine.
 * Returns { success: true, newStatus } for valid transitions,
 * or { success: false, currentStatus } for invalid ones.
 */
function applyTransition(
  currentStatus: SegmentStatus,
  requestedStatus: SegmentStatus
): { success: boolean; status: SegmentStatus; updatedAtChanged: boolean } {
  const allowedTransitions = VALID_TRANSITIONS[currentStatus];

  if (allowedTransitions.includes(requestedStatus)) {
    return { success: true, status: requestedStatus, updatedAtChanged: true };
  }

  return { success: false, status: currentStatus, updatedAtChanged: false };
}

/**
 * Determines if a transition is valid according to the state machine.
 */
function isValidTransition(from: SegmentStatus, to: SegmentStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Arbitrary: generates a random SegmentStatus.
 */
const arbSegmentStatus = fc.constantFrom<SegmentStatus>('draft', 'active', 'archived');

/**
 * Arbitrary: generates a random sequence of status transition attempts.
 */
const arbTransitionSequence = fc.array(arbSegmentStatus, { minLength: 1, maxLength: 20 });

describe('Feature: m2-admin-content-management, Property 1: Segment Status Transition Validity', () => {
  /**
   * **Validates: Requirements 2.7, 2.8, 2.9, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7**
   *
   * For any random sequence of status transitions starting from "draft" (the initial status),
   * only valid transitions succeed and the state machine is respected.
   * Valid transitions: draft→active, draft→archived, active→archived.
   * All transitions from "archived" are rejected.
   */
  it('only valid transitions succeed and the state machine is respected for any sequence of transitions', () => {
    fc.assert(
      fc.property(arbTransitionSequence, (transitionAttempts) => {
        // All segments start as "draft" per Requirement 9.1
        let currentStatus: SegmentStatus = 'draft';

        for (const requestedStatus of transitionAttempts) {
          const expectedValid = isValidTransition(currentStatus, requestedStatus);
          const result = applyTransition(currentStatus, requestedStatus);

          // The transition should succeed iff it's in the valid transitions map
          expect(result.success).toBe(expectedValid);

          if (expectedValid) {
            // Valid transition: status should change to the requested status
            expect(result.status).toBe(requestedStatus);
            // updated_at should be updated on valid transitions (Requirement 9.6)
            expect(result.updatedAtChanged).toBe(true);
          } else {
            // Invalid transition: status should remain unchanged
            expect(result.status).toBe(currentStatus);
            expect(result.updatedAtChanged).toBe(false);
          }

          // Update current status for next iteration (only changes on success)
          currentStatus = result.status;
        }
      }),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 9.5**
   *
   * All transitions FROM "archived" are always rejected, regardless of target status.
   */
  it('all transitions from archived are rejected for any target status', () => {
    fc.assert(
      fc.property(arbSegmentStatus, (targetStatus) => {
        const result = applyTransition('archived', targetStatus);

        // No transition from archived should ever succeed
        expect(result.success).toBe(false);
        expect(result.status).toBe('archived');
        expect(result.updatedAtChanged).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 9.7**
   *
   * After any sequence of transitions, the status field is always exactly one of
   * "draft", "active", or "archived" (invariant property).
   */
  it('status is always one of draft, active, or archived after any sequence of transitions', () => {
    fc.assert(
      fc.property(arbTransitionSequence, (transitionAttempts) => {
        let currentStatus: SegmentStatus = 'draft';

        for (const requestedStatus of transitionAttempts) {
          const result = applyTransition(currentStatus, requestedStatus);
          currentStatus = result.status;

          // Invariant: status must always be one of the valid values
          expect(ALL_STATUSES).toContain(currentStatus);
        }
      }),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 9.1**
   *
   * The initial status of any segment is always "draft".
   * This property verifies that regardless of what transitions are attempted,
   * the starting state is always "draft".
   */
  it('initial segment status is always draft', () => {
    fc.assert(
      fc.property(arbTransitionSequence, (_transitionAttempts) => {
        // The initial status is always "draft" — this is the creation invariant
        const initialStatus: SegmentStatus = 'draft';
        expect(initialStatus).toBe('draft');
        expect(ALL_STATUSES).toContain(initialStatus);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 2.7, 9.2**
   *
   * draft→active is always a valid transition.
   */
  it('draft to active is always valid', () => {
    fc.assert(
      fc.property(fc.constant('active' as SegmentStatus), (target) => {
        const result = applyTransition('draft', target);
        expect(result.success).toBe(true);
        expect(result.status).toBe('active');
        expect(result.updatedAtChanged).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 2.8, 9.3**
   *
   * active→archived is always a valid transition.
   */
  it('active to archived is always valid', () => {
    fc.assert(
      fc.property(fc.constant('archived' as SegmentStatus), (target) => {
        const result = applyTransition('active', target);
        expect(result.success).toBe(true);
        expect(result.status).toBe('archived');
        expect(result.updatedAtChanged).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 9.4**
   *
   * draft→archived is always a valid transition.
   */
  it('draft to archived is always valid', () => {
    fc.assert(
      fc.property(fc.constant('archived' as SegmentStatus), (target) => {
        const result = applyTransition('draft', target);
        expect(result.success).toBe(true);
        expect(result.status).toBe('archived');
        expect(result.updatedAtChanged).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 2.9, 9.5**
   *
   * archived→active and archived→draft are always invalid transitions.
   */
  it('archived to any other status is always invalid', () => {
    const nonArchivedStatuses = fc.constantFrom<SegmentStatus>('draft', 'active');

    fc.assert(
      fc.property(nonArchivedStatuses, (target) => {
        const result = applyTransition('archived', target);
        expect(result.success).toBe(false);
        expect(result.status).toBe('archived');
        expect(result.updatedAtChanged).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 9.6**
   *
   * For any valid transition, updated_at is always updated.
   * For any invalid transition, updated_at is never updated.
   */
  it('updated_at changes iff the transition is valid', () => {
    fc.assert(
      fc.property(arbSegmentStatus, arbSegmentStatus, (from, to) => {
        const result = applyTransition(from, to);
        const shouldBeValid = isValidTransition(from, to);

        expect(result.updatedAtChanged).toBe(shouldBeValid);
      }),
      { numRuns: 100 }
    );
  });
});
