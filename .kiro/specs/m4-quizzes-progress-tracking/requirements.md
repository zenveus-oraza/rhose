# Requirements Document

## Introduction

Milestone 4 implements basic multiple-choice quiz functionality and enhances progress tracking for the Rhose learning platform. Quizzes are non-blocking assessments that allow learners to test their understanding without gating progression. Admins create quiz questions with multiple options and a designated correct answer, and learners can take quizzes and view their results. Progress tracking is extended to include quiz attempt data alongside the existing lesson and module completion tracking from M3. This milestone builds on M1 (authentication, data models), M2 (admin content management), and M3 (lesson completion, sequential progression, progress tracking). Certificates, detailed scoring analytics, and email notifications are explicitly excluded.

## Design References

- **Lesson View (Video & Text Slide):** `/screenshots/LESSON (VIDEO & TEXTSLIDE).png` — Quizzes appear within or after lesson content. Use this reference for quiz placement relative to lesson content.
- **UI Components:** `/screenshots/COMPONENTS.png` — Reference for button styles, card layouts, form inputs, radio/checkbox controls, and feedback states used in quiz UI.
- **Mobile View:** `/screenshots/MOBILE VIEW.png` — Reference for responsive quiz layout on mobile viewports.
- **Content Management:** `/screenshots/CONTENT MANAGEMENT.png` — Reference for admin quiz management interface patterns (list views, forms, detail panels).

> **Note:** Final UI implementation must be consistent with the provided screenshots and any attached Figma design. If the SOW requires behavior not shown in the design references, document it as a design gap. If screenshots show functionality outside M4 scope, mark it as a scope clarification.

## Glossary

- **Quiz**: A set of multiple-choice questions associated with a lesson or module, used as a non-blocking assessment.
- **Quiz_Question**: An individual multiple-choice question within a quiz, containing question text and a set of answer options.
- **Quiz_Option**: A single answer choice for a quiz question, with text content and a flag indicating whether it is the correct answer. A question may have multiple correct options.
- **Single_Select_Question**: A quiz question where exactly one option is correct; the learner selects one answer.
- **Multi_Select_Question**: A quiz question where multiple options are correct; the learner must select all correct options and no incorrect options for the answer to count as correct.
- **Quiz_Attempt**: A record of a learner's submission of answers to all questions in a quiz, including selected options and the resulting score.
- **Quiz_Service**: The backend service responsible for quiz CRUD operations, attempt recording, and score calculation.
- **Quiz_Admin_Service**: The backend service responsible for admin-only quiz management operations (create, update, delete quizzes and questions).
- **Progress_Service**: The backend service responsible for tracking and querying lesson completion, module progress, and quiz attempt history for a user (extends M3 Progress_Service).
- **Quiz_View**: The frontend component that renders quiz questions to the learner and handles answer submission.
- **Score**: The number of correctly answered questions out of the total question count for a quiz attempt, expressed as a fraction and percentage.
- **Admin**: A user with elevated privileges who manages quizzes, content, and accounts.
- **Learner**: A standard user who takes quizzes and views their results.
- **Auth_Middleware**: The middleware that verifies JWT tokens and enforces role-based access on protected endpoints.
- **Schema_Validator**: The Zod-based validation layer that validates all API request payloads.
- **Segment_Access_Service**: The backend service responsible for verifying a learner's assignment to a segment and enforcing access duration (from M3).

## Requirements

### Requirement 1: Quiz Data Model

**User Story:** As a developer, I want Drizzle ORM schema definitions for quizzes, questions, options, and attempts so that quiz functionality has a stable data layer.

#### Acceptance Criteria

