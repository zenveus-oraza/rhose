import { apiClient } from './api';
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
  Assignment,
  CreateAssignmentInput,
  SegmentAssignment,
  UserAssignment,
  DashboardStats,
} from '@/types/admin';

// --- Dashboard ---

export async function getDashboardStats(): Promise<DashboardStats> {
  return apiClient<DashboardStats>('/admin/dashboard/stats');
}

// --- Segments ---

export async function createSegment(data: CreateSegmentInput): Promise<Segment> {
  return apiClient<Segment>('/admin/segments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function listSegments(): Promise<Segment[]> {
  return apiClient<Segment[]>('/admin/segments');
}

export async function getSegment(id: string): Promise<SegmentWithModuleCount> {
  return apiClient<SegmentWithModuleCount>(`/admin/segments/${id}`);
}

export async function updateSegment(id: string, data: UpdateSegmentInput): Promise<Segment> {
  return apiClient<Segment>(`/admin/segments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteSegment(id: string): Promise<void> {
  await apiClient<{ message: string }>(`/admin/segments/${id}`, {
    method: 'DELETE',
  });
}

// --- Modules ---

export async function createModule(segmentId: string, data: CreateModuleInput): Promise<Module> {
  return apiClient<Module>(`/admin/segments/${segmentId}/modules`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function listModules(segmentId: string): Promise<ModuleWithLessonCount[]> {
  return apiClient<ModuleWithLessonCount[]>(`/admin/segments/${segmentId}/modules`);
}

export async function updateModule(id: string, data: UpdateModuleInput): Promise<Module> {
  return apiClient<Module>(`/admin/modules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function reorderModules(segmentId: string, data: ReorderInput): Promise<void> {
  await apiClient<{ message: string }>(`/admin/segments/${segmentId}/modules/reorder`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteModule(id: string): Promise<void> {
  await apiClient<{ message: string }>(`/admin/modules/${id}`, {
    method: 'DELETE',
  });
}

// --- Lessons ---

export async function createLesson(moduleId: string, data: CreateLessonInput): Promise<Lesson> {
  return apiClient<Lesson>(`/admin/modules/${moduleId}/lessons`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function listLessons(moduleId: string): Promise<Lesson[]> {
  return apiClient<Lesson[]>(`/admin/modules/${moduleId}/lessons`);
}

export async function getLesson(id: string): Promise<Lesson> {
  return apiClient<Lesson>(`/admin/lessons/${id}`);
}

export async function updateLesson(id: string, data: UpdateLessonInput): Promise<Lesson> {
  return apiClient<Lesson>(`/admin/lessons/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function reorderLessons(moduleId: string, data: ReorderInput): Promise<void> {
  await apiClient<{ message: string }>(`/admin/modules/${moduleId}/lessons/reorder`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteLesson(id: string): Promise<void> {
  await apiClient<{ message: string }>(`/admin/lessons/${id}`, {
    method: 'DELETE',
  });
}

// --- User Management ---

export async function createUser(data: CreateUserInput): Promise<CreateUserResponse> {
  return apiClient<CreateUserResponse>('/admin/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function listUsers(params?: UserListParams): Promise<PaginatedResult<UserProfile>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.search) searchParams.set('search', params.search);

  const query = searchParams.toString();
  const endpoint = query ? `/admin/users?${query}` : '/admin/users';
  return apiClient<PaginatedResult<UserProfile>>(endpoint);
}

export async function updateUser(id: string, data: UpdateUserInput): Promise<UserProfile> {
  return apiClient<UserProfile>(`/admin/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deactivateUser(id: string): Promise<UserProfile> {
  return apiClient<UserProfile>(`/admin/users/${id}/deactivate`, {
    method: 'PUT',
  });
}

export async function resetUserPassword(id: string): Promise<ResetPasswordResponse> {
  return apiClient<ResetPasswordResponse>(`/admin/users/${id}/reset-password`, {
    method: 'POST',
  });
}

// --- Assignments ---

export async function createAssignment(data: CreateAssignmentInput): Promise<Assignment> {
  return apiClient<Assignment>('/admin/assignments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteAssignment(id: string): Promise<void> {
  await apiClient<{ message: string }>(`/admin/assignments/${id}`, {
    method: 'DELETE',
  });
}

export async function listSegmentAssignments(segmentId: string): Promise<SegmentAssignment[]> {
  return apiClient<SegmentAssignment[]>(`/admin/segments/${segmentId}/assignments`);
}

export async function listUserAssignments(userId: string): Promise<UserAssignment[]> {
  return apiClient<UserAssignment[]>(`/admin/users/${userId}/assignments`);
}
