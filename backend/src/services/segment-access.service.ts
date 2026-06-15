import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { segmentAssignments } from '../db/schema/segment-assignments.js';
import { segments } from '../db/schema/segments.js';
import { segmentService } from './segment.service.js';

/**
 * Access verification result returned by verifyAccess.
 */
export type SegmentAccessResult =
  | { granted: true }
  | { granted: false; code: 'ACCESS_DENIED' | 'ACCESS_EXPIRED' | 'SEGMENT_UNAVAILABLE' };

/**
 * Segment Access Service — verifies whether a user has valid access to a segment.
 * Checks assignment existence, segment active status, and access duration expiry.
 */
export const segmentAccessService = {
  /**
   * Verify whether a user currently has access to a segment.
   *
   * Checks performed in order:
   * 1. Assignment exists for the user + segment pair
   * 2. Segment status is 'active'
   * 3. Access duration has not expired (null duration = unlimited)
   *
   * Expiry calculation: assignedAt + accessDurationDays calendar days (UTC).
   */
  async verifyAccess(userId: string, segmentId: string): Promise<SegmentAccessResult> {
    const resolvedSegment = await segmentService.resolveIdentifier(segmentId).catch(() => null);
    if (!resolvedSegment) {
      return { granted: false, code: 'ACCESS_DENIED' };
    }

    // 1. Check assignment exists
    const [assignment] = await db
      .select({
        id: segmentAssignments.id,
        accessDurationDays: segmentAssignments.accessDurationDays,
        assignedAt: segmentAssignments.assignedAt,
      })
      .from(segmentAssignments)
      .where(
        and(
          eq(segmentAssignments.userId, userId),
          eq(segmentAssignments.segmentId, resolvedSegment.id)
        )
      )
      .limit(1);

    if (!assignment) {
      return { granted: false, code: 'ACCESS_DENIED' };
    }

    // 2. Check segment is active
    const [segment] = await db
      .select({ status: segments.status })
      .from(segments)
      .where(eq(segments.id, resolvedSegment.id))
      .limit(1);

    if (!segment || segment.status !== 'active') {
      return { granted: false, code: 'SEGMENT_UNAVAILABLE' };
    }

    // 3. Check access duration
    if (assignment.accessDurationDays === null) {
      return { granted: true };
    }

    // Calculate expiry: assignedAt + accessDurationDays calendar days (UTC)
    const assignedAt = new Date(assignment.assignedAt);
    const expiryDate = new Date(assignedAt);
    expiryDate.setUTCDate(expiryDate.getUTCDate() + assignment.accessDurationDays);

    const now = new Date();

    if (now > expiryDate) {
      return { granted: false, code: 'ACCESS_EXPIRED' };
    }

    return { granted: true };
  },
};
