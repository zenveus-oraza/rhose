# Implementation Plan: M3 User Learning Experience

## Overview

This plan implements the learner-facing experience for the Rhose platform: dashboard with assigned segments, segment access control with duration enforcement, lesson viewing (text and video), lesson completion confirmation, sequential progression, and progress tracking. The implementation follows a layered approach: data model extensions first, then backend services and API endpoints, then frontend integration and UI components.

## Tasks

- [ ] 1. Data model extensions and database schema
  - [ ] 1.1 Add access_duration_days column to segment_assignments table
    - Add nullable integer column `access_duration_days` to the existing `segment_assignments` Drizzle schema
    - Create corresponding database migration
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [ ] 1.2 Create lesson_completions table and schema
    - Define `lesson_completions` Drizzle schema with id, user_id, lesson_id, completed_at columns
    - Add unique constraint on (user_id, lesson_id)
    - Add foreign key constraints referencing users and lessons tables
    - Create corresponding database migration
    - _Requirements: 10.5, 10.6, 10.7, 10.8, 10.9_

- [ ] 2. Segment Access Service and middleware
  - [ ] 2.1 Implement Segment Access Service
    - Create `SegmentAccessService` with `verifyAccess(userId, segmentId)` method
    - Implement access expiry calculation: `assigned_at + access_duration_days` calendar days (UTC)
    - Handle null duration as unlimited access
    - Return appropriate error codes: ACCESS_DENIED, ACCESS_EXPIRED, SEGMENT_UNAVAILABLE
    - Verify assignment existence, duration validity, and segment active status
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ] 2.2 Implement segment access middleware
    - Create Express middleware that calls SegmentAccessService before learner route handlers
    - Return 403 with appropriate error code on access denial
    - Return 403 for non-learner roles accessing learner endpoints
    - _Requirements: 2.7, 2.8_

  - [ ]* 2.3 Write property test for access expiry calculation
    - **Property 1: Access Expiry Calculation**
    - Generate random assigned_at + access_duration_days + reference dates, verify active/expired classification
    - **Validates: Requirements 1.3, 1.4, 2.5, 10.4**

  - [ ]* 2.4 Write property test for access control invariant
    - **Property 2: Access Control Invariant**
    - Generate random user/segment/assignment/status combinations, verify access decision
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.7**

- [ ] 3. Checkpoint - Data model and access control
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Navigation Service and sequential progression
  - [ ] 4.1 Implement Navigation Service
    - Create `NavigationService` with methods: getSegmentDetail, getModuleLessons, getLessonContent, getCurrentLesson, canAccessLesson
    - Implement sequential lesson access enforcement: lesson N accessible only if lessons 1..N-1 completed
    - First lesson in a module is always accessible
    - Determine current lesson as first incomplete lesson in sort_order within first incomplete module
    - Return LESSON_LOCKED error with prerequisite lesson ID when access denied
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 3.1, 3.5_

  - [ ]* 4.2 Write property test for sequential access invariant
    - **Property 8: Sequential Access Invariant**
    - Generate random modules with N lessons and completion states, verify access rules
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.6**

  - [ ]* 4.3 Write property test for current lesson determination
    - **Property 9: Current Lesson Determination**
    - Generate random completion patterns, verify current lesson identification
    - **Validates: Requirements 7.7, 7.5**

- [ ] 5. Lesson Completion Service
  - [ ] 5.1 Implement Completion Service
    - Create `CompletionService` with `completeLesson(userId, lessonId)` method
    - Create lesson_completion record with user_id, lesson_id, completed_at
    - Implement idempotent behavior: duplicate completion returns 200 without new record
    - Return 404 for non-existent lessons
    - Enforce segment access check before allowing completion
    - Return updated progress state with next_lesson_id, module_complete, segment_complete
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ]* 5.2 Write property test for lesson completion idempotence
    - **Property 6: Lesson Completion Idempotence**
    - Generate random user-lesson pairs, complete N times, verify single record
    - **Validates: Requirements 6.2, 6.7, 10.6, 10.9**

  - [ ]* 5.3 Write property test for lesson completion round-trip
    - **Property 7: Lesson Completion Round-Trip**
    - Generate random user-lesson, complete then query, verify "completed" status
    - **Validates: Requirements 6.6**

