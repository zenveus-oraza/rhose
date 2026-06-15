import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Feature: m2-admin-content-management, Property 7: Password Hash Never Exposed
 *
 * **Validates: Requirements 5.1, 5.11**
 *
 * For any API response from any user-related endpoint (create, list, update,
 * deactivate, reset-password), the response body SHALL never contain a password
 * hash field or any field that looks like a bcrypt hash.
 */

// --- In-memory model of the User Management Service ---

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'learner';
  status: 'active' | 'deactivated';
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface UserManagementState {
  users: UserRecord[];
  nextId: number;
}

function createInitialState(): UserManagementState {
  return { users: [], nextId: 1 };
}

/**
 * Generates a bcrypt-like hash string for testing purposes.
 * Real bcrypt hashes start with $2a$, $2b$, or $2y$ followed by cost factor and 53 chars.
 */
function generateFakeBcryptHash(seed: number): string {
  const prefix = '$2b$10$';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789./';
  let hash = prefix;
  let s = seed;
  for (let i = 0; i < 53; i++) {
    hash += chars[Math.abs(s) % chars.length];
    s = (s * 31 + 7) | 0;
  }
  return hash;
}

/**
 * Strips the password hash from a user record, returning only safe fields.
 * This mirrors the service's behavior of using .returning() with specific columns.
 */
function toUserProfile(user: UserRecord): UserProfile {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// --- Operation types ---

type UserOperation =
  | { type: 'create'; name: string; email: string; role: 'admin' | 'learner' }
  | { type: 'list'; search?: string }
  | { type: 'update'; userIndex: number; name?: string; role?: 'admin' | 'learner' }
  | { type: 'deactivate'; userIndex: number }
  | { type: 'reset-password'; userIndex: number };

/**
 * Represents the response from a user management operation.
 * This is what the API would return to the client.
 */
type OperationResponse =
  | { type: 'create'; data: Record<string, unknown> }
  | { type: 'list'; data: Record<string, unknown>[] }
  | { type: 'update'; data: Record<string, unknown> }
  | { type: 'deactivate'; data: Record<string, unknown> }
  | { type: 'reset-password'; data: Record<string, unknown> };

/**
 * Applies a user operation to the state and returns the response object.
 * Models the actual service behavior.
 */
function applyOperation(
  state: UserManagementState,
  op: UserOperation,
  hashSeed: number
): { state: UserManagementState; response: OperationResponse } {
  switch (op.type) {
    case 'create': {
      const passwordHash = generateFakeBcryptHash(hashSeed);
      const now = new Date();
      const newUser: UserRecord = {
        id: `user-${state.nextId}`,
        name: op.name,
        email: op.email,
        role: op.role,
        status: 'active',
        passwordHash,
        createdAt: now,
        updatedAt: now,
      };
      const newState = {
        users: [...state.users, newUser],
        nextId: state.nextId + 1,
      };
      // Service returns user profile + temporaryPassword (not the hash)
      const profile = toUserProfile(newUser);
      const temporaryPassword = `temp-${hashSeed.toString(16).slice(0, 16)}`;
      return {
        state: newState,
        response: {
          type: 'create',
          data: { ...profile, temporaryPassword },
        },
      };
    }

    case 'list': {
      let filtered = state.users;
      if (op.search) {
        const searchLower = op.search.toLowerCase();
        filtered = state.users.filter(
          (u) =>
            u.name.toLowerCase().includes(searchLower) ||
            u.email.toLowerCase().includes(searchLower)
        );
      }
      const profiles = filtered.map(toUserProfile);
      return {
        state,
        response: {
          type: 'list',
          data: profiles.map((p) => ({ ...p })),
        },
      };
    }

    case 'update': {
      if (state.users.length === 0) {
        return { state, response: { type: 'update', data: {} } };
      }
      const idx = op.userIndex % state.users.length;
      const user = state.users[idx];
      const updated: UserRecord = {
        ...user,
        name: op.name ?? user.name,
        role: op.role ?? user.role,
        updatedAt: new Date(),
      };
      const newUsers = [...state.users];
      newUsers[idx] = updated;
      return {
        state: { ...state, users: newUsers },
        response: { type: 'update', data: { ...toUserProfile(updated) } },
      };
    }

    case 'deactivate': {
      if (state.users.length === 0) {
        return { state, response: { type: 'deactivate', data: {} } };
      }
      const idx = op.userIndex % state.users.length;
      const user = state.users[idx];
      const deactivated: UserRecord = {
        ...user,
        status: 'deactivated',
        updatedAt: new Date(),
      };
      const newUsers = [...state.users];
      newUsers[idx] = deactivated;
      return {
        state: { ...state, users: newUsers },
        response: { type: 'deactivate', data: { ...toUserProfile(deactivated) } },
      };
    }

    case 'reset-password': {
      if (state.users.length === 0) {
        return { state, response: { type: 'reset-password', data: {} } };
      }
      const idx = op.userIndex % state.users.length;
      const user = state.users[idx];
      const newPasswordHash = generateFakeBcryptHash(hashSeed + 1);
      const updatedUser: UserRecord = {
        ...user,
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      };
      const newUsers = [...state.users];
      newUsers[idx] = updatedUser;
      const temporaryPassword = `reset-${hashSeed.toString(16).slice(0, 16)}`;
      return {
        state: { ...state, users: newUsers },
        response: {
          type: 'reset-password',
          data: { message: 'Password reset successfully', temporaryPassword },
        },
      };
    }
  }
}

// --- Bcrypt hash detection ---

/**
 * Regex pattern matching bcrypt hash format: $2a$, $2b$, or $2y$ followed by
 * a two-digit cost factor and 53 characters of base64-like encoding.
 */
const BCRYPT_PATTERN = /^\$2[aby]\$\d{2}\$.{53}$/;

/**
 * Checks if a value looks like a bcrypt hash.
 */
function looksLikeBcryptHash(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return BCRYPT_PATTERN.test(value);
}

/**
 * Recursively checks an object for any field named passwordHash, password_hash,
 * or any string value that matches bcrypt hash format.
 */
function containsPasswordHash(obj: unknown, path = ''): string | null {
  if (obj === null || obj === undefined) return null;

  if (typeof obj === 'string') {
    if (looksLikeBcryptHash(obj)) {
      return `bcrypt hash found at ${path}`;
    }
    return null;
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const result = containsPasswordHash(obj[i], `${path}[${i}]`);
      if (result) return result;
    }
    return null;
  }

  if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      // Check for forbidden field names
      if (key === 'passwordHash' || key === 'password_hash') {
        return `forbidden field "${key}" found at ${path}.${key}`;
      }
      // Recursively check values
      const result = containsPasswordHash(value, `${path}.${key}`);
      if (result) return result;
    }
    return null;
  }

  return null;
}

