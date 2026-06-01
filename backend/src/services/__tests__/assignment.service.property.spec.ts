import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Feature: m2-admin-content-management, Property 5: Assignment Removal Round-Trip (Remove then List Excludes)
 *
 * **Validates: Requirements 6.5, 6.10**
 *
 * For any existing assignment, removing the assignment and then listing users assigned
 * to that segment SHALL exclude the removed user from the result set.
 */

// --- In-memory model of the Assignment Service ---

interface Assignment {
  id: string;
  userId: string;
  segmentId: string;
  assignedAt: Date;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface Segment {
  id: string;
  title: string;
}

interface AssignmentState {
  users: User[];
  segments: Segment[];
  assignments: Assignment[];
  nextAssignmentId: number;
}

function createInitialState(users: User[], segments: Segment[]): AssignmentState {
  return {
    users,
    segments,
    assignments: [],
    nextAssignmentId: 1,
  };
}

/**
 * Assign a user to a segment. Returns the new assignment or null if duplicate/invalid.
 * Mirrors assignmentService.assign logic.
 */
function assignUser(
  state: AssignmentState,
  userId: string,
  segmentId: string
): { state: AssignmentState; assignment: Assignment | null } {
  // Verify user exists
  const userExists = state.users.some((u) => u.id === userId);
  if (!userExists) return { state, assignment: null };

  // Verify segment exists
  const segmentExists = state.segments.some((s) => s.id === segmentId);
  if (!segmentExists) return { state, assignment: null };

  // Check for duplicate
  const duplicate = state.assignments.some(
    (a) => a.userId === userId && a.segmentId === segmentId
  );
  if (duplicate) return { state, assignment: null };

  const assignment: Assignment = {
    id: `assignment-${state.nextAssignmentId}`,
    userId,
    segmentId,
    assignedAt: new Date(),
  };

  return {
    state: {
      ...state,
      assignments: [...state.assignments, assignment],
      nextAssignmentId: state.nextAssignmentId + 1,
    },
    assignment,
  };
}

/**
 * Remove an assignment by ID.
 * Mirrors assignmentService.remove logic.
 */
function removeAssignment(
  state: AssignmentState,
  assignmentId: string
): { state: AssignmentState; removed: boolean } {
  const exists = state.assignments.some((a) => a.id === assignmentId);
  if (!exists) return { state, removed: false };

  return {
    state: {
      ...state,
      assignments: state.assignments.filter((a) => a.id !== assignmentId),
    },
    removed: true,
  };
}

/**
 * List user IDs assigned to a specific segment.
 * Mirrors assignmentService.listBySegment logic.
 */
function listUsersBySegment(state: AssignmentState, segmentId: string): string[] {
  return state.assignments
    .filter((a) => a.segmentId === segmentId)
    .map((a) => a.userId);
}

// --- Arbitraries ---

/**
 * Generates a random user with a unique ID.
 */
function arbUser(index: number): fc.Arbitrary<User> {
  return fc.record({
    id: fc.constant(`user-${index}`),
    name: fc.string({ minLength: 1, maxLength: 20 }).map((s) => s || `User${index}`),
    email: fc.constant(`user${index}@example.com`),
  });
}

/**
 * Generates a random segment with a unique ID.
 */
function arbSegment(index: number): fc.Arbitrary<Segment> {
  return fc.record({
    id: fc.constant(`segment-${index}`),
    title: fc.string({ minLength: 1, maxLength: 30 }).map((s) => s || `Segment${index}`),
  });
}

/**
 * Generates a set of users.
 */
function arbUsers(count: number): fc.Arbitrary<User[]> {
  return fc.tuple(...Array.from({ length: count }, (_, i) => arbUser(i))).map((users) => users);
}

/**
 * Generates a set of segments.
 */
function arbSegments(count: number): fc.Arbitrary<Segment[]> {
  return fc.tuple(...Array.from({ length: count }, (_, i) => arbSegment(i))).map((segs) => segs);
}

describe('Feature: m2-admin-content-management, Property 5: Assignment Removal Round-Trip (Remove then List Excludes)', () => {
  /**
   * **Validates: Requirements 6.5, 6.10**
   *
   * For any existing assignment, removing it and then listing users assigned to that
   * segment SHALL exclude the removed user from the result set.
   */
  it('removing an assignment then listing excludes the removed user', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }),
        fc.integer({ min: 1, max: 5 }),
        fc.nat({ max: 100 }),
        (numUsers, numSegments, seed) => {
          // Create users and segments
          const users: User[] = Array.from({ length: numUsers }, (_, i) => ({
            id: `user-${i}`,
            name: `User${i}`,
            email: `user${i}@example.com`,
          }));

          const segments: Segment[] = Array.from({ length: numSegments }, (_, i) => ({
            id: `segment-${i}`,
            title: `Segment${i}`,
          }));

          let state = createInitialState(users, segments);

          // Create some assignments
          const assignmentsToCreate = Math.min(numUsers * numSegments, 10);
          const createdAssignments: Assignment[] = [];

          for (let i = 0; i < assignmentsToCreate; i++) {
            const userId = users[i % numUsers].id;
            const segmentId = segments[i % numSegments].id;
            const result = assignUser(state, userId, segmentId);
            if (result.assignment) {
              state = result.state;
              createdAssignments.push(result.assignment);
            }
          }

          // Skip if no assignments were created
          if (createdAssignments.length === 0) return;

          // Pick a random assignment to remove
          const targetIndex = seed % createdAssignments.length;
          const targetAssignment = createdAssignments[targetIndex];

          // Remove the assignment
          const removeResult = removeAssignment(state, targetAssignment.id);
          expect(removeResult.removed).toBe(true);
          state = removeResult.state;

          // List users for the segment
          const assignedUsers = listUsersBySegment(state, targetAssignment.segmentId);

          // The removed user should NOT appear in the list for that segment
          // (unless they have another assignment to the same segment, which is impossible
          // due to the duplicate check)
          expect(assignedUsers).not.toContain(targetAssignment.userId);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 6.5, 6.10**
   *
   * Removing an assignment does not affect other assignments to the same segment.
   * Other users assigned to the same segment remain in the list.
   */
  it('removing one assignment does not affect other assignments to the same segment', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 10 }),
        fc.nat({ max: 100 }),
        (numUsers, seed) => {
          const users: User[] = Array.from({ length: numUsers }, (_, i) => ({
            id: `user-${i}`,
            name: `User${i}`,
            email: `user${i}@example.com`,
          }));

          const segments: Segment[] = [{ id: 'segment-0', title: 'Segment0' }];
          let state = createInitialState(users, segments);

          // Assign all users to the same segment
          const createdAssignments: Assignment[] = [];
          for (const user of users) {
            const result = assignUser(state, user.id, 'segment-0');
            if (result.assignment) {
              state = result.state;
              createdAssignments.push(result.assignment);
            }
          }

          // Must have at least 2 assignments to test
          if (createdAssignments.length < 2) return;

          // Pick one to remove
          const targetIndex = seed % createdAssignments.length;
          const targetAssignment = createdAssignments[targetIndex];
          const remainingAssignments = createdAssignments.filter((_, i) => i !== targetIndex);

          // Remove the target assignment
          const removeResult = removeAssignment(state, targetAssignment.id);
          expect(removeResult.removed).toBe(true);
          state = removeResult.state;

          // List users for the segment
          const assignedUsers = listUsersBySegment(state, 'segment-0');

          // Removed user should be excluded
          expect(assignedUsers).not.toContain(targetAssignment.userId);

          // All other users should still be present
          for (const remaining of remainingAssignments) {
            expect(assignedUsers).toContain(remaining.userId);
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 6.5, 6.10**
   *
   * Removing multiple assignments sequentially: after each removal, the removed user
   * is excluded from the segment's user list.
   */
  it('sequential removals each exclude the removed user from the list', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 8 }),
        fc.integer({ min: 1, max: 4 }),
        fc.array(fc.nat({ max: 100 }), { minLength: 1, maxLength: 10 }),
        (numUsers, numSegments, removalSeeds) => {
          const users: User[] = Array.from({ length: numUsers }, (_, i) => ({
            id: `user-${i}`,
            name: `User${i}`,
            email: `user${i}@example.com`,
          }));

          const segments: Segment[] = Array.from({ length: numSegments }, (_, i) => ({
            id: `segment-${i}`,
            title: `Segment${i}`,
          }));

          let state = createInitialState(users, segments);

          // Create assignments: assign each user to each segment
          const createdAssignments: Assignment[] = [];
          for (const user of users) {
            for (const segment of segments) {
              const result = assignUser(state, user.id, segment.id);
              if (result.assignment) {
                state = result.state;
                createdAssignments.push(result.assignment);
              }
            }
          }

          // Perform sequential removals
          let remainingAssignments = [...createdAssignments];

          for (const seed of removalSeeds) {
            if (remainingAssignments.length === 0) break;

            const targetIndex = seed % remainingAssignments.length;
            const targetAssignment = remainingAssignments[targetIndex];

            // Remove the assignment
            const removeResult = removeAssignment(state, targetAssignment.id);
            expect(removeResult.removed).toBe(true);
            state = removeResult.state;

            // Verify the removed user is excluded from that segment's list
            const assignedUsers = listUsersBySegment(state, targetAssignment.segmentId);
            expect(assignedUsers).not.toContain(targetAssignment.userId);

            // Update tracking
            remainingAssignments = remainingAssignments.filter((_, i) => i !== targetIndex);
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 6.5**
   *
   * Attempting to remove a non-existent assignment fails gracefully (returns removed: false).
   */
  it('removing a non-existent assignment returns removed false', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (fakeId) => {
          const state = createInitialState(
            [{ id: 'user-0', name: 'User0', email: 'user0@example.com' }],
            [{ id: 'segment-0', title: 'Segment0' }]
          );

          const result = removeAssignment(state, fakeId);
          expect(result.removed).toBe(false);
          // State should be unchanged
          expect(result.state).toEqual(state);
        }
      ),
      { numRuns: 100 }
    );
  });
});
