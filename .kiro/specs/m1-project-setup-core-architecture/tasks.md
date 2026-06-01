# Implementation Plan: M1 Project Setup & Core Architecture

## Overview

This implementation plan covers the foundational setup for the Rhose learning platform MVP. It establishes the monorepo structure, backend environment and database configuration, user authentication flows (login, forgot/reset password), user profile management, base data models (Users, Segments, Modules, Lessons), responsive layout scaffolding, and admin user creation. Tasks are grouped into backend foundation, authentication, frontend, and UI/Figma follow-up phases.

## Tasks

- [x] 1. Set up monorepo and backend foundation
  - [x] 1.1 Initialize or verify monorepo workspace scripts for frontend, backend, linting, type checking, and local dev
    - Ensure root package.json has workspace scripts for `dev`, `build`, `lint`, `typecheck`
    - Verify frontend uses Vite + React + TypeScript + shadcn/ui + Tailwind CSS
    - Verify backend uses Node.js + Express + TypeScript
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 1.2 Configure backend environment variables for DB, auth secrets, email settings, and app URLs
    - Create `.env.example` with documented variables for database connection, server port, JWT secret, email service credentials, and frontend origin
    - Set up env validation with Zod
    - _Requirements: 1.6, 8.8_

  - [x] 1.3 Set up Drizzle ORM connection and baseline schema files
    - Configure Drizzle with PostgreSQL connection
    - Create schema directory structure and drizzle config
    - Set up migration tooling
    - _Requirements: 1.3, 6.7_

  - [x] 1.4 Set up API error handling middleware and consistent response shapes
    - Implement global error handler returning `{ success: false, error: { code, message, details? } }`
    - Implement success response wrapper returning `{ success: true, data }`
    - Add CORS middleware for configured frontend origin
    - Implement Zod validation error formatting with field-specific details
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

- [x] 2. Implement data models
  - [x] 2.1 Create users table with role, email, password hash, profile fields, and timestamps
    - Define Drizzle schema for users table with UUID PK, email (unique), password_hash, name, role enum (admin/learner), status enum (active/inactive/deactivated), created_at, updated_at
    - Create password_reset_tokens table with token_hash, expires_at, used_at
    - _Requirements: 6.4, 3.1_

  - [x] 2.2 Create segments, modules, and lessons tables with ordering fields and status flags
    - Define segments table: id, title, description, status enum (draft/active/archived), timestamps
    - Define modules table: id, segment_id (FK → segments), title, description, sort_order, timestamps
    - Define lessons table: id, module_id (FK → modules), title, content_type enum (text/video), content_body, video_url, sort_order, timestamps
    - Enforce foreign key constraints
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6_

  - [x] 2.3 Run initial migration and verify schema
    - Generate and run Drizzle migration against database
    - Verify all tables, columns, types, and constraints are created correctly
    - _Requirements: 6.7, 6.8_

