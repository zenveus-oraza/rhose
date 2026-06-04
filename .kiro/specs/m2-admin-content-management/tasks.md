# Implementation Plan: M2 Admin Content Management

## Overview

This plan implements the full admin content management features for Milestone 2. M2 delivers real admin CRUD for the Segment → Module → Lesson hierarchy (NOT placeholders), user management, and segment assignment. The content structure created here is directly consumed by M3 (learner experience) and M4 (quizzes/progress). The implementation uses Node.js/Express with TypeScript, PostgreSQL via Drizzle ORM, Zod validation, and React with shadcn/ui + Tailwind on the frontend.

## Tasks

- [x] 1. Backend foundation and admin auth guard
  - [x] 1.1 Create admin route guard middleware
    - Implement Auth_Middleware to verify JWT tokens and attach user context
    - Implement Admin Guard middleware that checks `role === "admin"` and returns 403 Forbidden for non-admin users, 401 Unauthorized for unauthenticated users
    - Register middleware on `/api/admin/*` route prefix
    - _Requirements: 1.3, 1.4, 2.13, 3.10, 4.13, 5.10, 6.8_

  - [x] 1.2 Write unit tests for admin auth guard
    - Test valid admin token passes through
    - Test non-admin role returns 403
    - Test missing/invalid token returns 401
    - _Requirements: 1.3, 1.4_

- [x] 2. Segment schema update and CRUD with duration
  - [x] 2.1 Add duration field to segments schema, API, and validation
    - Add `duration` column (integer, nullable) to segments table in Drizzle schema
    - Create and run Drizzle migration for the new column
    - Update Zod segment creation schema to accept `duration` as a required positive integer
    - Update Zod segment update schema to accept `duration` as optional positive integer
    - Update Segment service `create()` to persist duration
    - Update Segment service `update()` to persist duration changes
    - Update Segment service `list()` to include duration in response
    - Update Segment service `getById()` to include duration in response
    - Validate: duration must be a positive integer (> 0), return 400 if missing or invalid on create
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.7_

  - [x] 2.2 Implement Segment service and controller with CRUD endpoints
    - POST `/api/admin/segments` — create segment with title, optional description, duration, default status "draft"
    - GET `/api/admin/segments` — list all segments (paginated) with duration included
    - GET `/api/admin/segments/:id` — get segment with module count and duration
    - PUT `/api/admin/segments/:id` — update title, description, duration, or status with transition validation
    - DELETE `/api/admin/segments/:id` — delete only if no modules exist, return 400 with child count otherwise
    - Implement status transition logic: allow draft→active, draft→archived, active→archived; reject from "archived"
    - _Requirements: 2.1–2.13, 9.1–9.7_

  - [x] 2.3 Write property test for segment status transitions
    - **Property 1: Segment Status Transition Validity**
    - Generate random sequences of status transitions, verify only valid ones succeed
    - **Validates: Requirements 2.8–2.10, 9.1–9.7**

  - [x] 2.4 Write unit tests for Segment service including duration
    - Test creation with valid title + duration succeeds
    - Test creation with missing title returns 400
    - Test creation with missing/invalid duration returns 400
    - Test update with new duration persists correctly
    - Test list includes duration field
    - Test getById includes duration field
    - Test all status transition edge cases
    - Test deletion blocked by existing modules
    - _Requirements: 2.1–2.13, 9.1–9.7_

- [x] 3. Module CRUD inside Segment
  - [x] 3.1 Implement Module service and controller with CRUD endpoints
    - POST `/api/admin/segments/:segmentId/modules` — create module with title, auto-assigned sort_order
    - GET `/api/admin/segments/:segmentId/modules` — list modules ordered by sort_order ascending with lesson count
    - PUT `/api/admin/modules/:id` — update module title
    - PUT `/api/admin/segments/:segmentId/modules/reorder` — reorder modules, maintain contiguous sort_order from 1
    - DELETE `/api/admin/modules/:id` — delete module only if no lessons exist, reorder remaining modules
    - Zod validation: title required, segment_id must reference existing segment
    - Module belongs to Segment through segment_id foreign key
    - Module has sort_order for sequencing (auto-assigned on creation, maintained contiguously)
    - Return 404 if parent segment does not exist
    - _Requirements: 3.1–3.11, 7.1, 7.6_

  - [x] 3.2 Write property test for module sort order contiguity
    - **Property 2: Module Sort Order Contiguity Invariant**
    - **Validates: Requirements 3.1, 3.6, 3.7, 3.9, 7.6**

  - [x] 3.3 Write unit tests for Module service
    - Test creation assigns next sort_order within segment
    - Test creation with non-existent segment returns 404
    - Test deletion reorders remaining modules
    - Test reorder maintains contiguity
    - Test deletion blocked by existing lessons returns 400
    - _Requirements: 3.1–3.11_

