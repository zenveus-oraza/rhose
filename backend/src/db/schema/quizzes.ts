import { pgTable, uuid, text, integer, timestamp, boolean, pgEnum, unique } from 'drizzle-orm/pg-core';
import { segments } from './segments.js';
import { users } from './users.js';

/**
 * Question type enum: single_select or multi_select.
 */
export const questionTypeEnum = pgEnum('question_type', ['single_select', 'multi_select']);

/**
 * Quizzes table — per-segment quiz container.
 * UNIQUE on segment_id ensures one quiz per segment.
 */
export const quizzes = pgTable('quizzes', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull().default('Segment Quiz'),
  description: text('description'),
  segmentId: uuid('segment_id').notNull().references(() => segments.id, { onDelete: 'cascade' }).unique(),
  isRequired: boolean('is_required').notNull().default(false),
  maxAttempts: integer('max_attempts'), // null = unlimited
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Quiz Questions table — individual questions within a quiz.
 * UNIQUE on (quiz_id, sort_order) ensures no duplicate ordering.
 * CASCADE delete when parent quiz is removed.
 */
export const quizQuestions = pgTable('quiz_questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  quizId: uuid('quiz_id').notNull().references(() => quizzes.id, { onDelete: 'cascade' }),
  questionText: text('question_text').notNull(),
  questionType: questionTypeEnum('question_type').notNull().default('single_select'),
  sortOrder: integer('sort_order').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueQuizSortOrder: unique().on(table.quizId, table.sortOrder),
}));

/**
 * Quiz Options table — answer options for a question.
 * UNIQUE on (question_id, sort_order) ensures no duplicate ordering.
 * CASCADE delete when parent question is removed.
 */
export const quizOptions = pgTable('quiz_options', {
  id: uuid('id').primaryKey().defaultRandom(),
  questionId: uuid('question_id').notNull().references(() => quizQuestions.id, { onDelete: 'cascade' }),
  optionText: text('option_text').notNull(),
  isCorrect: boolean('is_correct').notNull().default(false),
  sortOrder: integer('sort_order').notNull(),
}, (table) => ({
  uniqueQuestionSortOrder: unique().on(table.questionId, table.sortOrder),
}));

/**
 * Quiz Attempts table — records a learner's quiz submission.
 * CASCADE delete when parent quiz or user is removed.
 */
export const quizAttempts = pgTable('quiz_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  quizId: uuid('quiz_id').notNull().references(() => quizzes.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  score: integer('score').notNull(),
  totalQuestions: integer('total_questions').notNull(),
  completedAt: timestamp('completed_at').notNull().defaultNow(),
});

/**
 * Quiz Attempt Answers table — per-question answer within an attempt.
 * CASCADE delete when parent attempt is removed.
 */
export const quizAttemptAnswers = pgTable('quiz_attempt_answers', {
  id: uuid('id').primaryKey().defaultRandom(),
  attemptId: uuid('attempt_id').notNull().references(() => quizAttempts.id, { onDelete: 'cascade' }),
  questionId: uuid('question_id').notNull().references(() => quizQuestions.id),
  selectedOptionId: uuid('selected_option_id').notNull().references(() => quizOptions.id),
});
