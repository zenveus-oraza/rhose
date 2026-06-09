// Admin entity types matching backend response shapes

// --- Segment Types ---

export type SegmentStatus = 'draft' | 'active' | 'archived';

export interface Segment {
  id: string;
  title: string;
  description: string | null;
  duration: number | null;
  status: SegmentStatus;
  moduleCount?: number;
  assignedUserCount?: number;
  earliestExpiryDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SegmentWithModuleCount extends Segment {
  moduleCount: number;
}

export interface CreateSegmentInput {
  title: string;
  description?: string;
  duration: number;
}

export interface UpdateSegmentInput {
  title?: string;
  description?: string;
  duration?: number;
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

export type LessonContentType = 'text' | 'video' | 'slides';

export interface Lesson {
  id: string;
  title: string;
  contentType: LessonContentType;
  contentBody: string | null;
  videoUrl: string | null;
  slidesUrl: string | null;
  totalSlides: number | null;
  estimatedTimeValue: number | null;
  estimatedTimeUnit: 'minutes' | 'hours' | null;
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
  slides_url?: string;
  total_slides?: number;
  estimated_time_value?: number;
  estimated_time_unit?: 'minutes' | 'hours';
}

export interface UpdateLessonInput {
  title?: string;
  content_type?: LessonContentType;
  content_body?: string;
  video_url?: string;
  slides_url?: string;
  total_slides?: number;
  estimated_time_value?: number;
  estimated_time_unit?: 'minutes' | 'hours';
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
  jobTitle?: string;
  phone?: string;
  profileImage?: string;
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
  phone?: string | null;
  jobTitle?: string | null;
  profileImage?: string | null;
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

export interface SegmentListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: SegmentStatus;
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
  jobTitle?: string | null;
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
  endingSoonCount?: number;
}
