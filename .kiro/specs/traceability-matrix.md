# Rhose MVP Traceability Matrix

| Milestone | SOW Scope | Main Entities | Screenshot/Figma References | Notes |
|---|---|---|---|---|
| M1 | Project setup, auth, forgot password, profile, base segment/module/lesson models, responsive layout foundation | users, password reset tokens, segments, modules, lessons | USER_PROFILE.webp, MOBILE_VIEW.png, STYLE.png, OVERLAY.png | Auth/profile UI is now text-mapped. Layout shell should support both admin and learner flows. |
| M2 | Admin dashboard, content CRUD, user creation/reset, assign/remove users from segments | users, segments, modules, lessons, segment assignments | DASHBOARD_SCREEN.png, CONTENT_MANAGEMENT.png, USER_MANAGMENT_SCREENS.png, COMPONENTS.png | No bulk import or role-based admin permissions. Screenshot job-title roles are metadata, not admin permission roles. |
| M3 | User dashboard, assigned segments, lesson views, completion confirmation, segment access duration | segment assignments, lessons, lesson progress | LESSON_VIDEO_and_TEXTSLIDE.png, COMPONENTS.png, MOBILE_VIEW.png | No offline/downloadable content. Module accordion and lesson sidebar are defined by screenshots. |
| M4 | Multiple-choice quizzes, lesson/module progress, non-blocking quiz flow | quizzes, questions, options, responses, progress | COMPONENTS.png, CONTENT_MANAGEMENT.png, LESSON_VIDEO_and_TEXTSLIDE.png, DASHBOARD_SCREEN.png | No certificates or detailed analytics. Quiz appears after content / in admin content flow but must not block progression. |
| M5 | Weekly/monthly email triggers, template integration, QA, deployment-ready build | email templates, email logs/schedules | STYLE.png, OVERLAY.png, existing modal/status patterns only | No standalone email UI screenshot. No CRM integrations or custom email design. |

## Usage

Before implementation, each screen should be mapped to one milestone. If a screen contains features from multiple milestones, split implementation accordingly instead of merging milestone scopes.

Kiro must use `.kiro/context/screenshot-catalog.md` because it may not be able to read screenshots directly.