1. THE Quiz_Schema SHALL define columns for id (UUID primary key), title (text, required), description (text, optional), lesson_id (foreign key referencing Lesson, nullable), module_id (foreign key referencing Module, nullable), created_at (timestamp), and updated_at (timestamp).
2. THE Quiz_Question_Schema SHALL define columns for id (UUID primary key), quiz_id (foreign key referencing Quiz), question_text (text, required), sort_order (integer, required), created_at (timestamp), and updated_at (timestamp).
3. THE Quiz_Option_Schema SHALL define columns for id (UUID primary key), question_id (foreign key referencing Quiz_Question), option_text (text, required), is_correct (boolean, required, default false), sort_order (integer, required).
3a. THE Quiz_Question_Schema SHALL include a question_type column (enum: single_select, multi_select, required, default single_select) indicating whether the question allows one or multiple correct answers.
4. THE Quiz_Attempt_Schema SHALL define columns for id (UUID primary key), quiz_id (foreign key referencing Quiz), user_id (foreign key referencing User), score (integer, required), total_questions (integer, required), completed_at (timestamp, required).
5. THE Quiz_Attempt_Answer_Schema SHALL define columns for id (UUID primary key), attempt_id (foreign key referencing Quiz_Attempt), question_id (foreign key referencing Quiz_Question), selected_option_id (foreign key referencing Quiz_Option). A multi_select question will have multiple Quiz_Attempt_Answer records (one per selected option) for the same attempt_id and question_id.
6. THE Database SHALL enforce that a Quiz references either a valid Lesson or a valid Module via foreign key constraints.
7. THE Database SHALL enforce that Quiz_Question references a valid Quiz via foreign key constraint.
8. THE Database SHALL enforce that Quiz_Option references a valid Quiz_Question via foreign key constraint.
9. THE Database SHALL enforce that Quiz_Attempt references a valid Quiz and a valid User via foreign key constraints.
10. FOR ALL Quiz_Question records within a Quiz, the sort_order values SHALL be unique within that quiz (uniqueness invariant).
11. FOR ALL Quiz records, at least one of lesson_id or module_id SHALL be non-null (association invariant).
12. FOR ALL Quiz_Question records, there SHALL be at least one Quiz_Option with is_correct set to true (correctness invariant).
12a. FOR ALL single_select Quiz_Question records, there SHALL be exactly one Quiz_Option with is_correct set to true.
12b. FOR ALL multi_select Quiz_Question records, there SHALL be at least two Quiz_Options with is_correct set to true.
13. WHEN a Drizzle migration is run, THE Migration_Runner SHALL create all quiz-related tables with correct columns, types, and constraints without errors.

### Requirement 2: Admin Quiz Creation

**User Story:** As an admin, I want to create quizzes with multiple-choice questions so that learners can be assessed on lesson or module content.

#### Acceptance Criteria

1. WHEN an authenticated admin submits a valid quiz creation request with title, optional description, and association (lesson_id or module_id), THE Quiz_Admin_Service SHALL create the quiz record and return the created quiz with its id.
2. WHEN an authenticated admin submits a quiz creation request with questions, THE Quiz_Admin_Service SHALL create each question with its question_text and sort_order, and create each option with option_text, is_correct flag, and sort_order.
3. WHEN an authenticated admin submits a quiz creation request without at least one question, THE Schema_Validator SHALL return a 400 Bad Request response indicating at least one question is required.
4. WHEN an authenticated admin submits a question without at least two options, THE Schema_Validator SHALL return a 400 Bad Request response indicating at least two options are required per question.
5. WHEN an authenticated admin submits a single_select question where no option is marked as correct, THE Schema_Validator SHALL return a 400 Bad Request response indicating exactly one correct option is required for single-select questions.
6. WHEN an authenticated admin submits a single_select question where more than one option is marked as correct, THE Schema_Validator SHALL return a 400 Bad Request response indicating exactly one correct option is allowed for single-select questions.
6a. WHEN an authenticated admin submits a multi_select question where fewer than two options are marked as correct, THE Schema_Validator SHALL return a 400 Bad Request response indicating at least two correct options are required for multi-select questions.
7. WHEN an authenticated admin submits a quiz with a lesson_id that does not exist, THE Quiz_Admin_Service SHALL return a 404 Not Found response.
8. WHEN an authenticated admin submits a quiz with a module_id that does not exist, THE Quiz_Admin_Service SHALL return a 404 Not Found response.
9. WHEN a non-admin user attempts to create a quiz, THE Auth_Middleware SHALL return a 403 Forbidden response.
10. WHEN a quiz creation request is missing required fields (title), THE Schema_Validator SHALL return a 400 Bad Request response with field-specific validation errors.