- [ ] 6. Progress Service
  - [ ] 6.1 Implement Progress Service
    - Create `ProgressService` with getSegmentProgress and getModuleProgress methods
    - Calculate segment progress: round((completed_lessons / total_lessons) * 100)
    - Return 0% when segment has zero lessons
    - Return total lesson count, completed lesson count, and percentage
    - Return module completion status (complete or in-progress)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ]* 6.2 Write property test for progress percentage calculation
    - **Property 3: Progress Percentage Calculation**
    - Generate random completed/total pairs, verify formula
    - **Validates: Requirements 1.5, 8.1, 8.3, 8.4**

  - [ ]* 6.3 Write property test for progress invariant
    - **Property 4: Progress Invariant**
    - Generate random progress states, verify completed <= total
    - **Validates: Requirements 8.5**

  - [ ]* 6.4 Write property test for progress metamorphic property
    - **Property 5: Progress Metamorphic Property**
    - Generate random state, complete one lesson, verify +1 increment
    - **Validates: Requirements 8.6**

- [ ] 7. Checkpoint - Backend services complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Learner API endpoints
  - [ ] 8.1 Implement learner dashboard endpoint
    - Create GET `/api/learner/segments` returning assigned segments with progress and access status
    - Include segment title, description, progress_percentage, completed_lessons, total_lessons, access_status, assigned_at
    - Order segments by assigned_at descending
    - Display empty state when no assignments exist
    - Validate with Zod; enforce auth middleware
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 1.8_

  - [ ] 8.2 Implement segment detail endpoint
    - Create GET `/api/learner/segments/:segmentId` returning segment with modules and progress
    - Return segment title, description, ordered modules with lesson count and completed count per user
    - Scope to authenticated user assignments with access check
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ] 8.3 Implement module lesson listing endpoint
    - Create GET `/api/learner/segments/:segmentId/modules/:moduleId/lessons` returning lessons with completion status
    - Return ordered lessons with completion status for requesting user
    - Enforce segment access middleware
    - _Requirements: 3.4, 3.5_

  - [ ] 8.4 Implement lesson detail endpoint
    - Create GET `/api/learner/segments/:segmentId/modules/:moduleId/lessons/:lessonId` returning lesson content
    - Return lesson title, content_body (text) or video_url (video), content_type
    - Enforce segment access and sequential progression checks
    - _Requirements: 4.1, 4.2, 4.3, 5.1_

  - [ ] 8.5 Implement lesson completion endpoint
    - Create POST `/api/learner/lessons/:lessonId/complete` for marking lessons complete
    - Enforce segment access check before completion
    - Return completion result with next_lesson_id
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ] 8.6 Implement segment access duration check utility endpoint
    - Create GET `/api/learner/segments/:segmentId/current-lesson` returning current lesson for user
    - Implement access duration check utility used across endpoints
    - _Requirements: 2.5, 2.6, 7.7_

  - [ ]* 8.7 Write property test for ordering invariant
    - **Property 10: Ordering Invariant**
    - Generate random segment/module lists, verify ordering (segments by assigned_at desc, modules by sort_order asc)
    - **Validates: Requirements 1.8, 3.2**

- [ ] 9. Checkpoint - API endpoints complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Frontend API clients and hooks
  - [ ] 10.1 Create learner API client and React hooks
    - Create API client functions for all learner endpoints
    - Create React Query hooks: useAssignedSegments, useSegmentDetail, useModuleLessons, useLessonContent, useCompleteLesson, useSegmentProgress
    - Handle loading, error, and success states
    - _Requirements: 9.4, 9.5_

