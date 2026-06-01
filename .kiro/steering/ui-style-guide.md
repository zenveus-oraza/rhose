# UI Style Guide Context

## Source Assets

The following UI reference images are included in `.kiro/context/`:

- `STYLE.png`: global visual style reference for colors, typography, shadows, icons, and responsive grid.
- `OVERLAY.png`: component overlay reference for button states, input states, dropdowns, menus, status badges, and confirmation modal sizing.

Kiro must use these files as UI steering context when generating frontend implementation. Figma milestone screenshots can still be attached later inside each milestone `design.md` file. These style assets are the baseline visual system until more specific screen-level Figma frames are added.

## Visual Direction

- Use a clean, soft, card-based interface.
- Prefer rounded corners, light borders, subtle shadows, and generous whitespace.
- Keep the UI consistent across admin and learner experiences.
- Do not introduce a second visual language.
- When a Figma screen conflicts with this style guide, follow the screen-level Figma for layout but preserve the shared token/component rules where possible.

## Typography

Use Inter as the primary font family.

Recommended typography scale from the style reference:

- Page/major heading: 36px, bold.
- Section heading: 24px, bold.
- Subsection/card heading: 20px, semibold.
- Body text: 16px, regular/medium/semibold as needed.
- Small text/helper text: 14px, regular/medium/semibold.
- Underlined variants may be used for links where shown in Figma.

Avoid random font sizes. Stick to the scale above unless a Figma frame explicitly requires otherwise.

## Color Tokens

Approximate token names based on the supplied style image. Final hex values should be refined from the Figma design tokens if available.

```ts
export const uiColors = {
  danger: '#E5242A',
  dangerSoft: '#FEF1F1',
  primary: '#72D3CF',
  primarySoft: '#EAF7FF',
  warning: '#F9A10B',
  warningSoft: '#FFF8E6',
  success: '#18A34A',
  successSoft: '#EAF8EF',
  navy: '#0F172A',
  slate: '#506178',
  muted: '#9CA3AF',
  border: '#E5EAF1',
  surface: '#FFFFFF',
  background: '#F8FAFC',
  disabled: '#DCE3EC'
}
```

Tailwind/shadcn theme variables should map to these colors instead of scattering hardcoded values across components.

## Buttons

Button variants from `OVERLAY.png`:

- Primary/active button: dark navy background, white text.
- Secondary button: teal background, white text.
- Outline button: white background, navy text, bordered.
- Inactive/disabled button: grey background, muted text, no click behavior.
- Button with icon: dark navy background, icon + text centered.
- Critical/destructive action button: light red background, red border/text.
- Secondary action button: light cyan background, cyan text/border.

Sizing guidance:

- Main full-width button: around 350px wide and 54px high in the overlay, radius 16px.
- Compact destructive/action button: around 206px wide and 40px high, radius 12px.
- Use responsive width where needed, but keep height/radius consistent with the reference.

Implementation rule:

- Extend the shared Button component or shadcn button variants.
- Do not create one-off button styles inside feature screens.

## Inputs and Forms

Input states from `OVERLAY.png`:

- Default: light border, white background, placeholder text.
- Active/typing: teal border and subtle focus shadow/ring.
- Filled: white background, normal border, entered value.
- Error: red border, red helper/error text below.
- Inactive/disabled: muted grey background and muted text.

Sizing guidance:

- Input width in reference: around 335px.
- Input height in reference: around 56px.
- Border radius: around 8 to 12px depending on shadcn input base.
- Label appears above input, 16px text.
- Horizontal padding: around 16px.

Implementation rule:

- Use one shared form field wrapper that handles label, input, helper text, error text, disabled state, and focus state.
- Zod validation errors should map cleanly to this error state.

## Dropdowns, Selects, and Menus

Overlay references:

- Large dropdown: around 312px wide, radius 16px, white card, subtle shadow/border.
- Dropdown item: around 43px high, 288px content width, selected state uses light grey/blue fill.
- Action menu: around 177px wide, 153px high, item height around 43px.
- Status filter menu: around 139px wide, 282px high, item height around 43px.