- [x] 4. Lesson CRUD inside Module (with estimated time)
  - [x] 4.1 Add estimated_time fields to lessons schema
    - Add `estimated_time_value` column (integer, nullable) to lessons table
    - Add `estimated_time_unit` column (varchar(10), nullable, values: "minutes" | "hours") to lessons table
    - Create and run Drizzle migration for new columns
    - Update Zod lesson creation schema to accept estimated_time_value and estimated_time_unit
    - Update Zod lesson update schema to accept estimated_time_value and estimated_time_unit
    - Validate: if estimated_time_value provided, it must be a positive integer; estimated_time_unit must be "minutes" or "hours"
    - _Requirements: 4.1, 4.2, 4.15_

  - [x] 4.2 Implement Lesson service and controller with CRUD endpoints
    - POST `/api/admin/modules/:moduleId/lessons` — create lesson with content_type, estimated time, auto-assigned sort_order
    - GET `/api/admin/modules/:moduleId/lessons` — list lessons ordered by sort_order with estimated time fields
    - GET `/api/admin/lessons/:id` — get full lesson with content_body/video_url and estimated time
    - PUT `/api/admin/lessons/:id` — update lesson fields including estimated time
    - PUT `/api/admin/modules/:moduleId/lessons/reorder` — reorder lessons, maintain contiguous sort_order
    - DELETE `/api/admin/lessons/:id` — delete lesson, reorder remaining lessons
    - Zod validation: require content_body for text type, require video_url for video type, validate URL format
    - Lessons always belong to a Module (module_id foreign key) — never standalone
    - Return 404 if parent module does not exist
    - _Requirements: 4.1–4.15, 7.2, 7.7_

  - [x] 4.3 Write property test for lesson sort order contiguity
    - **Property 3: Lesson Sort Order Contiguity Invariant**
    - **Validates: Requirements 4.1, 4.2, 4.10, 4.11, 4.12, 7.7**

  - [x] 4.4 Write unit tests for Lesson service including estimated time
    - Test text lesson requires content_body
    - Test video lesson requires valid video_url
    - Test invalid URL format rejected
    - Test estimated_time_value and estimated_time_unit persisted correctly
    - Test list includes estimated time fields
    - Test getById includes estimated time fields
    - Test deletion reorders remaining lessons
    - Test creation with non-existent module returns 404
    - _Requirements: 4.1–4.15_

- [x] 5. Checkpoint - Backend content hierarchy with duration and estimated time
  - Verify segments.duration column exists and works end-to-end
  - Verify lessons.estimated_time_value and lessons.estimated_time_unit columns exist and work
  - Verify full hierarchy: create segment (with duration) → add modules → add lessons (with estimated time)
  - Ensure all tests pass

- [x] 6. User management
  - [x] 6.1 Implement User Management service and controller
    - POST, GET (paginated), PUT, deactivate, reset-password endpoints
    - Zod validation, 409 for duplicate email, never return password hash
    - _Requirements: 5.1–5.11_

  - [x] 6.2 Write property test for password hash exclusion
    - **Property 8: Password Hash Never Exposed**
    - **Validates: Requirements 5.1, 5.11**

  - [x] 6.3 Write unit tests for User Management service
    - _Requirements: 5.1–5.11_

- [x] 7. Segment user assignment
  - [x] 7.1 Implement Assignment service and controller
    - POST, DELETE, GET by segment, GET by user
    - 409 for duplicate, 404 for non-existent entities
    - Include access_duration_days field for M3 compatibility
    - _Requirements: 6.1–6.10, 7.3_

  - [x] 7.2 Write property tests for assignment round-trips
    - **Property 4 & 5: Assignment Round-Trip**
    - **Validates: Requirements 6.1, 6.5, 6.6, 6.9, 6.10**

  - [x] 7.3 Write unit tests for Assignment service
    - _Requirements: 6.1–6.10_

