import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../password.js';

describe('password utility', () => {
  describe('hashPassword', () => {
    it('should return a bcrypt hash string', async () => {
      const hash = await hashPassword('testPassword123');
      // bcrypt hashes start with $2b$ (or $2a$)
      expect(hash).toMatch(/^\$2[ab]\$/);
    });

    it('should use a cost factor of at least 10', async () => {
      const hash = await hashPassword('testPassword123');
      // bcrypt hash format: $2b$<cost>$<salt+hash>
      const costFactor = parseInt(hash.split('$')[2], 10);
      expect(costFactor).toBeGreaterThanOrEqual(10);
    });

    it('should produce different hashes for the same plaintext (due to salt)', async () => {
      const hash1 = await hashPassword('samePassword');
      const hash2 = await hashPassword('samePassword');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for matching plaintext and hash', async () => {
      const plaintext = 'mySecurePassword!';
      const hash = await hashPassword(plaintext);
      const result = await verifyPassword(plaintext, hash);
      expect(result).toBe(true);
    });

    it('should return false for non-matching plaintext', async () => {
      const hash = await hashPassword('correctPassword');
      const result = await verifyPassword('wrongPassword', hash);
      expect(result).toBe(false);
    });

    it('should return false for empty plaintext against a valid hash', async () => {
      const hash = await hashPassword('somePassword');
      const result = await verifyPassword('', hash);
      expect(result).toBe(false);
    });
  });
});
