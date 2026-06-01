# Requirements Document

## Introduction

Milestone 1 establishes the technical foundation for the Rhose learning platform MVP. This includes monorepo project setup, environment configuration, user authentication flows (login, forgot password, profile management), base data models for the content hierarchy (Segments, Modules, Lessons), and responsive layout scaffolding for desktop and mobile. Users cannot self-register; all accounts are created by admins.

## Design References

- Auth/Profile Screens: `.kiro/context/screenshots/USER_PROFILE.webp`
- Mobile Auth/Profile: `.kiro/context/screenshots/MOBILE_VIEW.png`
- Global Style: `.kiro/context/screenshot-catalog.md`, `STYLE.png`, `OVERLAY.png`

Use these as UI references only. Functional scope remains controlled by the SOW and this requirements file.

## Glossary

- **Auth_Service**: The backend service responsible for authentication operations including login, token management, and password reset.
- **User_Service**: The backend service responsible for user account CRUD operations and profile management.
- **Password_Hasher**: The utility that hashes plaintext passwords using bcrypt before storage.
- **Token_Generator**: The utility that creates cryptographically secure reset tokens with configurable expiry.
- **Schema_Validator**: The Zod-based validation layer that validates all API request payloads.
- **Layout_Shell**: The responsive application shell providing navigation, sidebar, and content area across breakpoints.
- **Segment**: A top-level learning programme container that groups related Modules.
- **Module**: A grouping of Lessons within a Segment.
- **Lesson**: An individual learning unit within a Module containing text content or external video links.
- **Admin**: A user with elevated privileges who manages accounts, content, and assignments.
- **Learner**: A standard user who accesses assigned learning content.

## Requirements

### Requirement 1: Monorepo Project Structure

**User Story:** As a developer, I want a configured monorepo with frontend and backend workspaces so that the team can develop, build, and run both applications from a single repository.

#### Acceptance Criteria

1. THE Monorepo SHALL contain separate workspace directories for frontend and backend applications with independent dependency management.
2. THE Frontend_Workspace SHALL use Vite as the build tool, React with TypeScript as the UI framework, shadcn/ui for component primitives, and Tailwind CSS for styling.
3. THE Backend_Workspace SHALL use Node.js with Express as the server framework, PostgreSQL as the database, Drizzle ORM for database access, and Zod for request validation.
4. WHEN a developer runs the install command from the repository root, THE Package_Manager SHALL install dependencies for both frontend and backend workspaces.
5. WHEN a developer runs the development command, THE Dev_Server SHALL start both frontend and backend applications with hot-reload enabled.
6. THE Monorepo SHALL include environment configuration files with documented variables for database connection, server port, JWT secret, and email service credentials.

### Requirement 2: User Login

**User Story:** As an admin-created user, I want to log in with my email and password so that I can access the platform securely.

#### Acceptance Criteria

1. WHEN a user submits valid email and password credentials, THE Auth_Service SHALL verify the password against the stored hash and return a signed JWT access token.
2. WHEN a user submits an email that does not exist in the database, THE Auth_Service SHALL return a 401 Unauthorized response without revealing whether the email exists.
3. WHEN a user submits a correct email with an incorrect password, THE Auth_Service SHALL return a 401 Unauthorized response with a generic "Invalid credentials" message.
4. WHEN a login request is missing the email field or the password field, THE Schema_Validator SHALL return a 400 Bad Request response with field-specific validation errors.
5. WHEN a user submits an email in an invalid format, THE Schema_Validator SHALL return a 400 Bad Request response indicating the email format is invalid.
6. THE Auth_Service SHALL include the user role (admin or learner) in the JWT token payload.
7. WHEN a valid JWT token is provided in the Authorization header, THE Auth_Service SHALL grant access to protected endpoints.
8. WHEN an expired or malformed JWT token is provided, THE Auth_Service SHALL return a 401 Unauthorized response.

### Requirement 3: Forgot Password

**User Story:** As a user who has forgotten their password, I want to request a password reset so that I can regain access to my account.

#### Acceptance Criteria