### Requirement 3: Admin Quiz Update and Deletion

**User Story:** As an admin, I want to update and delete quizzes so that I can maintain accurate and relevant assessments.

#### Acceptance Criteria

1. WHEN an authenticated admin submits a valid quiz update request, THE Quiz_Admin_Service SHALL update the quiz title, description, and association fields, and return the updated quiz.
2. WHEN an authenticated admin submits a quiz update that adds new questions, THE Quiz_Admin_Service SHALL create the new question and option records.
3. WHEN an authenticated admin submits a quiz update that removes questions, THE Quiz_Admin_Service SHALL delete the question and its associated options.
4. WHEN an authenticated admin submits a quiz update that modifies existing questions or options, THE Quiz_Admin_Service SHALL update the corresponding records.
5. WHEN an authenticated admin requests deletion of a quiz, THE Quiz_Admin_Service SHALL delete the quiz, all associated questions, all associated options, and all associated attempts, and return a 200 OK response.
6. WHEN an authenticated admin requests update or deletion of a quiz that does not exist, THE Quiz_Admin_Service SHALL return a 404 Not Found response.
7. WHEN a non-admin user attempts to update or delete a quiz, THE Auth_Middleware SHALL return a 403 Forbidden response.
8. WHEN an authenticated admin lists all quizzes, THE Quiz_Admin_Service SHALL return a paginated list of quizzes with their associated lesson or module title, question count, and attempt count.

### Requirement 4: Admin Quiz Listing and Detail

**User Story:** As an admin, I want to view all quizzes and their details so that I can manage assessments effectively.

#### Acceptance Criteria

1. WHEN an authenticated admin requests the quiz list, THE Quiz_Admin_Service SHALL return a list of all quizzes including id, title, associated lesson or module title, question count, and total attempt count.
2. WHEN an authenticated admin requests a specific quiz detail, THE Quiz_Admin_Service SHALL return the quiz with all questions, each question's options (including the is_correct flag), and attempt statistics (total attempts, average score percentage).
3. WHEN an authenticated admin requests a quiz that does not exist, THE Quiz_Admin_Service SHALL return a 404 Not Found response.
4. WHEN a non-admin user attempts to access admin quiz endpoints, THE Auth_Middleware SHALL return a 403 Forbidden response.
5. THE Quiz_Admin_Service SHALL support filtering quizzes by association type (lesson or module) and by specific lesson_id or module_id.

### Requirement 5: Learner Quiz Taking

**User Story:** As a learner, I want to take quizzes associated with my lessons or modules so that I can test my understanding of the content.

#### Acceptance Criteria

1. WHEN an authenticated learner with valid segment access requests a quiz, THE Quiz_Service SHALL return the quiz title, description, and all questions with their question_type and options (excluding the is_correct flag from the response).
2. WHEN an authenticated learner with valid segment access submits answers to a quiz, THE Quiz_Service SHALL record a Quiz_Attempt with the selected options, calculate the score, store the attempt, and return the results.
2a. FOR single_select questions, THE Quiz_Service SHALL mark the question as correct if the learner's single selected option has is_correct set to true.
2b. FOR multi_select questions, THE Quiz_Service SHALL mark the question as correct only if the learner's selected options exactly match all options with is_correct set to true (all correct options selected and no incorrect options selected).
3. WHEN an authenticated learner submits a quiz attempt with answers that do not reference valid option ids for the corresponding questions, THE Schema_Validator SHALL return a 400 Bad Request response.
3a. WHEN an authenticated learner submits a single_select question answer with more than one selected option, THE Schema_Validator SHALL return a 400 Bad Request response indicating only one selection is allowed for single-select questions.
4. WHEN an authenticated learner submits a quiz attempt without answering all questions, THE Quiz_Service SHALL accept the submission and score only the answered questions, treating unanswered questions as incorrect.
5. WHEN an authenticated learner requests a quiz associated with a lesson in a segment they are not assigned to, THE Segment_Access_Service SHALL return a 403 Forbidden response.
6. WHEN an authenticated learner requests a quiz that does not exist, THE Quiz_Service SHALL return a 404 Not Found response.
7. THE Quiz_Service SHALL allow a learner to take the same quiz multiple times, creating a new Quiz_Attempt record for each submission.
8. THE Quiz_Service SHALL never expose the is_correct flag for quiz options in learner-facing quiz retrieval endpoints.
9. FOR ALL quiz attempt submissions, the recorded score SHALL equal the count of questions where the learner's answer is correct: for single_select questions the selected option has is_correct true, for multi_select questions the selected options exactly match all correct options (score calculation invariant).
10. FOR ALL quiz attempt submissions, the total_questions field SHALL equal the total number of questions in the quiz at the time of submission (consistency invariant).

