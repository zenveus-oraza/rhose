# Implementation Plan: M5 Email Notifications & Final Delivery

## Overview

This implementation plan covers the automated email notification system for the Rhose learning platform MVP. It includes the email_logs data model, template engine for client-provided templates, Nodemailer transport with retry logic, cron-based scheduling for weekly and monthly emails, deduplication safeguards, comprehensive QA testing across all milestones (M1–M5), and production deployment readiness. The implementation uses TypeScript, Express, PostgreSQL with Drizzle ORM, and Nodemailer.

### Already Present From Earlier Milestones

The following M5 foundations are already present in the merged branch and should be treated as baseline:

- Nodemailer wired to Amazon SES SMTP for transactional email
- S3-backed file upload infrastructure
- PM2 ecosystem configuration for EC2 process management
- deployment documentation in `DEPLOYMENT.md`
- production-oriented environment variable documentation in `backend/.env.example`

## Tasks

- [ ] 1. Set up data model and email module structure
  - [ ] 1.1 Create email_logs Drizzle schema and database migration
    - Define the `email_logs` table in `backend/src/db/schema/email-logs.ts` with columns: id (UUID), user_id, segment_id, email_type, sent_at, delivery_status, error_details, created_at
    - Add deduplication index on (user_id, segment_id, email_type, sent_at) and window check index on (user_id, segment_id, email_type, delivery_status, sent_at)
    - Generate and run the Drizzle migration
    - _Requirements: 5.1, 5.2, 5.7_

  - [ ] 1.2 Create email module directory structure and core interfaces
    - Create `backend/src/modules/emails/` directory with files: `email-scheduler.ts`, `email-service.ts`, `recipient-identifier.ts`, `deduplication-checker.ts`, `template-engine.ts`
    - Define TypeScript interfaces: EmailSchedulerConfig, EmailScheduler, JobResult, EmailService, EmailRecipient, TemplateType, TemplateVariables, SendResult, RecipientIdentifier, DeduplicationChecker, TemplateEngine, RenderedEmail
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1_

- [ ] 2. Implement template engine
  - [ ] 2.1 Implement Template Engine with variable interpolation
    - Load templates from configurable `EMAIL_TEMPLATE_DIR` environment variable path
    - Support two template types: "weekly_segment" and "monthly_general"
    - Interpolate `{{variable_name}}` placeholders with provided variables (user_name, segment_title, current_progress_percentage, completion_date, platform_login_url)
    - Replace unresolved placeholders with empty string and log a warning
    - Read subject lines from `WEEKLY_EMAIL_SUBJECT` and `MONTHLY_EMAIL_SUBJECT` env vars
    - Handle missing template files gracefully (log error, skip dispatch, no crash)
    - Support HTML email content as provided by client templates
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [ ]* 2.2 Write property test for template interpolation round-trip
    - **Property 4: Template Interpolation Round-Trip**
    - Generate random valid variable maps, verify all provided values appear in rendered output
    - **Validates: Requirements 3.3, 3.4, 3.9**

  - [ ]* 2.3 Write property test for unresolved placeholder handling
    - **Property 5: Unresolved Placeholder Graceful Handling**
    - Generate templates with random unresolved placeholders, verify no raw `{{placeholder}}` syntax remains in output
    - **Validates: Requirements 3.6**

  - [ ]* 2.4 Write unit tests for Template Engine
    - Test correct variable interpolation for weekly and monthly templates
    - Test unresolved placeholders become empty strings
    - Test missing template file returns error without crash
    - Test HTML content passes through correctly
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 3.7, 7.5_