- [x] 8. Checkpoint - Backend complete
  - Ensure all backend tests pass

- [x] 9. Dashboard stats endpoint
  - [x] 9.1 Implement admin dashboard stats endpoint
    - GET `/api/admin/dashboard/stats` — total counts for segments, modules, lessons, users
    - _Requirements: 1.1, 1.2_

- [x] 10. Frontend API clients and hooks
  - [x] 10.1 Create frontend API clients/hooks for all admin endpoints
    - React Query hooks for segments (with duration), modules, lessons (with estimated time), users, assignments, dashboard
    - Typed API client functions matching backend response shapes
    - _Requirements: 8.15, 8.16_

- [x] 11. Admin dashboard frontend
  - [x] 11.1 Implement admin dashboard UI
    - Stats cards, quick actions, segment overview, responsive layout
    - _Requirements: 1.1, 1.2, 1.5, 8.18, 8.19_

- [x] 12. Content management frontend — Segment list and form with duration
  - [x] 12.1 Implement Segment list page with duration display
    - Build SegmentListPage with table/list showing title, status badge, module count, duration, and row actions
    - Duration displayed as "{N} days" in the list
    - Row actions: Edit, Manage Content, Archive/Delete
    - _Requirements: 8.1_

  - [x] 12.2 Implement Segment creation/edit form with duration field
    - Form fields: Title (required), Description (optional text area), Duration (required, positive integer input, labeled "Duration (days)")
    - Client-side validation: title required, duration must be positive integer
    - Save/Cancel actions
    - On success: navigate to segment detail or show success toast
    - _Requirements: 8.2, 2.1, 2.3_

- [x] 13. Content management frontend — Segment detail with Module panel
  - [x] 13.1 Implement Segment detail / content management screen
    - Left/main area: Display segment info (title, description, duration, status)
    - Show "Add Module" button with left icon, matching Figma primary button styling
    - Display list of existing Modules with lesson count, sort order, actions (edit, add lessons, reorder, delete)
    - Modules are managed WITHIN this segment detail context — not on a separate page
    - _Requirements: 8.3, 8.4, 8.6, 8.20_

  - [x] 13.2 Implement right-side Module panel
    - When admin clicks "Add Module", a right-side panel/section appears
    - Module panel contains:
      - Module name/title input field (required)
      - Save button and Cancel button
    - On save: create module via API, add to module list, close panel or show module detail
    - On cancel: close panel without changes
    - After module creation: show module in the segment's module list
    - Module panel shows existing module's details when editing
    - _Requirements: 8.5, 8.6, 3.11_

- [x] 14. Content management frontend — Lesson management inside Module
  - [x] 14.1 Implement "Add Lesson" button and lesson list area inside Module panel
    - Inside the Module panel/detail section, add an "Add Lesson" button at the top with Figma-matching styling (left icon + text)
    - Below the button: grey/empty lesson list area container
    - Empty state text: "Saved lessons will appear here" (exact text per Figma)
    - Populated state: lesson cards showing title, content type badge, estimated time, sort order, actions (edit, delete, reorder)
    - _Requirements: 8.7, 8.8, 8.9, 4.14_

  - [x] 14.2 Implement Lesson creation/edit form inside Module context
    - When admin clicks "Add Lesson", show lesson form fields:
      - Lesson title (required text input)
      - Lesson type selector: "Text" / "Video" (radio or dropdown)
      - Content area (conditional on type):
        - Text: rich text / content_body textarea
        - Video: video_url input field
      - Estimated time value (number input, positive integer)
      - Estimated time unit selector: "minutes" / "hours" (dropdown)
    - Client-side validation: title required, content_body required for text, video_url required for video
    - Save/Cancel actions
    - On save: create lesson via API, add to lesson list within module context
    - UI supports upload/content input now; storage/upload implementation follows final backend decision
    - _Requirements: 8.10, 8.11, 4.14, 4.15_