### Requirement 6: Quiz Results Display

**User Story:** As a learner, I want to see my quiz results after submission so that I can understand how I performed.

#### Acceptance Criteria

1. WHEN a quiz attempt is submitted successfully, THE Quiz_Service SHALL return the attempt result including score (correct count), total questions, percentage score, and per-question breakdown showing the learner's selected option and the correct option for each question.
2. WHEN an authenticated learner requests their attempt history for a specific quiz, THE Quiz_Service SHALL return a list of all attempts by that learner for that quiz, ordered by completed_at descending, each showing score, total_questions, percentage, and completed_at timestamp.
3. WHEN an authenticated learner requests a specific past attempt detail, THE Quiz_Service SHALL return the full attempt including per-question answers with the learner's selection and the correct answer indicated.
4. WHEN an authenticated learner requests attempt history for a quiz they have never taken, THE Quiz_Service SHALL return an empty list.
5. THE Quiz_Service SHALL calculate percentage score as (score / total_questions) * 100, rounded to the nearest whole number.
6. FOR ALL quiz results, the percentage score SHALL equal (score / total_questions) * 100 rounded to the nearest whole number (calculation invariant).

### Requirement 7: Non-Blocking Quiz Flow

**User Story:** As a platform operator, I want quizzes to never block learner progression so that learners can continue their learning regardless of quiz performance.

#### Acceptance Criteria

1. THE Quiz_Service SHALL NOT require quiz completion as a prerequisite for lesson completion or module progression.
2. WHEN a learner marks a lesson as complete without taking the associated quiz, THE Completion_Service SHALL record the lesson completion successfully.
3. WHEN a learner has not taken a quiz associated with a module, THE Navigation_Service SHALL still allow progression to subsequent modules based solely on lesson completion status.
4. WHEN a learner scores zero on a quiz, THE Navigation_Service SHALL not restrict access to any subsequent lesson or module.
5. THE Quiz_View SHALL display quizzes as optional activities with clear visual indication that they do not block progression.
6. WHEN a learner navigates past a lesson with an associated quiz without taking the quiz, THE Progress_Service SHALL still count the lesson as completable via the standard "Mark as Complete" flow.
7. FOR ALL learner progression checks, quiz attempt existence or quiz score SHALL have no effect on the progression eligibility determination (non-blocking invariant).

### Requirement 8: Enhanced Progress Tracking with Quiz Data

**User Story:** As a learner, I want my progress view to include quiz attempt information so that I can see a complete picture of my learning activity.

#### Acceptance Criteria

1. WHEN an authenticated learner requests their progress for a segment, THE Progress_Service SHALL return lesson progress (completed/total), module progress, and quiz attempt summary (quizzes attempted out of total quizzes available in the segment).
2. WHEN an authenticated learner requests their progress for a module, THE Progress_Service SHALL return lesson completion count, total lessons, module completion status, and quiz attempt data for quizzes associated with that module (attempted count, average score percentage).
3. THE Progress_Service SHALL calculate module completion status based solely on lesson completions, not quiz attempts (non-blocking principle).
4. WHEN a module has associated quizzes and the learner has attempted at least one, THE Progress_Service SHALL include the learner's best score percentage for each quiz in the module progress response.
5. WHEN a module has associated quizzes and the learner has not attempted any, THE Progress_Service SHALL indicate zero quizzes attempted without affecting module completion status.
6. THE Progress_Service SHALL calculate segment-level quiz statistics as total quizzes available in the segment and total quizzes attempted by the learner.
7. FOR ALL progress calculations, module completion status SHALL depend only on lesson completion counts and SHALL be independent of quiz attempt data (invariant property).
8. FOR ALL progress calculations, the quiz attempted count SHALL be less than or equal to the total quiz count within the scope (invariant property).