- [ ] 3. Implement Nodemailer transport and retry logic
  - [ ] 3.1 Configure Nodemailer transport with environment variables
    - Configure SMTP transport using env vars: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
    - Implement SMTP connectivity verification on application startup and log connection status
    - Send emails with rendered HTML body and plain-text fallback
    - Set configured sender address in the "from" field
    - _Requirements: 4.1, 4.2, 4.3, 4.6_

  - [ ] 3.2 Implement retry handler with exponential backoff
    - Retry failed SMTP sends up to 3 times with exponential backoff (1s, 2s, 4s delays)
    - If all retries fail, record failure in Email_Log with delivery_status "failed" and proceed to next recipient
    - Process email batches sequentially with configurable inter-send delay (default 500ms)
    - _Requirements: 4.4, 4.5, 4.7_

  - [ ]* 3.3 Write property test for retry behavior
    - **Property 6: Retry Behavior with Exponential Backoff**
    - Generate random failure sequences, verify retry count never exceeds 3 and timing follows (1s, 2s, 4s) pattern
    - **Validates: Requirements 4.4, 4.5**

  - [ ]* 3.4 Write unit tests for Nodemailer transport and retry logic
    - Test exponential backoff timing (1s, 2s, 4s)
    - Test max 3 retries enforced
    - Test success on retry N stops further retries
    - Test all retries exhausted records failure
    - _Requirements: 4.4, 4.5, 4.7_

- [ ] 4. Checkpoint - Verify template engine and transport
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement recipient identification
  - [ ] 5.1 Implement weekly email recipient identifier
    - Query users with at least one active assignment where segment status is "active" AND (access_duration_days is null OR current_date ≤ assigned_at + access_duration_days)
    - Return one EmailRecipient per active segment assignment per user
    - Exclude expired assignments and draft/archived segments
    - _Requirements: 1.2, 1.3, 1.8, 1.9_

  - [ ] 5.2 Implement monthly email recipient identifier
    - Query users who have completed all lessons in all modules of an assigned segment (Segment_Completion)
    - Exclude users with incomplete progress for a segment
    - _Requirements: 2.2, 2.7_

  - [ ]* 5.3 Write property test for weekly recipient identification
    - **Property 1: Weekly Recipient Identification Correctness**
    - Generate random user/assignment/segment states, verify recipient list matches expected filtering rules (active segment, within access duration)
    - **Validates: Requirements 1.2, 1.3, 1.8, 1.9**

  - [ ]* 5.4 Write property test for monthly recipient identification
    - **Property 2: Monthly Recipient Identification Correctness**
    - Generate random progress states, verify only fully-completed user-segment pairs are returned
    - **Validates: Requirements 2.2, 2.7**

  - [ ]* 5.5 Write unit tests for recipient identification
    - Test weekly: only active assignments with non-expired access duration included
    - Test weekly: draft/archived segments excluded
    - Test weekly: one email per active assignment per user
    - Test monthly: only users with full segment completion included
    - Test monthly: incomplete progress excludes user-segment pairs
    - _Requirements: 1.2, 1.3, 1.8, 1.9, 2.2, 2.7, 7.3_

- [ ] 6. Implement deduplication checker
  - [ ] 6.1 Implement deduplication logic with time-window checks
    - Query Email_Log for existing record matching user_id, segment_id, email_type within current window (7 days for weekly, 30 days for monthly)
    - If "sent" record exists within window, skip send and log deduplication event
    - If "failed" record exists within window, allow resend attempt
    - _Requirements: 1.4, 1.5, 2.3, 2.4, 5.3, 5.4, 5.5_

  - [ ]* 6.2 Write property test for email deduplication idempotence
    - **Property 3: Email Deduplication Idempotence**
    - Generate random send attempts within/outside windows, verify exactly one "sent" record per user-segment pair per window
    - **Validates: Requirements 1.5, 2.4, 5.4, 5.6**

  - [ ]* 6.3 Write unit tests for deduplication checker
    - Test "sent" record within window blocks resend
    - Test "failed" record within window allows resend
    - Test records outside window do not block new sends
    - Test window calculation for both 7-day and 30-day periods
    - _Requirements: 5.3, 5.4, 5.5, 5.6, 7.4_

