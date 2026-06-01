# UI States Audit

This document audits the loading, empty, and error states for each screen in the Rhose frontend (Milestone 1). It identifies which states are implemented, which are not needed, and which are gaps to address in future milestones.

**Validates:** Requirements 7.1, 7.2, 8.1

---

## Audit Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | State is implemented |
| ➖ | State is not applicable to this screen |
| ⚠️ | Gap — state not shown in Figma, implemented as an implementation decision |
| 🔲 | Gap — state deferred to a future milestone |

---

## 1. LoginPage

**File:** `src/pages/LoginPage.tsx`

| State Type | Status | Details |
|------------|--------|---------|
| **Loading** | ✅ Implemented | Spinner inside submit button with "Signing in..." text while `isLoading` is true. Button is disabled during loading. |
| **Error** | ✅ Implemented | Red alert banner (`role="alert"`) displayed above the form when login fails. Field-level validation errors shown below each input. |
| **Empty** | ➖ Not needed | Login form always renders with empty fields ready for input. No data-dependent empty state. |
| **Disabled** | ✅ Implemented | Submit button disabled while loading (`disabled:opacity-60 disabled:cursor-not-allowed`). |

**Figma coverage:** Loading spinner and error alert are **implementation decisions** — no explicit Figma mockup exists for these states. The visual treatment (inline spinner, red alert box) follows the design system color tokens and patterns.

---

## 2. ForgotPasswordPage

**File:** `src/pages/ForgotPasswordPage.tsx`

| State Type | Status | Details |
|------------|--------|---------|
| **Loading** | ✅ Implemented | Spinner inside submit button with "Sending..." text while `isLoading` is true. Button is disabled during loading. |
| **Error** | ✅ Implemented | Red alert banner for network/unexpected errors. Non-network errors intentionally show success (prevents email enumeration per Req 3.2). |
| **Success** | ✅ Implemented | Full-screen success view with green checkmark icon, "Check your email" heading, and "Back to login" button. |
| **Empty** | ➖ Not needed | Form always renders with empty email field. No data-dependent empty state. |
| **Disabled** | ✅ Implemented | Submit button disabled while loading. |

**Figma coverage:** Success confirmation screen is an **implementation decision** — the exact layout (checkmark icon + message + back link) is not explicitly shown in Figma but follows the design system patterns. Loading spinner is also an implementation decision.

---

## 3. ResetPasswordPage

**File:** `src/pages/ResetPasswordPage.tsx`

| State Type | Status | Details |
|------------|--------|---------|
| **Loading** | ✅ Implemented | Spinner inside submit button with "Resetting..." text while `isLoading` is true. Button is disabled during loading. |
| **Error** | ✅ Implemented | Red alert banner for API errors. Field-level validation errors for password requirements and mismatch. |
| **Success** | ✅ Implemented | Full-screen success view with green checkmark icon, "Password reset successful" heading, and "Back to login" button. |
| **Missing Token** | ✅ Implemented | Token validation error displayed as alert when `?token=` param is missing or empty. Submit button disabled when no token present. |
| **Empty** | ➖ Not needed | Form always renders with empty password fields. No data-dependent empty state. |
| **Disabled** | ✅ Implemented | Submit button disabled while loading OR when token is missing (`disabled={isLoading \|\| !token}`). |

**Figma coverage:** Password strength indicator (weak/medium/strong bar) aligns with Figma reference showing strength/rule helper. Success state and missing-token error are **implementation decisions** — not explicitly shown in Figma.

---

## 4. ProfilePage

**File:** `src/pages/ProfilePage.tsx`

| State Type | Status | Details |
|------------|--------|---------|
| **Loading (profile save)** | ✅ Implemented | Save button shows "Saving..." text while `profileLoading` is true. Button is disabled during save. |
| **Loading (password change)** | ✅ Implemented | Change Password button shows "Changing..." text while `passwordLoading` is true. Button is disabled during change. |
| **Error (profile)** | ✅ Implemented | Red feedback alert in Profile tab when update fails (e.g., duplicate email 409). |
| **Success (profile)** | ✅ Implemented | Green feedback alert in Profile tab on successful save. |
| **Error (password)** | ✅ Implemented | Red feedback alert in Password tab when change fails (e.g., wrong current password). Field-level errors for validation (min length, mismatch). |
| **Success (password)** | ✅ Implemented | Green feedback alert in Password tab on successful password change. Fields are cleared on success. |
| **Empty** | ➖ Not needed | Profile always has user data from auth context. No empty state scenario in M1. |
| **Loading (initial)** | ⚠️ Not implemented | No skeleton/spinner shown while initial user data loads. Currently relies on auth context being pre-populated. If auth context is slow to resolve, the page may briefly show "??" initials. |

