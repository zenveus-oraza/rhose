// Admin entity types matching backend response shapes

// --- Segment Types ---

export type SegmentStatus = 'draft' | 'active' | 'archived';

export interface Segment {
  id: string;
  title: string;
  description: string | null;
  status: SegmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SegmentWithModuleCount extends Segment {
  moduleCount: number;
}

export interface CreateSegmentInput {
  title: string;
  description?: string;
}

export interface UpdateSegmentInput {
  title?: string;
  description?: string;
  status?: SegmentStatus;
}

// --- Module Types ---

export interface Module {
  id: string;
  title: string;
  description: string | null;
  segmentId: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ModuleWithLessonCount extends Module {
  lessonCount: number;
}

export interface CreateModuleInput {
  title: string;
  description?: string;
}

export interface UpdateModuleInput {
  title?: string;
  description?: string;
}

export interface ReorderInput {
  orderedIds: string[];
}

// --- Lesson Types ---

export type LessonContentType = 'text' | 'video';

export interface Lesson {
  id: string;
  title: string;
  contentType: LessonContentType;
  contentBody: string | null;
  videoUrl: string | null;
  moduleId: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLessonInput {
  title: string;
  content_type: LessonContentType;
  content_body?: string;
  video_url?: string;
}

export interface UpdateLessonInput {
  title?: string;
  content_type?: LessonContentType;
  content_body?: string;
  video_url?: string;
}

// --- User Management Types ---

export type UserRole = 'admin' | 'learner';
export type UserStatus = 'active' | 'deactivated';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  role: UserRole;
}

export interface UpdateUserInput {
  name?: string;
  role?: UserRole;
}

export interface CreateUserResponse extends UserProfile {
  temporaryPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
  temporaryPassword: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
}

// --- Assignment Types ---

export interface Assignment {
  id: string;
  userId: string;
  segmentId: string;
  accessDurationDays: number | null;
  assignedAt: string;
}

export interface CreateAssignmentInput {
  user_id: string;
  segment_id: string;
  access_duration_days?: number;
}

export interface SegmentAssignment {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  status: string;
  assignedAt: string;
  accessDurationDays: number | null;
}

export interface UserAssignment {
  id: string;
  segmentId: string;
  title: string;
  status: string;
  assignedAt: string;
  accessDurationDays: number | null;
}

// --- Dashboard Types ---

export interface DashboardStats {
  totalSegments: number;
  totalModules: number;
  totalLessons: number;
  totalUsers: number;
}
