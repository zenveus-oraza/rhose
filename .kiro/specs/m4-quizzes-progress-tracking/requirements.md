# Requirements Document

## Introduction

Milestone 4 implements basic multiple-choice quiz functionality and enhances progress tracking for the Rhose learning platform. Quizzes are non-blocking assessments that allow learners to test their understanding without gating progression. Admins create quiz questions with multiple options and a designated correct answer, and learners can take quizzes and view their results. Progress tracking is extended to include quiz attempt data alongside the existing lesson and module completion tracking from M3.

This milestone also fixes UI inconsistencies from M2/M3:
- The learner lesson page left panel must **replace the LearnerLayout sidebar** (not render alongside it)
- The admin dashboard Recent Activity must show **real user activity data** (not hardcoded placeholders)
- The admin Segment Details page must show quiz questions, assigned users with progress, and segment info card
- The admin dashboard Segment Overview must show date, user count, progress bars, and status badges matching the Figma

**IMPORTANT**: This milestone implements all requirements from M4 AND follows all governance rules documented in `.kiro/steering/governance-and-cross-cutting-concerns.md`.

Certificates, detailed scoring analytics, and email notifications are explicitly excluded.

## Design References (from actual screenshots)

- **VIDEO LESSONS screenshot**: Learner lesson view — left panel replaces the sidebar entirely. Shows: "< Back to Dashboard" link, segment title (teal), description with "See more...", Instructor block (avatar + name), Progress bar (percentage + "X/Y Steps"), Module accordion list (check/clock/lock icons). Main area: breadcrumb "Modules N • Module Title", "In Progress" badge (top-right), video/content player, "Mark as Complete" button below.
- **DASHBOARD SCREEN screenshot**: Admin dashboard — Quick Actions (Assign Segment filled navy, Create User outline, Add New Segment outline), Stats cards (Total Users, Active Segment with "2 Ending Soon" sub-badge, Total Modules, Total Lessons), Segment Overview (rows with calendar date, user icon + count, status badges like Ending Soon/Expired/On Track, progress bars), Recent Activity (real user data with avatars, names, actions like "Passed the quiz", "Failed the quiz", "Resumed Lesson", "Assigned Sterilization Protocol", scores "Score: 8/10", timestamps).
- **CONTENT MANAGEMENT screenshot**: Segment list with rows showing duration (4 Weeks), module count, user count, status badge, created date, action menu (Edit, Reset Password, Archive Segment).
- **CREATE SEGMENT / PREVIEW screenshot**: 4-step wizard (Segment Info → Add Modules → Add Lesson → Preview). Preview shows Segment Info, Modules list, Quiz section with "Q 1:" numbered questions, and bottom actions (Back, Save as Draft, Publish). Quiz question creation uses side-panel/drawer with question text + checkbox options.
- **SEGMENT DETAILS screenshot**: Shows Segment Info (name, duration, description), Modules section (list with lesson counts + edit icon), Quiz section (numbered questions + edit icon), Assigned Users section (user list with name, job title, progress percentage + bar), Segment Info card (Created date, Users Assigned count, Completion Rate percentage), and "Unpublish" button at bottom-right.
- **USER MANAGEMENT screenshot**: Table with Name, Role (job title), Assigned Segment, Progress (% + bar), Status (badge + last activity time), action menu.
- **MOBILE VIEW screenshot**: Auth, learner dashboard, lesson views, profile with tabs.

## Glossary

