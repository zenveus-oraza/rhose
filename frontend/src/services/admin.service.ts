import { apiClient, apiUpload } from './api';
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

export async function listSegments(params?: SegmentListParams): Promise<PaginatedResult<Segment>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.search) searchParams.set('search', params.search);
  if (params?.status) searchParams.set('status', params.status);

  const query = searchParams.toString();
  const endpoint = query ? `/admin/segments?${query}` : '/admin/segments';
  return apiClient<PaginatedResult<Segment>>(endpoint);
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

export async function listModules(segmentId: string, params?: { page?: number; limit?: number }): Promise<PaginatedResult<ModuleWithLessonCount>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const query = searchParams.toString();
  const endpoint = query ? `/admin/segments/${segmentId}/modules?${query}` : `/admin/segments/${segmentId}/modules`;
  return apiClient<PaginatedResult<ModuleWithLessonCount>>(endpoint);
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

export async function listLessons(moduleId: string, params?: { page?: number; limit?: number }): Promise<PaginatedResult<Lesson>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const query = searchParams.toString();
  const endpoint = query ? `/admin/modules/${moduleId}/lessons?${query}` : `/admin/modules/${moduleId}/lessons`;
  return apiClient<PaginatedResult<Lesson>>(endpoint);
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

export async function listSegmentAssignments(segmentId: string, params?: { page?: number; limit?: number }): Promise<PaginatedResult<SegmentAssignment>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const query = searchParams.toString();
  const endpoint = query ? `/admin/segments/${segmentId}/assignments?${query}` : `/admin/segments/${segmentId}/assignments`;
  return apiClient<PaginatedResult<SegmentAssignment>>(endpoint);
}

export async function listUserAssignments(userId: string, params?: { page?: number; limit?: number }): Promise<PaginatedResult<UserAssignment>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const query = searchParams.toString();
  const endpoint = query ? `/admin/users/${userId}/assignments?${query}` : `/admin/users/${userId}/assignments`;
  return apiClient<PaginatedResult<UserAssignment>>(endpoint);
}

// --- File Uploads ---

export interface UploadResponse {
  url: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
}

/**
 * Upload a slides file (pptx, ppt, pdf). Max 50MB.
 * Returns the URL path to access the uploaded file.
 */
export async function uploadSlides(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  return apiUpload<UploadResponse>('/uploads/slides', formData);
}

/**
 * Upload a video file (mp4, webm, ogg, mov, etc). Max 20MB.
 * Returns the URL path to access the uploaded file.
 */
export async function uploadVideo(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  return apiUpload<UploadResponse>('/uploads/video', formData);
}
