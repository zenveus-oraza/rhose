# Technical Steering

## Monorepo Stack

The application is a monorepo with:

### Frontend
- Vite
- React
- TypeScript
- shadcn/ui
- Tailwind CSS
- Mixed usage of shadcn components and custom Tailwind components

### Backend
- Node.js
- Express
- PostgreSQL
- Drizzle ORM
- Zod for request validation
- Email/password authentication stored in DB
- Nodemailer for email delivery

## General Implementation Standards

- Keep code modular and reusable.
- Use clear separation between frontend, backend, shared types/schemas, and database concerns.
- Prefer shared validation schemas where practical, but do not force over-abstraction early.
- Use Zod for API request validation.
- Use Drizzle ORM for schema definitions, queries, and migrations.
- Use explicit service-layer functions for business logic.
- Keep controllers thin.
- Use consistent API response shapes.
- Use proper error handling for validation, authentication, authorization, not found, and server errors.
- Do not leak sensitive user or auth details in API responses.

## Suggested Backend Structure

Adapt to the existing monorepo structure, but keep this logical shape:

```txt
backend/
  src/
    modules/
      auth/
      users/
      segments/
      modules/
      lessons/
      quizzes/
      progress/
      emails/
    db/
      schema/
      migrations/
    middleware/
    utils/
    config/
```

## Suggested Frontend Structure

Adapt to the existing monorepo structure, but keep this logical shape:

```txt
frontend/
  src/
    app/
    routes/
    features/
      auth/
      admin/
      learning/
      profile/
    components/
      ui/
      layout/
      shared/
    lib/
    hooks/
    services/
    types/
```

## Auth Rules

- Authentication is email/password based.
- Passwords must be hashed before storage.
- User passwords must never be returned from APIs.
- Forgot password should use a token or OTP style reset flow stored securely with expiry.
- Admin-created users should receive credentials or password setup/reset flow according to the final agreed flow.
- Self-registration is out of scope.

## API Rules

- Every write endpoint should validate payloads with Zod.
- Every protected endpoint should require authenticated user context.
- Admin-only endpoints must enforce admin access.
- Learner endpoints must enforce ownership/assignment checks.
- Segment access checks must consider assignment and access duration.


## Frontend UI Implementation Rules From Screenshots

- Use a shared admin layout shell for Dashboard, User Management, Content Management, Create User, Create Segment, Assign Training, and Segment Details.
- Use a shared learner layout shell for Active Training, Lesson View, and Profile.
- Build shared reusable components before screen-specific variants: Button, FormField, Select/Dropdown, StatusBadge, Card, DataTable/List, ActionMenu, SuccessModal, SegmentAccordion, ProgressBar, Sidebar, PageHeader.
- Use the screenshot catalog for UI decisions where image reading is unavailable.
- Do not hardcode one-off Tailwind styles inside every screen if a reusable component variant should exist.
