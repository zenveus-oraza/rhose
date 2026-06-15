# Rhose Platform: Governance & Cross-Cutting Concerns

**Document Version:** 1.0  
**Last Updated:** June 4, 2026  
**Applicable Milestones:** M2, M3, M4, M5

---

## Executive Summary

This document establishes governance rules and cross-cutting concerns that apply across all Rhose platform milestones (M2–M5). These include:

- **Database Schema Governance**: Procedures for schema changes and their reflection across the stack
- **User Profile Data Model Extensions**: Phone, job title, profile picture fields and their proper handling
- **Pagination & Search**: Implementation requirements for all list, table, and dropdown UI elements
- **Last Admin Protection**: Rules preventing deactivation of the last active admin user
- **Admin Profile Capabilities**: Admin editing of user profiles with comprehensive field support
- **Profile Picture Display**: Lazy loading standards for all profile images across the platform
- **Search & Filter Reset Behavior**: Pagination resets when filters/search changes

These rules ensure consistency, scalability, and a cohesive user experience across all features.

---

## 1. Database Schema Governance Rule

### 1.1 The Schema Change Lifecycle

**RULE**: When a database schema change is needed, it SHALL follow this strict sequence across the entire platform:

```
1. Database Schema Change (Drizzle migration)
   ↓
2. Backend Types & Validation (Zod schemas, TypeScript interfaces)
   ↓
3. Backend API Endpoints (services, routes, middleware)
   ↓
4. Frontend Types (TypeScript interfaces, API response types)
   ↓
5. Frontend UI Components & Pages (reflect the new data in all relevant locations)
   ↓
6. Testing (unit tests, integration tests, E2E tests)
```

**Application**: This governance rule applies to schema changes like:
- Adding a new column to an existing table
- Modifying column types or constraints
- Creating new tables with foreign keys
- Renaming columns or fields

**Verification**: Schema governance compliance is verified by:
1. TypeScript compilation (no errors)
2. Build verification (backend and frontend build successfully)
3. Database migrations run successfully
4. All affected pages display new data correctly

### 1.2 Change Reflection Across the Stack

When a schema change is made, the following MUST be updated in order:

1. **Database**: Create and apply Drizzle migration
2. **Backend Types**: Update Zod validation schemas and TypeScript interfaces
3. **Backend Services**: Update service methods to read/write new fields
4. **Backend Routes**: Update endpoint handlers to accept/return new fields
5. **Frontend Types**: Update API response types and component props
6. **Frontend UI**: Update all pages, tables, forms, and dropdowns to display/edit new data
7. **Tests**: Update tests to verify new fields are handled correctly

### 1.3 Documentation in Specs

When schema changes are documented in spec files (requirements.md and tasks.md), they MUST include:
- Which table is modified
- Which columns are added/changed
- Type and constraint information
- Which API endpoints are affected
- Which frontend pages need updates
- An acceptance criterion for verifying the change is complete across the stack

---

## 2. User Profile Data Model Extensions

### 2.1 Extended Profile Fields

The users table now includes the following fields (implemented in M2):

- **phone** (varchar(20), nullable): User's phone number
- **jobTitle** (varchar(255), nullable): User's job title or position
- **profileImage** (text, nullable): URL to user's profile picture

### 2.2 Field Handling Rules

**Phone Field**:
- Displayed in all user profile views (admin viewing learner, learner viewing own profile)
- Editable by learners in ProfilePage
- Editable by admins in UserProfilePage
- Validated to maximum 20 characters

**Job Title Field**:
- Displayed in user lists, user profile, and dashboard contexts
- Shown below the role field in tables and cards
- Editable by learners and admins
- Validated to maximum 255 characters

**Profile Image Field**:
- Always displayed with lazy loading (`loading="lazy"` attribute)
- Falls back to initial letter avatar if not present
- Editable by learners (ProfileImageUpload component)
- Editable by admins in UserProfilePage
- Used in user lists, user profiles, and assignment workflows

