# Requirements Document

## Introduction

Milestone 5 completes the Rhose learning platform MVP by implementing automated email notification flows and ensuring final delivery readiness. This includes weekly segment-related email triggers sent to users during their active segment access period, monthly general email triggers sent after segment completion, integration of client-provided email templates, and comprehensive QA testing across all milestones (M1–M5) to produce a deployment-ready build. Email delivery uses Nodemailer as established in M1. 

**IMPORTANT**: This milestone implements all requirements from M5 requirements.md AND follows all governance rules and cross-cutting concerns documented in `.kiro/steering/governance-and-cross-cutting-concerns.md`, including pagination for user/segment lists in admin dashboard, profile picture display with lazy loading, phone/job title fields in user displays, and consistent admin editing capabilities across all pages.

CRM integrations and custom email design are explicitly excluded.

## Design References

- No standalone email UI screenshot is provided.
- Reuse success modal/status patterns from `.kiro/context/screenshot-catalog.md` only where admin confirmations are required.
- Email templates are client-provided and must not be redesigned in the app.

## Glossary

- **Email_Scheduler**: The cron-based background service responsible for triggering email jobs at configured intervals (weekly and monthly).
- **Email_Service**: The backend service responsible for composing emails from templates, resolving recipient lists, and dispatching emails via Nodemailer.
- **Email_Log**: The database record tracking each email sent, including recipient, email type, sent_at timestamp, and delivery status, used to prevent duplicate sends.
- **Template_Engine**: The utility responsible for loading client-provided email templates and interpolating dynamic variables (user name, segment title, progress data).
- **Weekly_Email**: A segment-related email sent once per week to users who have an active (non-expired) assignment to an active segment.
- **Monthly_Email**: A general follow-up email sent once per month to users who have completed all lessons in a segment.
- **Segment_Completion**: The state where a user has completed all lessons across all modules within an assigned segment.
- **Assignment**: A record linking a User to a Segment with assigned_at timestamp and access_duration_days value (from M2/M3).
- **Active_Assignment**: An assignment where the segment status is "active" and the current date is within the access duration period (or access_duration_days is null).
- **Nodemailer_Transport**: The configured Nodemailer SMTP transport instance used to send all outgoing emails.
- **Build_Pipeline**: The build and deployment configuration that produces production-ready frontend and backend artifacts.

## Requirements

### Requirement 1: Weekly Segment-Related Email Scheduling

**User Story:** As a platform operator, I want the system to automatically send weekly emails to users with active segment assignments so that learners receive regular engagement communication during their learning period.

#### Acceptance Criteria

1. THE Email_Scheduler SHALL execute the weekly email job once every 7 days at a configurable day-of-week and time (UTC).
2. WHEN the weekly email job executes, THE Email_Service SHALL identify all users who have at least one Active_Assignment (segment status is "active" AND assignment is within access duration OR access_duration_days is null).
3. WHEN a user has multiple Active_Assignments, THE Email_Service SHALL send one weekly email per active segment assignment for that user.
4. WHEN the Email_Service identifies an eligible recipient for a weekly email, THE Email_Service SHALL check the Email_Log for an existing weekly email record for that user-segment pair within the current 7-day window.
5. IF an Email_Log record already exists for the user-segment pair within the current 7-day window, THEN THE Email_Service SHALL skip sending a duplicate email for that pair (idempotence property).
6. WHEN a weekly email is sent successfully, THE Email_Service SHALL create an Email_Log record with user_id, segment_id, email_type "weekly", sent_at timestamp, and delivery_status "sent".
7. IF Nodemailer_Transport returns a delivery failure, THEN THE Email_Service SHALL create an Email_Log record with delivery_status "failed" and log the error details for operational review.
8. WHEN a user's assignment has expired (current date exceeds assigned_at plus access_duration_days), THE Email_Service SHALL exclude that user-segment pair from the weekly email recipient list.
9. WHEN a segment status is "draft" or "archived", THE Email_Service SHALL exclude all assignments to that segment from the weekly email recipient list.

### Requirement 2: Monthly Post-Segment Email Scheduling

**User Story:** As a platform operator, I want the system to automatically send monthly follow-up emails to users who have completed a segment so that learners receive continued engagement after finishing their programme.

#### Acceptance Criteria

1. THE Email_Scheduler SHALL execute the monthly email job once every 30 days at a configurable day-of-month and time (UTC).
2. WHEN the monthly email job executes, THE Email_Service SHALL identify all users who have achieved Segment_Completion (completed all lessons in all modules of an assigned segment).
3. WHEN the Email_Service identifies a user with Segment_Completion for a segment, THE Email_Service SHALL check the Email_Log for an existing monthly email record for that user-segment pair within the current 30-day window.
4. IF an Email_Log record already exists for the user-segment pair within the current 30-day window, THEN THE Email_Service SHALL skip sending a duplicate email for that pair (idempotence property).
5. WHEN a monthly email is sent successfully, THE Email_Service SHALL create an Email_Log record with user_id, segment_id, email_type "monthly", sent_at timestamp, and delivery_status "sent".
6. IF Nodemailer_Transport returns a delivery failure for a monthly email, THEN THE Email_Service SHALL create an Email_Log record with delivery_status "failed" and log the error details for operational review.
7. WHEN a user has not completed all lessons in a segment, THE Email_Service SHALL exclude that user-segment pair from the monthly email recipient list.
8. THE Email_Service SHALL continue sending monthly emails to a user-segment pair indefinitely (each 30-day cycle) until the feature is administratively disabled or the user account is deactivated.