- **Quiz**: A set of multiple-choice questions associated with a segment (shown as a dedicated section within the segment). Non-blocking assessment.
- **Quiz_Question**: An individual multiple-choice question within a quiz, containing question text and a set of answer options.
- **Quiz_Option**: A single answer choice for a quiz question, with text content and a flag indicating whether it is correct.
- **Single_Select_Question**: A quiz question where exactly one option is correct; the learner selects one answer.
- **Multi_Select_Question**: A quiz question where multiple options are correct; the learner must select all correct options.
- **Quiz_Attempt**: A record of a learner's submission of answers to all questions in a quiz.
- **Quiz_Service**: Backend service for quiz retrieval, attempt recording, and score calculation.
- **Quiz_Admin_Service**: Backend service for admin quiz CRUD operations.
- **Progress_Service**: Backend service for tracking lesson completion, module progress, and quiz data.
- **Recent_Activity_Service**: Backend service for tracking and returning real user activity events for the admin dashboard.
- **LessonPage_Layout**: On the learner lesson page, the left panel (segment info, progress, module accordion) completely replaces the normal LearnerLayout sidebar navigation.

## Requirements

### Requirement 1: Quiz Data Model

**User Story:** As a developer, I want Drizzle ORM schema definitions for quizzes, questions, options, and attempts so that quiz functionality has a stable data layer.

#### Acceptance Criteria

1. THE Quiz_Schema SHALL define columns for id (UUID), title (text, required), description (text, optional), segment_id (foreign key referencing Segment, required), created_at, updated_at.
2. THE Quiz_Question_Schema SHALL define columns for id (UUID), quiz_id (FK → Quiz), question_text (text, required), question_type (enum: single_select, multi_select, default single_select), sort_order (integer, required), created_at, updated_at.
3. THE Quiz_Option_Schema SHALL define columns for id (UUID), question_id (FK → Quiz_Question), option_text (text, required), is_correct (boolean, default false), sort_order (integer, required).
4. THE Quiz_Attempt_Schema SHALL define columns for id (UUID), quiz_id (FK → Quiz), user_id (FK → User), score (integer), total_questions (integer), completed_at (timestamp).
5. THE Quiz_Attempt_Answer_Schema SHALL define columns for id (UUID), attempt_id (FK → Quiz_Attempt), question_id (FK → Quiz_Question), selected_option_id (FK → Quiz_Option). Multi_select questions have multiple rows per (attempt_id, question_id).
6. THE Database SHALL enforce that Quiz references a valid Segment via foreign key.
7. THE Database SHALL enforce unique sort_order within quiz (quiz_id, sort_order) for questions and (question_id, sort_order) for options.
8. FOR single_select questions, there SHALL be exactly one Quiz_Option with is_correct=true.
9. FOR multi_select questions, there SHALL be at least two Quiz_Options with is_correct=true.
10. WHEN a Drizzle migration is run, THE Migration SHALL create all quiz tables without errors.

### Requirement 2: Admin Quiz Creation (within Segment)

**User Story:** As an admin, I want to create quiz questions within a segment so that learners can be assessed on segment content.

#### Acceptance Criteria

1. WHEN an admin creates/edits a segment, THE Create Segment Wizard SHALL include quiz question creation as part of the flow (side-panel/drawer with "Add Questions").
2. THE Admin SHALL be able to add questions with question text and multiple options (checkboxes in the drawer UI per the screenshot).
3. THE quiz questions SHALL be associated with the segment (segment_id), not individual lessons/modules.
4. WHEN viewing the segment Preview step, THE quiz section SHALL show numbered questions ("Q 1:", "Q 2:", etc.) matching the screenshot.
5. THE Admin SHALL be able to edit quiz questions from the Segment Details page (edit icon on the Quiz section).
6. WHEN less than one question is provided, THE system SHALL return a 400 error.
7. WHEN fewer than two options are provided per question, THE system SHALL return a 400 error.
8. WHEN no correct option is marked for a single_select question, THE system SHALL return a 400 error.
9. WHEN a non-admin user attempts quiz management, THE system SHALL return 403.

### Requirement 3: Admin Quiz Update and Deletion

**User Story:** As an admin, I want to update and delete quiz questions so that assessments stay accurate.

#### Acceptance Criteria

1. WHEN an admin edits the quiz section, THE system SHALL allow adding/removing/modifying questions and options.
2. WHEN an admin deletes a quiz, THE system SHALL cascade delete questions, options, and attempts.
3. WHEN updating quiz questions, sort_order values SHALL remain unique.
4. THE Segment Details page SHALL show the Quiz section with numbered questions and an edit icon (pencil) matching the screenshot.