### 2.3 Display Requirements

**Where Phone & Job Title Must Be Shown**:
- UserListPage (admin viewing users) - job title below role
- UserProfilePage (admin viewing user details) - as editable fields
- ProfilePage (learner viewing own profile) - as editable fields
- AssignTrainingPage (admin assigning users) - user selection list shows job title
- AdminDashboard (if users are shown) - consistent with other user displays

**Where Profile Picture Must Be Shown**:
- UserListPage (admin) - desktop table and mobile cards
- AssignTrainingPage (admin) - user selection list and selected badges
- UserProfilePage (admin) - user details header
- ProfilePage (learner) - profile header
- All locations with lazy loading: `loading="lazy"`

### 2.4 Profile Picture Upload/Management

- Learners can upload profile pictures in ProfilePage
- Admins can upload profile pictures in UserProfilePage
- ProfileImageUpload component handles upload logic
- Maximum file size, accepted formats, and aspect ratio TBD (refer to component implementation)

---

## 3. Pagination & Search Requirements

### 3.1 Pagination Scope

Pagination SHALL be implemented for ALL lists, tables, and dropdowns displaying 20+ items:

**Backend API Endpoints Requiring Pagination**:
- GET /admin/segments (with search, status filter)
- GET /admin/segments/{id}/modules (with pagination)
- GET /admin/modules/{id}/lessons (with pagination)
- GET /admin/segments/{id}/assignments (with pagination)
- GET /admin/users/{id}/assignments (with pagination)
- GET /admin/users (already has pagination, kept as-is)
- GET /learner/segments (paginated assigned segments)
- GET /learner/segments/{id}/modules (paginated modules)
- GET /learner/segments/{id}/assignments (paginated assignments)
- GET /admin/quizzes (paginated quiz list)

**Frontend Components Requiring Pagination**:
- SegmentListPage (20 items/page, search bar)
- AdminDashboard segment list (5 items/page, preview)
- AssignTrainingPage user selection (50 items/page)
- AssignTrainingPage segment dropdown (searchable dropdown, no hardcoded limit)
- SegmentDetailsPage modules list (10 items/page)
- SegmentDetailsPage assignments table (20 items/page)
- SegmentDetailsPage lessons list (10 items/page, within ModuleLessons component)
- LearnerDashboard segment list (20 items/page, search bar) - **M3**
- QuizListPage (for admin) (20 items/page)

### 3.2 Pagination Query Parameters

All backend list endpoints SHALL support:

```typescript
{
  page?: number;        // 1-indexed page number, defaults to 1
  limit?: number;       // Items per page, defaults to 20
  search?: string;      // Case-insensitive search (filters by name/title/email)
  [filter]?: string;    // Filter-specific param (e.g., status for segments)
}
```

### 3.3 Backend API Response Format

All paginated endpoints SHALL return:

```typescript
{
  data: T[];           // Array of items for current page
  pagination: {
    page: number;      // Current page number (1-indexed)
    limit: number;     // Items per page
    total: number;     // Total items across all pages
    totalPages: number // Math.ceil(total / limit)
  }
}
```

### 3.4 Frontend Pagination UI Pattern

All paginated lists SHALL display:

```tsx
<div className="mt-4 flex items-center justify-between">
  <p className="text-helper text-muted-500">
    Page {pagination.page} of {pagination.totalPages}
    ({pagination.total} total)
  </p>
  <div className="flex gap-2">
    <button
      onClick={() => setPage(p => Math.max(1, p - 1))}
      disabled={page <= 1}
      className="px-4 py-2 rounded-lg border border-muted-200 hover:bg-muted-50 disabled:opacity-50"
    >
      Previous
    </button>
    <button
      onClick={() => setPage(p => p + 1)}
      disabled={page >= pagination.totalPages}
      className="px-4 py-2 rounded-lg border border-muted-200 hover:bg-muted-50 disabled:opacity-50"
    >
      Next
    </button>
  </div>
</div>
```

### 3.5 Search & Filter Reset Behavior