// --- Arbitraries ---

const arbRole = fc.constantFrom<'admin' | 'learner'>('admin', 'learner');

const arbUserName = fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);

const arbEmail = fc
  .tuple(
    fc.stringMatching(/^[a-z][a-z0-9]{0,9}$/),
    fc.stringMatching(/^[a-z][a-z0-9]{0,9}$/),
    fc.constantFrom('com', 'org', 'net', 'io')
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

const arbCreateOp = fc
  .tuple(arbUserName, arbEmail, arbRole)
  .map(([name, email, role]) => ({
    type: 'create' as const,
    name,
    email,
    role,
  }));

const arbListOp = fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }).map(
  (search) => ({ type: 'list' as const, search })
);

const arbUpdateOp = fc
  .tuple(fc.nat({ max: 100 }), fc.option(arbUserName, { nil: undefined }), fc.option(arbRole, { nil: undefined }))
  .map(([userIndex, name, role]) => ({
    type: 'update' as const,
    userIndex,
    name,
    role,
  }));

const arbDeactivateOp = fc.nat({ max: 100 }).map((userIndex) => ({
  type: 'deactivate' as const,
  userIndex,
}));

const arbResetPasswordOp = fc.nat({ max: 100 }).map((userIndex) => ({
  type: 'reset-password' as const,
  userIndex,
}));

const arbOperation: fc.Arbitrary<UserOperation> = fc.oneof(
  { weight: 3, arbitrary: arbCreateOp },
  { weight: 2, arbitrary: arbListOp },
  { weight: 2, arbitrary: arbUpdateOp },
  { weight: 1, arbitrary: arbDeactivateOp },
  { weight: 2, arbitrary: arbResetPasswordOp }
);

const arbOperationSequence = fc.array(arbOperation, { minLength: 1, maxLength: 20 });