### Requirement 4: Learner Quiz Taking

**User Story:** As a learner, I want to take quizzes in my assigned segments so that I can test my understanding.

#### Acceptance Criteria

1. WHEN a learner with valid segment access requests a quiz, THE system SHALL return questions with options (excluding is_correct).
2. WHEN a learner submits answers, THE system SHALL calculate the score and record a Quiz_Attempt.
3. FOR single_select: correct if selected option has is_correct=true.
4. FOR multi_select: correct only if selected options exactly match all correct options.
5. Unanswered questions SHALL be treated as incorrect.
6. THE system SHALL allow multiple attempts per quiz.
7. THE system SHALL never expose is_correct to learners.
8. WHEN a learner lacks segment access, THE system SHALL return 403.
9. WHEN a quiz does not exist, THE system SHALL return 404.

### Requirement 5: Quiz Results Display

**User Story:** As a learner, I want to see my quiz results after submission.

#### Acceptance Criteria

1. AFTER submission, THE system SHALL return score, total_questions, percentage, and per-question breakdown.
2. THE system SHALL show which answers were correct/incorrect.
3. Attempt history SHALL be ordered by completed_at descending.
4. Percentage SHALL be Math.round((score / total_questions) * 100).

### Requirement 6: Non-Blocking Quiz Flow

**User Story:** As a platform operator, quizzes must never block learner progression.

#### Acceptance Criteria

1. THE system SHALL NOT require quiz completion for lesson/module progression.
2. Lesson completion SHALL succeed without quiz attempt.
3. Module progression SHALL not consider quiz scores.
4. THE Quiz UI SHALL indicate quizzes are optional.
5. Learners SHALL be able to skip quizzes entirely.

### Requirement 7: Enhanced Progress Tracking with Quiz Data

**User Story:** As a learner, I want my progress to include quiz information.

#### Acceptance Criteria

1. Segment progress SHALL include quiz summary (quizzes attempted vs total).
2. Module progress SHALL include quiz best scores when available.
3. Module completion SHALL depend ONLY on lesson completions (not quiz data).
4. Progress calculations SHALL be consistent and bounded (attempted ≤ total).

### Requirement 8: Learner Lesson Page Layout Fix

**User Story:** As a learner, when I view a lesson, the left navigation panel should replace the sidebar completely (matching the VIDEO LESSONS screenshot).

#### Acceptance Criteria

1. WHEN a learner navigates to a lesson page, THE LearnerLayout sidebar (Dashboard, My Learning, Profile, Logout links) SHALL be completely hidden/replaced by the lesson navigation panel.
2. THE lesson navigation panel SHALL contain: "< Back to Dashboard" link, segment title (teal color), description (with "See more..." truncation), Instructor block (avatar + name), Progress indicator (percentage + "X/Y Steps" with progress bar), Module accordion list with status icons (green check = completed, clock = in-progress, lock = locked).
3. ON MOBILE, THE lesson page SHALL not show the lesson sidebar; instead use the hamburger menu for the module drawer (existing mobile pattern).
4. WHEN a learner navigates away from the lesson page back to Dashboard/My Learning/Profile, THE normal LearnerLayout sidebar SHALL reappear.
5. THE main content area SHALL show: breadcrumb "Modules N • Module Title", status badge (top-right corner, "In Progress"/"Completed"), content player (video/slides/text), and "Mark as Complete" button below content.

### Requirement 9: Admin Dashboard Recent Activity (Real Data)

**User Story:** As an admin, I want the Recent Activity section to show real user actions (not hardcoded placeholders).

#### Acceptance Criteria