1. WHEN a user submits a registered email address to the forgot-password endpoint, THE Auth_Service SHALL generate a cryptographically secure reset token, store the token hash with a 60-minute expiry, and send a reset link to the email address via Nodemailer.
2. WHEN a user submits an unregistered email address to the forgot-password endpoint, THE Auth_Service SHALL return a 200 OK response without revealing whether the email exists in the system.
3. WHEN a user submits a valid reset token and a new password to the reset-password endpoint, THE Auth_Service SHALL hash the new password, update the stored password, and invalidate the reset token.
4. WHEN a user submits an expired reset token, THE Auth_Service SHALL return a 400 Bad Request response indicating the token has expired.
5. WHEN a user submits a reset token that has already been used, THE Auth_Service SHALL return a 400 Bad Request response indicating the token is invalid.
6. WHEN a user submits a new password that does not meet minimum length of 8 characters, THE Schema_Validator SHALL return a 400 Bad Request response with a descriptive validation error.
7. FOR ALL valid reset tokens, THE Token_Generator SHALL produce tokens with at least 32 bytes of cryptographic randomness.

### Requirement 4: Password Hashing

**User Story:** As a platform operator, I want all passwords hashed before storage so that user credentials remain secure even if the database is compromised.

#### Acceptance Criteria

1. THE Password_Hasher SHALL hash all passwords using bcrypt with a minimum cost factor of 10 before storing them in the database.
2. THE Password_Hasher SHALL never store plaintext passwords in the database or application logs.
3. FOR ALL plaintext passwords, hashing then verifying the same plaintext against the hash SHALL return true (round-trip property).
4. FOR ALL distinct plaintext passwords, THE Password_Hasher SHALL produce distinct hash outputs.
5. THE Auth_Service SHALL never return password hashes in any API response payload.

### Requirement 5: User Profile Management

**User Story:** As an authenticated user, I want to view and update my profile details so that my account information stays current.

#### Acceptance Criteria

1. WHEN an authenticated user requests their profile, THE User_Service SHALL return the user's name, email, role, and profile metadata without including the password hash.
2. WHEN an authenticated user submits valid profile updates (name, email), THE User_Service SHALL persist the changes and return the updated profile.
3. WHEN an authenticated user submits a profile update with an email already used by another account, THE User_Service SHALL return a 409 Conflict response indicating the email is already in use.
4. WHEN an authenticated user submits a password change with a valid current password and a valid new password, THE User_Service SHALL hash the new password and update the stored credential.
5. WHEN an authenticated user submits a password change with an incorrect current password, THE User_Service SHALL return a 401 Unauthorized response.
6. WHEN an unauthenticated request is made to the profile endpoint, THE Auth_Service SHALL return a 401 Unauthorized response.
7. WHEN a profile update request contains invalid field values, THE Schema_Validator SHALL return a 400 Bad Request response with field-specific validation errors.

### Requirement 6: Base Data Models

**User Story:** As a developer, I want Drizzle ORM schema definitions for Segments, Modules, and Lessons so that future milestones can build content management and learning features on a stable data layer.

#### Acceptance Criteria

1. THE Segment_Schema SHALL define columns for id (UUID primary key), title (text, required), description (text, optional), status (enum: draft, active, archived), created_at (timestamp), and updated_at (timestamp).
2. THE Module_Schema SHALL define columns for id (UUID primary key), segment_id (foreign key referencing Segment), title (text, required), description (text, optional), sort_order (integer), created_at (timestamp), and updated_at (timestamp).
3. THE Lesson_Schema SHALL define columns for id (UUID primary key), module_id (foreign key referencing Module), title (text, required), content_type (enum: text, video), content_body (text, optional), video_url (text, optional), sort_order (integer), created_at (timestamp), and updated_at (timestamp).
4. THE User_Schema SHALL define columns for id (UUID primary key), email (text, unique, required), password_hash (text, required), name (text, required), role (enum: admin, learner), status (enum: active, inactive, deactivated), created_at (timestamp), and updated_at (timestamp).
5. WHEN a Module references a Segment that does not exist, THE Database SHALL reject the insert with a foreign key constraint violation.
6. WHEN a Lesson references a Module that does not exist, THE Database SHALL reject the insert with a foreign key constraint violation.
7. WHEN a Drizzle migration is run against an empty database, THE Migration_Runner SHALL create all tables with correct columns, types, and constraints without errors.
8. FOR ALL schema definitions, running migration then introspecting the database SHALL produce table structures matching the Drizzle schema definitions (round-trip property).

