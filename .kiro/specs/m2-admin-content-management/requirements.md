# Requirements Document

## Introduction

Milestone 2 enables admins to fully create and manage learning content through the Segment → Module → Lesson hierarchy, manage user accounts, and assign users to segments. This builds on the M1 foundation (authentication, data models, layout shell) to deliver the complete admin content management experience. Segments, Modules, and Lessons are real admin-managed entities — not placeholders. The data structures created here are directly consumed by M3 (learner experience) and M4 (quizzes/progress).

## Design References

- Admin Dashboard: `.kiro/context/screenshots/DASHBOARD_SCREEN.png`
- Content Management: `.kiro/context/screenshots/CONTENT_MANAGEMENT.png`
- User Management: `.kiro/context/screenshots/USER_MANAGMENT_SCREENS.png`
- Component Patterns: `.kiro/context/screenshots/COMPONENTS.png`
- Style Tokens: `.kiro/context/screenshots/STYLE.png`
- Overlay/Button: `.kiro/context/screenshots/OVERLAY.png`
- Textual interpretation: `.kiro/context/screenshot-catalog.md`

Screenshots guide UI layout and component behavior. They do not add features outside the SOW.

## Glossary

- **Admin_Dashboard**: The authenticated admin landing page displaying summary statistics and navigation to content and user management areas.
- **Segment_Service**: The backend service responsible for CRUD operations on Segments including status transitions and duration management.
- **Module_Service**: The backend service responsible for CRUD operations on Modules within a Segment, including sort order management.
- **Lesson_Service**: The backend service responsible for CRUD operations on Lessons within a Module, including sort order, content type handling, and estimated time.
- **User_Management_Service**: The backend service responsible for admin-initiated user account creation, listing, editing, deactivation, and password reset.
- **Assignment_Service**: The backend service responsible for assigning and removing users from Segments.
- **Schema_Validator**: The Zod-based validation layer that validates all API request payloads.
- **Auth_Middleware**: The middleware that verifies JWT tokens and enforces role-based access on admin endpoints.
- **Segment**: A top-level learning programme container with title, description, duration, and statuses: draft, active, archived. Contains Modules.
- **Module**: A grouping of Lessons within a Segment, ordered by sort_order. Created and managed within the Segment detail context.
- **Lesson**: An individual learning unit within a Module containing text content, video URL, or uploaded content. Has a title, content type, estimated time, and sort_order. Always created within a Module context.
- **Content_Hierarchy**: The three-level structure: Segment → Module → Lesson. All entities are real admin-managed objects with full CRUD in M2.
- **Admin**: A user with role "admin" who manages accounts, content, and assignments.
- **Learner**: A standard user with role "learner" who accesses assigned learning content.
- **Segment_Duration**: The duration field on the Segment form (per Figma design). Stored on the segment model. Separate from assignment-specific access_duration_days used in M3.
- **Estimated_Time**: The time estimate for a Lesson, stored as a value and unit (minutes or hours).

## Requirements

### Requirement 1: Admin Dashboard

**User Story:** As an admin, I want a dashboard overview page so that I can see platform statistics and quickly navigate to content and user management.

#### Acceptance Criteria

1. WHEN an authenticated admin navigates to the admin dashboard, THE Admin_Dashboard SHALL display the total count of Segments, the total count of Modules, the total count of Lessons, and the total count of Users.
2. WHEN an authenticated admin navigates to the admin dashboard, THE Admin_Dashboard SHALL provide navigation links to the Segment management section and the User management section.
3. WHEN a non-admin user attempts to access the admin dashboard route, THE Auth_Middleware SHALL return a 403 Forbidden response and the frontend SHALL redirect the user away from the admin area.
4. WHEN an unauthenticated user attempts to access the admin dashboard route, THE Auth_Middleware SHALL return a 401 Unauthorized response.
5. THE Admin_Dashboard SHALL render responsively with a grid layout on desktop (viewport 1024px or greater) and a stacked card layout on mobile (viewport less than 1024px).

### Requirement 2: Segment Management (with Duration)

**User Story:** As an admin, I want to create, view, edit, and manage Segments with title, description, and duration so that I can structure learning programmes with clear timelines.

#### Acceptance Criteria

