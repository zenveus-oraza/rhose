# Implementation Plan: M4 Quizzes & Progress Tracking

## Overview

This implementation plan covers M4 features plus critical UI fixes from M2/M3 that were incomplete or inconsistent with the Figma screenshots. Tasks are organized to deliver:

1. Quiz data model and backend (per-segment quizzes)
2. Admin quiz CRUD integrated into segment wizard and details page
3. Learner quiz-taking with non-blocking flow
4. **FIX: Learner lesson page layout** — left panel replaces sidebar (not alongside it)
5. **FIX: Admin dashboard Real Activity** — backend service + real data display
6. **FIX: Admin Segment Details page** — quiz section, assigned users with progress, segment info card, publish/unpublish
7. **FIX: Admin Dashboard Segment Overview** — rich metadata (date, user count, progress bars, status badges)
8. **FIX: Content Management list** — richer row metadata (duration, modules, users)
9. Progress tracking extensions with quiz data

## Tasks

- [x] 1. Fix: Learner Lesson Page Layout (left panel replaces sidebar)
  - [x] 1.1 Create a `LessonLayout` component that renders NO sidebar navigation
    - Create `frontend/src/components/layout/LessonLayout.tsx`
    - This layout has NO desktop sidebar (no Dashboard/My Learning/Profile/Logout links)
    - Only renders: mobile header with hamburger icon (for mobile module drawer), and an `<Outlet />` for the page content
    - The LessonPage itself will render its own full left panel
    - _Requirements: 8.1, 8.3, 8.4_

  - [x] 1.2 Move LessonPage route to use `LessonLayout` instead of `LearnerLayout`
    - Update the router config so `/learner/segments/:segmentId/modules/:moduleId/lessons/:lessonId` uses `LessonLayout`
    - All other learner routes (`/learner`, `/learner/learning`, `/learner/profile`) remain under `LearnerLayout`
    - _Requirements: 8.1, 8.4_

  - [x] 1.3 Update LessonPage left panel to match the VIDEO LESSONS screenshot exactly
    - The left panel spans the full height and is part of the page (not LearnerLayout)
    - Content (top to bottom):
      - "< Back to Dashboard" link (text with left arrow, navigates to /learner)
      - Segment title in **teal color, bold** (e.g., "Sterilization Protocol")
      - Segment description (regular text, truncated with "See more..." link that expands)
      - Instructor block: circular avatar + "Instructor" label + name below
      - Horizontal divider
      - Progress section: "Progress" label on left, percentage on right (teal), progress bar below, "X/Y Steps" below the bar
      - Module accordion list:
        - Each module shows: chevron (▼/▶), "MODULES N:" prefix (bold), module title (truncated), status icon on right
        - Status icons: green checkmark (completed), clock/timer (in-progress), lock (locked)
        - Clicking an accessible module expands to show lesson list inside
        - Locked modules are dimmed/non-clickable
    - The left panel width should be ~250-280px (matching screenshot proportions)
    - Background: white with right border
    - _Requirements: 8.2, 8.5_

  - [x] 1.4 Verify LessonPage main content area matches screenshot
    - Top-left: breadcrumb text "Modules N • Module Title" (muted text)
    - Top-right: Status badge ("In Progress" in cyan, "Completed" in green)
    - Content area: video player / slides viewer / text content (full width of main area)
    - Below content: "Mark as Complete" button (coral/salmon background, white text, rounded)
    - Ensure proper spacing and proportions
    - _Requirements: 8.5_

- [x] 2. Quiz data model and database schema
  - [x] 2.1 Create quiz tables using Drizzle ORM
    - `quizzes` table: id, title, description, segment_id (FK, UNIQUE), created_at, updated_at
    - `quiz_questions` table: id, quiz_id (FK CASCADE), question_text, question_type (enum), sort_order, created_at, updated_at
    - `quiz_options` table: id, question_id (FK CASCADE), option_text, is_correct, sort_order
    - `quiz_attempts` table: id, quiz_id (FK CASCADE), user_id (FK CASCADE), score, total_questions, completed_at
    - `quiz_attempt_answers` table: id, attempt_id (FK CASCADE), question_id (FK), selected_option_id (FK)
    - UNIQUE constraint on (quiz_id, sort_order) for questions
    - UNIQUE constraint on (question_id, sort_order) for options
    - UNIQUE constraint on segment_id in quizzes (one quiz per segment)
    - _Requirements: 1.1–1.10_

  - [x] 2.2 Create activity_events table
    - `activity_events` table: id, user_id (FK), action (varchar), description (text), detail (text nullable), metadata (jsonb nullable), created_at
    - Index on created_at DESC for efficient recent queries
    - Index on user_id for user-specific queries
    - _Requirements: 9.5_

  - [x] 2.3 Generate and run Drizzle migration
    - Verify all tables create correctly with constraints
    - _Requirements: 1.10_