- [x] 3. Checkpoint - Ensure database and foundation are working
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement authentication
  - [x] 4.1 Implement Zod schemas for login, forgot password, reset password, and profile update
    - Login schema: email (valid format, required), password (required)
    - Forgot password schema: email (valid format, required)
    - Reset password schema: token (required), newPassword (min 8 chars)
    - Profile update schema: name (optional), email (optional, valid format)
    - Password change schema: currentPassword (required), newPassword (min 8 chars)
    - User creation schema: name (required), email (required, valid format), role (admin/learner)
    - _Requirements: 2.4, 2.5, 3.6, 5.7, 9.4_

  - [x] 4.2 Implement password hasher utility using bcrypt
    - Hash with minimum cost factor of 10
    - Implement verify function
    - Ensure plaintext is never stored or logged
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 4.3 Implement JWT auth middleware
    - Verify JWT from Authorization header
    - Extract user id and role from token payload
    - Return 401 for expired/malformed tokens
    - Implement role-based authorization (admin guard)
    - _Requirements: 2.6, 2.7, 2.8, 8.4, 8.5_

  - [x] 4.4 Implement login endpoint with password verification and JWT response
    - POST `/api/auth/login` — verify credentials, return signed JWT with user id and role
    - Return generic 401 for non-existent email or wrong password (no email enumeration)
    - _Requirements: 2.1, 2.2, 2.3, 2.6_

  - [x] 4.5 Implement forgot/reset password flow with secure expiring reset token and Nodemailer integration
    - POST `/api/auth/forgot-password` — generate 32+ byte token, store hash with 60-min expiry, send email via Nodemailer
    - Return 200 regardless of email existence (no enumeration)
    - POST `/api/auth/reset-password` — validate token, hash new password, update user, invalidate token
    - Reject expired and already-used tokens with 400
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.7_

  - [x] 4.6 Write property tests for password hashing
    - **Property 1: Password Hash Round-Trip** — hashing then verifying same plaintext returns true
    - **Property 2: Distinct Passwords Produce Distinct Hashes** — different plaintexts produce different hashes
    - **Validates: Requirements 4.3, 4.4**

  - [x] 4.7 Write property tests for auth service
    - **Property 3: Valid Login Returns JWT with Role** — valid credentials return JWT containing user id and role
    - **Property 4: Invalid JWT is Rejected** — malformed/expired tokens return 401, valid tokens grant access
    - **Property 5: Validation Rejects Invalid Payloads** — invalid payloads return 400 with field-specific errors
    - **Validates: Requirements 2.1, 2.4, 2.5, 2.6, 2.7, 2.8**

  - [x] 4.8 Write property tests for password reset flow
    - **Property 6: Password Reset Round-Trip** — valid reset updates password and invalidates token
    - **Property 7: Reset Token Cryptographic Strength** — tokens contain at least 32 bytes of randomness
    - **Validates: Requirements 3.3, 3.7**

- [x] 5. Implement user management
  - [x] 5.1 Implement profile get/update endpoints
    - GET `/api/users/profile` — return user name, email, role, metadata (no password hash)
    - PATCH `/api/users/profile` — update name/email, return 409 on duplicate email
    - POST `/api/users/change-password` — verify current password, hash and store new password
    - Return 401 for unauthenticated requests and incorrect current password
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 4.5_

  - [x] 5.2 Implement admin user creation endpoint
    - POST `/api/users` — admin-only, create user with temporary password, hash password, store with status "active" and specified role
    - Return 409 on duplicate email, 403 for non-admin, 400 for missing fields
    - Never return password hash in response
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 5.3 Write property tests for user management
    - **Property 8: Profile Update Round-Trip** — update then fetch returns updated values
    - **Property 9: Password Change Round-Trip** — after change, new password works and old is rejected
    - **Property 10: No Password Hash in API Responses** — no endpoint returns password_hash field
    - **Property 13: User Creation Stores Correct Status and Role** — created user has active status and specified role
    - **Validates: Requirements 5.2, 5.4, 4.5, 5.1, 9.1, 9.5**

