// Learner entity types matching backend response shapes

// --- Assigned Segments ---

export type AccessStatus = 'active' | 'expired';

export interface LearnerSegment {
  segmentId: string;
  title: string;
  description: string | null;
  progress_percentage: number;
  completed_lessons: number;
  total_lessons: number;
  access_status: AccessStatus;
  assigned_at: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AssignedSegmentsResponse {
  segments: LearnerSegment[];
  pagination: PaginationMeta;
}

// --- Segment Detail ---

export interface ModuleSummary {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  lessonCount: number;
  completedCount: number;
  accessible: boolean;
}

export interface SegmentDetail {
  id: string;
  title: string;
  description: string | null;
  status: string;
  modules: ModuleSummary[];
}

export interface SegmentDetailResponse {
  segment: SegmentDetail;
}

// --- Module Lessons ---

export interface LessonWithStatus {
  id: string;
  title: string;
  contentType: string;
  sortOrder: number;
  estimatedTimeValue: number | null;
  estimatedTimeUnit: string | null;
  completed: boolean;
  accessible: boolean;
}

export interface ModuleLessonsResponse {
  lessons: LessonWithStatus[];
}

// --- Lesson Content ---

export interface UploadedAssetMetadata {
  key: string;
  originalName: string;
  size: number;
  mimeType: string;
}

export interface LessonContent {
  id: string;
  title: string;
  contentType: string;
  contentBody: string | null;
  videoUrl: string | null;
  videoAsset: UploadedAssetMetadata | null;
  slidesUrl: string | null;
  slidesAsset: UploadedAssetMetadata | null;
  totalSlides: number | null;
}

export interface LessonContentResponse {
  lesson: LessonContent;
}

// --- Complete Lesson ---

export interface CompleteLessonResponse {
  alreadyCompleted: boolean;
  nextLessonId: string | null;
  moduleComplete: boolean;
  segmentComplete: boolean;
}

// --- Current Lesson ---

export interface CurrentLessonResponse {
  currentLesson: { moduleId: string; lessonId: string } | null;
  segmentComplete: boolean;
}

// --- Lesson Progress ---

export interface LessonProgressResponse {
  progressPercent: number;
  canComplete: boolean;
}
