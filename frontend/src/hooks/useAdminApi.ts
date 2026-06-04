import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import * as adminService from '@/services/admin.service';
import type {
  Segment,
  SegmentWithModuleCount,
  CreateSegmentInput,
  UpdateSegmentInput,
  Module,
  ModuleWithLessonCount,
  CreateModuleInput,
  UpdateModuleInput,
  ReorderInput,
  Lesson,
  CreateLessonInput,
  UpdateLessonInput,
  UserProfile,
  CreateUserInput,
  UpdateUserInput,
  CreateUserResponse,
  ResetPasswordResponse,
  PaginatedResult,
  UserListParams,
  SegmentListParams,
  Assignment,
  CreateAssignmentInput,
  SegmentAssignment,
  UserAssignment,
  DashboardStats,
} from '@/types/admin';
import type { ApiError } from '@/services/api';

// --- Query Keys ---

export const adminKeys = {
  all: ['admin'] as const,
  dashboard: () => [...adminKeys.all, 'dashboard'] as const,
  dashboardStats: () => [...adminKeys.dashboard(), 'stats'] as const,

  segments: () => [...adminKeys.all, 'segments'] as const,
  segmentList: (params?: SegmentListParams) => [...adminKeys.segments(), 'list', params] as const,
  segmentDetail: (id: string) => [...adminKeys.segments(), 'detail', id] as const,

  modules: () => [...adminKeys.all, 'modules'] as const,
  moduleList: (segmentId: string, params?: { page?: number; limit?: number }) => [...adminKeys.modules(), 'list', segmentId, params] as const,

  lessons: () => [...adminKeys.all, 'lessons'] as const,
  lessonList: (moduleId: string, params?: { page?: number; limit?: number }) => [...adminKeys.lessons(), 'list', moduleId, params] as const,
  lessonDetail: (id: string) => [...adminKeys.lessons(), 'detail', id] as const,

  users: () => [...adminKeys.all, 'users'] as const,
  userList: (params?: UserListParams) => [...adminKeys.users(), 'list', params] as const,

  assignments: () => [...adminKeys.all, 'assignments'] as const,
  segmentAssignments: (segmentId: string, params?: { page?: number; limit?: number }) => [...adminKeys.assignments(), 'segment', segmentId, params] as const,
  userAssignments: (userId: string, params?: { page?: number; limit?: number }) => [...adminKeys.assignments(), 'user', userId, params] as const,
};

// --- Dashboard Hooks ---

export function useDashboardStats(
  options?: Omit<UseQueryOptions<DashboardStats, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<DashboardStats, ApiError>({
    queryKey: adminKeys.dashboardStats(),
    queryFn: adminService.getDashboardStats,
    ...options,
  });
}

// --- Segment Hooks ---

export function useSegments(
  params?: SegmentListParams,
  options?: Omit<UseQueryOptions<PaginatedResult<Segment>, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<PaginatedResult<Segment>, ApiError>({
    queryKey: adminKeys.segmentList(params),
    queryFn: () => adminService.listSegments(params),
    ...options,
  });
}

export function useSegment(
  id: string,
  options?: Omit<UseQueryOptions<SegmentWithModuleCount, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<SegmentWithModuleCount, ApiError>({
    queryKey: adminKeys.segmentDetail(id),
    queryFn: () => adminService.getSegment(id),
    enabled: !!id,
    ...options,
  });
}

export function useCreateSegment(
  options?: UseMutationOptions<Segment, ApiError, CreateSegmentInput>
) {
  const queryClient = useQueryClient();
  return useMutation<Segment, ApiError, CreateSegmentInput>({
    mutationFn: adminService.createSegment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.segments() });
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() });
    },
    ...options,
  });
}

export function useUpdateSegment(
  options?: UseMutationOptions<Segment, ApiError, { id: string; data: UpdateSegmentInput }>
) {
  const queryClient = useQueryClient();
  return useMutation<Segment, ApiError, { id: string; data: UpdateSegmentInput }>({
    mutationFn: ({ id, data }) => adminService.updateSegment(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.segments() });
      queryClient.invalidateQueries({ queryKey: adminKeys.segmentDetail(variables.id) });
    },
    ...options,
  });
}

export function useDeleteSegment(
  options?: UseMutationOptions<void, ApiError, string>
) {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: adminService.deleteSegment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.segments() });
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() });
    },
    ...options,
  });
}

