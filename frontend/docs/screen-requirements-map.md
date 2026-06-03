# Screen-to-Requirements Mapping

This document maps each implemented frontend screen/component to the Milestone 1 requirements it fulfills, and documents any gaps between the Figma/design references and the current implementation.

---

## 1. LoginPage

**File:** `src/pages/LoginPage.tsx`

| Requirement | Description | Status |
|-------------|-------------|--------|
| 2.1 | Email/password login form submitting credentials | ✅ Covered |
| 7.1 | Responsive layout (desktop via AuthLayout split) | ✅ Covered |
| 7.2 | Mobile layout (single-column form, no teal panel) | ✅ Covered |
| 7.3 | Inter font / typography scale | ✅ Covered (via Tailwind `text-heading-section`, `text-body`, `text-helper`) |
| 7.4 | Color tokens (navy, teal, danger, muted) | ✅ Covered |

**Features implemented:**
- Email field with validation (required, format check)
- Password field with validation (required)
- "Remember me" checkbox (UI present, backend token persistence TBD)
- "Forgot password?" link → `/forgot-password`
- Loading spinner on submit
- Error alert for failed login
- "Contact your admin" link for users without accounts

**Gaps:**
- Remember me checkbox is rendered but actual session persistence behavior (longer-lived token) is not confirmed as wired to backend. Marked as UI-only pending backend support.

---

## 2. ForgotPasswordPage

**File:** `src/pages/ForgotPasswordPage.tsx`

| Requirement | Description | Status |
|-------------|-------------|--------|
| 3.1 | Forgot password flow (submit email, receive reset link) | ✅ Covered |
| 7.1 | Responsive desktop layout (AuthLayout split) | ✅ Covered |
| 7.2 | Mobile layout (single-column) | ✅ Covered |
| 7.3 | Inter font / typography scale | ✅ Covered |
| 7.4 | Color tokens | ✅ Covered |

**Features implemented:**
- Email field with validation
- Submit triggers `forgotPassword` service call
- Success state shows "Check your email" confirmation (prevents email enumeration)
- Network errors shown; non-network errors still show success (security)
- "Back to login" link

**Gaps:** None identified.

---

## 3. ResetPasswordPage

**File:** `src/pages/ResetPasswordPage.tsx`

| Requirement | Description | Status |
|-------------|-------------|--------|
| 3.1 | Reset password (new password + confirm, token from URL) | ✅ Covered |
| 3.6 | Minimum 8-character password validation | ✅ Covered |
| 7.1 | Responsive desktop layout (AuthLayout split) | ✅ Covered |
| 7.2 | Mobile layout (single-column) | ✅ Covered |
| 7.3 | Inter font / typography scale | ✅ Covered |
| 7.4 | Color tokens | ✅ Covered |

**Features implemented:**
- New password field with validation (min 8 chars)
- Confirm password field with match validation
- Password strength indicator (weak/medium/strong with color bar)
- Token extracted from URL search params
- Missing/invalid token error display
- Success state with "Back to login" link
- Loading spinner on submit

**Gaps:** None identified.

---

## 4. ProfilePage

**File:** `src/pages/ProfilePage.tsx`

| Requirement | Description | Status |
|-------------|-------------|--------|
| 5.1 | View profile (name, email, role displayed) | ✅ Covered |
| 5.2 | Edit profile (name, email editable with save/cancel) | ✅ Covered |
| 5.4 | Change password (current + new + confirm) | ✅ Covered |
| 7.2 | Mobile layout (stacked, full-width) | ✅ Covered |
| 7.3 | Inter font / typography scale | ✅ Covered |
| 7.4 | Color tokens | ✅ Covered |

**Features implemented:**
- Cover image gradient with avatar (user initials)
- Role badge display
- Tabbed interface (Profile / Password) using Radix Tabs
- Profile tab: view mode (read-only fields) and edit mode (editable inputs)
- Password tab: current password, new password (min 8 chars), confirm password
- Success/error feedback alerts
- Mobile logout button (visible only on mobile via `lg:hidden`)
- API calls to `PATCH /users/profile` and `POST /users/change-password`

**Gaps:** None identified.

---

## 5. AdminLayout

**File:** `src/components/layout/AdminLayout.tsx`

| Requirement | Description | Status |
|-------------|-------------|--------|
| 7.6 | Role-appropriate navigation (admin-specific links) | ✅ Covered |
| 7.1 | Desktop: persistent sidebar | ✅ Covered |
| 7.2 | Mobile: collapsible sidebar with overlay | ✅ Covered |
| 7.5 | Responsive transition without page reload | ✅ Covered (CSS transition + lg breakpoint) |

**Features implemented:**
- Admin-specific nav links: Dashboard, Content Management, Users, Settings
- Persistent sidebar on desktop (lg:static)
- Collapsible sidebar on mobile with overlay backdrop
- User name and role displayed in sidebar footer
- Logout button in sidebar
- Mobile header with hamburger menu

**Gaps:** None identified.

---

## 6. LearnerLayout

**File:** `src/components/layout/LearnerLayout.tsx`

| Requirement | Description | Status |
|-------------|-------------|--------|
| 7.6 | Role-appropriate navigation (learner-specific links) | ✅ Covered |
| 7.1 | Desktop: persistent sidebar | ✅ Covered |
| 7.2 | Mobile: collapsible sidebar with overlay | ✅ Covered |
| 7.5 | Responsive transition without page reload | ✅ Covered (CSS transition + lg breakpoint) |