- [x] 3. Implement admin quiz CRUD backend
  - [x] 3.1 Create Zod validation schemas for quiz operations
    - `createQuizSchema`: title (optional, defaults to "Segment Quiz"), questions array (min 1)
    - Each question: question_text (required), question_type (single_select/multi_select), options array (min 2)
    - Each option: option_text (required), is_correct (boolean)
    - Validate: single_select has exactly 1 correct, multi_select has ≥2 correct
    - _Requirements: 2.6, 2.7, 2.8_

  - [x] 3.2 Implement QuizAdminService
    - `createOrUpdateQuiz(segmentId, data)`: Create quiz with questions/options in transaction. If quiz exists for segment, update it.
    - `getQuizForSegment(segmentId)`: Return quiz with all questions and options (including is_correct for admin view)
    - `deleteQuiz(segmentId)`: Delete quiz cascading to questions, options, attempts
    - Validate segment exists (404 if not)
    - Validate role (403 for non-admin)
    - _Requirements: 2.1–2.9, 3.1–3.4_

  - [x] 3.3 Create admin quiz routes
    - POST `/api/admin/segments/:segmentId/quiz` — create/update quiz
    - GET `/api/admin/segments/:segmentId/quiz` — get quiz for segment
    - DELETE `/api/admin/segments/:segmentId/quiz` — delete quiz
    - All require admin auth middleware
    - _Requirements: 2.9_

- [x] 4. Implement Activity Service backend
  - [x] 4.1 Implement ActivityService
    - `trackEvent(event)`: Insert into activity_events table
    - `getRecentActivity(options)`: Query recent events with user join (name, profile image), limit, optional filter by action type
    - Returns: id, userName (abbreviated like "Amaka O."), userAvatar, action, description, detail, score (from metadata), relative timestamp
    - _Requirements: 9.1, 9.2_

  - [x] 4.2 Create activity routes
    - GET `/api/admin/activity?limit=10&filter=all` — recent activity for dashboard
    - Requires admin auth
    - _Requirements: 9.3, 9.4_

  - [x] 4.3 Integrate activity tracking into existing services
    - On lesson completion: track "lesson_completed" event
    - On segment assignment: track "segment_assigned" event
    - On user creation: track "user_created" event
    - On quiz submission: track "quiz_passed" or "quiz_failed" event (with score in metadata)
    - _Requirements: 9.1_