**RULE**: When a user applies a search query or changes a filter, the current page SHALL automatically reset to 1.

**Implementation**:
```tsx
const [page, setPage] = useState(1);
const [search, setSearch] = useState('');

// Search state update automatically resets page via dependency
useEffect(() => {
  setPage(1);
}, [search]);
```

### 3.6 Searchable Dropdowns

For dropdowns with 100+ items (e.g., segment selection in AssignTrainingPage):

- SHALL NOT use plain `<select>` elements
- SHALL use `SearchableDropdown` component (created in M2)
- SHALL support both local and server-side search filtering
- SHALL show "No items found" when search returns no results
- SHALL disable hard-coded item limits (always use pagination on backend)

---

## 4. Last Admin Protection

### 4.1 Rule Statement

**RULE**: The system SHALL prevent deactivation of the last active admin user.

**Implementation**:
- When a deactivation request is received for an admin user, check if they are the last active admin
- If true, return HTTP 400 with error message: "Cannot deactivate the last active admin user"
- If false, proceed with deactivation

**Verification**:
```sql
SELECT COUNT(*) FROM users
WHERE role = 'admin' AND status != 'deactivated' AND id != ?
```

If count = 0, reject the deactivation.

### 4.2 Scope

- Applies to: UserProfilePage (admin deactivating user), AdminDashboard (if bulk deactivate exists)
- Does NOT apply to: Soft-delete, archiving, or other state changes (only deactivation/disable)
- Verified in: user-management.service.ts `deactivate()` method

---

## 5. Admin Profile Editing Capabilities

### 5.1 What Admins Can Edit

When an admin views another user's profile (UserProfilePage), admins MUST be able to edit:

- **name**: User's full name (required)
- **email**: User's email address (read-only for display, NOT editable)
- **phone**: User's phone number (optional)
- **jobTitle**: User's job title (optional)
- **role**: User's role (admin or learner) - dropdown selector
- **profileImage**: User's profile picture - upload capability

### 5.2 Edit Form Display

The edit form in UserProfilePage SHALL:
- Show "Edit Profile" button in view mode
- Display form with all editable fields in edit mode
- Include Cancel and Save buttons
- Show loading state on Save button during submission
- Display success/error toast notifications on completion
- Validate inputs matching backend Zod schemas

### 5.3 Backend Support

The UpdateUserInput type and updateUser endpoint SHALL accept:

```typescript
{
  name?: string;
  phone?: string | null;
  jobTitle?: string | null;
  profileImage?: string | null;
  role?: UserRole;
}
```

### 5.4 Scope

- Available for: Admin viewing admin or learner profiles
- Not available for: Admins editing their own profile (no self-edit, use ProfilePage instead)

---

## 6. Profile Picture Display Standards

### 6.1 Lazy Loading Requirement

**RULE**: All profile picture `<img>` tags MUST include `loading="lazy"` attribute.

```tsx
<img
  src={user.profileImage}
  alt={user.name}
  loading="lazy"
  className="h-9 w-9 rounded-full object-cover border border-muted-200"
/>
```

### 6.2 Fallback Behavior

When profileImage is not available, display initial letter avatar:

```tsx
{user.profileImage ? (
  <img src={user.profileImage} alt={user.name} loading="lazy" className="..." />
) : (
  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-50">
    {user.name.charAt(0).toUpperCase()}
  </div>
)}
```

### 6.3 Locations Requiring Profile Pictures with Lazy Loading

- UserListPage (desktop table and mobile cards)
- AssignTrainingPage (user selection list and selected badges)
- UserProfilePage (user details header)
- ProfilePage (learner profile header)
- Any admin/learner dashboard showing users
- Any user mention in UI (comments, activity feeds, etc.)

---

## 7. Role vs. Job Title Distinction

### 7.1 Visual Hierarchy

**Role** (Primary Identifier):
- Shown in bold or larger text
- Shows: "admin" or "learner"
- Always displayed

