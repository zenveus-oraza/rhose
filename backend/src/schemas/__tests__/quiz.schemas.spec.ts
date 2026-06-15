import { describe, it, expect } from 'vitest';
import { createQuizSchema, submitQuizAttemptSchema } from '../quiz.schemas.js';

describe('createQuizSchema', () => {
  it('accepts a valid quiz with single_select question', () => {
    const result = createQuizSchema.safeParse({
      questions: [
        {
          question_text: 'What is 2 + 2?',
          question_type: 'single_select',
          options: [
            { option_text: '3', is_correct: false },
            { option_text: '4', is_correct: true },
          ],
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Segment Quiz');
    }
  });

  it('accepts a valid quiz with multi_select question', () => {
    const result = createQuizSchema.safeParse({
      title: 'Custom Quiz',
      questions: [
        {
          question_text: 'Select all even numbers',
          question_type: 'multi_select',
          options: [
            { option_text: '2', is_correct: true },
            { option_text: '3', is_correct: false },
            { option_text: '4', is_correct: true },
          ],
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Custom Quiz');
    }
  });

  it('defaults title to "Segment Quiz" when not provided', () => {
    const result = createQuizSchema.safeParse({
      questions: [
        {
          question_text: 'Q1',
          question_type: 'single_select',
          options: [
            { option_text: 'A', is_correct: true },
            { option_text: 'B', is_correct: false },
          ],
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Segment Quiz');
    }
  });

  it('rejects when questions array is empty', () => {
    const result = createQuizSchema.safeParse({
      questions: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues.find((i) => i.path.includes('questions'));
      expect(msg?.message).toBe('At least one question is required');
    }
  });

  it('rejects when options array has fewer than 2 items', () => {
    const result = createQuizSchema.safeParse({
      questions: [
        {
          question_text: 'Q1',
          question_type: 'single_select',
          options: [{ option_text: 'Only one', is_correct: true }],
        },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues.find((i) => i.path.includes('options'));
      expect(msg?.message).toBe('At least two options required per question');
    }
  });

  it('rejects single_select with zero correct options', () => {
    const result = createQuizSchema.safeParse({
      questions: [
        {
          question_text: 'Q1',
          question_type: 'single_select',
          options: [
            { option_text: 'A', is_correct: false },
            { option_text: 'B', is_correct: false },
          ],
        },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues.find((i) =>
        i.message === 'Exactly one correct option required'
      );
      expect(msg).toBeDefined();
    }
  });

  it('rejects single_select with more than 1 correct option', () => {
    const result = createQuizSchema.safeParse({
      questions: [
        {
          question_text: 'Q1',
          question_type: 'single_select',
          options: [
            { option_text: 'A', is_correct: true },
            { option_text: 'B', is_correct: true },
          ],
        },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues.find((i) =>
        i.message === 'Exactly one correct option required'
      );
      expect(msg).toBeDefined();
    }
  });

  it('rejects multi_select with fewer than 2 correct options', () => {
    const result = createQuizSchema.safeParse({
      questions: [
        {
          question_text: 'Q1',
          question_type: 'multi_select',
          options: [
            { option_text: 'A', is_correct: true },
            { option_text: 'B', is_correct: false },
          ],
        },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues.find((i) =>
        i.message === 'At least two correct options required for multi-select'
      );
      expect(msg).toBeDefined();
    }
  });

  it('rejects when question_text is empty', () => {
    const result = createQuizSchema.safeParse({
      questions: [
        {
          question_text: '',
          question_type: 'single_select',
          options: [
            { option_text: 'A', is_correct: true },
            { option_text: 'B', is_correct: false },
          ],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects when option_text is empty', () => {
    const result = createQuizSchema.safeParse({
      questions: [
        {
          question_text: 'Q1',
          question_type: 'single_select',
          options: [
            { option_text: '', is_correct: true },
            { option_text: 'B', is_correct: false },
          ],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid question_type', () => {
    const result = createQuizSchema.safeParse({
      questions: [
        {
          question_text: 'Q1',
          question_type: 'free_text',
          options: [
            { option_text: 'A', is_correct: true },
            { option_text: 'B', is_correct: false },
          ],
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe('submitQuizAttemptSchema', () => {
  it('accepts valid answers', () => {
    const result = submitQuizAttemptSchema.safeParse({
      answers: [
        {
          question_id: '550e8400-e29b-41d4-a716-446655440000',
          selected_option_ids: ['550e8400-e29b-41d4-a716-446655440001'],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty answers array', () => {
    const result = submitQuizAttemptSchema.safeParse({ answers: [] });
    expect(result.success).toBe(false);
  });

  it('rejects invalid UUID in question_id', () => {
    const result = submitQuizAttemptSchema.safeParse({
      answers: [
        {
          question_id: 'not-a-uuid',
          selected_option_ids: ['550e8400-e29b-41d4-a716-446655440001'],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty selected_option_ids', () => {
    const result = submitQuizAttemptSchema.safeParse({
      answers: [
        {
          question_id: '550e8400-e29b-41d4-a716-446655440000',
          selected_option_ids: [],
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});
