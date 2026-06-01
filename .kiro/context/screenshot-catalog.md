# Screenshot Catalog and Textual Interpretation

Kiro may not reliably read image files. Treat this file as the source-of-truth textual interpretation of the attached screenshots.

## Global Style Assets

### STYLE.png
- Visual tokens: red/danger, teal/primary, amber/warning, white/surface, pale grey/background, light blue/secondary surface, navy/primary action, slate text, green/success, pink/danger-soft, mint/success-soft, cream/warning-soft, pale blue/primary-soft.
- Typography uses Inter. Visible scale: 36px bold for major headings, 24px bold for section headings, 20px semibold for card/subsection headings, 16px for body/form labels, 14px for helper/small text.
- Shadows are soft and light, used on cards, dropdowns, popovers, and modal surfaces.
- Icons are outline-style and consistent in stroke weight. Prefer Lucide React unless the existing repo already has a standard icon library.
- Responsive grid: mobile uses 4 columns, desktop uses 12 columns. Mobile gutters around 16px; desktop gutters around 20px.

### OVERLAY.png
- Button variants: teal secondary, navy active/primary, white outline, grey inactive/disabled, navy with icon, red destructive/critical, pale-cyan secondary action.
- Main button reference is around 350px wide, 54px high, 16px radius. Compact action button is around 206px wide, 40px high, 12px radius.
- Input states: default, active/typing with teal border, filled, error with red border/error text, inactive/disabled grey.
- Input reference size is around 335px wide, 56px high, 16px horizontal padding.
- Dropdown/menu patterns use white cards, 16px radius, subtle shadow/border, 43px item height, selected item with light grey/blue fill.
- Status badges shown: Not Started, In Progress, Completed, Overdue, Inactive, Deactivated, Ending Soon, On Track.
- Success modal/card reference: around 550px wide, 354px high, 16px radius, centered green check icon, bold title, supporting text, navy action button.

## Screen-Level Screenshots

### COMPONENTS.png
Applies mainly to M3 learner content navigation and M4 quiz placement.

- Segment content uses a white card with title `Segment Content` and helper copy `Tap to view lessons in Modules`.
- Module rows are accordion-like cards with chevron, module title, and status icon.
- Completed modules show green check icons.
- Current/in-progress modules show a clock or progress-style icon.
- Locked modules and locked quiz row use muted grey disabled backgrounds and lock icons.
- Expanded module cards show a vertical lesson timeline with dots and a left connecting line.
- Lesson rows show lesson title and metadata like `Video • 8 mins`, `Video • 7 mins`, or `Article • 7 mins Read`.
- Quiz appears as a separate locked row after module rows.

### DASHBOARD SCREEN.png
Applies mainly to M2 admin dashboard.

- Admin layout has a left sidebar with logo at top, Dashboard, User Management, Content Management, and bottom Settings/Log out.
- Active sidebar item uses teal fill.
- Dashboard header includes greeting (`Hi there 👋`), title `Dashboard`, and profile/avatar dropdown at top-right.
- Quick Actions include `Assign Segment` as navy primary button, `Create User` as outline/secondary action with icon, and `Add New Segment` as outline/secondary action with plus icon.
- Stats cards include Total Users, Active Segment, Total Modules, and Total Lessons.
- Segment Overview panel lists segment rows with calendar/user metadata, status badges (`Ending Soon`, `Expired`, `On Track`), and progress bars.
- Recent Activity panel lists user avatar, name, activity text, related module/quiz detail, score where relevant, and relative timestamp.
- Filter icon button and status dropdown appear on list panels.

### CONTENT MANAGEMENT.png
Applies mainly to M2 admin content management and segment assignment.

- Content Management list view uses admin shell sidebar and a main table/list area.
- Content rows show segment names with nested/module metadata, status badges, dates/counts, and a row action menu.
- Row action menu includes actions such as Edit and Archive Segment. Destructive archive action must use danger styling.
- Create Segment flow appears as a step-based/wizard form with top step tabs/progress line.
- Create Segment includes segment info fields, module addition, lesson addition, quiz/question setup, and a review/details page.
- Add Module and Add Lesson use side-panel/drawer patterns from the right.
- Add Question appears as a side-panel/drawer for quiz/question entry.
- Review/Segment Details page summarizes segment information, modules, lessons, quiz items, and assigned users/progress.
- Assign Training flow includes segment selection, user checklist/list, selected users, notification toggle, due date/access duration fields, and final action button.
- Success modal appears after assignment with centered green check and navy action button.

