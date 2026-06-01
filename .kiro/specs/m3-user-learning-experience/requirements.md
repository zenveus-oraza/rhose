# Requirements Document

## Introduction

Milestone 3 delivers the structured learning experience for end users of the Rhose platform. This includes the learner dashboard displaying assigned segments, lesson views supporting text content and embedded video links, lesson completion confirmation flow, sequential lesson progression enforcement, and segment-based access control with duration handling. This builds on M1 (authentication, data models, layout shell) and M2 (admin content management, user management, segment assignments). Offline access and downloadable lesson content are explicitly excluded.

## Design References

- Learner Dashboard and Lesson Views: `.kiro/context/screenshots/LESSON_VIDEO_and_TEXTSLIDE.png`
- Segment Content Accordion: `.kiro/context/screenshots/COMPONENTS.png`
- Mobile Learner Views: `.kiro/context/screenshots/MOBILE_VIEW.png`
- Textual interpretation: `.kiro/context/screenshot-catalog.md`

Screenshots guide UI layout and component behavior. They do not add features outside the SOW.

## Glossary

- **Learner_Dashboard**: The authenticated learner landing page displaying the user's assigned segments with progress indicators and access status.
- **Segment_Access_Service**: The backend service responsible for verifying a learner's assignment to a segment and enforcing access duration expiry.
- **Progress_Service**: The backend service responsible for tracking and querying lesson completion state for a user.
- **Lesson_View**: The frontend component that renders lesson content (text or embedded video) to the learner.
- **Completion_Service**: The backend service responsible for recording lesson completion confirmations and determining progression eligibility.
- **Navigation_Service**: The backend service responsible for determining which lesson a user should access next based on their progress within a module.
- **Segment**: A top-level learning programme container with statuses: draft, active, archived.
- **Module**: A grouping of Lessons within a Segment, ordered by sort_order.
- **Lesson**: An individual learning unit within a Module containing text content or an external video URL, ordered by sort_order.
- **Assignment**: A record linking a User to a Segment with an assigned_at timestamp and access_duration_days value.
- **Access_Duration**: The number of days from assignment date during which a learner may access a segment's content.
- **Lesson_Completion**: A record indicating a specific user has confirmed completion of a specific lesson, with a completed_at timestamp.
- **Auth_Middleware**: The middleware that verifies JWT tokens and enforces role-based access on protected endpoints.
- **Schema_Validator**: The Zod-based validation layer that validates all API request payloads.

## Requirements

### Requirement 1: Learner Dashboard

**User Story:** As a learner, I want to see my assigned segments on a dashboard so that I can start or continue my learning programmes.

#### Acceptance Criteria

1. WHEN an authenticated learner navigates to the dashboard, THE Learner_Dashboard SHALL display a list of all segments assigned to that learner, each showing the segment title, segment description, overall progress percentage, and access status (active or expired).
2. WHEN an authenticated learner has no segment assignments, THE Learner_Dashboard SHALL display an empty state message indicating no programmes are currently assigned.
3. WHEN a segment assignment has an access_duration_days value and the current date exceeds assigned_at plus access_duration_days, THE Learner_Dashboard SHALL display that segment with an "expired" access status and disable navigation into the segment.
4. WHEN a segment assignment is within its access duration period, THE Learner_Dashboard SHALL display that segment with an "active" access status and enable navigation into the segment.
5. THE Learner_Dashboard SHALL calculate and display progress percentage as the count of completed lessons divided by the total lesson count within that segment, rounded to the nearest whole number.
6. WHEN an authenticated learner selects an active segment from the dashboard, THE Learner_Dashboard SHALL navigate the learner to the segment detail view showing modules and lessons.
7. WHEN an unauthenticated user attempts to access the dashboard route, THE Auth_Middleware SHALL return a 401 Unauthorized response.
8. THE Learner_Dashboard SHALL order assigned segments by assigned_at descending (most recently assigned first).

### Requirement 2: Segment Access Control

**User Story:** As a platform operator, I want segment access enforced by assignment and duration so that users only access content approved for them within the allowed timeframe.

#### Acceptance Criteria

1. WHEN an authenticated learner requests content from a segment they are assigned to and the assignment is within its access duration, THE Segment_Access_Service SHALL grant access and return the requested content.
2. WHEN an authenticated learner requests content from a segment they are not assigned to, THE Segment_Access_Service SHALL return a 403 Forbidden response with error code "ACCESS_DENIED".
3. WHEN an authenticated learner requests content from a segment where their assignment access duration has expired, THE Segment_Access_Service SHALL return a 403 Forbidden response with error code "ACCESS_EXPIRED".
4. WHEN an authenticated learner requests content from a segment with status "draft" or "archived", THE Segment_Access_Service SHALL return a 403 Forbidden response with error code "SEGMENT_UNAVAILABLE".
5. THE Segment_Access_Service SHALL compute access expiry as assigned_at plus access_duration_days expressed in calendar days (using UTC date comparison).
6. WHEN an assignment record has access_duration_days set to null, THE Segment_Access_Service SHALL treat the assignment as having no expiry (unlimited access).
7. FOR ALL segment content requests, THE Segment_Access_Service SHALL verify both assignment existence and duration validity before returning any content (invariant property).
8. WHEN a non-learner user (admin) accesses learner content endpoints, THE Auth_Middleware SHALL return a 403 Forbidden response.