- [x] 6. Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement frontend auth and layout
  - [x] 7.1 Create frontend auth service functions and basic protected route structure
    - Implement API client hooks for login, forgot password, reset password
    - Set up auth state management (store JWT, user role)
    - Implement protected route wrapper that redirects to login on 401
    - _Requirements: 2.7, 2.8, 5.6_

  - [x] 7.2 Create minimal responsive layout shell
    - Implement 12-column grid with persistent sidebar for desktop (≥1024px)
    - Implement 4-column grid with collapsible nav for mobile (<1024px)
    - Apply Inter font family with defined typography scale (36/24/20/16/14px)
    - Apply color tokens (navy, teal, danger red, success green, warning amber, muted slate) via Tailwind theme
    - Transition between layouts without page reload on resize
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 7.3 Create shared layout shell foundations for admin and learner routes
    - AdminLayout with sidebar navigation for admin pages
    - LearnerLayout with sidebar navigation for learner pages
    - Render role-appropriate navigation links based on authenticated user role
    - _Requirements: 7.6_

  - [x] 7.4 Create responsive auth screens following desktop split layout and mobile single-column layout
    - LoginPage: email/password form, remember me, forgot password link, contact admin link
    - ForgotPasswordPage: email field, send email button
    - ResetPasswordPage: new password, confirm password, strength indicator
    - Desktop: split layout with teal visual panel + form
    - Mobile: single-column form only
    - _Requirements: 2.1, 3.1, 7.1, 7.2_

  - [x] 7.5 Create profile/password tab UI using USER_PROFILE and MOBILE_VIEW references
    - Profile tab: editable name/email fields, avatar/cover image, role display, Cancel/Save/Edit actions
    - Password tab: current password, new password, confirm password fields
    - Mobile: logout button visible, stacked card layout
    - _Requirements: 5.1, 5.2, 5.4, 7.2_

  - [x] 7.6 Write property tests for API response consistency
    - **Property 11: API Response Shape Consistency** — all responses match defined success/error shapes
    - **Property 12: CORS Headers on All Endpoints** — all responses include CORS headers
    - **Validates: Requirements 8.1, 8.2, 8.7, 8.8**

- [x] 8. Checkpoint - Ensure all frontend and backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. UI/Figma follow-up and integration verification
  - [x] 9.1 Map each screen to the milestone requirements
    - Verify each implemented screen covers its referenced requirements
    - Document any gaps between Figma and implementation
    - _Requirements: 1.1, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 9.2 Confirm empty/loading/error states from Figma or mark as missing
    - Review each screen for loading spinners, empty state messages, error displays
    - Mark any states not shown in Figma as gaps
    - _Requirements: 7.1, 7.2, 8.1_

  - [x] 9.3 Confirm responsive behavior from Figma or mark as missing
    - Verify desktop/mobile transitions match Figma at 1024px breakpoint
    - Document any responsive behaviors not covered by screenshots
    - _Requirements: 7.1, 7.2, 7.5_

  - [x] 9.4 Ensure final implementation stays consistent with Figma, shadcn/ui, and Tailwind usage in the monorepo
    - Verify color tokens, typography, spacing, and component usage match design system
    - Ensure shadcn/ui primitives are used where appropriate
    - _Requirements: 7.3, 7.4_

  - [x] 9.5 Write integration tests for schema migration round-trip
    - **Property 14: Schema Migration Round-Trip** — migrations create tables matching Drizzle schema definitions
    - **Validates: Requirements 6.7, 6.8**

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design uses TypeScript throughout — all code examples and implementations use TypeScript
- UI implementation must follow `.kiro/steering/ui-style-guide.md`, `.kiro/steering/design-system.md`, and `.kiro/context/screenshot-catalog.md`
- Screenshots are UI/UX references only, not automatic scope additions
- The UI/Figma follow-up tasks (section 9) ensure visual consistency with design assets

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4"] },
    { "id": 2, "tasks": ["2.1", "2.2"] },
    { "id": 3, "tasks": ["2.3", "4.1", "4.2"] },
    { "id": 4, "tasks": ["4.3", "4.4", "4.5"] },
    { "id": 5, "tasks": ["4.6", "4.7", "4.8"] },
    { "id": 6, "tasks": ["5.1", "5.2"] },
    { "id": 7, "tasks": ["5.3", "7.1"] },
    { "id": 8, "tasks": ["7.2", "7.3"] },
    { "id": 9, "tasks": ["7.4", "7.5"] },
    { "id": 10, "tasks": ["7.6", "9.1"] },
    { "id": 11, "tasks": ["9.2", "9.3"] },
    { "id": 12, "tasks": ["9.4", "9.5"] }
  ]
}
```