Implementation rule:

- Use shadcn Select/DropdownMenu/Popover where suitable.
- Keep item heights, padding, selected state, radius, and shadow consistent.
- Destructive menu actions such as Archive Segment must use the danger color.

## Status Badges

Known badge statuses from the overlay:

- Not Started
- In Progress
- Completed
- Overdue
- Inactive
- Deactivated
- Ending Soon
- On Track

Use badge variants instead of custom inline classes in every screen.

Recommended mapping:

- Not Started: neutral/outline.
- In Progress: primary/cyan.
- Completed: success/green.
- Overdue: warning/orange.
- Inactive: muted/slate.
- Deactivated: danger/red.
- Ending Soon: warning/amber.
- On Track: success/green.

## Cards, Modals, and Success States

Confirmation modal/card reference:

- Width around 550px.
- Height around 354px.
- Radius around 16px.
- White surface with subtle border/shadow.
- Centered success icon in a green circle.
- Main message in bold.
- Supporting text below.
- Primary dark action button at the bottom.

Use this pattern for success states such as:

- User created successfully.
- Password reset email sent.
- Segment created/updated.
- Lesson saved.
- Quiz saved.

## Icons

- Use one consistent icon library across the app.
- Lucide React is preferred unless the repo already standardizes another icon set.
- Match icon weight/size to the supplied icon reference.
- Avoid mixing filled icon packs with outline icons unless Figma explicitly requires it.

## Shadows

Use subtle shadows only.

- Cards: light shadow and border.
- Active/focused fields: subtle focus ring/shadow.
- Dropdowns/menus: slightly stronger shadow than cards.
- Avoid heavy elevation or dark shadows.

## Grid and Responsive Layout

From the style reference:

- Mobile: 4-column grid.
- Desktop: 12-column grid.
- Mobile gutter appears around 16px.
- Desktop gutter appears around 20px.
- Desktop outer margin appears around 12px in the reference.

Implementation rule:

- Use responsive Tailwind grid utilities.
- Keep forms and cards readable on mobile.
- Do not simply shrink desktop tables onto mobile. Use responsive stacking or horizontal overflow only where acceptable.

## UI Implementation Guardrails

- Screens must follow attached Figma screenshots when added to the milestone specs.
- If only style/overlay assets are available, implement safe reusable components but leave screen-specific layout decisions as pending.
- Do not invent final dashboard layouts, admin tables, or learner flows without milestone-specific Figma screenshots.
- Every generated screen should use shared components for Button, Input, Select, Badge, Card, Modal, and Dropdown patterns.
- Keep shadcn and Tailwind styles aligned to the tokens above.


## Screen-Level UI Patterns From Uploaded Screenshots

Kiro must use `.kiro/context/screenshot-catalog.md` as the textual source for the uploaded screenshots. Important reusable patterns include:

- Admin left sidebar with logo, active teal navigation item, nested User Management and Content Management sections, bottom Settings and Log out.
- Admin dashboard with quick action buttons, statistic cards, Segment Overview list, status badges, progress bars, Recent Activity list, filters, and top-right profile dropdown.
- Admin content management table/list with row action menu and create segment stepper/wizard.
- Create Segment flow with segment info, modules, lessons, questions/quiz, and review/details. Use side panels/drawers for Add Module, Add Lesson, and Add Question where shown.
- Assign Training flow with segment selection, selectable user list, selected user panel, notification toggle, due date/access-duration fields, and success modal.
- User Management table with search, filter, row actions, assigned segment, progress, and status columns.
- Create User flow with user fields, role dropdown, segment assignment list, invite email action, and success modal.
- Learner Active Training dashboard with progress, segment detail cards, Resume Lesson, Next Up, and Segment Content accordion.
- Lesson view with left contextual panel, module accordion, 16:9 video player or slide viewer, thumbnail carousel for slides, status badge, and Mark as Complete action.
- Mobile auth/dashboard/lesson/profile screens are single-column and should not simply shrink desktop tables. Use stacked cards, drawer navigation, and full-width actions.