1. THE Recent_Activity_Service SHALL track and return real user events: quiz pass/fail (with score), lesson completions, lesson resumptions, segment assignments, user creations.
2. EACH activity item SHALL include: user avatar (with lazy loading), user name (abbreviated like "Amaka O."), action description, related content detail (module/quiz name), score when applicable ("Score: 8/10"), and relative timestamp ("5m ago", "1hr ago", "Yesterday").
3. THE admin dashboard Recent Activity panel SHALL have a "Filter" dropdown (All + filter by type).
4. THE activity list SHALL be paginated or scrollable (max ~6 visible items).
5. THE activity data SHALL come from a backend endpoint (not frontend hardcoded data).

### Requirement 10: Admin Dashboard Segment Overview Enhancement

**User Story:** As an admin, I want the Segment Overview to show rich metadata matching the design.

#### Acceptance Criteria

1. EACH segment row SHALL show: segment name, calendar date (e.g., "Jan 20"), user icon + assigned user count, status badge (Ending Soon/Expired/On Track), and progress bar.
2. THE Active Segment stats card SHALL show the count plus a sub-badge indicating warnings (e.g., "2 Ending Soon").
3. THE Segment Overview SHALL have a filter dropdown and filter icon.
4. THE bottom of the Segment Overview SHALL have a "View All Segment" link.

### Requirement 11: Admin Segment Details Page (Quiz Section & Assigned Users)

**User Story:** As an admin, I want the Segment Details page to show quiz questions and assigned users with progress.

#### Acceptance Criteria

1. THE Segment Details page SHALL show sections: Segment Info (name, duration, description), Modules (list with lesson counts + edit icon), Quiz (numbered questions + edit icon), Assigned Users (user list with progress), and Segment Info card (Created date, Users Assigned, Completion Rate).
2. THE Assigned Users section SHALL show each user's name, job title, and progress percentage with colored progress bar.
3. THE Assigned Users section SHALL have an "Add/Remove User" button.
4. THE Segment Info card (right side or below) SHALL show Created date, Users Assigned count, and Completion Rate percentage.
5. THE page SHALL have an "Unpublish" button at the bottom-right (red/coral for active segments) or "Publish" for draft segments.

### Requirement 12: Learner Quiz Frontend Experience

**User Story:** As a learner, I want a responsive quiz interface to take quizzes.

#### Acceptance Criteria

1. THE Quiz_View SHALL render single_select with radio buttons and multi_select with checkboxes.
2. THE Quiz_View SHALL show question type indicator ("Select one answer" / "Select all correct answers").
3. ON submit, THE Quiz_View SHALL display results inline (score, percentage, per-question feedback).
4. THE Quiz_View SHALL show a "Skip Quiz" option.
5. THE Quiz_View SHALL display previous best score with retake option.
6. THE Quiz_View SHALL handle loading state and prevent duplicate submissions.
7. THE Quiz_View SHALL be responsive (card layout ≥1024px, stacked <1024px).

### Requirement 13: Admin Content Management List Enhancement

**User Story:** As an admin, the content management segment list should show richer metadata.

#### Acceptance Criteria

1. EACH segment row SHALL show: segment name, duration (e.g., "4 Weeks"), module count icon + number, user count icon + number, status badge (Draft/Active), created date, and action menu (three dots).
2. THE action menu SHALL include: Edit, Reset Password (if applicable), Archive Segment (in danger/red text).
3. THE page header SHALL have a search bar and "Create New Segment" button (navy filled).

## Scope Guardrails

- Quizzes are per-segment (not per-lesson/module) based on the screenshots.
- Certificates are excluded.
- Detailed scoring analytics (percentile, trends) are excluded.
- Email notifications belong to M5.
- Quiz results do not affect progression.
- Self-registration, SSO, MFA, CRM, bulk imports are out of scope.

## Cross-Cutting Concerns

Per `.kiro/steering/governance-and-cross-cutting-concerns.md`:
- Database schema changes cascade through stack
- Pagination for all admin lists (quizzes, users, segments)
- Profile pictures with lazy loading
- Role vs. job title distinction
- Admin editing capabilities