**Features implemented:**
- Learner-specific nav links: Dashboard, My Learning, Profile
- Persistent sidebar on desktop (lg:static)
- Collapsible sidebar on mobile with overlay backdrop
- User name displayed in sidebar footer
- Logout button in sidebar
- Mobile header with hamburger menu

**Gaps:** None identified.

---

## 7. AppShell

**File:** `src/components/layout/AppShell.tsx`

| Requirement | Description | Status |
|-------------|-------------|--------|
| 7.1 | 12-column grid layout on desktop (≥1024px) | ✅ Covered (`grid-cols-layout-desktop` = 12 cols) |
| 7.2 | 4-column grid layout on mobile (<1024px) | ✅ Covered (`grid-cols-layout-mobile` = 4 cols) |
| 7.3 | Inter font family with typography scale | ✅ Covered (Tailwind config: Inter as default sans, custom font sizes) |
| 7.4 | Color tokens (navy, teal, danger, success, warning, muted) | ✅ Covered (all defined in `tailwind.config.ts`) |
| 7.5 | Responsive transition without page reload | ✅ Covered (CSS breakpoint at lg/1024px) |

**Features implemented:**
- Desktop: persistent sidebar (60px/w-60) + main content with 12-col grid
- Mobile: hidden sidebar, hamburger MobileNav component, 4-col grid
- Content area uses `grid-cols-layout-desktop` and `grid-cols-layout-mobile` custom grid templates
- MobileNav: slide-in panel with overlay, escape key close, body scroll lock

**Supporting configuration (tailwind.config.ts):**
- `fontFamily.sans`: Inter as primary
- `fontSize`: heading-page (36px bold), heading-section (24px bold), heading-card (20px semibold), body (16px), helper (14px)
- `colors`: navy, teal, danger, success, warning, muted — all with full shade scales
- `gridTemplateColumns`: layout-desktop (12 cols), layout-mobile (4 cols)

**Gaps:**
- AppShell is defined but not actively used in routing (AdminLayout and LearnerLayout are used directly as route wrappers). AppShell serves as a reference/generic shell. This is acceptable since AdminLayout and LearnerLayout implement the same responsive patterns inline.

---

## 8. AuthLayout

**File:** `src/components/layout/AuthLayout.tsx`

| Requirement | Description | Status |
|-------------|-------------|--------|
| 7.1 | Desktop split layout (teal panel + form) | ✅ Covered |
| 7.2 | Mobile single-column (form only, teal panel hidden) | ✅ Covered |
| 7.5 | Responsive transition at lg breakpoint | ✅ Covered |

**Features implemented:**
- Desktop: 50/50 split with teal gradient panel (decorative circles) and white form panel
- Mobile: full-width white form panel, teal panel hidden via `hidden lg:flex`
- Branding text in teal panel ("Rhose — Your learning journey starts here")

**Gaps:** None identified.

---

## Summary of Gaps

| # | Gap Description | Severity | Notes |
|---|----------------|----------|-------|
| 1 | "Remember me" checkbox on LoginPage is UI-only | Low | Backend token persistence for extended sessions not yet implemented. Checkbox renders but has no effect on token lifetime. |
| 2 | AppShell not used in active routing | Info | AdminLayout and LearnerLayout implement the same responsive patterns directly. AppShell exists as a generic reference component. No functional gap. |

---

## Tailwind Design System Verification

| Token/Feature | Requirement | Configured |
|---------------|-------------|------------|
| Inter font | 7.3 | ✅ `fontFamily.sans: ['Inter', ...]` |
| 36px bold (page heading) | 7.3 | ✅ `text-heading-page` |
| 24px bold (section heading) | 7.3 | ✅ `text-heading-section` |
| 20px semibold (card heading) | 7.3 | ✅ `text-heading-card` |
| 16px body | 7.3 | ✅ `text-body` |
| 14px helper | 7.3 | ✅ `text-helper` |
| Navy color scale | 7.4 | ✅ Full scale (50–900) |
| Teal color scale | 7.4 | ✅ Full scale (50–900) |
| Danger (red) color scale | 7.4 | ✅ Full scale (50–900) |
| Success (green) color scale | 7.4 | ✅ Full scale (50–900) |
| Warning (amber) color scale | 7.4 | ✅ Full scale (50–900) |
| Muted (slate) color scale | 7.4 | ✅ Full scale (50–900) |
| 12-col desktop grid | 7.1 | ✅ `grid-cols-layout-desktop` |
| 4-col mobile grid | 7.2 | ✅ `grid-cols-layout-mobile` |
| lg breakpoint (1024px) | 7.5 | ✅ Tailwind default `lg` = 1024px |

---

## Routing & Role-Based Access

| Route | Component | Role Guard | Layout |
|-------|-----------|------------|--------|
| `/login` | LoginPage | Public (redirects if authenticated) | AuthLayout |
| `/forgot-password` | ForgotPasswordPage | Public | AuthLayout |
| `/reset-password` | ResetPasswordPage | Public | AuthLayout |
| `/admin` | AdminDashboard | Admin only | AdminLayout |
| `/admin/profile` | ProfilePage | Admin only | AdminLayout |
| `/learner` | LearnerDashboard | Learner only | LearnerLayout |
| `/learner/profile` | ProfilePage | Learner only | LearnerLayout |

Role-based navigation (Req 7.6) is enforced at two levels:
1. **Route guards**: `ProtectedRoute` component checks authentication and `requiredRole`
2. **Layout navigation**: AdminLayout shows admin links; LearnerLayout shows learner links