**Figma coverage:** Edit/Cancel/Save flow matches Figma profile screenshots. Feedback alerts (success/error) are **implementation decisions** — Figma shows the form states but not explicit success/error banners. Initial loading state is a gap but low-risk since auth context is typically resolved before navigation.

---

## 5. AdminDashboard

**File:** `src/pages/AdminDashboard.tsx`

| State Type | Status | Details |
|------------|--------|---------|
| **Loading** | 🔲 Deferred | Placeholder page — no async data fetching in M1. Loading states will be needed when dashboard widgets are added (M2+). |
| **Error** | 🔲 Deferred | Placeholder page — no API calls to fail. Error handling needed when real data is loaded (M2+). |
| **Empty** | 🔲 Deferred | Placeholder page — shows static welcome text. Empty states for "no content yet" / "no users yet" needed when dashboard is built out (M2+). |

**Figma coverage:** Dashboard content is out of scope for M1. Current placeholder is an **implementation decision** to provide a landing page after admin login.

---

## 6. LearnerDashboard

**File:** `src/pages/LearnerDashboard.tsx`

| State Type | Status | Details |
|------------|--------|---------|
| **Loading** | 🔲 Deferred | Placeholder page — no async data fetching in M1. Loading states will be needed when learning content is displayed (M3+). |
| **Error** | 🔲 Deferred | Placeholder page — no API calls to fail. Error handling needed when real data is loaded (M3+). |
| **Empty** | 🔲 Deferred | Placeholder page — shows static welcome text. Empty states for "no assigned content" needed when learner experience is built (M3+). |

**Figma coverage:** Learner dashboard content is out of scope for M1. Current placeholder is an **implementation decision** to provide a landing page after learner login.

---

## Summary

### States Coverage Matrix

| Screen | Loading | Error | Empty | Success | Disabled |
|--------|---------|-------|-------|---------|----------|
| LoginPage | ✅ | ✅ | ➖ | ➖ | ✅ |
| ForgotPasswordPage | ✅ | ✅ | ➖ | ✅ | ✅ |
| ResetPasswordPage | ✅ | ✅ | ➖ | ✅ | ✅ |
| ProfilePage | ✅ | ✅ | ➖ | ✅ | ✅ |
| AdminDashboard | 🔲 | 🔲 | 🔲 | ➖ | ➖ |
| LearnerDashboard | 🔲 | 🔲 | 🔲 | ➖ | ➖ |

### Figma/Design Gaps

| # | Screen | Missing State | Classification | Notes |
|---|--------|---------------|----------------|-------|
| 1 | All auth pages | Loading spinner design | Implementation decision | Inline SVG spinner in button — consistent pattern across all forms. Not explicitly shown in Figma. |
| 2 | All auth pages | Error alert design | Implementation decision | Red bordered alert box with `role="alert"` — follows design system danger tokens. Not explicitly shown in Figma. |
| 3 | ForgotPasswordPage | Success confirmation screen | Implementation decision | Green checkmark + message + back link. Not explicitly shown in Figma. |
| 4 | ResetPasswordPage | Success confirmation screen | Implementation decision | Green checkmark + message + back link. Not explicitly shown in Figma. |
| 5 | ResetPasswordPage | Missing token error state | Implementation decision | Alert shown when URL has no token. Not explicitly shown in Figma. |
| 6 | ProfilePage | Initial loading skeleton | Gap (low risk) | No skeleton/spinner for initial data load. Auth context is typically pre-resolved. |
| 7 | AdminDashboard | All states | Deferred to M2+ | Placeholder only — no real data or async operations in M1. |
| 8 | LearnerDashboard | All states | Deferred to M3+ | Placeholder only — no real data or async operations in M1. |

### Design Consistency Notes

All implemented states follow these patterns:
- **Loading:** Inline spinner (animated SVG) inside the triggering button with descriptive text ("Signing in...", "Sending...", "Resetting...", "Saving...", "Changing...")
- **Error:** Red alert box using `border-danger-200 bg-danger-50 text-danger-700` tokens with `role="alert"` for accessibility
- **Success:** Green alert/confirmation using `bg-success-50 text-success-700` or full-page success view with checkmark icon
- **Disabled:** Buttons use `disabled:opacity-60 disabled:cursor-not-allowed` during loading or invalid states
- **Field errors:** Inline text below inputs using `text-danger-600` with `aria-invalid` and `aria-describedby` for accessibility

These patterns are consistent with the design system defined in `tailwind.config.ts` and the screenshot catalog, even though explicit Figma mockups for these transient states were not provided.