1. WHEN an authenticated admin submits a valid segment creation request with title, optional description, and duration (in days), THE Segment_Service SHALL create the Segment with status "draft", generate a UUID primary key, set created_at and updated_at timestamps, store the duration value, and return the created Segment object.
2. WHEN an authenticated admin submits a segment creation request with a missing title, THE Schema_Validator SHALL return a 400 Bad Request response with a field-specific validation error indicating title is required.
3. WHEN an authenticated admin submits a segment creation request with a missing or invalid duration (non-positive integer), THE Schema_Validator SHALL return a 400 Bad Request response with a field-specific validation error indicating duration must be a positive integer.
4. WHEN an authenticated admin requests the list of all Segments, THE Segment_Service SHALL return an array of Segment objects including id, title, description, duration, status, created_at, and updated_at, ordered by created_at descending.
5. WHEN an authenticated admin requests a single Segment by id, THE Segment_Service SHALL return the Segment object with its associated Module count and duration.
6. WHEN an authenticated admin requests a Segment that does not exist, THE Segment_Service SHALL return a 404 Not Found response with error code "NOT_FOUND".
7. WHEN an authenticated admin submits a valid segment update request with title, description, or duration changes, THE Segment_Service SHALL persist the changes, update the updated_at timestamp, and return the updated Segment object.
8. WHEN an authenticated admin changes a Segment status from "draft" to "active", THE Segment_Service SHALL update the status and updated_at timestamp.
9. WHEN an authenticated admin changes a Segment status from "active" to "archived", THE Segment_Service SHALL update the status and updated_at timestamp.
10. WHEN an authenticated admin attempts to change a Segment status from "archived" to "active", THE Segment_Service SHALL return a 400 Bad Request response indicating archived Segments cannot be reactivated.
11. WHEN an authenticated admin deletes a Segment that has no Modules, THE Segment_Service SHALL remove the Segment record and return a 200 OK response.
12. WHEN an authenticated admin attempts to delete a Segment that has associated Modules, THE Segment_Service SHALL return a 400 Bad Request response indicating the Segment must have all Modules removed before deletion.
13. WHEN a non-admin user attempts any Segment management operation, THE Auth_Middleware SHALL return a 403 Forbidden response.

### Requirement 3: Module Management (inside Segment)

**User Story:** As an admin, I want to create, view, edit, and manage Modules within a Segment detail view so that I can organize content into logical groups inside each Segment.

#### Acceptance Criteria

1. WHEN an authenticated admin submits a valid module creation request with title and segment_id, THE Module_Service SHALL create the Module with a UUID primary key, assign the next available sort_order within that Segment, set created_at and updated_at timestamps, and return the created Module object.
2. WHEN an authenticated admin submits a module creation request with a segment_id that does not exist, THE Module_Service SHALL return a 404 Not Found response indicating the parent Segment does not exist.
3. WHEN an authenticated admin submits a module creation request with a missing title, THE Schema_Validator SHALL return a 400 Bad Request response with a field-specific validation error indicating title is required.
4. WHEN an authenticated admin requests all Modules for a given Segment, THE Module_Service SHALL return an array of Module objects ordered by sort_order ascending, each including id, title, sort_order, segment_id, and lesson count.
5. WHEN an authenticated admin submits a valid module update request with title changes, THE Module_Service SHALL persist the changes, update the updated_at timestamp, and return the updated Module object.
6. WHEN an authenticated admin submits a sort order update for Modules within a Segment, THE Module_Service SHALL reorder all affected Modules and persist the new sort_order values.
7. WHEN an authenticated admin deletes a Module that has no Lessons, THE Module_Service SHALL remove the Module record, reorder remaining Modules in the Segment to maintain contiguous sort_order values, and return a 200 OK response.
8. WHEN an authenticated admin attempts to delete a Module that has associated Lessons, THE Module_Service SHALL return a 400 Bad Request response indicating the Module must have all Lessons removed before deletion.
9. FOR ALL sort order updates within a Segment, THE Module_Service SHALL maintain unique contiguous sort_order values starting from 1 for all Modules in that Segment (invariant property).
10. WHEN a non-admin user attempts any Module management operation, THE Auth_Middleware SHALL return a 403 Forbidden response.
11. THE Module management UI SHALL be accessible only within the Segment detail context (not as a standalone top-level page disconnected from a Segment).

### Requirement 4: Lesson Management (inside Module)

**User Story:** As an admin, I want to create, view, edit, and manage Lessons within a Module so that I can deliver text, video, and uploaded content with estimated completion times.

