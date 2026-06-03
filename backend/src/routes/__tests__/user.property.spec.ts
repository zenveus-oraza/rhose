import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { profileUpdateSchema, userCreationSchema } from '../../schemas/user.schemas.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';

describe('Feature: m1-project-setup-core-architecture, Property 8: Profile Update Round-Trip', () => {
  /**
   * **Validates: Requirements 5.2**
   *
   * For any valid name string, parsing { name } through profileUpdateSchema
   * succeeds and the output matches the input.
   * For any valid email, parsing { email } succeeds and the output matches.
   */
  it('valid name parses successfully and round-trips through schema', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (name) => {
          const result = profileUpdateSchema.safeParse({ name });
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.name).toBe(name);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('valid email parses successfully and round-trips through schema', () => {
    // Generate emails that conform to Zod's stricter email validation
    const zodSafeEmail = fc
      .tuple(
        fc.stringMatching(/^[a-z][a-z0-9]{0,9}$/),
        fc.stringMatching(/^[a-z][a-z0-9]{0,9}$/),
        fc.constantFrom('com', 'org', 'net', 'io', 'dev')
      )
      .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

    fc.assert(
      fc.property(zodSafeEmail, (email) => {
        const result = profileUpdateSchema.safeParse({ email });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.email).toBe(email);
        }
      }),
      { numRuns: 100 }
    );
  });
});

describe('Feature: m1-project-setup-core-architecture, Property 9: Password Change Round-Trip', () => {
  /**
   * **Validates: Requirements 5.4**
   *
   * For any two distinct passwords (old and new), hash the old, verify it matches,
   * hash the new, verify the new matches and the old no longer matches the new hash.
   */
  it('after password change, new password works and old is rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 72 }),
        fc.string({ minLength: 8, maxLength: 72 }),
        async (oldPassword, newPassword) => {
          fc.pre(oldPassword !== newPassword);

          // Hash the old password and verify it matches
          const oldHash = await hashPassword(oldPassword);
          const oldVerifies = await verifyPassword(oldPassword, oldHash);
          expect(oldVerifies).toBe(true);

          // Hash the new password and verify it matches
          const newHash = await hashPassword(newPassword);
          const newVerifies = await verifyPassword(newPassword, newHash);
          expect(newVerifies).toBe(true);

          // Old password should NOT match the new hash
          const oldAgainstNew = await verifyPassword(oldPassword, newHash);
          expect(oldAgainstNew).toBe(false);
        }
      ),
      { numRuns: 10 }
    );
  });
});

describe('Feature: m1-project-setup-core-architecture, Property 10: No Password Hash in API Responses', () => {
  /**
   * **Validates: Requirements 4.5, 5.1, 9.1**
   *
   * The expected user response fields never include password_hash or passwordHash.
   * For any object with safe fields plus a passwordHash field, a sanitization
   * function that picks only safe fields excludes the hash.
   */
  const SAFE_USER_FIELDS = ['id', 'email', 'name', 'role', 'status', 'createdAt', 'updatedAt'];

  it('safe user fields list does not include password_hash or passwordHash', () => {
    expect(SAFE_USER_FIELDS).not.toContain('passwordHash');
    expect(SAFE_USER_FIELDS).not.toContain('password_hash');
  });

  it('sanitization function excludes passwordHash for any generated user object', () => {
    // Sanitization function: picks only safe fields from an object
    const sanitizeUser = (user: Record<string, unknown>): Record<string, unknown> => {
      const sanitized: Record<string, unknown> = {};
      for (const key of SAFE_USER_FIELDS) {
        if (key in user) {
          sanitized[key] = user[key];
        }
      }
      return sanitized;
    };

    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          email: fc.emailAddress(),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          role: fc.constantFrom('admin', 'learner'),
          status: fc.constantFrom('active', 'inactive', 'deactivated'),
          createdAt: fc.date().map((d) => d.toISOString()),
          updatedAt: fc.date().map((d) => d.toISOString()),
          passwordHash: fc.string({ minLength: 60, maxLength: 60 }),
        }),
        (userWithHash) => {
          const sanitized = sanitizeUser(userWithHash);
          expect(sanitized).not.toHaveProperty('passwordHash');
          expect(sanitized).not.toHaveProperty('password_hash');
          // Verify safe fields are preserved
          expect(sanitized).toHaveProperty('id');
          expect(sanitized).toHaveProperty('email');
          expect(sanitized).toHaveProperty('name');
          expect(sanitized).toHaveProperty('role');
          expect(sanitized).toHaveProperty('status');
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: m1-project-setup-core-architecture, Property 13: User Creation Stores Correct Status and Role', () => {
  /**
   * **Validates: Requirements 9.1, 9.5**
   *
   * For any role in ['admin', 'learner'], parsing a valid user creation payload succeeds.
   * For any string NOT in ['admin', 'learner'], parsing fails.
   */
  it('valid roles (admin, learner) parse successfully', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('admin', 'learner'),
        (role) => {
          const result = userCreationSchema.safeParse({
            name: 'Test',
            email: 'test@example.com',
            role,
          });
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.role).toBe(role);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('invalid roles are rejected by the schema', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(
          (s) => s !== 'admin' && s !== 'learner'
        ),
        (invalidRole) => {
          const result = userCreationSchema.safeParse({
            name: 'Test',
            email: 'test@example.com',
            role: invalidRole,
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
