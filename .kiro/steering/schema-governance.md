# Schema Governance Rule

## Database Schema Change Protocol

When a change is made to the backend database schema (tables, columns, relationships), the following must be completed before merging:

### 1. Drizzle Migration
- Generate migration with `npx drizzle-kit generate`
- Review generated SQL for correctness
- Commit migration file to Git

### 2. TypeScript Types Update
- Update schema type definitions in `backend/src/db/schema/*.ts`
- Update service layer return types (if applicable)
- Update API response types

### 3. API Routes Update
- Add/update endpoints to select new fields if needed
- Update response shapes (DTOs)
- Include new fields in PATCH/PUT operations for profile updates

### 4. Frontend Type Definitions
- Update `frontend/src/types/admin.ts` with new fields
- Update any API client response interfaces
- Add fields to context types if used in AuthContext

### 5. UI Implementation
- **Admin Dashboard/Profile**: Show new fields where appropriate
  - Profile page showing user details
  - User list viewing
  - User management admin interface
  
- **Learner Profile**: Show new fields where appropriate
  - User profile page
  - Display read-only fields

- **All Affected Roles**: 
  - Any UI component displaying user data must reflect schema changes
  - Forms that accept user data must include new editable fields (if applicable)

### 6. Testing
- Run migration against test database
- Verify API endpoints return correct data shapes
- Test form submissions with new fields
- Verify all UI displays data correctly

## Example: Adding a New User Field

When adding `phone` field to users table:

```
1. Schema: Add `phone: varchar('phone', { length: 20 })` to users table
2. Migration: Generate with drizzle-kit
3. Types: Update UserProfile interface with `phone?: string`
4. Routes: Include `phone` in SELECT statements and PATCH handlers
5. Frontend Types: Add `phone?: string` to admin.ts UserProfile
6. UI: Add phone field to ProfilePage and admin UserProfilePage
7. Test: Verify full end-to-end flow
```

## Review Checklist
- [ ] Migration generated and reviewed
- [ ] All TypeScript types updated
- [ ] API routes include new fields
- [ ] Frontend types updated
- [ ] UI reflects new fields across all relevant pages
- [ ] Tests pass
- [ ] No TypeScript errors

---
**Note**: This rule ensures schema changes don't create database-frontend mismatches and prevents runtime errors from missing fields in API responses or UI displays.
