# Design and UI Steering

## Current Status

Global style and screen-level screenshot references have been provided. Kiro may not read images reliably, so use the text file below as the authoritative interpretation:

- `.kiro/context/screenshot-catalog.md`

Available visual assets:
- `.kiro/context/STYLE.png`
- `.kiro/context/OVERLAY.png`
- `.kiro/context/screenshots/COMPONENTS.png`
- `.kiro/context/screenshots/CONTENT_MANAGEMENT.png`
- `.kiro/context/screenshots/DASHBOARD_SCREEN.png`
- `.kiro/context/screenshots/LESSON_VIDEO_and_TEXTSLIDE.png`
- `.kiro/context/screenshots/MOBILE_VIEW.png`
- `.kiro/context/screenshots/USER_MANAGMENT_SCREENS.png`
- `.kiro/context/screenshots/USER_PROFILE.webp`

## UI Consistency Requirement

Generated UI must keep consistency across admin and learner experiences.

This includes:
- Layout structure.
- Spacing.
- Typography.
- Colors.
- Button hierarchy.
- Form styling.
- Table/list patterns.
- Empty states.
- Loading states.
- Error states.
- Responsive behavior.
- Navigation patterns.
- shadcn/Tailwind usage conventions.

## Screen Mapping

- M1 uses auth and profile screenshots from `USER_PROFILE.webp` and mobile auth/profile screenshots from `MOBILE_VIEW.png`.
- M2 uses admin dashboard, content management, user management, create user, assign training, and segment details screenshots from `DASHBOARD_SCREEN.png`, `CONTENT_MANAGEMENT.png`, and `USER_MANAGMENT_SCREENS.png`.
- M3 uses learner active training, segment content, lesson video/text-slide, module accordion, and mobile lesson screenshots from `LESSON_VIDEO_and_TEXTSLIDE.png`, `COMPONENTS.png`, and `MOBILE_VIEW.png`.
- M4 uses quiz placement and quiz-related list/activity patterns from `COMPONENTS.png`, `CONTENT_MANAGEMENT.png`, `DASHBOARD_SCREEN.png`, and `LESSON_VIDEO_and_TEXTSLIDE.png`. Keep quiz flow non-blocking and basic.
- M5 has no standalone email UI screenshot. Use existing success modal/status patterns for QA/admin confirmations only where needed.

## Component Rules

- Prefer existing shadcn/ui components where they match the design.
- Use Tailwind for layout and custom styling.
- Avoid creating duplicate versions of the same component.
- Keep shared components reusable across admin and learner flows.
- Do not invent UI flows that are not shown in Figma unless needed to satisfy SOW functionality. If a required SOW flow is missing in Figma, mark it as a design gap.

## UI Gap Policy

Use this format wherever a UI flow is missing:

```md
### UI/Figma Gap
Status: Pending Figma reference or clarification

Required by SOW:
- ...

Needed from design/client:
- Screen/frame for ...
- Empty state for ...
- Error/loading state for ...
- Mobile layout for ...

Instruction to Kiro:
Do not invent final UI. Implement only safe structure and keep styles consistent with the attached screenshot/Figma context.
```