#### Acceptance Criteria

1. WHEN an authenticated admin submits a valid lesson creation request with title, module_id, content_type "text", content_body, and estimated_time (value and unit), THE Lesson_Service SHALL create the Lesson with a UUID primary key, assign the next available sort_order within that Module, set created_at and updated_at timestamps, and return the created Lesson object.
2. WHEN an authenticated admin submits a valid lesson creation request with title, module_id, content_type "video", video_url, and estimated_time (value and unit), THE Lesson_Service SHALL create the Lesson with a UUID primary key, assign the next available sort_order within that Module, set created_at and updated_at timestamps, and return the created Lesson object.
3. WHEN an authenticated admin submits a lesson creation request with content_type "text" but no content_body, THE Schema_Validator SHALL return a 400 Bad Request response indicating content_body is required for text lessons.
4. WHEN an authenticated admin submits a lesson creation request with content_type "video" but no video_url, THE Schema_Validator SHALL return a 400 Bad Request response indicating video_url is required for video lessons.
5. WHEN an authenticated admin submits a lesson creation request with content_type "video" and a video_url that is not a valid URL format, THE Schema_Validator SHALL return a 400 Bad Request response indicating the video_url format is invalid.
6. WHEN an authenticated admin submits a lesson creation request with a module_id that does not exist, THE Lesson_Service SHALL return a 404 Not Found response indicating the parent Module does not exist.
7. WHEN an authenticated admin requests all Lessons for a given Module, THE Lesson_Service SHALL return an array of Lesson objects ordered by sort_order ascending, each including id, title, content_type, estimated_time_value, estimated_time_unit, sort_order, and module_id.
8. WHEN an authenticated admin requests a single Lesson by id, THE Lesson_Service SHALL return the full Lesson object including content_body or video_url and estimated time fields.
9. WHEN an authenticated admin submits a valid lesson update request, THE Lesson_Service SHALL persist the changes, update the updated_at timestamp, and return the updated Lesson object.
10. WHEN an authenticated admin submits a sort order update for Lessons within a Module, THE Lesson_Service SHALL reorder all affected Lessons and persist the new sort_order values.
11. WHEN an authenticated admin deletes a Lesson, THE Lesson_Service SHALL remove the Lesson record, reorder remaining Lessons in the Module to maintain contiguous sort_order values, and return a 200 OK response.
12. FOR ALL sort order updates within a Module, THE Lesson_Service SHALL maintain unique contiguous sort_order values starting from 1 for all Lessons in that Module (invariant property).
13. WHEN a non-admin user attempts any Lesson management operation, THE Auth_Middleware SHALL return a 403 Forbidden response.
14. THE Lesson management UI SHALL be accessible only within a Module context (not as a standalone top-level page disconnected from its parent Module and Segment).
15. WHEN the admin creates a lesson with estimated_time_value and estimated_time_unit ("minutes" or "hours"), THE Lesson_Service SHALL persist both fields.

### Requirement 5: User Management

**User Story:** As an admin, I want to create user accounts, view user lists, edit user details, deactivate users, and trigger password resets so that I can centrally manage platform access.

#### Acceptance Criteria

1. WHEN an authenticated admin submits a valid user creation request with name, email, and role (admin or learner), THE User_Management_Service SHALL create the account with a system-generated temporary password, hash the password, store the user record with status "active", and return the created user profile without the password hash.
2. WHEN an authenticated admin submits a user creation request with an email already in use, THE User_Management_Service SHALL return a 409 Conflict response indicating the email is already registered.
3. WHEN an authenticated admin submits a user creation request with missing required fields (name or email), THE Schema_Validator SHALL return a 400 Bad Request response with field-specific validation errors.
4. WHEN an authenticated admin submits a user creation request with an invalid email format, THE Schema_Validator SHALL return a 400 Bad Request response indicating the email format is invalid.
5. WHEN an authenticated admin requests the list of all users, THE User_Management_Service SHALL return a paginated array of user objects including id, name, email, role, status, and created_at, ordered by created_at descending.
6. WHEN an authenticated admin requests the user list with a search query, THE User_Management_Service SHALL filter results by partial match on name or email (case-insensitive).
7. WHEN an authenticated admin submits a valid user update request with name or role changes, THE User_Management_Service SHALL persist the changes, update the updated_at timestamp, and return the updated user profile.
8. WHEN an authenticated admin deactivates a user account, THE User_Management_Service SHALL set the user status to "deactivated" and update the updated_at timestamp.
9. WHEN an authenticated admin triggers a password reset for a user, THE User_Management_Service SHALL generate a new temporary password, hash and store it, and return a confirmation response (the temporary password is shown once to the admin).
10. WHEN a non-admin user attempts any user management operation, THE Auth_Middleware SHALL return a 403 Forbidden response.
11. THE User_Management_Service SHALL never return password hashes in any API response.

