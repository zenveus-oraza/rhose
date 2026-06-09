import { z } from 'zod';

/**
 * Valid question type values.
 */
export const questionTypeValues = ['single_select', 'multi_select'] as const;
export type QuestionType = (typeof questionTypeValues)[number];

/**
 * Schema for a quiz option (answer choice).
 */
export const quizOptionSchema = z.object({
  option_text: z.string().min(1, 'Option text is required'),
  is_correct: z.boolean(),
});

/**
 * Schema for a quiz question.
 * Validates correct option constraints based on question_type:
 * - single_select: exactly 1 correct option
 * - multi_select: at least 2 correct options
 */
export const quizQuestionSchema = z.object({
  question_text: z.string().min(1, 'Question text is required'),
  question_type: z.enum(questionTypeValues, {
    errorMap: () => ({ message: 'Question type must be "single_select" or "multi_select"' }),
  }),
  options: z.array(quizOptionSchema).min(2, 'At least two options required per question'),
}).superRefine((question, ctx) => {
  const correctCount = question.options.filter((o) => o.is_correct).length;

  if (question.question_type === 'single_select' && correctCount !== 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Exactly one correct option required',
      path: ['options'],
    });
  }

  if (question.question_type === 'multi_select' && correctCount < 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'At least two correct options required for multi-select',
      path: ['options'],
    });
  }
});

/**
 * Schema for creating or updating a quiz for a segment.
 * Title defaults to "Segment Quiz" if not provided.
 * At least one question is required.
 */
export const createQuizSchema = z.object({
  title: z.string().min(1).max(255).optional().default('Segment Quiz'),
  description: z.string().optional(),
  is_required: z.boolean().optional().default(false),
  max_attempts: z.number().int().min(1).nullable().optional().default(null),
  questions: z.array(quizQuestionSchema).min(1, 'At least one question is required'),
});

/**
 * Schema for submitting a quiz attempt.
 * Each answer maps a question to the selected option(s).
 */
export const submitQuizAttemptSchema = z.object({
  answers: z.array(
    z.object({
      question_id: z.string().uuid('question_id must be a valid UUID'),
      selected_option_ids: z.array(
        z.string().uuid('Each selected_option_id must be a valid UUID')
      ).min(1, 'At least one option must be selected per question'),
    })
  ).min(1, 'At least one answer is required'),
});

export type QuizOptionInput = z.infer<typeof quizOptionSchema>;
export type QuizQuestionInput = z.infer<typeof quizQuestionSchema>;
export type CreateQuizInput = z.infer<typeof createQuizSchema>;
export type SubmitQuizAttemptInput = z.infer<typeof submitQuizAttemptSchema>;
