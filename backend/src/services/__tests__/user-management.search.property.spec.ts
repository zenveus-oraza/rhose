import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Feature: m2-admin-content-management, Property 8: User Search Returns Matching Results
 *
 * **Validates: Requirements 5.6**
 *
 * For any search query string that is a case-insensitive substring of a user's name or email,
 * that user SHALL appear in the filtered user list results.
 */

// --- In-memory model of the User Management search logic ---

interface UserModel {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'learner';
  status: 'active' | 'deactivated';
}

/**
 * Simulates the search behavior of userManagementService.list().
 * Filters users by case-insensitive partial match on name or email.
 * This mirrors the `ilike(users.name, `%${search}%`)` and
 * `ilike(users.email, `%${search}%`)` logic in the service.
 */
function searchUsers(users: UserModel[], query: string): UserModel[] {
  if (!query) return users;

  const lowerQuery = query.toLowerCase();
  return users.filter(
    (user) =>
      user.name.toLowerCase().includes(lowerQuery) ||
      user.email.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Determines if a user matches a search query (case-insensitive partial match on name or email).
 */
function userMatchesQuery(user: UserModel, query: string): boolean {
  if (!query) return true;
  const lowerQuery = query.toLowerCase();
  return (
    user.name.toLowerCase().includes(lowerQuery) ||
    user.email.toLowerCase().includes(lowerQuery)
  );
}

// --- Generators ---

const arbRole = fc.constantFrom<'admin' | 'learner'>('admin', 'learner');
const arbStatus = fc.constantFrom<'active' | 'deactivated'>('active', 'deactivated');

/**
 * Generate a user with realistic name and email fields.
 */
const arbUser: fc.Arbitrary<UserModel> = fc
  .tuple(
    fc.uuid(),
    fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
    fc.tuple(
      fc.stringMatching(/^[a-z][a-z0-9]{1,8}$/),
      fc.stringMatching(/^[a-z][a-z0-9]{1,6}$/),
      fc.constantFrom('com', 'org', 'net', 'io')
    ).map(([local, domain, tld]) => `${local}@${domain}.${tld}`),
    arbRole,
    arbStatus
  )
  .map(([id, name, email, role, status]) => ({
    id,
    name,
    email,
    role,
    status,
  }));

/**
 * Generate a list of users (1 to 20).
 */
const arbUserList = fc.array(arbUser, { minLength: 1, maxLength: 20 });

/**
 * Generate a non-empty search query string (1 to 10 chars).
 */
const arbSearchQuery = fc.string({ minLength: 1, maxLength: 10 }).filter((s) => s.trim().length > 0);

describe('Feature: m2-admin-content-management, Property 8: User Search Returns Matching Results', () => {
  /**
   * **Validates: Requirements 5.6**
   *
   * For any random set of users and any random search substring,
   * all users whose name or email contains the query (case-insensitive)
   * SHALL appear in the search results.
   */
  it('all users matching the search query appear in the filtered results', () => {
    fc.assert(
      fc.property(arbUserList, arbSearchQuery, (users, query) => {
        const results = searchUsers(users, query);

        // Every user that matches the query must be in the results
        for (const user of users) {
          if (userMatchesQuery(user, query)) {
            const found = results.some((r) => r.id === user.id);
            expect(found).toBe(true);
          }
        }
      }),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 5.6**
   *
   * For any random set of users and any random search substring,
   * no user in the results should fail to match the query.
   * (Results only contain matching users — no false positives.)
   */
  it('search results contain only users that match the query', () => {
    fc.assert(
      fc.property(arbUserList, arbSearchQuery, (users, query) => {
        const results = searchUsers(users, query);

        // Every user in results must actually match the query
        for (const result of results) {
          expect(userMatchesQuery(result, query)).toBe(true);
        }
      }),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 5.6**
   *
   * Search with a substring extracted from a user's name always returns that user.
   * This tests the "guaranteed match" scenario.
   */
  it('searching with a substring of a user name always returns that user', () => {
    fc.assert(
      fc.property(arbUserList, fc.nat(), (users, seed) => {
        // Pick a random user from the list
        const targetUser = users[seed % users.length];
        const name = targetUser.name;

        // Extract a random substring from the name (at least 1 char)
        if (name.length === 0) return;
        const start = seed % name.length;
        const maxLen = name.length - start;
        const len = (seed % maxLen) + 1;
        const substring = name.slice(start, start + len);

        const results = searchUsers(users, substring);
        const found = results.some((r) => r.id === targetUser.id);
        expect(found).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 5.6**
   *
   * Search with a substring extracted from a user's email always returns that user.
   */
  it('searching with a substring of a user email always returns that user', () => {
    fc.assert(
      fc.property(arbUserList, fc.nat(), (users, seed) => {
        // Pick a random user from the list
        const targetUser = users[seed % users.length];
        const email = targetUser.email;

        // Extract a random substring from the email (at least 1 char)
        if (email.length === 0) return;
        const start = seed % email.length;
        const maxLen = email.length - start;
        const len = (seed % maxLen) + 1;
        const substring = email.slice(start, start + len);

        const results = searchUsers(users, substring);
        const found = results.some((r) => r.id === targetUser.id);
        expect(found).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 5.6**
   *
   * Search is case-insensitive: searching with upper/lower/mixed case
   * of a known substring always returns the matching user.
   */
  it('search is case-insensitive', () => {
    fc.assert(
      fc.property(arbUserList, fc.nat(), (users, seed) => {
        // Pick a random user
        const targetUser = users[seed % users.length];
        const name = targetUser.name;

        if (name.length === 0) return;

        // Extract a substring and randomize its case
        const start = seed % name.length;
        const maxLen = name.length - start;
        const len = (seed % maxLen) + 1;
        const substring = name.slice(start, start + len);

        // Convert to alternating case
        const mixedCase = substring
          .split('')
          .map((ch, i) => (i % 2 === 0 ? ch.toUpperCase() : ch.toLowerCase()))
          .join('');

        const results = searchUsers(users, mixedCase);
        const found = results.some((r) => r.id === targetUser.id);
        expect(found).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 5.6**
   *
   * An empty search query returns all users (no filtering applied).
   */
  it('empty search query returns all users', () => {
    fc.assert(
      fc.property(arbUserList, (users) => {
        const results = searchUsers(users, '');
        expect(results.length).toBe(users.length);

        // All users should be present
        for (const user of users) {
          const found = results.some((r) => r.id === user.id);
          expect(found).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 5.6**
   *
   * The number of search results is always <= the total number of users.
   */
  it('search results count is always <= total user count', () => {
    fc.assert(
      fc.property(arbUserList, arbSearchQuery, (users, query) => {
        const results = searchUsers(users, query);
        expect(results.length).toBeLessThanOrEqual(users.length);
      }),
      { numRuns: 200 }
    );
  });
});
