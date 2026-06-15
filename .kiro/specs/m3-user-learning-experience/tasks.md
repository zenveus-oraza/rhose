# Implementation Plan: M3 User Learning Experience

## Overview

This plan implements the learner-facing experience for the Rhose platform. The implementation covers: learner dashboard, My Learning page, segment/module/lesson navigation, lesson viewing (text, video, and slides), progress evidence tracking, module-level sequential locking, lesson completion with 75% engagement gate, and responsive UI matching admin design patterns.

**Key changes from original design:**
- Lessons within a module are all freely accessible (no lesson-level locking)
- Modules are sequentially locked — complete all lessons in module N to unlock module N+1
- Slides content type added with file upload (PPTX/PPT/PDF)
- Video supports both URL links (YouTube/Vimeo) AND file uploads (up to 20MB)
- Progress evidence tracking (backend records engagement %) — completion requires 75% engagement
- My Learning page added showing all segments/modules/lessons with navigation
- React Player (v2) used for video progress tracking
- Layout matches admin: no top-right user section, heading + divider pattern, content starts from top

## Tasks

- [x] 1. Data model extensions and database schema
  - [x] 1.1 Add access_duration_days column to segment_assignments table
  - [x] 1.2 Create lesson_completions table and schema
  - [x] 1.3 Add slides content type to lessons table
    - Extended `lesson_content_type` enum: `['text', 'video', 'slides']`
    - Added `slides_url` (varchar 2048) and `total_slides` (integer) columns to lessons
    - Migration: `0009_add_slides_and_progress.sql`
  - [x] 1.4 Create lesson_progress table for engagement evidence tracking
    - Table: `lesson_progress` with `user_id`, `lesson_id`, `progress_percent` (0-100), `updated_at`
    - Unique constraint on `(user_id, lesson_id)`
    - Progress is max-wins (only stores if new > existing)

- [x] 2. Segment Access Service and middleware
  - [x] 2.1 Implement Segment Access Service (verifyAccess with expiry logic)
  - [x] 2.2 Implement segment access middleware (requireSegmentAccess, requireLearner)
  - [x] 2.3 Property test for access expiry calculation
  - [x] 2.4 Property test for access control invariant

- [x] 3. Navigation Service and module-level sequential progression
  - [x] 3.1 Implement Navigation Service
    - `getSegmentDetail`: Returns modules with `accessible` boolean (module-level locking)
    - `getModuleLessons`: Returns all lessons as accessible (no lesson-level locking)
    - `getLessonContent`: Returns lesson content including slides fields
    - `getCurrentLesson`: First incomplete lesson in first incomplete module
  - [x] 3.2 Module-level sequential locking logic
    - First module always accessible
    - Module N+1 unlocks when ALL lessons in module N are completed
    - Empty modules (0 lessons) treated as complete, don't block progression
    - All previous modules must be done (not just immediate predecessor)
  - [x] 3.3 Lesson content endpoint enforces module-level access
    - Returns 403 `MODULE_LOCKED` if target module is not accessible

- [x] 4. Lesson Completion Service
  - [x] 4.1 Implement Completion Service (idempotent, returns next lesson/progress state)
  - [x] 4.2 Enforce 75% progress evidence before allowing completion
    - Completion endpoint checks `lesson_progress` table
    - Returns 403 `INSUFFICIENT_PROGRESS` with current/required percentages if < 75%
  - [x] 4.3 Property tests for completion idempotence and round-trip

- [x] 5. Progress Service
  - [x] 5.1 Implement Progress Service (segment and module level)
  - [x] 5.2 Property tests for progress calculation, invariant, metamorphic

- [x] 6. Progress Evidence Reporting API
  - [x] 6.1 Implement POST `/api/learner/lessons/:lessonId/progress`
    - Atomic upsert with `GREATEST` for max-wins (prevents race condition)
    - Returns `{ progressPercent, canComplete }`
  - [x] 6.2 Implement GET `/api/learner/lessons/:lessonId/progress`
    - Returns current progress percentage and completion eligibility

