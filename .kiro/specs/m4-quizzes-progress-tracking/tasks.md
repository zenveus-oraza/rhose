# Implementation Plan: M4 Quizzes & Progress Tracking

## Overview

This implementation plan covers basic multiple-choice quiz functionality and enhanced progress tracking for the Rhose learning platform. Tasks are organized from data model setup through admin CRUD, learner quiz-taking, progress tracking extensions, and frontend implementation. Quizzes are non-blocking assessments — they never gate learner progression.

## Tasks

- [ ] 1. Set up quiz data model and database schema
  - [ ] 1.1 Create quiz, quiz_questions, quiz_options, quiz_attempts, and quiz_attempt_answers tables using Drizzle ORM
    - Define all columns, types, constraints, foreign keys, CHECK constraints, and UNIQUE constraints as specified in the design
    - Include question_type enum (single_select, multi_select) on quiz_questions
    - Enforce CHECK (lesson_id IS NOT NULL OR module_id IS NOT NULL) on quizzes table
    - Enforce UNIQUE (quiz_id, sort_order) on quiz_questions and UNIQUE (question_id, sort_order) on quiz_options
    - _Requirements: 1.1, 1.2, 1.3, 1.3a, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11_

  - [ ] 1.2 Generate and run Drizzle migration for quiz tables
    - Verify migration creates all tables with correct columns, types, and constraints without errors
    - _Requirements: 1.13_

  - [ ]* 1.3 Write property tests for data model invariants
    - **Property 1: Sort Order Uniqueness Within Quiz**
    - **Property 2: Quiz Association Invariant**
    - **Property 3: Correct Option Constraints by Question Type**
    - **Validates: Requirements 1.10, 1.11, 1.12, 1.12a, 1.12b**

- [ ] 2. Implement admin quiz CRUD endpoints
  - [ ] 2.1 Create Zod validation schemas for quiz creation, update, and deletion requests
    - Validate title required, at least one question, at least two options per question
    - Validate single_select has exactly one correct option, multi_select has at least two correct options
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.6a, 2.10_

  - [ ] 2.2 Implement QuizAdminService with createQuiz, updateQuiz, deleteQuiz, listQuizzes, and getQuizDetail methods
    - Create quiz with nested questions and options in a transaction
    - Update supports adding, removing, and modifying questions/options
    - Delete cascades to questions, options, and attempts
    - List returns paginated quizzes with associated content title, question count, and attempt count
    - Detail returns quiz with all questions, options (including is_correct), and attempt statistics
    - Support filtering by association type (lesson/module) and specific lesson_id or module_id
    - _Requirements: 2.1, 2.2, 2.7, 2.8, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.8, 4.1, 4.2, 4.3, 4.5_

  - [ ] 2.3 Create admin quiz route handlers and Express routes with auth middleware
    - POST /api/admin/quizzes, GET /api/admin/quizzes, GET /api/admin/quizzes/:quizId, PUT /api/admin/quizzes/:quizId, DELETE /api/admin/quizzes/:quizId
    - Enforce admin role via Auth_Middleware (return 403 for non-admin users)
    - _Requirements: 2.9, 3.7, 4.4_

  - [ ]* 2.4 Write property test for quiz creation round-trip
    - **Property 4: Quiz Creation Round-Trip**
    - **Validates: Requirements 2.1, 2.2**

  - [ ]* 2.5 Write unit tests for admin quiz CRUD
    - Test create with valid data, missing title (400), non-existent lesson_id (404), non-admin access (403)
    - Test update add/remove/modify questions, delete cascade verification
    - _Requirements: 2.1–2.10, 3.1–3.8, 4.1–4.5_

- [ ] 3. Checkpoint - Ensure admin CRUD tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement learner quiz-taking endpoints
  - [ ] 4.1 Implement QuizService with getQuizForLearner and submitAttempt methods
    - getQuizForLearner returns quiz with questions and options, excluding is_correct flag
    - submitAttempt records attempt, calculates score (single_select: selected option is_correct; multi_select: exact match of all correct options), stores attempt answers
    - Unanswered questions treated as incorrect
    - Allow multiple attempts per learner per quiz
    - _Requirements: 5.1, 5.2, 5.2a, 5.2b, 5.4, 5.7, 5.8, 5.9, 5.10_

  - [ ] 4.2 Implement quiz submission validation and segment access checks
    - Validate submitted option_ids reference valid options for corresponding questions
    - Validate single_select questions have only one selected option
    - Enforce segment access via Segment_Access_Service (return 403 if learner lacks access)
    - Return 404 for non-existent quiz
    - _Requirements: 5.3, 5.3a, 5.5, 5.6_

  - [ ] 4.3 Create learner quiz route handlers and Express routes
    - GET /api/quizzes/:quizId, POST /api/quizzes/:quizId/attempts, GET /api/quizzes/:quizId/attempts, GET /api/quizzes/:quizId/attempts/:attemptId
    - Enforce authenticated learner with valid segment access
    - _Requirements: 5.1, 5.5, 5.6_

  - [ ]* 4.4 Write property tests for quiz scoring and learner data exposure
    - **Property 5: Correct Answer Never Exposed to Learner**
    - **Property 6: Score Calculation Invariant**
    - **Property 7: Total Questions Consistency**
    - **Validates: Requirements 5.1, 5.2, 5.2a, 5.2b, 5.4, 5.8, 5.9, 5.10**

  - [ ]* 4.5 Write unit tests for learner quiz-taking
    - Test all correct → full score, all incorrect → zero, partial submission, single_select multiple selections (400), invalid option_id (400), retake creates new attempt
    - _Requirements: 5.1–5.10_