- [x] 15. Content management frontend — Lesson type handling
  - [x] 15.1 Implement conditional lesson content fields
    - When "Text" is selected: show content_body textarea (required)
    - When "Video" is selected: show video_url input (required, URL validation)
    - Hide non-applicable field when type changes
    - Show estimated_time_value and estimated_time_unit regardless of type
    - Do NOT add quiz fields — quiz remains M4
    - _Requirements: 8.10, 8.11_

- [x] 16. User management frontend
  - [x] 16.1 Implement user management UI
    - UserListPage with search, filters, row actions (View Profile, Assign Segment, Reset Password, Deactivate)
    - UserCreateForm with name, email, role
    - UserProfilePage with user details, segment assignments
    - AssignTrainingPage with segment selector, user checklist, duration/date fields
    - Confirmation dialogs for destructive actions
    - _Requirements: 8.12, 8.13, 8.14, 8.15, 8.16, 8.17, 8.18, 8.19_

- [x] 17. Integration wiring and database integrity
  - [x] 17.1 Verify content hierarchy with new fields
    - Verify segments.duration migration applied and working
    - Verify lessons.estimated_time_value and estimated_time_unit migration applied
    - Verify foreign key constraints enforce Segment → Module → Lesson
    - Verify restrict-on-delete prevents orphaned records
    - Verify unique constraint on (user_id, segment_id) in segment_assignments
    - _Requirements: 7.1–7.7_

  - [x] 17.2 Write integration tests for full content hierarchy
    - Test: create segment with duration → add modules → add lessons with estimated time → verify full listing
    - Test: referential integrity (delete segment with modules fails)
    - Test: auth (admin-only endpoints reject non-admin)
    - Test: assignment flow (assign → list → remove)
    - Test: dashboard stats accurate after entity creation
    - Verify data is ready for M3 learner viewing and M4 quiz association
    - _Requirements: 7.1–7.7, 1.3, 1.4_

- [x] 18. Final checkpoint — M2 complete
  - Verify ALL of the following are working end-to-end:
    - Segment CRUD with duration field (schema, API, validation, UI)
    - Module add/edit inside segment detail view (right-side panel)
    - Lesson add/edit inside module context (with estimated time fields)
    - Lesson empty state text: "Saved lessons will appear here"
    - Right-side module panel behavior (open/close, save/cancel)
    - Lesson type selector with conditional content fields
    - Estimated time value + unit fields on lesson form
    - Data structure ready for M3 (learner can view segment → module → lesson)
    - Data structure ready for M4 (quiz can associate to module/lesson)
    - No quiz features implemented (quiz is M4 only)
    - No learner-side viewing implemented (learner viewing is M3 only)
  - Ensure all tests pass

## Notes

- Modules and Lessons are REAL admin-managed entities in M2, NOT placeholders
- Segment duration field is per the Figma design — separate from assignment access_duration_days
- Lesson estimated_time is per the Figma lesson form — value (integer) + unit (minutes/hours)
- The UI flow follows Figma: Segment form → Add Module (right panel) → Add Lesson (inside Module)
- No disconnected "Modules" or "Lessons" pages — everything in context
- Do NOT implement quiz creation, submission, scoring, or progress (that's M4)
- Do NOT implement learner-side lesson viewing/completion (that's M3)
- M2 MUST create the full content structure that M3 and M4 depend on
- UI uses shadcn/ui + Tailwind, consistent with project styling
- Use existing AdminLayout, Button, Toast, ActionMenu, StatusBadge components
- Empty lesson list uses grey container with exact text: "Saved lessons will appear here"

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "9.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4"] },
    { "id": 3, "tasks": ["3.1", "3.2", "3.3"] },
    { "id": 4, "tasks": ["4.1", "4.2", "4.3", "4.4"] },
    { "id": 5, "tasks": ["6.1", "6.2", "6.3"] },
    { "id": 6, "tasks": ["7.1", "7.2", "7.3"] },
    { "id": 7, "tasks": ["10.1"] },
    { "id": 8, "tasks": ["11.1", "12.1", "12.2"] },
    { "id": 9, "tasks": ["13.1", "13.2"] },
    { "id": 10, "tasks": ["14.1", "14.2", "15.1"] },
    { "id": 11, "tasks": ["16.1"] },
    { "id": 12, "tasks": ["17.1", "17.2"] },
    { "id": 13, "tasks": ["18"] }
  ]
}
```