**Job Title** (Secondary Descriptor):
- Shown below role in smaller, secondary color text
- Shows: "Manager", "Developer", "Coordinator", etc.
- Only displayed if present (optional field)
- Never shown alone; always accompanies role

### 7.2 Display Pattern

```tsx
<div>
  <p className="font-medium capitalize">{user.role}</p>
  {user.jobTitle && (
    <p className="text-helper text-muted-500">{user.jobTitle}</p>
  )}
</div>
```

### 7.3 Table Column Naming

- Old column name: "Role / Job Title" (confusing, combines two concepts)
- New column name: "Role" (clear single concept)
- Job title shown below role in same cell when available

---

## 8. Click-to-Open User Details

### 8.1 User List Navigation

**RULE**: In user lists (UserListPage, AssignTrainingPage, etc.), clicking anywhere on a user row/card SHALL navigate to that user's profile.

### 8.2 Implementation

```tsx
<tr
  onClick={() => navigate(`/admin/users/${user.id}`)}
  className="hover:bg-muted-50 transition-colors cursor-pointer"
>
  {/* table cells */}
  <td onClick={(e) => e.stopPropagation()}>
    {/* action menu, buttons - prevent navigation */}
  </td>
</tr>
```

### 8.3 Exceptions

- Action menu clicks (Edit, Delete, Reset Password) do NOT navigate
- Use `event.stopPropagation()` on action menu to prevent row navigation

---

## 9. Segment/Module/Lesson List Simplification

### 9.1 What Was Removed

From previous iterations, the following were removed to focus on core functionality:

- Removed "Assign Segment" action from user profile (learner-only feature, not applicable to admin profiles)
- Removed "View Profile" action from user list (entire row now clickable instead)
- Removed "User Assignments" section from admin UserProfilePage (focus on admin editing only)
- Removed "Progress" column from user list in some contexts (simplified table)

### 9.2 Current Table Structure

**UserListPage** (Admin):
- User (with profile picture, name)
- Role (with job title below when available)
- Status (active/deactivated)
- Actions (Reset Password, Deactivate)

---

## 10. Backward Compatibility & Migration Notes

### 10.1 Existing M2 Milestones

All rules in this document apply to M2 milestones already implemented:

- Phone field added ✅
- Job title added ✅
- Profile picture added ✅
- Admin editing capabilities added ✅
- Profile picture lazy loading applied ✅
- Last admin protection implemented ✅
- Pagination implemented on backend and frontend ✅

### 10.2 M3+ New Implementations

New milestones (M3, M4, M5) SHALL apply these governance rules from day one:

- New user lists MUST have pagination
- New dropdowns MUST be searchable if 100+ items
- New user displays MUST show profile pictures with lazy loading
- New schema changes MUST follow the governance lifecycle
- New admin pages MUST show phone, job title, profile pictures

---

## 11. Testing & Verification

### 11.1 Acceptance Tests for Governance Rules

All milestone task descriptions SHALL include acceptance criteria verifying:

1. Schema changes cascade through the stack (DB → Types → API → Frontend)
2. Phone, job title, and profile picture display consistently
3. Pagination is implemented for all lists 20+ items
4. Search/filter resets page to 1
5. Last admin protection prevents deactivation
6. Admin can edit all user profile fields
7. Profile pictures use lazy loading
8. Role and job title have clear visual distinction

### 11.2 Build Verification

Each milestone release SHALL verify:
- TypeScript compilation: 0 errors
- Build success (Vite frontend, Node backend)
- All migrations run successfully
- Tests pass (unit, integration, E2E)

---

## 12. References

- **Schema Governance**: Section 1
- **User Profile Extensions**: Section 2
- **Pagination**: Section 3
- **Last Admin Protection**: Section 4
- **Admin Editing**: Section 5
- **Profile Pictures**: Section 6
- **Role vs. Job Title**: Section 7
- **Click-to-Open**: Section 8
- **List Simplification**: Section 9

---

**Document Status**: APPROVED for M2–M5 Implementation