### USER MANAGMENT SCREENS.png
Applies mainly to M2 admin user management.

- User Management list uses admin shell sidebar and top search.
- Table columns include user/name, role, assigned segment, progress, status, and action menu.
- Status filter dropdown includes All, Inactive, In Progress, Completed, Not Started, Deactivated.
- Row action menu includes View Profile, Assign Segment, Reset Password, and Deactivate User.
- User Profile page includes user information form fields, role dropdown, email, phone, segment assignment card, learning progress, activity log with filter dropdown, quick actions, and account details.
- Create User page includes user information fields, role dropdown, email, phone, account details card, invite email action, segment assignment section, and `Assign New Segment` action.
- Role dropdown options include Dental Hygienist, Dental Assistant, Practice Manager, Associate Dentist, Lead Dentist, Clinical Director, Sterilization Technician, Lab Technician, and Dental Practitioner.
- Segment assignment list uses checkboxes, segment name, date/user metadata, lesson count chips, and search.
- Success modals shown: `User Created Successfully`, `An invite email has been sent`, with actions such as `Assign Training Now` or `Go to Dashboard`.

### USER PROFILE.webp
Applies mainly to M1 auth/profile and M3 learner profile.

- Desktop login/forgot/reset screens use a split layout: large teal visual panel on the left and form on the right.
- Login screen: title `Welcome Back!`, email/password fields, remember me checkbox, navy Login button, `Forgot Password?` link, and `Contact your admin` support link.
- Forgot screen: title `Forgot Your Password?`, email field, navy `Send Email` button, login link, and support link.
- Reset screen: title `Reset Password`, password fields, strength indicator, password rule helper, navy `Save New Password` button.
- Desktop profile page uses sidebar, page title, hero/cover image, avatar, user name/role/member date, Profile and Password tabs, form fields, and bottom-right Cancel/Save or Edit Profile actions.

### LESSON_VIDEO_AND_TEXTSLIDE.png
Applies mainly to M3 learner lesson experience and M4 quiz placement after learning content.

- Active Training dashboard has learner sidebar with Dashboard and Profile, greeting, title `Your Active Training`, segment title, description, progress bar, `Resume Lesson` button, segment detail cards, and Segment Content accordion list.
- Lesson view has a left contextual panel with Back to Dashboard, segment title/description, instructor block, progress indicator, and module accordion navigation.
- Main lesson area has breadcrumb/module context, status badge (`In Progress`), video player or slide viewer, and `Mark as Complete` button.
- Video lesson uses a large 16:9 embedded media area.
- Text/slide lesson uses large slide preview, bottom thumbnail carousel, and an expand/fullscreen affordance.
- `Mark as Complete` is placed below content and appears disabled/grey when the lesson cannot be completed yet or when action is inactive.

### MOBILE_VIEW.png
Applies across M1/M3 responsive behavior.

- Mobile auth screens are single-column with no desktop teal side panel. They use compact titles, full-width inputs, navy buttons, small helper links, and bottom safe-area spacing.
- Mobile learner dashboard shows Active Training card, progress bar, segment detail cards in a compact grid, Resume Lesson button, and next-up/module link.
- Mobile lesson screens keep the media/content first, then completion action. Header includes back arrow, module/lesson context, status badge, and hamburger/menu icon.
- Mobile module navigation can appear as a right-side drawer or overlay showing progress and module accordion list.
- Mobile profile screens show avatar/cover, tabs, profile fields, password fields, Cancel/Save/Edit actions, and logout link.
- Landscape media view shows the slide/video viewer with thumbnails and content scaled to available width.

## Scope Notes From Screenshots

- Some screenshots show rich recent activity and quiz pass/fail rows. Treat these as lightweight display patterns only. Do not implement advanced analytics or detailed reporting because they are out of scope.
- Some screenshots show roles as job titles. For the MVP, these can be profile/job title metadata or selectable user roles only if required by the form design. They must not become role-based admin permissions because that is out of scope.
- Screenshots contain quiz UI references, but quiz scoring must remain basic and non-blocking.
- Any screen item not backed by SOW scope must be documented as a clarification item rather than implemented silently.