### Requirement 6: Segment User Assignment

**User Story:** As an admin, I want to assign users to Segments and remove assignments so that users only access learning content approved for them.

#### Acceptance Criteria

1. WHEN an authenticated admin assigns a user to a Segment by providing user_id and segment_id, THE Assignment_Service SHALL create an assignment record with assigned_at timestamp and return the assignment confirmation.
2. WHEN an authenticated admin attempts to assign a user to a Segment they are already assigned to, THE Assignment_Service SHALL return a 409 Conflict response indicating the assignment already exists.
3. WHEN an authenticated admin attempts to assign a user_id that does not exist, THE Assignment_Service SHALL return a 404 Not Found response indicating the user does not exist.
4. WHEN an authenticated admin attempts to assign a user to a segment_id that does not exist, THE Assignment_Service SHALL return a 404 Not Found response indicating the Segment does not exist.
5. WHEN an authenticated admin removes a user from a Segment, THE Assignment_Service SHALL delete the assignment record and return a 200 OK response.
6. WHEN an authenticated admin requests the list of users assigned to a specific Segment, THE Assignment_Service SHALL return an array of user objects (id, name, email, role, status) currently assigned to that Segment.
7. WHEN an authenticated admin requests the list of Segments assigned to a specific user, THE Assignment_Service SHALL return an array of Segment objects (id, title, status) assigned to that user.
8. WHEN a non-admin user attempts any assignment operation, THE Auth_Middleware SHALL return a 403 Forbidden response.
9. FOR ALL assignment operations, assigning a user then listing assigned users for that Segment SHALL include the assigned user in the result (round-trip property).
10. FOR ALL removal operations, removing a user assignment then listing assigned users for that Segment SHALL exclude the removed user from the result (round-trip property).

### Requirement 7: Content Hierarchy Integrity

**User Story:** As an admin, I want the system to enforce the Segment → Module → Lesson hierarchy so that content remains structurally valid.

#### Acceptance Criteria

1. THE Database SHALL enforce that every Module references a valid Segment via foreign key constraint.
2. THE Database SHALL enforce that every Lesson references a valid Module via foreign key constraint.
3. THE Database SHALL enforce that every Segment Assignment references both a valid User and a valid Segment via foreign key constraints.
4. WHEN a Segment is deleted, THE Database SHALL prevent deletion if Modules reference that Segment (restrict on delete).
5. WHEN a Module is deleted, THE Database SHALL prevent deletion if Lessons reference that Module (restrict on delete).
6. FOR ALL Modules within a single Segment, THE Module_Service SHALL enforce that no two Modules share the same sort_order value (uniqueness invariant).
7. FOR ALL Lessons within a single Module, THE Lesson_Service SHALL enforce that no two Lessons share the same sort_order value (uniqueness invariant).

### Requirement 8: Admin Content Management Frontend (Figma Flow)

**User Story:** As an admin, I want a responsive web interface that follows the Figma content management flow — Segment form on the left/main area, Module panel on the right, Lessons inside Module — so that I can create the full content hierarchy without leaving context.

#### Acceptance Criteria