### Requirement 3: Segment Detail and Module Navigation

**User Story:** As a learner, I want to see the modules and lessons within an assigned segment so that I can understand the programme structure and track my progress.

#### Acceptance Criteria

1. WHEN an authenticated learner with valid segment access requests the segment detail, THE Navigation_Service SHALL return the segment title, description, and an ordered list of modules each containing module title, lesson count, and completed lesson count for that user.
2. WHEN an authenticated learner views the segment detail, THE Learner_Dashboard SHALL display modules in sort_order ascending, with each module showing a progress indicator (completed lessons out of total lessons).
3. WHEN all lessons within a module are completed by the learner, THE Learner_Dashboard SHALL display that module with a "completed" visual indicator.
4. WHEN a learner selects a module from the segment detail view, THE Learner_Dashboard SHALL navigate to the module view showing the ordered list of lessons with their completion status.
5. THE Navigation_Service SHALL return each lesson's completion status (completed or not completed) for the requesting user within the module context.

### Requirement 4: Lesson View - Text Content

**User Story:** As a learner, I want to view text-based lessons so that I can read and learn from written content.

#### Acceptance Criteria

1. WHEN an authenticated learner with valid segment access requests a text lesson, THE Lesson_View SHALL render the lesson title and the full content_body as formatted text.
2. WHEN an authenticated learner requests a text lesson that belongs to a module within their assigned segment, THE Lesson_View SHALL display the lesson content without truncation.
3. WHEN an authenticated learner requests a lesson from a segment they do not have valid access to, THE Segment_Access_Service SHALL return a 403 Forbidden response.
4. THE Lesson_View SHALL display a "Mark as Complete" action button below the text content when the lesson has not been completed by the learner.
5. WHEN the lesson has already been completed by the learner, THE Lesson_View SHALL display a "Completed" indicator instead of the completion button.
6. THE Lesson_View SHALL display navigation context showing the current module title and lesson position (e.g., "Lesson 3 of 7").

### Requirement 5: Lesson View - Video Content

**User Story:** As a learner, I want to view video-based lessons with embedded video players so that I can watch instructional content.

#### Acceptance Criteria

1. WHEN an authenticated learner with valid segment access requests a video lesson, THE Lesson_View SHALL render the lesson title and an embedded video player using the stored video_url.
2. THE Lesson_View SHALL embed video content using an iframe element with the video_url as the source, supporting YouTube and Vimeo URL formats.
3. THE Lesson_View SHALL render the embedded video player with a 16:9 aspect ratio that scales responsively to the container width.
4. WHEN the video_url is not a supported embed format, THE Lesson_View SHALL display the video_url as a clickable external link that opens in a new browser tab.
5. THE Lesson_View SHALL display a "Mark as Complete" action button below the video player when the lesson has not been completed by the learner.
6. WHEN the lesson has already been completed by the learner, THE Lesson_View SHALL display a "Completed" indicator instead of the completion button.

### Requirement 6: Lesson Completion Confirmation

**User Story:** As a learner, I want to confirm that I have completed a lesson so that my progress is recorded and I can advance to the next lesson.

#### Acceptance Criteria

1. WHEN an authenticated learner submits a completion confirmation for a lesson they have not previously completed, THE Completion_Service SHALL create a Lesson_Completion record with the user_id, lesson_id, and completed_at timestamp, and return a success response.
2. WHEN an authenticated learner submits a completion confirmation for a lesson they have already completed, THE Completion_Service SHALL return a 200 OK response without creating a duplicate record (idempotent operation).
3. WHEN an authenticated learner submits a completion confirmation for a lesson in a segment they do not have valid access to, THE Segment_Access_Service SHALL return a 403 Forbidden response.
4. WHEN an authenticated learner submits a completion confirmation for a lesson that does not exist, THE Completion_Service SHALL return a 404 Not Found response.
5. WHEN a lesson completion is recorded successfully, THE Completion_Service SHALL return the updated progress state including the next available lesson_id within the module (or null if the module is complete).
6. FOR ALL lesson completion operations, completing a lesson then querying that lesson's status for the same user SHALL return "completed" (round-trip property).
7. FOR ALL lesson completion operations, completing the same lesson multiple times SHALL produce the same single completion record (idempotence property).

### Requirement 7: Sequential Lesson Progression

**User Story:** As a platform operator, I want learners to complete lessons in order within a module so that the structured learning flow is maintained.

#### Acceptance Criteria

