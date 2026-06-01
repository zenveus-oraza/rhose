import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { hashPassword, verifyPassword } from '../password.js';

describe('Feature: m1-project-setup-core-architecture, Property 1: Password Hash Round-Trip', () => {
  /**
   * **Validates: Requirements 4.3**
   *
   * For any non-empty plaintext password string, hashing it with bcrypt
   * and then verifying the same plaintext against the resulting hash
   * SHALL return true.
   */
  it('hashing then verifying same plaintext returns true', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 72 }),
        async (plaintext) => {
          const hash = await hashPassword(plaintext);
          const result = await verifyPassword(plaintext, hash);
          expect(result).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });
});

describe('Feature: m1-project-setup-core-architecture, Property 2: Distinct Passwords Produce Distinct Hashes', () => {
  /**
   * **Validates: Requirements 4.4**
   *
   * For any two distinct non-empty plaintext password strings,
   * hashing both SHALL produce different hash outputs.
   */
  it('different plaintexts produce different hashes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 72 }),
        fc.string({ minLength: 1, maxLength: 72 }),
        async (password1, password2) => {
          fc.pre(password1 !== password2);
          const hash1 = await hashPassword(password1);
          const hash2 = await hashPassword(password2);
          expect(hash1).not.toBe(hash2);
        }
      ),
      { numRuns: 20 }
    );
  });
});