- [x] 7. File Upload System
  - [x] 7.1 Backend upload infrastructure
    - Installed `multer` for multipart file handling
    - Created `POST /api/uploads/slides` — accepts .pptx, .ppt, .pdf (max 50MB)
    - Created `POST /api/uploads/video` — accepts .mp4, .webm, .ogg, .mov, .avi, .mkv (max 20MB)
    - Files stored in `backend/uploads/slides/` and `backend/uploads/videos/`
    - Served as static assets from `/uploads/`
  - [x] 7.2 Frontend upload utilities
    - Created `apiUpload<T>()` function for FormData requests
    - Created `uploadSlides()` and `uploadVideo()` admin service functions
    - Added Vite proxy for `/uploads` → backend

- [x] 8. Learner API endpoints
  - [x] 8.1 GET `/api/learner/segments` — assigned segments with progress + access status
  - [x] 8.2 GET `/api/learner/segments/:segmentId` — segment detail with modules (includes `accessible` flag)
  - [x] 8.3 GET `/api/learner/segments/:segmentId/modules/:moduleId/lessons` — module lessons with completion status
  - [x] 8.4 GET `/api/learner/segments/:segmentId/modules/:moduleId/lessons/:lessonId` — lesson content (text/video/slides)
  - [x] 8.5 POST `/api/learner/lessons/:lessonId/complete` — mark complete (requires 75% progress)
  - [x] 8.6 GET `/api/learner/segments/:segmentId/current-lesson` — current lesson for resume
  - [x] 8.7 POST `/api/learner/lessons/:lessonId/progress` — report engagement evidence
  - [x] 8.8 GET `/api/learner/lessons/:lessonId/progress` — get current progress

- [x] 9. Backend validation schema updates
  - [x] 9.1 Updated `createLessonSchema` — discriminated union with text/video/slides
    - Video: `z.string().min(1)` for video_url (supports both URLs and relative upload paths)
    - Slides: `z.string().min(1)` for slides_url + required `total_slides`
  - [x] 9.2 Updated `updateLessonSchema` — same relaxed URL validation
  - [x] 9.3 Created `reportProgressSchema` — validates progress_percent 0-100

- [x] 10. Admin lesson management updates (slides + video upload)
  - [x] 10.1 Updated LessonDrawer with slides content type
    - File upload zone (drag/click) for PPTX/PPT/PDF
    - Shows uploaded filename and size
    - Total slides number input
  - [x] 10.2 Updated LessonDrawer with video upload option
    - Toggle between "Paste Link" and "Upload File"
    - Link mode: URL input for YouTube/Vimeo/direct
    - Upload mode: File upload zone for MP4/WebM/MOV (max 20MB)
  - [x] 10.3 Fixed lesson edit persistence
    - LessonDrawer now fetches full lesson detail via `useLesson(id)` when editing
    - List endpoint doesn't return content fields; detail endpoint does
  - [x] 10.4 Added `slides` variant to StatusBadge component
  - [x] 10.5 Updated admin types (LessonContentType includes 'slides', added slidesUrl/totalSlides)
  - [x] 10.6 Lesson deletion now cleans up `lesson_completions` and `lesson_progress` records

- [x] 11. Frontend learner pages
  - [x] 11.1 Learner Dashboard
    - Welcome message, segment title/description, progress card, Resume Lesson button
    - Segment Details cards (Duration, Deadline, Time Left)
    - Module list with status icons (completed/in-progress/locked)
    - Locked modules shown with lock icon, dimmed, non-clickable
  - [x] 11.2 My Learning page (`/learner/learning`)
    - Shows ALL assigned segments with progress bars
    - Each segment expands into modules (with lock state)
    - Each module expands into lessons with direct navigation links
    - Lessons show type icon (video/text/slides) and completion checkmark
  - [x] 11.3 Lesson Page redesign
    - Left sidebar: segment info, progress bar, module accordion with expandable lessons
    - Modules show lock state; locked modules can't expand
    - Current lesson highlighted in sidebar
    - Completed checkmark shows even when selected (white on teal background)
    - Main content: module breadcrumb, status badge, content area, Mark as Complete