// --- Module Hooks ---

export function useModules(
  segmentId: string,
  params?: { page?: number; limit?: number },
  options?: Omit<UseQueryOptions<PaginatedResult<ModuleWithLessonCount>, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<PaginatedResult<ModuleWithLessonCount>, ApiError>({
    queryKey: adminKeys.moduleList(segmentId, params),
    queryFn: () => adminService.listModules(segmentId, params),
    enabled: !!segmentId,
    ...options,
  });
}

export function useCreateModule(
  options?: UseMutationOptions<Module, ApiError, { segmentId: string; data: CreateModuleInput }>
) {
  const queryClient = useQueryClient();
  return useMutation<Module, ApiError, { segmentId: string; data: CreateModuleInput }>({
    mutationFn: ({ segmentId, data }) => adminService.createModule(segmentId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.modules() });
      queryClient.invalidateQueries({ queryKey: adminKeys.segmentDetail(variables.segmentId) });
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() });
    },
    ...options,
  });
}

export function useUpdateModule(
  options?: UseMutationOptions<Module, ApiError, { id: string; data: UpdateModuleInput }>
) {
  const queryClient = useQueryClient();
  return useMutation<Module, ApiError, { id: string; data: UpdateModuleInput }>({
    mutationFn: ({ id, data }) => adminService.updateModule(id, data),
    onSuccess: (updatedModule) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.modules() });
      queryClient.invalidateQueries({ queryKey: adminKeys.moduleList(updatedModule.segmentId) });
    },
    ...options,
  });
}

export function useReorderModules(
  options?: UseMutationOptions<void, ApiError, { segmentId: string; data: ReorderInput }>
) {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, { segmentId: string; data: ReorderInput }>({
    mutationFn: ({ segmentId, data }) => adminService.reorderModules(segmentId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.modules() });
      queryClient.invalidateQueries({ queryKey: adminKeys.moduleList(variables.segmentId) });
    },
    ...options,
  });
}

export function useDeleteModule(
  options?: UseMutationOptions<void, ApiError, { id: string; segmentId: string }>
) {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, { id: string; segmentId: string }>({
    mutationFn: ({ id }) => adminService.deleteModule(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.modules() });
      queryClient.invalidateQueries({ queryKey: adminKeys.moduleList(variables.segmentId) });
      queryClient.invalidateQueries({ queryKey: adminKeys.segmentDetail(variables.segmentId) });
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() });
    },
    ...options,
  });
}

// --- Lesson Hooks ---

export function useLessons(
  moduleId: string,
  params?: { page?: number; limit?: number },
  options?: Omit<UseQueryOptions<PaginatedResult<Lesson>, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<PaginatedResult<Lesson>, ApiError>({
    queryKey: adminKeys.lessonList(moduleId, params),
    queryFn: () => adminService.listLessons(moduleId, params),
    enabled: !!moduleId,
    ...options,
  });
}

export function useLesson(
  id: string,
  options?: Omit<UseQueryOptions<Lesson, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Lesson, ApiError>({
    queryKey: adminKeys.lessonDetail(id),
    queryFn: () => adminService.getLesson(id),
    enabled: !!id,
    ...options,
  });
}

export function useCreateLesson(
  options?: UseMutationOptions<Lesson, ApiError, { moduleId: string; data: CreateLessonInput }>
) {
  const queryClient = useQueryClient();
  return useMutation<Lesson, ApiError, { moduleId: string; data: CreateLessonInput }>({
    mutationFn: ({ moduleId, data }) => adminService.createLesson(moduleId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.lessons() });
      queryClient.invalidateQueries({ queryKey: adminKeys.lessonList(variables.moduleId) });
      queryClient.invalidateQueries({ queryKey: adminKeys.modules(), refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() });
    },
    ...options,
  });
}

export function useUpdateLesson(
  options?: UseMutationOptions<Lesson, ApiError, { id: string; data: UpdateLessonInput }>
) {
  const queryClient = useQueryClient();
  return useMutation<Lesson, ApiError, { id: string; data: UpdateLessonInput }>({
    mutationFn: ({ id, data }) => adminService.updateLesson(id, data),
    onSuccess: (updatedLesson) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.lessonDetail(updatedLesson.id) });
      queryClient.invalidateQueries({ queryKey: adminKeys.lessons() });
      queryClient.invalidateQueries({ queryKey: adminKeys.lessonList(updatedLesson.moduleId) });
    },
    ...options,
  });
}

