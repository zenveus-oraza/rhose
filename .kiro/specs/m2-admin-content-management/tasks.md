# Implementation Plan: M2 Admin Content Management

## Overview

This plan implements the admin content management features for Milestone 2, covering backend foundation (auth middleware, route guards), content CRUD (Segments, Modules, Lessons with ordering and status lifecycle), user management (create, list, edit, deactivate, password reset), segment user assignment, and the full admin frontend UI. The implementation uses Node.js/Express with TypeScript, PostgreSQL via Drizzle ORM, Zod validation, and React with shadcn/ui on the frontend.

## Tasks

- [x] 1. Backend foundation and admin auth guard
  - [x] 1.1 Create admin route guard middleware
    - Implement Auth_Middleware to verify JWT tokens and attach user context
    - Implement Admin Guard middleware that checks `role === "admin"` and returns 403 Forbidden for non-admin users, 401 Unauthorized for unauthenticated users
    - Register middleware on `/api/admin/*` route prefix
    - _Requirements: 1.3, 1.4, 2.12, 3.10, 4.13, 5.10, 6.8_

  - [x] 1.2 Write unit tests for admin auth guard
    - Test valid admin token passes through
    - Test non-admin role returns 403
    - Test missing/invalid token returns 401
    - _Requirements: 1.3, 1.4_

- [x] 2. Segment CRUD and status management
  - [x] 2.1 Implement Segment service and controller with CRUD endpoints
    - POST `/api/admin/segments` — create segment with title, optional description, default status "draft"
    - GET `/api/admin/segments` — list all segments ordered by created_at descending
    - GET `/api/admin/segments/:id` — get segment with module count
    - PUT `/api/admin/segments/:id` — update segment title, description, or status with transition validation
    - DELETE `/api/admin/segments/:id` — delete segment only if no modules exist, return 400 with child count otherwise
    - Add Zod validation schemas for all request bodies (title required, status enum)
    - Implement status transition logic: allow draft→active, draft→archived, active→archived; reject transitions from "archived"
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

  - [x] 2.2 Write property test for segment status transitions
    - **Property 1: Segment Status Transition Validity**
    - Generate random sequences of status transitions, verify only valid ones succeed and the state machine is respected
    - **Validates: Requirements 2.7, 2.8, 2.9, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7**

  - [x] 2.3 Write unit tests for Segment service
    - Test creation with valid/invalid inputs
    - Test all status transition edge cases
    - Test deletion blocked by existing modules
    - Test 404 for non-existent segment
    - _Requirements: 2.1–2.11, 9.1–9.7_

- [x] 3. Module CRUD and ordering
  - [x] 3.1 Implement Module service and controller with CRUD endpoints
    - POST `/api/admin/segments/:segmentId/modules` — create module with auto-assigned sort_order
    - GET `/api/admin/segments/:segmentId/modules` — list modules ordered by sort_order ascending with lesson count
    - PUT `/api/admin/modules/:id` — update module title/description
    - PUT `/api/admin/segments/:segmentId/modules/reorder` — reorder modules, maintain contiguous sort_order from 1
    - DELETE `/api/admin/modules/:id` — delete module only if no lessons exist, reorder remaining modules
    - Add Zod validation schemas (title required, segment_id must exist)
    - Return 404 if parent segment does not exist
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 7.1, 7.6_

  - [x] 3.2 Write property test for module sort order contiguity
    - **Property 2: Module Sort Order Contiguity Invariant**
    - Generate random sequences of create/delete/reorder operations, verify sort_order forms contiguous sequence from 1
    - **Validates: Requirements 3.1, 3.6, 3.7, 3.9, 7.6**

  - [x] 3.3 Write unit tests for Module service
    - Test creation assigns next sort_order
    - Test deletion reorders remaining modules
    - Test reorder maintains contiguity
    - Test 404 for non-existent parent segment
    - Test deletion blocked by existing lessons
    - _Requirements: 3.1–3.9_