- [x] 12. Content type viewers (Lesson Page)
  - [x] 12.1 Video content with progress tracking
    - `react-player@2` (lazy loaded) with `onProgress` callback
    - Reports watch percentage to backend every 5% increment
    - Resolves uploaded video paths to full URLs for playback
  - [x] 12.2 Slides content viewer
    - PDF files: rendered directly in iframe
    - PPTX/PPT files: download button with slide thumbnail navigation
    - Slide-by-slide navigation with viewed tracking
    - Reports (viewedSlides / totalSlides * 100) as progress
  - [x] 12.3 Text content with scroll tracking
    - Scrollable container with scroll position monitoring
    - Reports scroll percentage as progress
    - Content that fits without scrolling = 100% immediately

- [x] 13. Mark as Complete — progress-gated
  - [x] 13.1 Button disabled until `canComplete: true` (progress >= 75%)
  - [x] 13.2 Shows progress hint when insufficient ("Complete at least 75%...")
  - [x] 13.3 Standard button size (not full width)
  - [x] 13.4 Confirmation prompt before submission
  - [x] 13.5 On success: navigates to next lesson or back to dashboard if segment complete

- [x] 14. Layout and navigation
  - [x] 14.1 Learner sidebar: Dashboard, My Learning, Profile + Logout
  - [x] 14.2 Removed top-right user name/profile section (desktop has no header bar)
  - [x] 14.3 Admin-style heading + divider pattern on all learner pages
    - Container: `pb-4 pt-1 lg:px-8`
    - Heading: `text-heading-page text-navy`
    - Description: `text-body text-muted-500`
    - Divider: `border-b border-muted-200 mb-6`
  - [x] 14.4 Mobile: hamburger menu only (lg:hidden), same as admin layout

- [x] 15. Caching and state management
  - [x] 15.1 Set React Query staleTime to 0 (always refetch on mount)
  - [x] 15.2 Enable refetchOnWindowFocus
  - [x] 15.3 Clear query cache on logout (`queryClient.clear()`)
  - [x] 15.4 Invalidate relevant queries on lesson completion (segment detail, modules, progress, segments list)

- [x] 16. Error handling improvements
  - [x] 16.1 LessonDrawer shows actual validation error details (not generic "Validation failed")
    - Reads `error.details` object values for field-specific messages

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Module-level locking (not lesson-level) | Learners can freely explore lessons within a module; must complete module before advancing |
| 75% engagement gate for completion | Prevents gaming — users must actually watch/read/view content |
| react-player v2 for video | Provides `onProgress` callback with `played` percentage; v3 lacks this |
| Atomic upsert for progress | Prevents race condition from rapid progress reports (GREATEST function) |
| File uploads stored locally | Simple self-hosted approach; easily swappable to S3 later |
| staleTime: 0 | Ensures fresh data on every navigation; completion state updates immediately |
| Empty modules don't block | Prevents admin mistakes from locking learners out of later modules |

## File Locations

### Backend
- `src/db/schema/lessons.ts` — lesson schema with slides fields
- `src/db/schema/lesson-progress.ts` — progress evidence table
- `src/schemas/lesson.schemas.ts` — Zod validation (text/video/slides/progress)
- `src/services/navigation.service.ts` — module accessibility logic
- `src/services/completion.service.ts` — completion with access checks
- `src/services/lesson.service.ts` — CRUD with cleanup on delete
- `src/routes/learner.routes.ts` — all learner endpoints + progress
- `src/routes/upload.routes.ts` — file upload endpoints (slides + video)
- `drizzle/0009_add_slides_and_progress.sql` — migration

### Frontend
- `src/pages/LearnerDashboard.tsx` — main dashboard
- `src/pages/learner/MyLearningPage.tsx` — all segments/modules/lessons
- `src/pages/learner/LessonPage.tsx` — lesson viewer with progress tracking
- `src/pages/admin/LessonDrawer.tsx` — admin lesson form (text/video/slides)
- `src/components/layout/LearnerLayout.tsx` — learner shell (no top header)
- `src/components/learner/MarkCompleteButton.tsx` — progress-gated button
- `src/hooks/useLearner.ts` — React Query hooks (including progress)
- `src/services/learner.service.ts` — API client functions
- `src/services/api.ts` — `apiUpload()` for multipart requests
- `src/types/learner.ts` — types with slides + progress
- `src/types/admin.ts` — types with slides content type