### Requirement 3: Email Template Integration

**User Story:** As a platform operator, I want client-provided email templates integrated into the system so that outgoing emails match the approved content and branding.

#### Acceptance Criteria

1. THE Template_Engine SHALL load email templates from a configurable directory path on the server filesystem.
2. THE Template_Engine SHALL support at minimum two template types: "weekly_segment" and "monthly_general".
3. WHEN composing a weekly email, THE Template_Engine SHALL interpolate the following variables into the weekly_segment template: user_name, segment_title, current_progress_percentage, and platform_login_url.
4. WHEN composing a monthly email, THE Template_Engine SHALL interpolate the following variables into the monthly_general template: user_name, segment_title, completion_date, and platform_login_url.
5. IF a required template file is missing from the configured directory, THEN THE Template_Engine SHALL log an error and skip email dispatch for that template type without crashing the Email_Scheduler.
6. IF a template contains a variable placeholder that cannot be resolved, THEN THE Template_Engine SHALL replace the unresolved placeholder with an empty string and log a warning.
7. THE Template_Engine SHALL support HTML email content as provided by the client templates.
8. THE Email_Service SHALL set the email subject line from a configurable value per template type (not hardcoded in the template file).
9. FOR ALL valid template variables, rendering a template with known inputs then inspecting the output SHALL contain the interpolated values in the correct positions (round-trip property).

### Requirement 4: Email Delivery via Nodemailer

**User Story:** As a platform operator, I want reliable email delivery through Nodemailer so that all notification emails reach users' inboxes.

#### Acceptance Criteria

1. THE Nodemailer_Transport SHALL be configured using environment variables for SMTP host, port, authentication credentials, and sender address.
2. WHEN the Email_Service dispatches an email, THE Nodemailer_Transport SHALL send the email to the recipient's registered email address with the configured sender address in the "from" field.
3. WHEN the Email_Service dispatches an email, THE Nodemailer_Transport SHALL include the rendered HTML content as the email body and a plain-text fallback.
4. IF the SMTP connection fails or times out, THEN THE Email_Service SHALL retry the send operation up to 3 times with exponential backoff (1s, 2s, 4s delays).
5. IF all retry attempts fail, THEN THE Email_Service SHALL record the failure in the Email_Log with delivery_status "failed" and proceed to the next recipient without halting the batch.
6. WHEN the application starts, THE Nodemailer_Transport SHALL verify SMTP connectivity and log the connection status (success or failure).
7. THE Email_Service SHALL process email batches sequentially with a configurable delay between sends (default 500ms) to avoid SMTP rate limiting.

### Requirement 5: Email Deduplication and Tracking

**User Story:** As a platform operator, I want the system to track all sent emails and prevent duplicates so that users do not receive the same notification multiple times.

#### Acceptance Criteria

1. THE Email_Log_Schema SHALL define columns for id (UUID primary key), user_id (foreign key referencing User), segment_id (foreign key referencing Segment), email_type (enum: "weekly", "monthly"), sent_at (timestamp), delivery_status (enum: "sent", "failed"), and error_details (text, nullable).
2. THE Database SHALL enforce a unique constraint on (user_id, segment_id, email_type, sent_at_window) where sent_at_window represents the applicable deduplication period (7 days for weekly, 30 days for monthly).
3. WHEN the Email_Service attempts to send an email, THE Email_Service SHALL first query the Email_Log for an existing record matching the user_id, segment_id, email_type, and current time window.
4. IF a matching Email_Log record with delivery_status "sent" exists within the deduplication window, THEN THE Email_Service SHALL skip the send and log a deduplication event.
5. IF a matching Email_Log record with delivery_status "failed" exists within the deduplication window, THEN THE Email_Service SHALL attempt to resend the email (failed sends do not count as successful deduplication).
6. FOR ALL email send operations, sending the same email type to the same user-segment pair within the same deduplication window SHALL result in exactly one "sent" Email_Log record (idempotence property).
7. FOR ALL Email_Log records, the user_id SHALL reference a valid User and the segment_id SHALL reference a valid Segment (referential integrity invariant).

### Requirement 6: Email Scheduler Configuration and Control

**User Story:** As a platform operator, I want configurable scheduling parameters and the ability to monitor email job execution so that I can manage the notification system operationally.