- [x] 4. Lesson CRUD and ordering
  - [x] 4.1 Implement Lesson service and controller with CRUD endpoints
    - POST `/api/admin/modules/:moduleId/lessons` — create lesson with content_type "text" or "video", auto-assigned sort_order
    - GET `/api/admin/modules/:moduleId/lessons` — list lessons ordered by sort_order ascending
    - GET `/api/admin/lessons/:id` — get full lesson with content_body or video_url
    - PUT `/api/admin/lessons/:id` — update lesson fields
    - PUT `/api/admin/modules/:moduleId/lessons/reorder` — reorder lessons, maintain contiguous sort_order from 1
    - DELETE `/api/admin/lessons/:id` — delete lesson, reorder remaining lessons
    - Add Zod validation: require content_body for text type, require video_url for video type, validate URL format
    - Return 404 if parent module does not exist
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12, 7.2, 7.7_

  - [x] 4.2 Write property test for lesson sort order contiguity
    - **Property 3: Lesson Sort Order Contiguity Invariant**
    - Generate random sequences of create/delete/reorder operations on lessons, verify sort_order forms contiguous sequence from 1
    - **Validates: Requirements 4.1, 4.2, 4.10, 4.11, 4.12, 7.7**

  - [x] 4.3 Write unit tests for Lesson service
    - Test text lesson requires content_body
    - Test video lesson requires valid video_url
    - Test invalid URL format rejected
    - Test deletion reorders remaining lessons
    - Test 404 for non-existent parent module
    - _Requirements: 4.1–4.12_

- [x] 5. Checkpoint - Backend content hierarchy
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. User management
  - [x] 6.1 Implement User Management service and controller
    - POST `/api/admin/users` — create user with name, email, role; generate temporary password, hash and store; return profile without password hash
    - GET `/api/admin/users` — list users paginated, searchable by name/email (case-insensitive), ordered by created_at descending
    - PUT `/api/admin/users/:id` — update user name or role
    - PUT `/api/admin/users/:id/deactivate` — set status to "deactivated"
    - POST `/api/admin/users/:id/reset-password` — generate new temporary password, hash and store, return confirmation with temp password shown once
    - Add Zod validation: name required, email required and valid format, role enum
    - Return 409 Conflict for duplicate email
    - Never return password hash in any response
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11_

  - [x] 6.2 Write property test for password hash exclusion
    - **Property 7: Password Hash Never Exposed**
    - Generate random user operations (create, list, update, deactivate, reset-password), verify no response contains password hash
    - **Validates: Requirements 5.1, 5.11**

  - [x] 6.3 Write property test for user search correctness
    - **Property 8: User Search Returns Matching Results**
    - Generate random users and substring queries, verify matching users appear in results
    - **Validates: Requirements 5.6**

  - [x] 6.4 Write property test for user deactivation
    - **Property 9: User Deactivation Sets Correct Status**
    - Generate random active users, deactivate, verify status change and updated_at
    - **Validates: Requirements 5.8**

  - [x] 6.5 Write unit tests for User Management service
    - Test creation with valid inputs returns profile without password hash
    - Test duplicate email returns 409
    - Test search filters by name/email case-insensitively
    - Test deactivation sets correct status
    - Test password reset generates new temporary password
    - _Requirements: 5.1–5.11_

- [x] 7. Segment user assignment
  - [x] 7.1 Implement Assignment service and controller
    - POST `/api/admin/assignments` — assign user to segment with assigned_at timestamp
    - DELETE `/api/admin/assignments/:id` — remove assignment
    - GET `/api/admin/segments/:segmentId/assignments` — list users assigned to segment
    - GET `/api/admin/users/:userId/assignments` — list segments assigned to user
    - Return 409 for duplicate assignment
    - Return 404 for non-existent user or segment
    - Include access_duration_days field for M3 compatibility
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 7.3_

  - [x] 7.2 Write property test for assignment round-trip (assign then list)
    - **Property 4: Assignment Round-Trip (Assign then List Includes)**
    - Generate random valid user/segment pairs, assign, list, verify inclusion
    - **Validates: Requirements 6.1, 6.6, 6.9**

  - [x] 7.3 Write property test for assignment removal round-trip
    - **Property 5: Assignment Removal Round-Trip (Remove then List Excludes)**
    - Generate random existing assignments, remove, list, verify exclusion
    - **Validates: Requirements 6.5, 6.10**

  - [x] 7.4 Write unit tests for Assignment service
    - Test assign creates record and returns confirmation
    - Test duplicate assignment returns 409
    - Test removal deletes record
    - Test list by segment returns assigned users
    - Test list by user returns assigned segments
    - _Requirements: 6.1–6.10_

- [x] 8. Checkpoint - Backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Dashboard stats endpoint
  - [x] 9.1 Implement admin dashboard stats endpoint
    - GET `/api/admin/dashboard/stats` — return total counts for segments, modules, lessons, and users
    - _Requirements: 1.1, 1.2_

  - [x] 9.2 Write property test for update persistence round-trip
    - **Property 6: Update Persistence Round-Trip**
    - Generate random valid updates for segments, modules, lessons, and users; apply update, re-fetch, verify persistence and updated_at
    - **Validates: Requirements 2.6, 3.5, 4.9, 5.7**