### Requirement 7: Responsive Layout Shell

**User Story:** As a user, I want the application layout to adapt between desktop and mobile viewports so that I can use the platform on any device.

#### Acceptance Criteria

1. WHILE the viewport width is 1024px or greater, THE Layout_Shell SHALL render a 12-column grid layout with a persistent sidebar navigation and a main content area.
2. WHILE the viewport width is less than 1024px, THE Layout_Shell SHALL render a 4-column grid layout with a collapsible navigation menu and a full-width content area.
3. THE Layout_Shell SHALL use Inter as the primary font family with the typography scale: 36px bold for page headings, 24px bold for section headings, 20px semibold for card headings, 16px for body text, and 14px for helper text.
4. THE Layout_Shell SHALL apply the defined color tokens (navy, primary teal, danger red, success green, warning amber, muted slate) consistently through Tailwind CSS theme variables.
5. WHEN a user resizes the browser window across the 1024px breakpoint, THE Layout_Shell SHALL transition between desktop and mobile layouts without page reload.
6. THE Layout_Shell SHALL render navigation links appropriate to the authenticated user's role (admin navigation for admins, learner navigation for learners).

### Requirement 8: API Error Handling

**User Story:** As a frontend developer, I want consistent API error response shapes so that the client can reliably parse and display errors.

#### Acceptance Criteria

1. THE Backend SHALL return all error responses in the shape: `{ success: false, error: { code: string, message: string, details?: object } }`.
2. THE Backend SHALL return all success responses in the shape: `{ success: true, data: object }`.
3. WHEN a request fails Zod validation, THE Schema_Validator SHALL return HTTP 400 with error code "VALIDATION_ERROR" and field-specific details.
4. WHEN a request fails authentication, THE Auth_Service SHALL return HTTP 401 with error code "UNAUTHORIZED".
5. WHEN a request fails authorization, THE Auth_Service SHALL return HTTP 403 with error code "FORBIDDEN".
6. WHEN a requested resource does not exist, THE Backend SHALL return HTTP 404 with error code "NOT_FOUND".
7. WHEN an unhandled server error occurs, THE Backend SHALL return HTTP 500 with error code "INTERNAL_ERROR" without exposing stack traces or internal details.
8. FOR ALL API endpoints, THE Backend SHALL include appropriate CORS headers for the configured frontend origin.

### Requirement 9: Admin User Creation

**User Story:** As an admin, I want to create user accounts so that learners can access the platform without self-registration.

#### Acceptance Criteria

1. WHEN an authenticated admin submits a valid user creation request with name, email, and role, THE User_Service SHALL create the account with a temporary password, hash the password, store the user record, and return the created user profile without the password hash.
2. WHEN an admin submits a user creation request with an email already in use, THE User_Service SHALL return a 409 Conflict response.
3. WHEN a non-admin user attempts to create a user account, THE Auth_Service SHALL return a 403 Forbidden response.
4. WHEN an admin submits a user creation request with missing required fields, THE Schema_Validator SHALL return a 400 Bad Request response with field-specific validation errors.
5. WHEN a user account is created, THE User_Service SHALL store the account with status "active" and the specified role.

## Scope Guardrails

- This milestone covers project setup, authentication, profile management, base data models, and responsive layout only.
- Admin content management (CRUD for Segments, Modules, Lessons) belongs to Milestone 2.
- User learning experience (dashboard, lesson viewing, progress) belongs to Milestone 3.
- Quizzes belong to Milestone 4.
- Email notifications (weekly/monthly) belong to Milestone 5.
- SSO, MFA, analytics, bulk imports, and role-based admin permissions are out of scope for the MVP.
