# Scope Boundaries

## In Scope

- Admin-managed user accounts.
- Authentication: login, forgot password, profile management.
- Content hierarchy: Segments, Modules, Lessons.
- Admin content management.
- User segment assignment/removal.
- Assigned user dashboard.
- Lesson rendering with text and external video links.
- Lesson completion confirmation.
- Segment access duration handling.
- Basic multiple-choice quizzes.
- Non-blocking quiz flow.
- Lesson and module progress tracking.
- Weekly segment-related emails.
- Monthly general emails after segment completion.
- QA fixes and deployment-ready build.

## Out of Scope Unless Approved Later

- User self-registration.
- SSO.
- MFA.
- Advanced security features.
- Analytics and advanced reporting.
- Bulk user imports.
- Role-based admin permissions.
- Offline access.
- Downloadable lesson content.
- Certificates.
- Detailed scoring analytics.
- CRM or external system integrations.
- Custom email design.
- Any feature visible in Figma but not supported by the SOW unless confirmed by the client.

## Conflict Resolution

- SOW controls functional scope.
- Figma controls UI/UX design.
- If SOW and Figma conflict, document the conflict as a clarification item.
- Do not silently add scope.


## Screenshot Scope Guardrails

The screenshots are UI references, not automatic scope approval.

- Dashboard recent activity is allowed as a lightweight display only if supported by existing/basic events. It must not become advanced analytics.
- Job-title dropdown values shown in screenshots may be treated as user profile metadata. They must not become role-based admin permissions.
- Quiz pass/fail and score rows may be shown as basic quiz attempt output only. They must not introduce detailed scoring analytics.
- Any visible feature not listed in the SOW must be marked as a clarification item before implementation.
- Kiro must use `.kiro/context/screenshot-catalog.md` for screenshot interpretation.
