---
name: Design Clarifications
description: Specific design details and color standards for all milestones
inclusion: auto
---

# Design Clarifications & Standards

These are the standardized design details that apply across all milestones.

## Global 12px Padding

A 12px padding is applied at the **topmost layer** in `App.tsx` wrapping everything on the screen. This means the entire app content (including navigation/sidebar) sits inside a 12px inset from the browser edges.

Implementation: `<div className="p-[12px] min-h-screen">` wrapping all routes.

## Colors

- **Primary / Secondary Button**: `#75D8D5`
- **Active Button**: `#0F172A`
- **Nav/Sidebar Background**: `#F8FAFC`

## Navigation / Sidebar

- Background: `#F8FAFC` with a `border-r border-muted-200` separating it from content
- **Logo only** in the header area — centered, no project name text beside it
- Logo file: `public/images/cmc_oral_logo.png`
- Divider between header and nav items: `border-b border-muted-200`
- Footer divider: `border-t border-muted-200`
- Footer padding matches header padding exactly (`px-3 py-4`)

### Learner sidebar footer
- **Logout only** — no user name, no settings

### Admin sidebar footer
- **Settings** link
- **Logout** button below it
- No user name displayed

## Auth Screens (Login, Forgot Password, Reset Password)

- Plain solid color on left panel (`bg-primary` / `#75D8D5`)
- **No circles, no gradients, no decorative elements**
- Logo centered in the left panel at 100% (large, clear)
- Right side: white background with form

## Icons

All real icons live in `public/icon/` (PNG files). Use them instead of generic SVG placeholders.

Key icons:
- `logout.png` — sidebar logout button
- `settings.png` — settings link
- `dashboard.png`, `profile.png`, etc.

## Project Name

Internal reference: `cmc-oral`
