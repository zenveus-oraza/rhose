import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
  keepPreviousData,
} from '@tanstack/react-query';
import * as learnerService from '@/services/learner.service';
import type { GetAssignedSegmentsParams } from '@/services/learner.service';
import type {
  AssignedSegmentsResponse,
  SegmentDetailResponse,
  ModuleLessonsResponse,
  LessonContentResponse,
  CompleteLessonResponse,
  CurrentLessonResponse,
} from '@/types/learner';
import type { ApiError } from '@/services/api';

// --- Query Keys ---

export const learnerKeys = {
  all: ['learner'] as const,

  segments: () => [...learnerKeys.all, 'segments'] as const,
  segmentList: (params?: GetAssignedSegmentsParams) =>
    [...learnerKeys.segments(), 'list', params ?? {}] as const,
  segmentDetail: (segmentId: string) => [...learnerKeys.segments(), 'detail', segmentId] as const,

  modules: () => [...learnerKeys.all, 'modules'] as const,
  moduleLessons: (segmentId: string, moduleId: string) =>
    [...learnerKeys.modules(), 'lessons', segmentId, moduleId] as const,

  lessons: () => [...learnerKeys.all, 'lessons'] as const,
  lessonContent: (segmentId: string, moduleId: string, lessonId: string) =>
    [...learnerKeys.lessons(), 'content', segmentId, moduleId, lessonId] as const,

  currentLesson: (segmentId: string) =>
    [...learnerKeys.all, 'current-lesson', segmentId] as const,

  progress: () => [...learnerKeys.all, 'progress'] as const,
  segmentProgress: (segmentId: string) => [...learnerKeys.progress(), segmentId] as const,
};

// --- Assigned Segments ---

/**
 * Fetch segments assigned to the authenticated learner with pagination and search.
 * Handles loading, error, and success states via React Query.
 * Uses keepPreviousData for smooth pagination transitions.
 */
export function useAssignedSegments(
  params?: GetAssignedSegmentsParams,
  options?: Omit<UseQueryOptions<AssignedSegmentsResponse, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<AssignedSegmentsResponse, ApiError>({
    queryKey: learnerKeys.segmentList(params),
    queryFn: () => learnerService.getAssignedSegments(params),
    placeholderData: keepPreviousData,
    ...options,
  });
}

// --- Segment Detail ---

/**
 * Fetch segment detail with modules and per-user completion progress.
 * Automatically disabled when segmentId is empty.
 */
export function useSegmentDetail(
  segmentId: string,
  options?: Omit<UseQueryOptions<SegmentDetailResponse, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<SegmentDetailResponse, ApiError>({
    queryKey: learnerKeys.segmentDetail(segmentId),
    queryFn: () => learnerService.getSegmentDetail(segmentId),
    enabled: !!segmentId,
    ...options,
  });
}

// --- Module Lessons ---

/**
 * Fetch ordered lessons for a module with completion and accessibility status.
 * Automatically disabled when segmentId or moduleId is empty.
 */
export function useModuleLessons(
  segmentId: string,
  moduleId: string,
  options?: Omit<UseQueryOptions<ModuleLessonsResponse, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<ModuleLessonsResponse, ApiError>({
    queryKey: learnerKeys.moduleLessons(segmentId, moduleId),
    queryFn: () => learnerService.getModuleLessons(segmentId, moduleId),
    enabled: !!segmentId && !!moduleId,
    ...options,
  });
}

// --- Lesson Content ---

/**
 * Fetch full lesson content (text or video).
 * Automatically disabled when any ID parameter is empty.
 */
export function useLessonContent(
  segmentId: string,
  moduleId: string,
  lessonId: string,
  options?: Omit<UseQueryOptions<LessonContentResponse, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<LessonContentResponse, ApiError>({
    queryKey: learnerKeys.lessonContent(segmentId, moduleId, lessonId),
    queryFn: () => learnerService.getLessonContent(segmentId, moduleId, lessonId),
    enabled: !!segmentId && !!moduleId && !!lessonId,
    ...options,
  });
}

// --- Complete Lesson ---

/**
 * Mark a lesson as completed. Mutation hook that invalidates relevant queries
 * on success to refresh progress data across the UI.
 */
export function useCompleteLesson(
  options?: UseMutationOptions<
    CompleteLessonResponse,
    ApiError,
    { lessonId: string; segmentId: string; moduleId: string }
  >
) {
  const queryClient = useQueryClient();
  return useMutation<
    CompleteLessonResponse,
    ApiError,
    { lessonId: string; segmentId: string; moduleId: string }
  >({
    mutationFn: ({ lessonId }) => learnerService.completeLesson(lessonId),
    onSuccess: (_data, variables) => {
      // Invalidate the module lessons to refresh completion/accessibility status
      queryClient.invalidateQueries({
        queryKey: learnerKeys.moduleLessons(variables.segmentId, variables.moduleId),
      });
      // Invalidate segment detail to refresh module completion counts
      queryClient.invalidateQueries({
        queryKey: learnerKeys.segmentDetail(variables.segmentId),
      });
      // Invalidate the assigned segments list to refresh progress percentages
      queryClient.invalidateQueries({
        queryKey: learnerKeys.segments(),
      });
      // Invalidate current lesson to get the next lesson
      queryClient.invalidateQueries({
        queryKey: learnerKeys.currentLesson(variables.segmentId),
      });
      // Invalidate segment progress
      queryClient.invalidateQueries({
        queryKey: learnerKeys.segmentProgress(variables.segmentId),
      });
    },
    ...options,
  });
}

// --- Current Lesson ---

/**
 * Get the current (next incomplete) lesson for the learner within a segment.
 * Useful for "continue where you left off" functionality.
 */
export function useCurrentLesson(
  segmentId: string,
  options?: Omit<UseQueryOptions<CurrentLessonResponse, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<CurrentLessonResponse, ApiError>({
    queryKey: learnerKeys.currentLesson(segmentId),
    queryFn: () => learnerService.getCurrentLesson(segmentId),
    enabled: !!segmentId,
    ...options,
  });
}

// --- Segment Progress (derived from assigned segments) ---

/**
 * Convenience hook to get progress data for a specific segment.
 * Uses the assigned segments query and extracts progress for the given segment.
 */
export function useSegmentProgress(
  segmentId: string,
  options?: Omit<UseQueryOptions<AssignedSegmentsResponse, ApiError>, 'queryKey' | 'queryFn'>
) {
  const query = useQuery<AssignedSegmentsResponse, ApiError>({
    queryKey: learnerKeys.segmentList(),
    queryFn: () => learnerService.getAssignedSegments(),
    enabled: !!segmentId,
    ...options,
  });

  const segmentProgress = query.data?.segments.find((s) => s.segmentId === segmentId);

  return {
    ...query,
    data: segmentProgress
      ? {
          progressPercentage: segmentProgress.progress_percentage,
          completedLessons: segmentProgress.completed_lessons,
          totalLessons: segmentProgress.total_lessons,
          accessStatus: segmentProgress.access_status,
        }
      : undefined,
  };
}