#### Acceptance Criteria

1. THE Email_Scheduler SHALL read scheduling configuration from environment variables: WEEKLY_EMAIL_CRON (cron expression for weekly job) and MONTHLY_EMAIL_CRON (cron expression for monthly job).
2. WHEN the application starts, THE Email_Scheduler SHALL register the configured cron jobs and log the next scheduled execution time for each job.
3. WHEN a scheduled job begins execution, THE Email_Scheduler SHALL log the job start time, email type, and the count of eligible recipients identified.
4. WHEN a scheduled job completes execution, THE Email_Scheduler SHALL log the job end time, total emails sent, total emails skipped (deduplicated), and total emails failed.
5. IF the Email_Scheduler encounters an unhandled error during job execution, THEN THE Email_Scheduler SHALL log the error with full context and continue running (the scheduler process shall not crash).
6. THE Email_Scheduler SHALL execute jobs in a single-instance mode to prevent concurrent execution of the same job type (using a database lock or equivalent mechanism).

### Requirement 7: QA Testing and Cross-Milestone Verification

**User Story:** As a project team, I want comprehensive QA testing across all milestones so that the platform is verified as functionally complete before delivery.

#### Acceptance Criteria

1. THE Backend SHALL include integration tests covering all API endpoints from M1 through M5 with at minimum one positive and one negative test case per endpoint.
2. THE Backend SHALL include unit tests for all service-layer business logic functions with at minimum 80% line coverage across service modules.
3. THE Email_Service SHALL include unit tests verifying correct recipient identification for weekly emails (active assignments only) and monthly emails (completed segments only).
4. THE Email_Service SHALL include unit tests verifying deduplication logic correctly prevents duplicate sends within the configured time window.
5. THE Template_Engine SHALL include unit tests verifying correct variable interpolation for all supported template types.
6. WHEN all tests pass, THE Test_Suite SHALL produce a coverage report indicating line coverage percentage per module.
7. THE Test_Suite SHALL include tests verifying authentication flows (login, forgot password, token validation) from M1.
8. THE Test_Suite SHALL include tests verifying segment access control and duration enforcement from M3.
9. THE Test_Suite SHALL include tests verifying lesson completion and progress tracking from M3.

### Requirement 8: Deployment-Ready Build

**User Story:** As a project team, I want a production-ready build configuration so that the application can be deployed to the target environment.

#### Acceptance Criteria

1. WHEN the production build command is executed, THE Build_Pipeline SHALL produce optimized frontend assets (minified JavaScript, CSS, and static files) in a dist directory.
2. WHEN the production build command is executed, THE Build_Pipeline SHALL compile the backend TypeScript to JavaScript and produce a runnable Node.js application.
3. THE Build_Pipeline SHALL validate that all environment variables required for production operation are documented in an .env.example file.
4. THE Build_Pipeline SHALL include database migration scripts that can be executed against a fresh PostgreSQL instance to create the complete schema.
5. WHEN the production build is started with valid environment configuration, THE Application SHALL start without errors and respond to health check requests within 5 seconds.
6. THE Application SHALL expose a GET /health endpoint that returns HTTP 200 with a JSON body indicating service status and database connectivity.
7. THE Build_Pipeline SHALL produce a build that runs without development dependencies (devDependencies excluded from production node_modules).
8. THE Application SHALL log startup configuration (port, database connection status, email transport status, scheduler registration) without exposing secrets.

## Scope Guardrails

- This milestone covers weekly email triggers, monthly email triggers, template integration, email delivery, deduplication, QA testing, and deployment readiness only.
- CRM or external system integrations are excluded.
- Custom email design is excluded — the system integrates client-provided templates as-is.
- User self-registration is out of scope for the MVP.
- SSO, MFA, analytics, certificates, bulk imports, and role-based admin permissions are out of scope for the MVP.
- Admin UI for managing email schedules or templates is not in scope — configuration is via environment variables and filesystem.
- Email content authoring or WYSIWYG editing is not in scope.
## Cross-Cutting Concerns & Governance

**IMPORTANT**: This milestone implements in alignment with `.kiro/steering/governance-and-cross-cutting-concerns.md`, which establishes:

- **Database Schema Governance** (Section 1): All schema changes must cascade through the stack (DB → Types → API → Frontend UI)
- **User Profile Extensions** (Section 2): Phone, job title, and profile picture fields are handled consistently across all pages
- **Pagination & Search** (Section 3): All admin lists (users, segments, emails) must have pagination; search/filter resets page to 1
- **Profile Picture Display** (Section 6): All profile pictures must use lazy loading (`loading="lazy"` attribute)
- **Role vs. Job Title Distinction** (Section 7): Clear visual hierarchy with role primary, job title secondary
- **Admin Editing Capabilities** (Section 5): Admins can edit comprehensive user profile fields

Refer to the governance document for implementation details and patterns. In particular, email templates should reference user.phone and user.jobTitle when needed for personalization.