- [x] 5. Implement learner quiz-taking backend
  - [x] 5.1 Implement QuizService (learner)
    - `getQuizForLearner(segmentId, userId)`: Return quiz questions with options, **excluding is_correct**. Verify segment access.
    - `submitAttempt(segmentId, userId, answers)`: Calculate score, store attempt + answers, track activity event
    - Score calculation: single_select correct if option is_correct=true, multi_select correct if exact match of all correct options
    - Unanswered = incorrect
    - Allow multiple attempts
    - _Requirements: 4.1–4.9_

  - [x] 5.2 Implement attempt history and detail
    - `getAttemptHistory(segmentId, userId)`: Return attempts ordered by completed_at DESC
    - `getAttemptDetail(attemptId, userId)`: Return attempt with per-question breakdown (learner's selection + correct answer)
    - Percentage = Math.round((score / total_questions) * 100)
    - _Requirements: 5.1–5.4_

  - [x] 5.3 Create learner quiz routes
    - GET `/api/learner/segments/:segmentId/quiz` — get quiz for taking
    - POST `/api/learner/segments/:segmentId/quiz/attempts` — submit attempt
    - GET `/api/learner/segments/:segmentId/quiz/attempts` — attempt history
    - GET `/api/learner/segments/:segmentId/quiz/attempts/:attemptId` — attempt detail
    - All require authenticated learner with segment access
    - _Requirements: 4.8, 4.9_

- [x] 6. Extend progress tracking with quiz data
  - [x] 6.1 Extend Progress Service
    - Segment progress response now includes: quizzesAttempted (0 or 1 since one quiz per segment), quizBestScore (if attempted), quizTotalQuestions
    - Module completion still based ONLY on lesson completions (non-blocking)
    - _Requirements: 7.1–7.4_

  - [x] 6.2 Verify non-blocking invariant
    - Confirm Navigation Service does NOT check quiz state
    - Confirm Completion Service does NOT check quiz state
    - Lesson completion succeeds without quiz attempt
    - _Requirements: 6.1–6.5_

- [x] 7. Checkpoint - Backend complete
  - Run all backend tests, verify quiz CRUD, learner taking, activity tracking, progress extensions work
  - Ask user if questions arise

- [x] 8. Frontend API clients and hooks
  - [x] 8.1 Create quiz API client functions
    - Admin: createOrUpdateQuiz, getSegmentQuiz, deleteSegmentQuiz
    - Learner: getQuizForTaking, submitQuizAttempt, getAttemptHistory, getAttemptDetail
    - Activity: getRecentActivity
    - _Requirements: 12.1, 9.1_

  - [x] 8.2 Create React Query hooks
    - `useSegmentQuiz(segmentId)` — admin quiz data
    - `useLearnerQuiz(segmentId)` — learner quiz (no is_correct)
    - `useSubmitQuizAttempt()` — mutation
    - `useQuizAttemptHistory(segmentId)` — learner attempts
    - `useRecentActivity(limit, filter)` — admin activity
    - _Requirements: 12.1_

- [x] 9. Fix: Admin Dashboard (Real Activity + Segment Overview)
  - [x] 9.1 Update AdminDashboard Segment Overview to match screenshot
    - Each segment row shows: segment name (bold), metadata line with calendar icon + date, user icon + assigned user count, status badge (Ending Soon/Expired/On Track with colored backgrounds), progress bar
    - Add segment-level progress data to the segments list endpoint (or use existing data)
    - Add "View All Segment" link at bottom
    - Keep filter icon + dropdown
    - The Active Segment stats card should show count + sub-text like "2 Ending Soon"
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 9.2 Replace hardcoded Recent Activity with real data
    - Remove the hardcoded `recentActivity` array
    - Use `useRecentActivity()` hook to fetch from backend
    - Each item shows: user avatar (circular, lazy loading, fallback to initial), abbreviated name ("Amaka O."), action description, detail line (module/quiz name), score if applicable ("Score: 8/10"), relative timestamp (right-aligned)
    - Add filter icon + "All" dropdown
    - Show loading state while fetching
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 9.3 Update Quick Actions styling to match screenshot
    - "Assign Segment": navy filled button with left icon (currently correct)
    - "Create User": outline/secondary style with left icon
    - "Add New Segment": outline/secondary style with + icon
    - Ensure first button is filled navy, rest are outline (per screenshot — Assign Segment is filled, others are outline)
    - _Requirements: 10 (general dashboard accuracy)_

- [x] 10. Fix: Admin Segment Details Page
  - [x] 10.1 Add Quiz section to Segment Details page
    - Below the Modules section, add a "Quiz" section header with edit pencil icon
    - Show numbered questions: "Q 1: {question_text}", "Q 2: {question_text}", etc.
    - Clicking edit pencil opens the QuizDrawer for editing
    - If no quiz exists, show "No quiz added" or "Add Quiz" button
    - _Requirements: 11.1, 3.4_

  - [x] 10.2 Add Assigned Users section with progress
    - Section header "Assigned Users" with "Add/Remove User" button (teal outline)
    - Search bar below the header ("Search or select a users")
    - User list showing: user name (bold), job title (muted below), progress percentage with colored bar (right-aligned)
    - Progress bars: green for high %, blue/teal for medium, short colored bar proportional to %
    - _Requirements: 11.2, 11.3_

  - [x] 10.3 Add Segment Info card
    - Small card (right side or below assigned users) showing:
      - Created: date (e.g., "Dec 25, 2024")
      - Users Assigned: count (e.g., "9")
      - Completion Rate: percentage in teal (e.g., "68%")
    - _Requirements: 11.4_

  - [x] 10.4 Add Publish/Unpublish button
    - Bottom-right of the page
    - For active segments: "Unpublish" button (red/coral background, white text)
    - For draft segments: "Publish" button (navy background, white text)
    - Clicking triggers status change via existing segment update endpoint
    - _Requirements: 11.5_

  - [x] 10.5 Add status badge at top of page
    - Show "Active" (green badge) or "Draft" (grey badge) below the page heading
    - _Requirements: 11.1_

- [x] 11. Fix: Content Management Segment List
  - [x] 11.1 Update SegmentListPage row metadata to match screenshot
    - Each row shows: segment name (bold, first line), metadata line below with:
      - Calendar icon + duration (e.g., "4 Weeks")
      - Module icon + module count (e.g., "5 Modules")
      - User icon + assigned user count (e.g., "45 Users Assigned")
    - Right side: Status badge (Draft red border / Active green border), Created date, three-dot action menu
    - Table header: "Segment Name", "Status", "Created on"
    - _Requirements: 13.1_

  - [x] 11.2 Update action menu items
    - Edit (navigate to segment details/edit)
    - Reset Password (if applicable, or remove if not relevant for segments)
    - Archive Segment (red/danger text)
    - _Requirements: 13.2_

  - [x] 11.3 Ensure page header matches screenshot
    - Page title: "Content Management" (large heading)
    - Top-right: Search bar + "Create New Segment" button (navy filled with document icon)
    - _Requirements: 13.3_

- [x] 12. Admin Quiz Creation in Segment Wizard
  - [x] 12.1 Create QuizDrawer component (side-panel for adding questions)
    - Drawer/side-panel that slides in from the right
    - Title: "Add Questions"
    - Fields:
      - Question text (text input/textarea, required)
      - Question type selector: "Single Select" / "Multi Select" (radio or dropdown, defaults to single)
      - "Options" section: each option row is `[checkbox] [text input]`
        - The checkbox marks the option as the CORRECT answer (this is how admins grade the quiz)
        - For single-select: only one checkbox can be checked (auto-uncheck others, or use radio-style behavior)
        - For multi-select: multiple checkboxes can be checked
        - Minimum 2 option rows required
        - "Add Option" button to add more option rows
      - Validation (required, shown on Save attempt):
        - Question text cannot be empty
        - At least 2 options with text
        - For single-select: exactly 1 option must be checked as correct (error: "Please mark one correct answer")
        - For multi-select: at least 2 options must be checked as correct (error: "Please mark at least two correct answers")
    - Bottom actions: "Cancel" (outline) and "Save Question" (teal/navy filled)
    - Supports adding multiple questions (after saving one, drawer resets for next question or closes with option to add another)
    - Clear visual distinction: checked checkbox = correct answer (e.g., green highlight or "✓ Correct" label)
    - _Requirements: 2.1, 2.2, 2.6, 2.7, 2.8_

  - [x] 12.2 Integrate quiz step into Create Segment Wizard
    - The Create Segment wizard already has steps: Segment Info → Add Modules → Add Lesson → Preview
    - Quiz questions are created within this flow (can be part of the "Add Lesson" step or a sub-step)
    - The "Add Questions" drawer opens from within the wizard
    - Quiz questions are stored in wizard state until final submission
    - On "Publish" or "Save as Draft", the quiz is created along with the segment
    - _Requirements: 2.1, 2.4_

  - [x] 12.3 Update Preview step to show Quiz section
    - In the Preview/Review step of the wizard, show:
      - Segment Info section
      - Modules section (module names with lesson counts)
      - Quiz section with numbered questions ("Q 1: ...", "Q 2: ...")
    - Each section has an edit pencil icon to jump back to that step
    - Bottom actions: "Back" (outline), "Save as Draft" (outline), "Publish" (navy filled)
    - _Requirements: 2.4_

- [x] 13. Learner Quiz Frontend
  - [x] 13.1 Create QuizView component
    - Renders quiz questions with:
      - Question number and text
      - Question type indicator ("Select one answer" / "Select all correct answers")
      - Radio buttons for single_select, checkboxes for multi_select
      - Option text next to each input
    - Submit button with loading state (prevents double-submit)
    - "Skip Quiz" link/button
    - If previously attempted: show best score and "Retake" option
    - _Requirements: 12.1–12.6_

  - [x] 13.2 Create QuizResults component
    - Shows after submission:
      - Overall score: "X out of Y" with percentage
      - Per-question breakdown: question text, learner's answer, correct answer, correct/incorrect indicator (green checkmark / red X)
    - "Retake Quiz" button
    - "Continue" / navigation option
    - _Requirements: 5.1–5.4, 12.3_

  - [x] 13.3 Place quiz UI in learner segment/lesson flow
    - Quiz can be accessed from the learner's segment detail view or after completing modules
    - Clearly marked as optional ("This quiz is optional and does not affect your progress")
    - Responsive: card layout ≥1024px, stacked <1024px
    - _Requirements: 6.4, 6.5, 12.7_

- [x] 14. Admin Dashboard Stats Card Enhancement
  - [x] 14.1 Update Active Segment stats card
    - Show the active segment count
    - Below the count, show a sub-badge/text like "2 Ending Soon" (amber/warning color) when segments are close to expiry
    - This requires checking segment assignment expiry dates
    - _Requirements: 10.2_

- [x] 15. Final checkpoint
  - Verify ALL of the following are working end-to-end:
    - Learner lesson page: left panel replaces sidebar (no Dashboard/My Learning/Profile links visible)
    - Learner lesson page: left panel shows Back to Dashboard, segment title (teal), description, instructor, progress, module accordion
    - Admin dashboard: Segment Overview rows show date, user count, status badges, progress bars
    - Admin dashboard: Recent Activity shows real user data from backend (not hardcoded)
    - Admin dashboard: Active Segment card shows "X Ending Soon" sub-text
    - Admin Segment Details: has Quiz section with numbered questions + edit icon
    - Admin Segment Details: has Assigned Users section with name, job title, progress bars
    - Admin Segment Details: has Segment Info card (Created, Users, Completion Rate)
    - Admin Segment Details: has Publish/Unpublish button
    - Content Management list: rows show duration, module count, user count
    - Create Segment wizard: can add quiz questions via drawer
    - Create Segment Preview: shows Quiz section with numbered questions
    - Learner can take quiz (per segment), see results, retake
    - Quiz is non-blocking (does not affect lesson/module progression)
    - Activity events are tracked on quiz submit, lesson complete, segment assign
    - All pagination follows governance rules
    - Profile pictures use lazy loading where shown
  - Ensure all tests pass, ask user if questions arise

## Notes

- **Quiz is per-segment** (not per-lesson/module) — one quiz per segment based on the Figma screenshots showing quiz as a segment-level section
- **Lesson page layout is a critical fix** — the left panel in the screenshot clearly replaces the sidebar navigation (no nav items visible)
- **Real activity data** — the admin dashboard screenshot shows real user names, avatars, quiz scores, and timestamps; the current hardcoded placeholder must be replaced
- **Segment Details** is a comprehensive view — it shows info, modules, quiz, assigned users (with progress), and segment stats all on one scrollable page
- **Content Management list** rows show richer metadata than currently implemented (duration, module count, user count)
- Tasks marked with property tests are optional for faster MVP
- The UI must match the screenshots exactly (colors, spacing, icons, text patterns)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "2.2"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.3"] },
    { "id": 2, "tasks": ["1.4", "3.1", "4.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "4.2", "4.3"] },
    { "id": 4, "tasks": ["5.1", "5.2", "5.3"] },
    { "id": 5, "tasks": ["6.1", "6.2"] },
    { "id": 6, "tasks": ["8.1", "8.2"] },
    { "id": 7, "tasks": ["9.1", "9.2", "9.3"] },
    { "id": 8, "tasks": ["10.1", "10.2", "10.3", "10.4", "10.5"] },
    { "id": 9, "tasks": ["11.1", "11.2", "11.3"] },
    { "id": 10, "tasks": ["12.1", "12.2", "12.3"] },
    { "id": 11, "tasks": ["13.1", "13.2", "13.3"] },
    { "id": 12, "tasks": ["14.1"] },
    { "id": 13, "tasks": ["15"] }
  ]
}
```