- [x] 10. Frontend API clients and hooks
  - [x] 10.1 Create frontend API clients/hooks for admin content and user management
    - Implement React Query hooks for all admin endpoints (segments, modules, lessons, users, assignments, dashboard stats)
    - Create typed API client functions matching backend response shapes
    - Handle loading, error, and success states consistently
    - _Requirements: 8.11, 8.12_

- [x] 11. Admin dashboard frontend
  - [x] 11.1 Implement admin dashboard UI
    - Build DashboardPage with stats cards (Total Users, Active Segments, Total Modules, Total Lessons)
    - Implement quick actions (Assign Segment, Create User, Add New Segment)
    - Implement Segment Overview list with status badges, progress bars, and filter/status dropdown
    - Implement Recent Activity panel (lightweight operational events)
    - Add navigation links to Segment management and User management sections
    - Implement responsive layout: grid on desktop (≥1024px), stacked cards on mobile (<1024px)
    - _Requirements: 1.1, 1.2, 1.5, 8.14, 8.15_

- [x] 12. Content management frontend
  - [x] 12.1 Implement content management list/table and segment CRUD UI
    - Build SegmentListPage with table/list view, status badges, module count, and row action menu (edit, manage modules, delete)
    - Build SegmentCreateWizard with stepper form (Segment Info → Modules → Lessons → Quiz → Review)
    - Build ModuleDrawer (right-side panel) for add/edit module within segment context
    - Build LessonDrawer (right-side panel) for add/edit lesson with conditional fields (content_body for text, video_url for video)
    - Build SegmentDetailsPage with summary, modules/lessons, assigned users
    - Implement action menus and success modals
    - Add client-side validation matching backend Zod schemas
    - Implement confirmation dialogs for destructive actions (delete, archive)
    - Implement loading indicators and error messages
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.11, 8.12, 8.13, 8.14, 8.15_

- [x] 13. User management frontend
  - [x] 13.1 Implement user management UI
    - Build UserListPage with search, filter dropdown, columns for role/job-title, assigned segment, progress, status, and row actions (View Profile, Assign Segment, Reset Password, Deactivate User)
    - Build UserCreateForm with name, email, role/job-title dropdown, segment assignment, invite email action, and success modal
    - Build UserProfilePage (admin view) with user details, segment assignments, activity, quick actions, account details
    - Build AssignTrainingPage with segment selector, selectable users list, selected users panel, notification toggle, duration/date fields, and success modal
    - Implement confirmation dialogs for destructive actions (deactivate)
    - _Requirements: 8.8, 8.9, 8.10, 8.11, 8.12, 8.13, 8.14, 8.15_

- [x] 14. Checkpoint - Frontend complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Integration wiring and database integrity
  - [x] 15.1 Verify content hierarchy database constraints
    - Ensure foreign key constraints enforce Segment → Module → Lesson hierarchy
    - Ensure segment_assignments references valid user and segment via foreign keys
    - Ensure restrict-on-delete prevents orphaned records
    - Verify unique constraint on (user_id, segment_id) in segment_assignments
    - Run Drizzle migrations for any new/modified schema
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 15.2 Write integration tests for content hierarchy and auth flow
    - Test full flow: create segment → add modules → add lessons → verify listing and ordering
    - Test referential integrity: attempt delete segment with modules, verify rejection
    - Test auth: admin-only endpoints reject non-admin and unauthenticated requests
    - Test assignment flow: assign → list → remove → verify
    - Test dashboard stats accuracy after entity creation
    - _Requirements: 7.1–7.7, 1.3, 1.4_

- [x] 16. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using `fast-check`
- Unit tests validate specific examples and edge cases
- The tech stack is TypeScript throughout: Node.js/Express backend, React frontend, Drizzle ORM, Zod validation
- UI implementation should follow `.kiro/steering/ui-style-guide.md`, `.kiro/steering/design-system.md`, and `.kiro/context/screenshot-catalog.md`
- Segment access duration fields are included in assignment schema for M3 compatibility but not enforced in M2

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "9.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "6.1"] },
    { "id": 5, "tasks": ["6.2", "6.3", "6.4", "6.5", "7.1"] },
    { "id": 6, "tasks": ["7.2", "7.3", "7.4", "9.2"] },
    { "id": 7, "tasks": ["10.1"] },
    { "id": 8, "tasks": ["11.1", "12.1", "13.1"] },
    { "id": 9, "tasks": ["15.1"] },
    { "id": 10, "tasks": ["15.2"] }
  ]
}
```
