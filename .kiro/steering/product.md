# Product Steering: Rhose Learning Platform MVP

## Product Overview

Rhose is a web-based learning platform MVP for delivering structured learning programmes through a controlled admin-managed experience.

The platform supports:
- Admin-managed users.
- Structured content hierarchy: Segments, Modules, Lessons.
- Assigned segment access for users.
- Text lessons and externally hosted video links.
- Lesson completion confirmation.
- Basic non-blocking multiple-choice quizzes.
- Progress tracking at lesson/module level.
- Weekly segment-related emails and monthly general emails after segment completion.

## Core Business Rules

- Users cannot self-register.
- Admins create and manage user accounts.
- Users can only access segments assigned to them.
- Segment access must respect configured duration.
- Lessons may include text content and external video URLs.
- Quizzes are simple multiple-choice and must not block progression.
- Analytics, advanced reporting, certificates, SSO, MFA, CRM integrations, bulk imports, and role-based admin permissions are out of scope for the MVP unless added through a change request.

## Screenshot Interpretation Rule

Kiro must not depend on reading screenshots directly. Use `.kiro/context/screenshot-catalog.md` as the textual interpretation of all attached Figma/export screenshots.

## User Types

### Admin
Responsible for managing users, content, segment assignments, password resets, and platform readiness.

Admin screens use the left sidebar shell, dashboard cards, content management views, user management views, create/edit flows, assignment flows, and success modals described in the screenshot catalog.

### Learner/User
Responsible for accessing assigned learning segments, viewing lessons, confirming lesson completion, taking non-blocking quizzes, and tracking progress.

Learner screens use the active training dashboard, segment content accordion, lesson video/text-slide view, mobile lesson flow, and profile screens described in the screenshot catalog.

## Acceptance Principles

- Build only what is covered by the SOW or explicitly confirmed later.
- Keep UI consistent with the client-provided screenshot/Figma design context.
- Preserve responsive behavior across desktop and mobile.
- Do not introduce advanced analytics, certificates, custom email designs, SSO, MFA, or bulk imports unless approved separately.
- If a screenshot shows functionality beyond the SOW, document it as a clarification instead of implementing it by default.