- [ ] 7. Implement email service and scheduler
  - [ ] 7.1 Implement Email Service orchestration
    - Compose weekly and monthly email flows: identify recipients → check deduplication → render template → send via Nodemailer → log result
    - Create Email_Log record with delivery_status "sent" on success or "failed" on failure with error details
    - Continue sending monthly emails indefinitely each 30-day cycle until administratively disabled
    - _Requirements: 1.6, 1.7, 2.5, 2.6, 2.8_

  - [ ] 7.2 Implement Email Scheduler with cron jobs
    - Read WEEKLY_EMAIL_CRON and MONTHLY_EMAIL_CRON from environment variables
    - Register cron jobs using node-cron and log next scheduled execution time on startup
    - Log job start (time, email type, eligible recipient count) and completion (end time, sent/skipped/failed counts)
    - Implement single-instance execution guard using database lock to prevent concurrent job execution
    - Handle unhandled errors gracefully (log error, scheduler continues running)
    - _Requirements: 1.1, 2.1, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ] 8. Checkpoint - Verify email notification system end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implement health endpoint and deployment configuration
  - [ ] 9.1 Implement GET /health endpoint
    - Return HTTP 200 with JSON body indicating service status, database connectivity, email transport status, and scheduler status
    - Application must respond to health check within 5 seconds of startup
    - _Requirements: 8.5, 8.6_

  - [ ] 9.2 Verify and document environment variables
    - Ensure all required production env vars are documented in `.env.example` (SMTP config, cron expressions, template dir, subject lines, database URL)
    - Log startup configuration (port, database connection status, email transport status, scheduler registration) without exposing secrets
    - _Requirements: 8.3, 8.8_

  - [ ] 9.3 Generate deployment-ready builds
    - Produce optimized frontend assets (minified JS, CSS, static files) in dist directory
    - Compile backend TypeScript to JavaScript as runnable Node.js application
    - Ensure build runs without devDependencies in production node_modules
    - Include database migration scripts executable against fresh PostgreSQL instance
    - _Requirements: 8.1, 8.2, 8.4, 8.7_

  - [ ]* 9.4 Write unit tests for health endpoint
    - Test returns 200 with correct JSON shape
    - Test reports database connectivity status
    - Test reports email transport status
    - _Requirements: 8.5, 8.6_

- [ ] 10. QA testing and cross-milestone verification
  - [ ] 10.1 Write integration tests for email notification flows
    - Test full email send flow with mocked SMTP (Nodemailer createTestAccount or ethereal.email)
    - Test scheduler job execution end-to-end with test database
    - Test health endpoint with real database connection
    - _Requirements: 7.1, 7.3, 7.4_

  - [ ] 10.2 Write cross-milestone API integration tests (M1–M5)
    - Test authentication flows: login, forgot password, token validation (M1)
    - Test segment access control and duration enforcement (M3)
    - Test lesson completion and progress tracking (M3)
    - At minimum one positive and one negative test case per endpoint
    - _Requirements: 7.1, 7.7, 7.8, 7.9_

  - [ ] 10.3 Verify test coverage and generate coverage report
    - Ensure minimum 80% line coverage across service modules
    - Generate coverage report indicating line coverage percentage per module
    - _Requirements: 7.2, 7.6_

  - [ ] 10.4 Confirm client-provided email templates are present
    - Verify template files exist in configured EMAIL_TEMPLATE_DIR before marking template integration complete
    - Reuse existing success/status/modal patterns only where email QA or admin confirmation UI is needed
    - _Requirements: 3.1, 3.2_

  - [ ] 10.5 Fix critical bugs found during QA
    - Address any critical issues discovered during integration and cross-milestone testing
    - _Requirements: 7.1, 7.2_

- [ ] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Email templates are client-provided — no custom email design is created in the app
- CRM/external integrations are explicitly out of scope
- Configuration is via environment variables and filesystem (no admin UI for email management)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "3.2"] },
    { "id": 3, "tasks": ["3.3", "3.4", "5.1", "5.2"] },
    { "id": 4, "tasks": ["5.3", "5.4", "5.5", "6.1"] },
    { "id": 5, "tasks": ["6.2", "6.3", "7.1"] },
    { "id": 6, "tasks": ["7.2"] },
    { "id": 7, "tasks": ["9.1", "9.2", "9.3"] },
    { "id": 8, "tasks": ["9.4", "10.1", "10.2"] },
    { "id": 9, "tasks": ["10.3", "10.4"] },
    { "id": 10, "tasks": ["10.5"] }
  ]
}
```
