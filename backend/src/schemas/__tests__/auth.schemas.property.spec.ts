import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { loginSchema } from '../auth.schemas.js';

describe('Feature: m1-project-setup-core-architecture, Property 5: Validation Rejects Invalid Payloads', () => {
  /**
   * **Validates: Requirements 2.4, 2.5**
   *
   * For any object missing required fields or with invalid email format,
   * loginSchema.safeParse() returns success: false with appropriate error messages.
   */

  it('rejects payloads missing the email field', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (password) => {
          const result = loginSchema.safeParse({ password });

          expect(result.success).toBe(false);
          if (!result.success) {
            const emailErrors = result.error.issues.filter(
              (issue) => issue.path.includes('email')
            );
            expect(emailErrors.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects payloads missing the password field', () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        (email) => {
          const result = loginSchema.safeParse({ email });

          expect(result.success).toBe(false);
          if (!result.success) {
            const passwordErrors = result.error.issues.filter(
              (issue) => issue.path.includes('password')
            );
            expect(passwordErrors.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects payloads with invalid email format', () => {
    fc.assert(
      fc.property(
        // Generate strings that are NOT valid emails
        fc.string({ minLength: 1, maxLength: 100 }).filter((s) => {
          // Must not contain @ or must not have valid email structure
          return !s.includes('@') || !s.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        }),
        fc.string({ minLength: 1, maxLength: 100 }),
        (invalidEmail, password) => {
          const result = loginSchema.safeParse({ email: invalidEmail, password });

          expect(result.success).toBe(false);
          if (!result.success) {
            const emailErrors = result.error.issues.filter(
              (issue) => issue.path.includes('email')
            );
            expect(emailErrors.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects completely empty payloads', () => {
    const result = loginSchema.safeParse({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('accepts valid payloads with proper email and non-empty password', () => {
    // Use a constrained email generator that produces emails Zod's .email() accepts
    const zodCompatibleEmail = fc
      .tuple(
        fc.stringMatching(/^[a-z][a-z0-9]{1,10}$/),
        fc.stringMatching(/^[a-z]{2,8}$/),
        fc.constantFrom('com', 'org', 'net', 'io', 'dev')
      )
      .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

    fc.assert(
      fc.property(
        zodCompatibleEmail,
        fc.string({ minLength: 1, maxLength: 100 }),
        (email, password) => {
          const result = loginSchema.safeParse({ email, password });
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
