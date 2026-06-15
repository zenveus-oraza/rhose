import { eq, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { activityEvents } from '../db/schema/activity-events.js';
import { users } from '../db/schema/users.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActivityAction =
  | 'quiz_passed'
  | 'quiz_failed'
  | 'lesson_completed'
  | 'lesson_resumed'
  | 'segment_assigned'
  | 'user_created'
  | 'module_completed';

export interface ActivityEvent {
  userId: string;
  action: ActivityAction;
  description: string;
  detail?: string;
  metadata?: Record<string, unknown>;
}

export interface ActivityItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  action: ActivityAction;
  description: string;
  detail?: string;
  score?: string;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Abbreviate a full name to "FirstName L." format.
 * E.g., "Amaka Okafor" → "Amaka O.", "John" → "John"
 */
function abbreviateName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) {
    return parts[0] ?? '';
  }
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1][0]?.toUpperCase();
  return lastInitial ? `${firstName} ${lastInitial}.` : firstName;
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Activity Service — tracks user activity events and queries recent activity
 * for the admin dashboard. Events are append-only (immutable).
 */
export const activityService = {
  /**
   * Track a new activity event. Inserts a record into the activity_events table.
   */
  async trackEvent(event: ActivityEvent): Promise<void> {
    await db.insert(activityEvents).values({
      userId: event.userId,
      action: event.action,
      description: event.description,
      detail: event.detail ?? null,
      metadata: event.metadata ?? null,
    });
  },

  /**
   * Get recent activity events with user information for the admin dashboard.
   * Supports optional filtering by action type and limiting result count.
   */
  async getRecentActivity(options: { limit: number; filter?: string }): Promise<ActivityItem[]> {
    const { limit, filter } = options;

    let query = db
      .select({
        id: activityEvents.id,
        userId: activityEvents.userId,
        action: activityEvents.action,
        description: activityEvents.description,
        detail: activityEvents.detail,
        metadata: activityEvents.metadata,
        createdAt: activityEvents.createdAt,
        userName: users.name,
        userAvatar: users.profileImage,
      })
      .from(activityEvents)
      .innerJoin(users, eq(activityEvents.userId, users.id))
      .orderBy(desc(activityEvents.createdAt))
      .limit(limit)
      .$dynamic();

    if (filter && filter !== 'all') {
      query = query.where(eq(activityEvents.action, filter));
    }

    const rows = await query;

    return rows.map((row) => {
      const meta = row.metadata as Record<string, unknown> | null;
      let score: string | undefined;
      if (meta && 'score' in meta && 'totalQuestions' in meta) {
        score = `${meta.score}/${meta.totalQuestions}`;
      }

      return {
        id: row.id,
        userId: row.userId,
        userName: abbreviateName(row.userName),
        userAvatar: row.userAvatar,
        action: row.action as ActivityAction,
        description: row.description,
        detail: row.detail ?? undefined,
        score,
        createdAt: row.createdAt.toISOString(),
      };
    });
  },
};
