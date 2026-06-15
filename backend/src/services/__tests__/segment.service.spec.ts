import { describe, it, expect } from 'vitest';
import { createSegmentSchema, updateSegmentSchema } from '../../schemas/segment.schemas.js';

/**
 * Unit tests for Segment Zod validation schemas and status transition rules.
 * These tests validate the schema layer without requiring a database connection.
 */
describe('Segment Schemas', () => {
  describe('createSegmentSchema', () => {
    it('should accept valid input with title and duration', () => {
      const result = createSegmentSchema.safeParse({ title: 'My Segment', duration: 30 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('My Segment');
        expect(result.data.duration).toBe(30);
        expect(result.data.description).toBeUndefined();
      }
    });

    it('should accept valid input with title, description, and duration', () => {
      const result = createSegmentSchema.safeParse({
        title: 'My Segment',
        description: 'A description',
        duration: 14,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('My Segment');
        expect(result.data.description).toBe('A description');
        expect(result.data.duration).toBe(14);
      }
    });

    it('should reject missing title', () => {
      const result = createSegmentSchema.safeParse({ duration: 30 });
      expect(result.success).toBe(false);
    });

    it('should reject empty title', () => {
      const result = createSegmentSchema.safeParse({ title: '', duration: 30 });
      expect(result.success).toBe(false);
    });

    it('should reject title exceeding 255 characters', () => {
      const result = createSegmentSchema.safeParse({ title: 'a'.repeat(256), duration: 30 });
      expect(result.success).toBe(false);
    });

    it('should reject missing duration', () => {
      const result = createSegmentSchema.safeParse({ title: 'Test' });
      expect(result.success).toBe(false);
    });

    it('should reject zero duration', () => {
      const result = createSegmentSchema.safeParse({ title: 'Test', duration: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject negative duration', () => {
      const result = createSegmentSchema.safeParse({ title: 'Test', duration: -5 });
      expect(result.success).toBe(false);
    });

    it('should reject non-integer duration', () => {
      const result = createSegmentSchema.safeParse({ title: 'Test', duration: 3.5 });
      expect(result.success).toBe(false);
    });

    it('should reject non-number duration', () => {
      const result = createSegmentSchema.safeParse({ title: 'Test', duration: 'thirty' });
      expect(result.success).toBe(false);
    });
  });

  describe('updateSegmentSchema', () => {
    it('should accept empty object (no fields to update)', () => {
      const result = updateSegmentSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept valid title update', () => {
      const result = updateSegmentSchema.safeParse({ title: 'Updated Title' });
      expect(result.success).toBe(true);
    });

    it('should accept valid duration update', () => {
      const result = updateSegmentSchema.safeParse({ duration: 60 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.duration).toBe(60);
      }
    });

    it('should reject invalid duration on update (zero)', () => {
      const result = updateSegmentSchema.safeParse({ duration: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject invalid duration on update (negative)', () => {
      const result = updateSegmentSchema.safeParse({ duration: -1 });
      expect(result.success).toBe(false);
    });

    it('should reject non-integer duration on update', () => {
      const result = updateSegmentSchema.safeParse({ duration: 2.5 });
      expect(result.success).toBe(false);
    });

    it('should accept valid status values', () => {
      for (const status of ['draft', 'active', 'archived']) {
        const result = updateSegmentSchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid status value', () => {
      const result = updateSegmentSchema.safeParse({ status: 'published' });
      expect(result.success).toBe(false);
    });

    it('should reject empty title when provided', () => {
      const result = updateSegmentSchema.safeParse({ title: '' });
      expect(result.success).toBe(false);
    });
  });
});

/**
 * Unit tests for status transition logic.
 * Tests the valid state machine: draft→active, draft→archived, active→archived.
 * All transitions from "archived" are rejected.
 */
describe('Segment Status Transition Logic', () => {
  // Replicate the transition map from the service for isolated testing
  const VALID_TRANSITIONS: Record<string, string[]> = {
    draft: ['active', 'archived'],
    active: ['archived'],
    archived: [],
  };

  function isValidTransition(from: string, to: string): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
  }

  describe('valid transitions', () => {
    it('should allow draft → active', () => {
      expect(isValidTransition('draft', 'active')).toBe(true);
    });

    it('should allow draft → archived', () => {
      expect(isValidTransition('draft', 'archived')).toBe(true);
    });

    it('should allow active → archived', () => {
      expect(isValidTransition('active', 'archived')).toBe(true);
    });
  });

  describe('invalid transitions', () => {
    it('should reject archived → active', () => {
      expect(isValidTransition('archived', 'active')).toBe(false);
    });

    it('should reject archived → draft', () => {
      expect(isValidTransition('archived', 'draft')).toBe(false);
    });

    it('should reject active → draft', () => {
      expect(isValidTransition('active', 'draft')).toBe(false);
    });
  });

  describe('no-op transitions (same status)', () => {
    it('should reject draft → draft as not in allowed list', () => {
      expect(isValidTransition('draft', 'draft')).toBe(false);
    });

    it('should reject active → active as not in allowed list', () => {
      expect(isValidTransition('active', 'active')).toBe(false);
    });

    it('should reject archived → archived as not in allowed list', () => {
      expect(isValidTransition('archived', 'archived')).toBe(false);
    });
  });
});