- [ ] 5. Implement quiz results display endpoints
  - [ ] 5.1 Implement getAttemptHistory and getAttemptDetail methods in QuizService
    - Return attempt history ordered by completed_at descending
    - Return per-question breakdown with learner's selection and correct answer
    - Calculate percentage as Math.round((score / total_questions) * 100)
    - Return empty list for quizzes never taken
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 5.2 Write property tests for results display
    - **Property 8: Attempt History Ordering**
    - **Property 9: Percentage Calculation Invariant**
    - **Validates: Requirements 6.2, 6.5, 6.6**

- [ ] 6. Ensure quiz completion does not block progression
  - [ ] 6.1 Verify non-blocking quiz flow in Navigation and Completion services
    - Confirm Navigation_Service and Completion_Service do NOT check quiz state
    - Verify lesson completion succeeds without quiz attempt
    - Verify module progression allowed regardless of quiz scores
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.6_

  - [ ]* 6.2 Write property test for non-blocking progression invariant
    - **Property 10: Non-Blocking Progression Invariant**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.6, 7.7, 8.3, 8.5, 8.7**

- [ ] 7. Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement progress tracking extensions with quiz data
  - [ ] 8.1 Implement lesson progress calculation utility
    - Calculate lesson completion counts within modules and segments
    - _Requirements: 8.1, 8.2_

  - [ ] 8.2 Implement module progress calculation utility
    - Calculate module completion based solely on lesson completions (not quiz attempts)
    - Include quiz attempt data: attempted count, average score, best score per quiz
    - _Requirements: 8.2, 8.3, 8.4, 8.5_

  - [ ] 8.3 Expose progress summary in learner dashboard and segment/module endpoints
    - Extend GET /api/progress/segments/:segmentId with quizzesAttempted and quizzesTotal
    - Extend GET /api/progress/modules/:moduleId with quiz attempt data and best scores
    - _Requirements: 8.1, 8.2, 8.4, 8.5, 8.6_

  - [ ]* 8.4 Write property tests for progress tracking
    - **Property 11: Best Score Selection**
    - **Property 12: Attempted Count Bounded Invariant**
    - **Validates: Requirements 8.4, 8.8**

  - [ ]* 8.5 Write unit tests for progress calculations
    - Test module completion unaffected by quiz state, best score identification, segment quiz statistics
    - _Requirements: 8.1–8.8_

- [ ] 9. Checkpoint - Ensure progress tracking tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Create frontend API clients and hooks for quiz and progress flows
  - [ ] 10.1 Create frontend API clients/hooks for quiz and progress flows
    - Implement API client functions for all quiz endpoints (admin and learner)
    - Implement React hooks for quiz data fetching, submission, and progress queries
    - _Requirements: 9.1, 9.3, 10.1, 10.4_

- [ ] 11. Implement learner quiz frontend components
  - [ ] 11.1 Create placeholder quiz components/pages wired to data
    - Build QuizView component with radio buttons (single_select) and checkboxes (multi_select)
    - Display question type indicator ("Select one answer" / "Select all correct answers")
    - Implement submit with loading state and duplicate submission prevention
    - Display error messages on API failure with retry option
    - Show "Skip Quiz" navigation option
    - Display previous best score with retake option
    - Leave final UI polish for Figma attachment
    - _Requirements: 9.1, 9.2, 9.2a, 9.3, 9.7, 9.8, 9.9, 9.10_

  - [ ] 11.2 Create QuizResults component for score/result display
    - Show overall score (e.g., "4 out of 5"), percentage, and per-question feedback
    - Indicate correct/incorrect answers visually
    - Expose only basic score/result display; do not build detailed analytics or certificates
    - _Requirements: 6.1, 9.4_

  - [ ] 11.3 Place quiz UI according to module/lesson context
    - Position quiz section within lesson/module view as optional activity with clear visual indication
    - Ensure quiz flow is non-blocking (learner can proceed without taking quiz)
    - Responsive: card layout at ≥1024px, stacked full-width at <1024px
    - _Requirements: 7.5, 9.1, 9.5, 9.6_

- [ ] 12. Implement admin quiz frontend components
  - [ ] 12.1 Implement admin quiz/question creation using existing content wizard and side-panel patterns
    - Build QuizList with title, associated content, question count, attempt count
    - Build QuizForm with title, description, content association, and dynamic QuestionBuilder
    - Include question type selector (single-select / multi-select) and correct answer marking
    - Build QuizDetail view with questions, options, correct answers highlighted, and attempt statistics
    - Implement edit (pre-populated form) and delete (confirmation dialog) flows
    - Responsive single-column layout at <1024px
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

- [ ] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design uses TypeScript — all implementation tasks use TypeScript
- Quiz UI components are initially placeholder; final polish depends on Figma attachment
- Non-blocking quiz flow is enforced by absence of coupling (Navigation/Completion services never check quiz state)
- Progress tracking extensions build on existing M3 infrastructure without replacing it

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3", "2.1"] },
    { "id": 3, "tasks": ["2.2", "4.1"] },
    { "id": 4, "tasks": ["2.3", "2.4", "4.2"] },
    { "id": 5, "tasks": ["2.5", "4.3", "4.4"] },
    { "id": 6, "tasks": ["4.5", "5.1", "6.1"] },
    { "id": 7, "tasks": ["5.2", "6.2"] },
    { "id": 8, "tasks": ["8.1"] },
    { "id": 9, "tasks": ["8.2"] },
    { "id": 10, "tasks": ["8.3", "8.4"] },
    { "id": 11, "tasks": ["8.5", "10.1"] },
    { "id": 12, "tasks": ["11.1", "12.1"] },
    { "id": 13, "tasks": ["11.2", "11.3"] }
  ]
}
```
