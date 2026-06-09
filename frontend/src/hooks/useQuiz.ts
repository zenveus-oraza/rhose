import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import * as quizService from '@/services/quiz.service';
import type {
  Quiz,
  LearnerQuiz,
  CreateQuizInput,
  SubmitQuizAttemptInput,
  AttemptResult,
  AttemptSummary,
  ActivityItem,
} from '@/types/quiz';
import type { ApiError } from '@/services/api';
import { adminKeys } from './useAdminApi';
import { learnerKeys } from './useLearner';

// --- Query Keys ---

export const quizKeys = {
  all: ['quiz'] as const,

  // Admin quiz keys
  admin: () => [...quizKeys.all, 'admin'] as const,
  segmentQuiz: (segmentId: string) => [...quizKeys.admin(), 'segment', segmentId] as const,

  // Learner quiz keys
  learner: () => [...quizKeys.all, 'learner'] as const,
  learnerQuiz: (segmentId: string) => [...quizKeys.learner(), 'segment', segmentId] as const,
  attemptHistory: (segmentId: string) =>
    [...quizKeys.learner(), 'attempts', segmentId] as const,

  // Activity keys
  activity: () => [...quizKeys.all, 'activity'] as const,
  recentActivity: (limit: number, filter: string) =>
    [...quizKeys.activity(), { limit, filter }] as const,
};

// --- Admin Quiz Hooks ---

/**
 * Fetch the quiz (with questions and options including is_correct) for a segment.
 * Used on admin segment details and quiz editing.
 */
export function useSegmentQuiz(
  segmentId: string,
  options?: Omit<UseQueryOptions<Quiz | null, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Quiz | null, ApiError>({
    queryKey: quizKeys.segmentQuiz(segmentId),
    queryFn: () => quizService.getSegmentQuiz(segmentId),
    enabled: !!segmentId,
    staleTime: 5 * 60 * 1000, // 5 minutes — quiz data doesn't change often
    ...options,
  });
}

/**
 * Create or update the quiz for a segment.
 * Invalidates admin quiz cache and segment detail on success.
 */
export function useCreateOrUpdateQuiz(
  options?: UseMutationOptions<Quiz, ApiError, { segmentId: string; data: CreateQuizInput }>
) {
  const queryClient = useQueryClient();
  return useMutation<Quiz, ApiError, { segmentId: string; data: CreateQuizInput }>({
    mutationFn: ({ segmentId, data }) => quizService.createOrUpdateQuiz(segmentId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: quizKeys.segmentQuiz(variables.segmentId) });
      queryClient.invalidateQueries({ queryKey: adminKeys.segmentDetail(variables.segmentId) });
    },
    ...options,
  });
}

/**
 * Delete the quiz for a segment.
 * Invalidates admin quiz cache and segment detail on success.
 */
export function useDeleteQuiz(
  options?: UseMutationOptions<void, ApiError, string>
) {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (segmentId) => quizService.deleteSegmentQuiz(segmentId),
    onSuccess: (_data, segmentId) => {
      queryClient.invalidateQueries({ queryKey: quizKeys.segmentQuiz(segmentId) });
      queryClient.invalidateQueries({ queryKey: adminKeys.segmentDetail(segmentId) });
    },
    ...options,
  });
}

// --- Learner Quiz Hooks ---

/**
 * Fetch the quiz for a learner to take (no is_correct in options).
 * Returns null if no quiz exists for the segment.
 */
export function useLearnerQuiz(
  segmentId: string,
  options?: Omit<UseQueryOptions<LearnerQuiz | null, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<LearnerQuiz | null, ApiError>({
    queryKey: quizKeys.learnerQuiz(segmentId),
    queryFn: () => quizService.getQuizForTaking(segmentId),
    enabled: !!segmentId,
    staleTime: 10 * 60 * 1000, // 10 minutes — quiz content rarely changes for learners
    ...options,
  });
}

/**
 * Submit a quiz attempt. Mutation that invalidates attempt history and progress on success.
 */
export function useSubmitQuizAttempt(
  options?: UseMutationOptions<
    AttemptResult,
    ApiError,
    { segmentId: string; data: SubmitQuizAttemptInput }
  >
) {
  const queryClient = useQueryClient();
  return useMutation<
    AttemptResult,
    ApiError,
    { segmentId: string; data: SubmitQuizAttemptInput }
  >({
    mutationFn: ({ segmentId, data }) => quizService.submitQuizAttempt(segmentId, data),
    onSuccess: (_data, variables) => {
      // Refresh attempt history
      queryClient.invalidateQueries({
        queryKey: quizKeys.attemptHistory(variables.segmentId),
      });
      // Refresh segment progress (now includes quiz data)
      queryClient.invalidateQueries({
        queryKey: learnerKeys.segmentProgress(variables.segmentId),
      });
      // Refresh activity feed for admins (new quiz attempt event)
      queryClient.invalidateQueries({
        queryKey: quizKeys.activity(),
      });
    },
    ...options,
  });
}

/**
 * Fetch quiz attempt history for the authenticated learner on a segment.
 * Returns attempts ordered by most recent first.
 */
export function useQuizAttemptHistory(
  segmentId: string,
  options?: Omit<UseQueryOptions<AttemptSummary[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<AttemptSummary[], ApiError>({
    queryKey: quizKeys.attemptHistory(segmentId),
    queryFn: () => quizService.getAttemptHistory(segmentId),
    enabled: !!segmentId,
    staleTime: 2 * 60 * 1000, // 2 minutes — attempts update after submissions
    ...options,
  });
}

// --- Activity Hooks ---

/**
 * Fetch recent activity events for the admin dashboard.
 * Supports limit and filter by action type.
 */
export function useRecentActivity(
  limit: number = 10,
  filter: string = 'all',
  options?: Omit<UseQueryOptions<ActivityItem[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<ActivityItem[], ApiError>({
    queryKey: quizKeys.recentActivity(limit, filter),
    queryFn: () => quizService.getRecentActivity({ limit, filter }),
    staleTime: 30 * 1000, // 30 seconds — activity should stay fresh
    refetchInterval: 60 * 1000, // Auto-refresh every minute
    ...options,
  });
}