export function useReorderLessons(
  options?: UseMutationOptions<void, ApiError, { moduleId: string; data: ReorderInput }>
) {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, { moduleId: string; data: ReorderInput }>({
    mutationFn: ({ moduleId, data }) => adminService.reorderLessons(moduleId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.lessons() });
      queryClient.invalidateQueries({ queryKey: adminKeys.lessonList(variables.moduleId) });
    },
    ...options,
  });
}

export function useDeleteLesson(
  options?: UseMutationOptions<void, ApiError, { id: string; moduleId: string }>
) {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, { id: string; moduleId: string }>({
    mutationFn: ({ id }) => adminService.deleteLesson(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.lessons() });
      queryClient.invalidateQueries({ queryKey: adminKeys.lessonList(variables.moduleId) });
      queryClient.invalidateQueries({ queryKey: adminKeys.modules(), refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() });
    },
    ...options,
  });
}

// --- User Management Hooks ---

export function useUsers(
  params?: UserListParams,
  options?: Omit<UseQueryOptions<PaginatedResult<UserProfile>, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<PaginatedResult<UserProfile>, ApiError>({
    queryKey: adminKeys.userList(params),
    queryFn: () => adminService.listUsers(params),
    ...options,
  });
}

export function useCreateUser(
  options?: UseMutationOptions<CreateUserResponse, ApiError, CreateUserInput>
) {
  const queryClient = useQueryClient();
  return useMutation<CreateUserResponse, ApiError, CreateUserInput>({
    mutationFn: adminService.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() });
    },
    ...options,
  });
}

export function useUpdateUser(
  options?: UseMutationOptions<UserProfile, ApiError, { id: string; data: UpdateUserInput }>
) {
  const queryClient = useQueryClient();
  return useMutation<UserProfile, ApiError, { id: string; data: UpdateUserInput }>({
    mutationFn: ({ id, data }) => adminService.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
    ...options,
  });
}

export function useDeactivateUser(
  options?: UseMutationOptions<UserProfile, ApiError, string>
) {
  const queryClient = useQueryClient();
  return useMutation<UserProfile, ApiError, string>({
    mutationFn: adminService.deactivateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
    ...options,
  });
}

export function useResetUserPassword(
  options?: UseMutationOptions<ResetPasswordResponse, ApiError, string>
) {
  return useMutation<ResetPasswordResponse, ApiError, string>({
    mutationFn: adminService.resetUserPassword,
    ...options,
  });
}

// --- Assignment Hooks ---

export function useSegmentAssignments(
  segmentId: string,
  params?: { page?: number; limit?: number },
  options?: Omit<UseQueryOptions<PaginatedResult<SegmentAssignment>, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<PaginatedResult<SegmentAssignment>, ApiError>({
    queryKey: adminKeys.segmentAssignments(segmentId, params),
    queryFn: () => adminService.listSegmentAssignments(segmentId, params),
    enabled: !!segmentId,
    ...options,
  });
}

export function useUserAssignments(
  userId: string,
  params?: { page?: number; limit?: number },
  options?: Omit<UseQueryOptions<PaginatedResult<UserAssignment>, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<PaginatedResult<UserAssignment>, ApiError>({
    queryKey: adminKeys.userAssignments(userId, params),
    queryFn: () => adminService.listUserAssignments(userId, params),
    enabled: !!userId,
    ...options,
  });
}

export function useCreateAssignment(
  options?: UseMutationOptions<Assignment, ApiError, CreateAssignmentInput>
) {
  const queryClient = useQueryClient();
  return useMutation<Assignment, ApiError, CreateAssignmentInput>({
    mutationFn: adminService.createAssignment,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.segmentAssignments(variables.segment_id) });
      queryClient.invalidateQueries({ queryKey: adminKeys.userAssignments(variables.user_id) });
    },
    ...options,
  });
}

export function useDeleteAssignment(
  options?: UseMutationOptions<void, ApiError, { id: string; segmentId: string; userId: string }>
) {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, { id: string; segmentId: string; userId: string }>({
    mutationFn: ({ id }) => adminService.deleteAssignment(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.segmentAssignments(variables.segmentId) });
      queryClient.invalidateQueries({ queryKey: adminKeys.userAssignments(variables.userId) });
    },
    ...options,
  });
}