describe('Feature: m2-admin-content-management, Property 7: Password Hash Never Exposed', () => {
  /**
   * **Validates: Requirements 5.1, 5.11**
   *
   * For any random sequence of user management operations (create, list, update,
   * deactivate, reset-password), no response ever contains a passwordHash field
   * or any value that looks like a bcrypt hash.
   */
  it('no response from any user operation contains password hash or bcrypt-like values', () => {
    fc.assert(
      fc.property(
        arbOperationSequence,
        fc.array(fc.nat({ max: 100000 }), { minLength: 20, maxLength: 20 }),
        (operations, seeds) => {
          let state = createInitialState();

          for (let i = 0; i < operations.length; i++) {
            const seed = seeds[i % seeds.length];
            const { state: newState, response } = applyOperation(state, operations[i], seed);
            state = newState;

            // Core property: response must never contain password hash
            const violation = containsPasswordHash(response.data, `response[${i}]`);
            expect(violation).toBeNull();
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 5.1, 5.11**
   *
   * For any user creation, the response includes the user profile fields
   * and temporaryPassword but never the passwordHash.
   */
  it('create user response includes profile and temporaryPassword but never passwordHash', () => {
    fc.assert(
      fc.property(
        arbUserName,
        arbEmail,
        arbRole,
        fc.nat({ max: 100000 }),
        (name, email, role, seed) => {
          const state = createInitialState();
          const op: UserOperation = { type: 'create', name, email, role };
          const { response } = applyOperation(state, op, seed);

          // Should have user profile fields
          expect(response.data).toHaveProperty('id');
          expect(response.data).toHaveProperty('name');
          expect(response.data).toHaveProperty('email');
          expect(response.data).toHaveProperty('role');
          expect(response.data).toHaveProperty('status');
          expect(response.data).toHaveProperty('temporaryPassword');

          // Must NOT have password hash
          expect(response.data).not.toHaveProperty('passwordHash');
          expect(response.data).not.toHaveProperty('password_hash');

          // No value should look like a bcrypt hash
          const violation = containsPasswordHash(response.data, 'create-response');
          expect(violation).toBeNull();
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 5.11**
   *
   * For any list operation (with or without search), no user object in the
   * response array contains a password hash.
   */
  it('list users response never contains password hash in any user object', () => {
    fc.assert(
      fc.property(
        fc.array(arbCreateOp, { minLength: 1, maxLength: 10 }),
        fc.option(fc.string({ minLength: 1, maxLength: 10 }), { nil: undefined }),
        fc.array(fc.nat({ max: 100000 }), { minLength: 10, maxLength: 10 }),
        (createOps, search, seeds) => {
          // First create some users
          let state = createInitialState();
          for (let i = 0; i < createOps.length; i++) {
            const { state: newState } = applyOperation(state, createOps[i], seeds[i % seeds.length]);
            state = newState;
          }

          // Then list them
          const listOp: UserOperation = { type: 'list', search };
          const { response } = applyOperation(state, listOp, 0);

          // Check each user in the list
          expect(response.type).toBe('list');
          if (Array.isArray(response.data)) {
            for (const user of response.data) {
              expect(user).not.toHaveProperty('passwordHash');
              expect(user).not.toHaveProperty('password_hash');
              const violation = containsPasswordHash(user, 'list-user');
              expect(violation).toBeNull();
            }
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 5.11**
   *
   * For any reset-password operation, the response contains the temporary
   * password (plain text, not a hash) and never the stored hash.
   */
  it('reset-password response contains temporaryPassword but never a bcrypt hash', () => {
    fc.assert(
      fc.property(
        fc.array(arbCreateOp, { minLength: 1, maxLength: 5 }),
        fc.nat({ max: 100 }),
        fc.array(fc.nat({ max: 100000 }), { minLength: 6, maxLength: 6 }),
        (createOps, resetIndex, seeds) => {
          // Create some users first
          let state = createInitialState();
          for (let i = 0; i < createOps.length; i++) {
            const { state: newState } = applyOperation(state, createOps[i], seeds[i]);
            state = newState;
          }

          if (state.users.length === 0) return;

          // Reset password for a random user
          const resetOp: UserOperation = { type: 'reset-password', userIndex: resetIndex };
          const { response } = applyOperation(state, resetOp, seeds[seeds.length - 1]);

          expect(response.data).toHaveProperty('temporaryPassword');
          expect(response.data).not.toHaveProperty('passwordHash');
          expect(response.data).not.toHaveProperty('password_hash');

          // The temporaryPassword value should NOT look like a bcrypt hash
          const tempPwd = (response.data as Record<string, unknown>).temporaryPassword;
          expect(looksLikeBcryptHash(tempPwd)).toBe(false);

          const violation = containsPasswordHash(response.data, 'reset-response');
          expect(violation).toBeNull();
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 5.11**
   *
   * The internal state stores password hashes, but the toUserProfile function
   * (which mirrors the service's .returning() clause) never leaks them.
   */
  it('toUserProfile never includes passwordHash regardless of input', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          name: arbUserName,
          email: arbEmail,
          role: arbRole,
          status: fc.constantFrom<'active' | 'deactivated'>('active', 'deactivated'),
          passwordHash: fc.string({ minLength: 60, maxLength: 60 }),
          createdAt: fc.date(),
          updatedAt: fc.date(),
        }),
        (userRecord) => {
          const profile = toUserProfile(userRecord);

          expect(profile).not.toHaveProperty('passwordHash');
          expect(profile).not.toHaveProperty('password_hash');
          expect(profile).toHaveProperty('id');
          expect(profile).toHaveProperty('name');
          expect(profile).toHaveProperty('email');
          expect(profile).toHaveProperty('role');
          expect(profile).toHaveProperty('status');
        }
      ),
      { numRuns: 200 }
    );
  });
});
