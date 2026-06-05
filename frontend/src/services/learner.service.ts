import { apiClient } from './api';
import type {
  AssignedSegmentsResponse,
  SegmentDetailResponse,
  ModuleLessonsResponse,
  LessonContentResponse,
  CompleteLessonResponse,
  CurrentLessonResponse,
  LessonProgressResponse,
} from '@/types/learner';

// --- Assigned Segments ---

export interface GetAssignedSegmentsParams {
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * Fetch segments assigned to the authenticated learner with pagination and search.
 * Returns segments with progress and access status, ordered by most recent first.
 */
export async function getAssignedSegments(
  params?: GetAssignedSegmentsParams
): Promise<AssignedSegmentsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.search) searchParams.set('search', params.search);

  const query = searchParams.toString();
  const url = `/learner/segments${query ? `?${query}` : ''}`;
  return apiClient<AssignedSegmentsResponse>(url);
}

// --- Segment Detail ---

/**
 * Fetch segment detail including modules with lesson counts and completion counts.
 * Requires valid segment access (assignment + not expired).
 */
export async function getSegmentDetail(segmentId: string): Promise<SegmentDetailResponse> {
  return apiClient<SegmentDetailResponse>(`/learner/segments/${segmentId}`);
}

// --- Module Lessons ---

/**
 * Fetch lessons for a specific module with completion status and accessibility.
 * Requires valid segment access.
 */
export async function getModuleLessons(
  segmentId: string,
  moduleId: string
): Promise<ModuleLessonsResponse> {
  return apiClient<ModuleLessonsResponse>(
    `/learner/segments/${segmentId}/modules/${moduleId}/lessons`
  );
}

// --- Lesson Content ---

/**
 * Fetch full lesson content (text body or video URL).
 * Enforces sequential progression — returns 403 if lesson is locked.
 */
export async function getLessonContent(
  segmentId: string,
  moduleId: string,
  lessonId: string
): Promise<LessonContentResponse> {
  return apiClient<LessonContentResponse>(
    `/learner/segments/${segmentId}/modules/${moduleId}/lessons/${lessonId}`
  );
}

// --- Complete Lesson ---

/**
 * Mark a lesson as completed for the authenticated learner.
 * Returns next lesson info, module/segment completion flags.
 */
export async function completeLesson(lessonId: string): Promise<CompleteLessonResponse> {
  return apiClient<CompleteLessonResponse>(`/learner/lessons/${lessonId}/complete`, {
    method: 'POST',
  });
}

// --- Current Lesson ---

/**
 * Get the current (next incomplete) lesson for the learner within a segment.
 * Returns null currentLesson and segmentComplete: true if all lessons are done.
 */
export async function getCurrentLesson(segmentId: string): Promise<CurrentLessonResponse> {
  return apiClient<CurrentLessonResponse>(`/learner/segments/${segmentId}/current-lesson`);
}

// --- Lesson Progress ---

/**
 * Report progress evidence for a lesson (video watch %, slides viewed %, scroll %).
 * Backend only updates if the new progress is higher (max-wins).
 */
export async function reportLessonProgress(
  lessonId: string,
  progressPercent: number
): Promise<LessonProgressResponse> {
  return apiClient<LessonProgressResponse>(`/learner/lessons/${lessonId}/progress`, {
    method: 'POST',
    body: JSON.stringify({ progress_percent: progressPercent }),
  });
}

/**
 * Get current progress evidence for a lesson.
 */
export async function getLessonProgress(lessonId: string): Promise<LessonProgressResponse> {
  return apiClient<LessonProgressResponse>(`/learner/lessons/${lessonId}/progress`);
}