- [ ] 11. Frontend learner dashboard and segment pages
  - [ ] 11.1 Implement Learner Dashboard page
    - Create LearnerDashboard page with segment card grid layout
    - Display assigned segments with progress percentage, completed step count, and access status (active/expired)
    - Implement "Your Active Training" heading, progress cards, segment detail cards (Duration, Deadline, Time Left), and resume action
    - Show empty state when no assignments
    - Implement responsive layout: card grid at >=1024px, single-column stacked at <1024px
    - _Requirements: 1.1, 1.2, 1.6, 9.1, 9.2_

  - [ ] 11.2 Implement Segment Detail page with module accordion
    - Create SegmentDetailPage with ModuleAccordion component
    - Display modules in sort_order with progress indicators (completed lessons / total)
    - Implement accordion states: completed (green check), current/in-progress (clock icon), locked (muted/disabled with lock icon)
    - Show segment content accordion with module rows
    - Navigate to module lesson list on selection
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 9.7_

  - [ ] 11.3 Implement reusable SegmentAccordion and ModuleLessonTimeline components
    - Create SegmentAccordion with expandable module rows
    - Create LessonTimeline with vertical timeline, status dots (completed/current/locked), and lesson metadata (Video/Article, duration)
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

- [ ] 12. Frontend lesson view
  - [ ] 12.1 Implement Lesson View page with text and video content
    - Create LessonPage with contextual left panel (back to dashboard, segment summary, progress indicator, module accordion)
    - Implement text content renderer displaying lesson title and full content_body
    - Implement video embed with 16:9 responsive iframe for YouTube/Vimeo URLs
    - Display video_url as clickable external link when not a supported embed format
    - Show navigation context: current module title and lesson position (e.g., "Lesson 3 of 7")
    - _Requirements: 4.1, 4.2, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4_

  - [ ] 12.2 Implement Mark as Complete action and lesson navigation
    - Create MarkCompleteButton with confirmation prompt before submission
    - Show "Mark as Complete" when lesson not completed; show "Completed" indicator when done
    - Implement Previous/Next navigation buttons with Next disabled when next lesson is locked
    - Update UI to completed state and enable next lesson navigation without full page reload on success
    - _Requirements: 4.4, 4.5, 5.5, 5.6, 6.1, 9.6, 9.9, 9.10_

- [ ] 13. Frontend responsive and mobile behavior
  - [ ] 13.1 Implement mobile lesson dashboard, lesson view, and module drawer
    - Implement mobile single-column stacked cards for dashboard
    - Implement mobile lesson header with back arrow, module/lesson context, status badge, menu icon
    - Implement module navigation as drawer/overlay on mobile
    - Render text content and video embeds at full container width with appropriate padding on mobile
    - _Requirements: 9.2, 9.3_

  - [ ] 13.2 Implement loading, error, and empty states
    - Display loading indicators during API requests
    - Display user-visible error messages without technical details on API failure
    - Display learner name and profile link in navigation header
    - _Requirements: 9.4, 9.5, 9.8_

- [ ] 14. Final checkpoint - All features integrated
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using `fast-check`
- Unit tests validate specific examples and edge cases
- The tech stack is TypeScript throughout: React + Vite frontend, Express + Drizzle backend
- UI implementation should follow `.kiro/steering/ui-style-guide.md` and `.kiro/context/screenshot-catalog.md`
- Leave final UI polish, page hierarchy, and responsive fine-tuning for Figma attachment review

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3", "2.4", "4.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "5.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "6.1"] },
    { "id": 5, "tasks": ["6.2", "6.3", "6.4", "8.1", "8.2"] },
    { "id": 6, "tasks": ["8.3", "8.4", "8.5", "8.6"] },
    { "id": 7, "tasks": ["8.7", "10.1"] },
    { "id": 8, "tasks": ["11.1", "11.2", "11.3"] },
    { "id": 9, "tasks": ["12.1", "12.2"] },
    { "id": 10, "tasks": ["13.1", "13.2"] }
  ]
}
```