1. WHEN an authenticated learner requests a lesson that is the first lesson (sort_order 1) in a module, THE Navigation_Service SHALL grant access regardless of other lesson completion states within that module.
2. WHEN an authenticated learner requests a lesson with sort_order N (where N > 1), THE Navigation_Service SHALL grant access only if the lesson with sort_order N-1 in the same module has been completed by that learner.
3. WHEN an authenticated learner requests a lesson whose prerequisite lesson has not been completed, THE Navigation_Service SHALL return a 403 Forbidden response with error code "LESSON_LOCKED" and include the id of the prerequisite lesson that must be completed first.
4. WHEN an authenticated learner completes the last lesson in a module, THE Navigation_Service SHALL indicate that the next module's first lesson is now accessible (cross-module progression).
5. WHEN an authenticated learner has completed all lessons in all modules of a segment, THE Navigation_Service SHALL indicate segment completion status.
6. FOR ALL lessons within a module, a learner SHALL only access lesson at position N if all lessons at positions 1 through N-1 are completed (sequential invariant property).
7. THE Navigation_Service SHALL determine the learner's "current lesson" as the first incomplete lesson in sort_order within the first incomplete module in sort_order.

### Requirement 8: Progress Tracking

**User Story:** As a learner, I want to see my progress through segments and modules so that I know how much I have completed and what remains.

#### Acceptance Criteria

1. WHEN an authenticated learner requests their progress for a segment, THE Progress_Service SHALL return the total lesson count, completed lesson count, and progress percentage for that segment.
2. WHEN an authenticated learner requests their progress for a module, THE Progress_Service SHALL return the total lesson count, completed lesson count, and completion status (complete or in-progress) for that module.
3. THE Progress_Service SHALL calculate segment progress percentage as (completed_lessons / total_lessons) * 100, rounded to the nearest whole number.
4. WHEN a segment has zero lessons, THE Progress_Service SHALL return 0 as the progress percentage.
5. FOR ALL progress calculations, the completed lesson count SHALL be less than or equal to the total lesson count (invariant property).
6. FOR ALL progress calculations, completing a lesson then querying progress SHALL show the completed count incremented by exactly one compared to the prior state (metamorphic property).

### Requirement 9: Learner Frontend Experience

**User Story:** As a learner, I want a responsive web interface for accessing my learning content so that I can learn from any device.

#### Acceptance Criteria

1. WHILE the viewport width is 1024px or greater, THE Learner_Dashboard SHALL render the segment list in a card grid layout with sidebar navigation.
2. WHILE the viewport width is less than 1024px, THE Learner_Dashboard SHALL render the segment list in a single-column stacked layout with collapsible navigation.
3. WHILE the viewport width is less than 1024px, THE Lesson_View SHALL render text content and video embeds at full container width with appropriate padding.
4. WHEN an API request is in progress, THE Learner_Frontend SHALL display a loading indicator.
5. WHEN an API request fails, THE Learner_Frontend SHALL display a user-visible error message without exposing technical details.
6. WHEN a learner navigates between lessons within a module, THE Learner_Frontend SHALL provide "Previous" and "Next" navigation buttons, with "Next" disabled when the next lesson is locked.
7. THE Learner_Frontend SHALL display a progress bar at the module level showing completed lessons out of total lessons.
8. THE Learner_Frontend SHALL display the learner's name and a profile link in the navigation header.
9. WHEN a learner clicks the "Mark as Complete" button, THE Learner_Frontend SHALL display a confirmation prompt before submitting the completion request.
10. WHEN a lesson is successfully marked as complete, THE Learner_Frontend SHALL update the UI to show the completed state and enable navigation to the next lesson without requiring a full page reload.

### Requirement 10: Assignment Duration Data Model Extension

**User Story:** As a developer, I want the segment assignment data model to support access duration so that the platform can enforce time-limited segment access.

#### Acceptance Criteria

1. THE Assignment_Schema SHALL include an access_duration_days column (integer, nullable) representing the number of days the learner may access the segment from the assignment date.
2. THE Assignment_Schema SHALL include the existing assigned_at column (timestamp) representing when the assignment was created.
3. WHEN access_duration_days is null, THE Segment_Access_Service SHALL interpret the assignment as having no expiry date.
4. WHEN access_duration_days is a positive integer, THE Segment_Access_Service SHALL compute the expiry date as assigned_at date plus access_duration_days calendar days.
5. THE Lesson_Completion_Schema SHALL define columns for id (UUID primary key), user_id (foreign key referencing User), lesson_id (foreign key referencing Lesson), and completed_at (timestamp).
6. THE Database SHALL enforce that the combination of user_id and lesson_id in Lesson_Completion is unique (no duplicate completions).
7. THE Database SHALL enforce that Lesson_Completion references a valid User via foreign key constraint.
8. THE Database SHALL enforce that Lesson_Completion references a valid Lesson via foreign key constraint.
9. FOR ALL Lesson_Completion records, the user_id and lesson_id pair SHALL be unique (uniqueness invariant).

## Scope Guardrails

- This milestone covers learner dashboard, segment access control with duration, lesson viewing (text and video), lesson completion confirmation, sequential progression, and progress tracking only.
- Quizzes and quiz-related progression belong to Milestone 4.
- Email notifications (weekly/monthly) belong to Milestone 5.
- Offline access is excluded from the MVP.
- Downloadable lesson content is excluded from the MVP.
- Admin management of access_duration_days on assignments is an M2 admin concern (the admin sets duration when assigning); M3 only enforces the duration on the learner side.
- SSO, MFA, analytics, certificates, and CRM integrations are out of scope for the MVP.
