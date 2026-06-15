import { apiClient } from './api';
import type {
  Quiz,
  LearnerQuiz,
  CreateQuizInput,
  SubmitQuizAttemptInput,
  AttemptResult,
  AttemptSummary,
  AttemptDetail,
  ActivityItem,
} from '@/types/quiz';

// ─── Admin Quiz API ───────────────────────────────────────────────────────────

/**
 * Create or update the quiz for a segment.
 * If a quiz already exists, it replaces it entirely.
 */
export async function createOrUpdateQuiz(
  segmentId: string,
  data: CreateQuizInput
): Promise<Quiz> {
  return apiClient<Quiz>(`/admin/segments/${segmentId}/quiz`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get the quiz with all questions and options for a segment (admin view, includes is_correct).
 * Returns null if no quiz exists.
 */
export async function getSegmentQuiz(segmentId: string): Promise<Quiz | null> {
  return apiClient<Quiz | null>(`/admin/segments/${segmentId}/quiz`);
}

/**
 * Delete the quiz for a segment (cascades to questions, options, and attempts).
 */
export async function deleteSegmentQuiz(segmentId: string): Promise<void> {
  await apiClient<{ message: string }>(`/admin/segments/${segmentId}/quiz`, {
    method: 'DELETE',
  });
}

// ─── Learner Quiz API ─────────────────────────────────────────────────────────

/**
 * Get quiz for taking — excludes is_correct flag from options.
 * Returns null if no quiz exists for the segment.
 */
export async function getQuizForTaking(segmentId: string): Promise<LearnerQuiz | null> {
  return apiClient<LearnerQuiz | null>(`/learner/segments/${segmentId}/quiz`);
}

/**
 * Submit a quiz attempt with answers.
 * Returns score, percentage, and pass/fail status.
 */
export async function submitQuizAttempt(
  segmentId: string,
  data: SubmitQuizAttemptInput
): Promise<AttemptResult> {
  return apiClient<AttemptResult>(`/learner/segments/${segmentId}/quiz/attempts`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get attempt history for the authenticated learner on this segment's quiz.
 * Returns attempts ordered by most recent first.
 */
export async function getAttemptHistory(segmentId: string): Promise<AttemptSummary[]> {
  const response = await apiClient<{ attempts: AttemptSummary[] }>(
    `/learner/segments/${segmentId}/quiz/attempts`
  );
  return response.attempts;
}

/**
 * Get detailed breakdown for a specific attempt.
 * Shows per-question results with learner's selection and correct answers.
 */
export async function getAttemptDetail(
  segmentId: string,
  attemptId: string
): Promise<AttemptDetail> {
  return apiClient<AttemptDetail>(
    `/learner/segments/${segmentId}/quiz/attempts/${attemptId}`
  );
}

// ─── Activity API ─────────────────────────────────────────────────────────────

export interface GetRecentActivityParams {
  limit?: number;
  filter?: string;
}

/**
 * Get recent activity events for the admin dashboard.
 * Supports filtering by action type and limiting result count.
 */
export async function getRecentActivity(
  params?: GetRecentActivityParams
): Promise<ActivityItem[]> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.filter && params.filter !== 'all') {
    searchParams.set('filter', params.filter);
  }

  const query = searchParams.toString();
  const endpoint = query ? `/admin/activity?${query}` : '/admin/activity';
  return apiClient<ActivityItem[]>(endpoint);
}