### Requirement 9: Quiz Frontend Experience

**User Story:** As a learner, I want a responsive quiz interface so that I can take quizzes comfortably on any device.

#### Acceptance Criteria

1. WHEN a learner navigates to a lesson or module with an associated quiz, THE Quiz_View SHALL display a clearly labeled quiz section indicating the quiz is optional.
2. THE Quiz_View SHALL render single_select questions with radio-button options allowing the learner to select one option, and multi_select questions with checkbox options allowing the learner to select multiple options.
2a. THE Quiz_View SHALL clearly indicate to the learner whether a question is single-select or multi-select (e.g., "Select one answer" vs "Select all correct answers").
3. WHEN a learner has selected answers and clicks the submit button, THE Quiz_View SHALL submit the attempt to the backend and display the results inline.
4. WHEN quiz results are displayed, THE Quiz_View SHALL show the overall score (e.g., "4 out of 5"), percentage, and per-question feedback indicating which answers were correct and which were incorrect.
5. WHILE the viewport width is 1024px or greater, THE Quiz_View SHALL render questions in a card-based layout within the main content area.
6. WHILE the viewport width is less than 1024px, THE Quiz_View SHALL render questions in a full-width stacked layout with touch-friendly option selection targets.
7. WHEN a quiz submission API request is in progress, THE Quiz_View SHALL display a loading state on the submit button and prevent duplicate submissions.
8. WHEN a quiz submission API request fails, THE Quiz_View SHALL display a user-visible error message and allow the learner to retry.
9. THE Quiz_View SHALL display a "Skip Quiz" or equivalent navigation option that allows the learner to proceed without taking the quiz.
10. WHEN a learner has previously taken a quiz, THE Quiz_View SHALL display their most recent score and offer the option to retake the quiz.

### Requirement 10: Admin Quiz Frontend

**User Story:** As an admin, I want a quiz management interface so that I can create, edit, and view quizzes within the content management area.

#### Acceptance Criteria

1. WHEN an authenticated admin navigates to the quiz management section, THE Admin_Frontend SHALL display a list of all quizzes with title, associated content (lesson or module name), question count, and attempt count.
2. WHEN an authenticated admin clicks "Create Quiz", THE Admin_Frontend SHALL display a form with fields for title, description, content association (select lesson or module), and a dynamic question builder.
3. THE Admin_Frontend question builder SHALL allow adding multiple questions, each with question text, question type selection (single-select or multi-select), at least two option fields, and the ability to mark correct options (one for single-select, multiple for multi-select).
4. WHEN an authenticated admin submits the quiz creation form with valid data, THE Admin_Frontend SHALL send the creation request to the backend and display a success confirmation.
5. WHEN an authenticated admin clicks on an existing quiz, THE Admin_Frontend SHALL display the quiz detail with all questions, options, correct answers highlighted, and attempt statistics.
6. WHEN an authenticated admin clicks "Edit" on a quiz, THE Admin_Frontend SHALL display the quiz form pre-populated with existing data, allowing modifications to questions and options.
7. WHEN an authenticated admin clicks "Delete" on a quiz, THE Admin_Frontend SHALL display a confirmation dialog before sending the deletion request.
8. WHILE the viewport width is less than 1024px, THE Admin_Frontend quiz management SHALL render in a responsive single-column layout.

## Scope Guardrails

- This milestone covers quiz CRUD (admin), quiz taking (learner), quiz results display, non-blocking quiz flow, and enhanced progress tracking with quiz data only.
- Certificates are excluded from the MVP.
- Detailed scoring analytics (percentile rankings, trend analysis, comparative scoring) are excluded.
- Email notifications (weekly/monthly) belong to Milestone 5.
- Quiz results do not affect lesson completion or module progression under any circumstance.
- Self-registration, SSO, MFA, CRM integrations, bulk imports, and role-based admin permissions are out of scope for the MVP.
- Progress tracking enhancements in this milestone extend M3's existing progress infrastructure; they do not replace it.