1. THE Admin_Frontend SHALL provide a Segment list view displaying all Segments with title, status badge, Module count, duration, and action buttons (edit, manage modules, delete).
2. THE Admin_Frontend SHALL provide a Segment creation/edit form with fields for title, description, and duration (validated as positive integer), with client-side validation matching backend Zod schemas.
3. THE Admin_Frontend SHALL provide a Segment detail/content management screen that shows the segment info on the left/main area and allows managing Modules and Lessons in context.
4. THE Segment detail screen SHALL display a primary "Add Module" button with a left icon, matching the Figma styling.
5. WHEN the admin clicks "Add Module", a right-side panel/section SHALL appear with a module name/title input field and save/cancel actions.
6. AFTER a Module is created, the Module list SHALL display within the Segment detail context, showing module title, lesson count, sort order, and action buttons (edit, add lessons, reorder, delete).
7. THE Module panel/section SHALL include an "Add Lesson" button at the top with styling matching the Figma pattern.
8. BELOW the "Add Lesson" button, THE Module panel SHALL display a grey/empty lesson list area.
9. WHEN there are no Lessons in a Module, the empty state text SHALL read: "Saved lessons will appear here".
10. WHEN the admin clicks "Add Lesson", THE Admin_Frontend SHALL show lesson fields: title, lesson type selector (text/video), content input area (content_body for text or video_url for video), estimated time value, and estimated time unit selector (minutes/hours).
11. THE Lesson creation form SHALL support content upload/input area depending on lesson type. UI supports upload/content input now; storage/upload implementation must follow final backend decision.
12. THE Admin_Frontend SHALL provide a User list view with search functionality, displaying users with name, email, role badge, status badge, and action buttons (edit, reset password, deactivate).
13. THE Admin_Frontend SHALL provide a User creation form with fields for name, email, and role selector.
14. THE Admin_Frontend SHALL provide a Segment assignment interface showing assigned users with an option to add or remove users.
15. WHEN an API request fails, THE Admin_Frontend SHALL display a user-visible error message via toast notification without exposing technical details.
16. WHEN an API request is in progress, THE Admin_Frontend SHALL display a loading indicator.
17. WHEN a destructive action (delete, deactivate) is initiated, THE Admin_Frontend SHALL display a confirmation dialog before executing the action.
18. WHILE the viewport width is 1024px or greater, THE Admin_Frontend SHALL render management views in the desktop grid layout with sidebar navigation.
19. WHILE the viewport width is less than 1024px, THE Admin_Frontend SHALL render management views in a mobile-friendly stacked layout with collapsible navigation.
20. THE Admin_Frontend SHALL NOT create disconnected standalone "Modules" or "Lessons" pages. Modules are always managed within a Segment context. Lessons are always managed within a Module context.

### Requirement 9: Segment Status Transition Rules

**User Story:** As an admin, I want clear rules for Segment status changes so that content lifecycle is predictable and controlled.

#### Acceptance Criteria

1. WHEN a Segment is created, THE Segment_Service SHALL set the initial status to "draft".
2. WHEN an admin transitions a Segment from "draft" to "active", THE Segment_Service SHALL allow the transition and update the status.
3. WHEN an admin transitions a Segment from "active" to "archived", THE Segment_Service SHALL allow the transition and update the status.
4. WHEN an admin transitions a Segment from "draft" to "archived", THE Segment_Service SHALL allow the transition and update the status.
5. WHEN an admin attempts to transition a Segment from "archived" to "draft" or "active", THE Segment_Service SHALL return a 400 Bad Request response indicating archived Segments cannot change status.
6. FOR ALL valid status transitions, THE Segment_Service SHALL update the updated_at timestamp to the current time.
7. FOR ALL Segments, the status field SHALL contain exactly one of the values: "draft", "active", or "archived" (invariant property).

## Scope Guardrails

- This milestone covers admin dashboard, Segment/Module/Lesson CRUD (full admin content creation), user management (create, list, edit, deactivate, password reset), and segment assignment.
- Modules and Lessons are NOT placeholders. They are fully functional admin-managed entities in M2 with real CRUD, validation, and UI.
- The data created in M2 is directly used by M3 (learner lesson viewing) and M4 (quiz association to modules/lessons).
- Bulk user imports are excluded from this milestone.
- Role-based admin permissions (granular admin roles) are excluded from this milestone.
- User learning experience (dashboard, lesson viewing, progress tracking) belongs to Milestone 3.
- Quiz creation, quiz submission, quiz scoring, and quiz progress belong to Milestone 4 only. Do NOT implement any quiz features in M2.
- Learner-side lesson consumption/viewing/completion belongs to Milestone 3. Do NOT implement learner-facing content views in M2.
- Email notifications (weekly/monthly) belong to Milestone 5.
- Segment access duration enforcement belongs to Milestone 3 (learner-facing). The segment duration field in M2 is for admin metadata, not for access enforcement.
- SSO, MFA, analytics, certificates, and CRM integrations are out of scope for the MVP.
