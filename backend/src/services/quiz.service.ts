import { eq, desc, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { quizzes, quizQuestions, quizOptions, quizAttempts, quizAttemptAnswers } from '../db/schema/quizzes.js';
import { segmentAssignments } from '../db/schema/segment-assignments.js';
import { AppError } from '../utils/AppError.js';
import { activityService } from './activity.service.js';
import type { SubmitQuizAttemptInput } from '../schemas/quiz.schemas.js';
import { segmentService } from './segment.service.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LearnerQuizOption {
  id: string;
  optionText: string;
  sortOrder: number;
}

export interface LearnerQuizQuestion {
  id: string;
  questionText: string;
  questionType: 'single_select' | 'multi_select';
  sortOrder: number;
  options: LearnerQuizOption[];
}

export interface LearnerQuiz {
  id: string;
  title: string;
  description: string | null;
  segmentId: string;
  isRequired: boolean;
  maxAttempts: number | null;
  questions: LearnerQuizQuestion[];
}

export interface AttemptResult {
  attemptId: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  passed: boolean;
}

export interface AttemptSummary {
  id: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  completedAt: string;
}

export interface OptionDetail {
  id: string;
  optionText: string;
}

export interface AttemptAnswerDetail {
  questionId: string;
  questionText: string;
  questionType: 'single_select' | 'multi_select';
  selectedOptions: OptionDetail[];
  correctOptions: OptionDetail[];
  isCorrect: boolean;
}

export interface AttemptDetail {
  id: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  completedAt: string;
  answers: AttemptAnswerDetail[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * QuizService — handles learner-facing quiz operations:
 * - Get quiz for taking (without is_correct)
 * - Submit quiz attempt with score calculation
 * - View attempt history and detail
 *
 * Key invariants:
 * - is_correct is NEVER exposed to learners in getQuizForLearner
 * - Segment access is verified before any operation (403 if not assigned)
 * - 404 if segment not found
 * - Multiple attempts are allowed
 * - Unanswered questions count as incorrect
 */
export const quizService = {
  /**
   * Verify that a user has access to a segment.
   * Checks segment existence (404) and assignment existence (403).
   */
  async verifySegmentAccess(segmentId: string, userId: string): Promise<void> {
    const segment = await segmentService.resolveIdentifier(segmentId);

    // Check user is assigned to this segment
    const [assignment] = await db
      .select({ id: segmentAssignments.id })
      .from(segmentAssignments)
      .where(
        and(
          eq(segmentAssignments.userId, userId),
          eq(segmentAssignments.segmentId, segment.id)
        )
      )
      .limit(1);

    if (!assignment) {
      throw AppError.forbidden('Access denied');
    }
  },

  /**
   * Get quiz for a learner to take. Returns questions with options but EXCLUDES is_correct.
   * Verifies segment access first.
   * Throws 403 if no access, 404 if quiz doesn't exist.
   */
  async getQuizForLearner(segmentId: string, userId: string): Promise<LearnerQuiz> {
    // Verify segment access
    await this.verifySegmentAccess(segmentId, userId);
    const segment = await segmentService.resolveIdentifier(segmentId);

    // Get quiz for segment
    const [quiz] = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.segmentId, segment.id))
      .limit(1);

    if (!quiz) {
      throw AppError.notFound('Quiz not found');
    }

    // Get questions ordered by sort_order
    const questions = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quiz.id))
      .orderBy(quizQuestions.sortOrder);

    // Get options for all questions — EXCLUDING is_correct
    const questionsWithOptions: LearnerQuizQuestion[] = await Promise.all(
      questions.map(async (question) => {
        const options = await db
          .select({
            id: quizOptions.id,
            optionText: quizOptions.optionText,
            sortOrder: quizOptions.sortOrder,
          })
          .from(quizOptions)
          .where(eq(quizOptions.questionId, question.id))
          .orderBy(quizOptions.sortOrder);

        return {
          id: question.id,
          questionText: question.questionText,
          questionType: question.questionType as 'single_select' | 'multi_select',
          sortOrder: question.sortOrder,
          options,
        };
      })
    );

    return {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      segmentId: segment.slug,
      isRequired: quiz.isRequired,
      maxAttempts: quiz.maxAttempts,
      questions: questionsWithOptions,
    };
  },

  /**
   * Submit a quiz attempt. Calculates score, stores attempt + answers,
   * and tracks a "quiz_passed" or "quiz_failed" activity event.
   *
   * Score calculation:
   * - single_select: correct if the single selected option has is_correct=true
   * - multi_select: correct if selected set exactly matches the set of all correct options
   * - Unanswered questions (no answer submitted for a question) = incorrect
   *
   * Multiple attempts are allowed.
   */
  async submitAttempt(segmentId: string, userId: string, data: SubmitQuizAttemptInput): Promise<AttemptResult> {
    // Verify segment access
    await this.verifySegmentAccess(segmentId, userId);
    const segment = await segmentService.resolveIdentifier(segmentId);

    // Get quiz for segment
    const [quiz] = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.segmentId, segment.id))
      .limit(1);

    if (!quiz) {
      throw AppError.notFound('Quiz not found');
    }

    // Enforce max attempts limit if set
    if (quiz.maxAttempts !== null) {
      const existingAttempts = await db
        .select({ id: quizAttempts.id })
        .from(quizAttempts)
        .where(and(eq(quizAttempts.quizId, quiz.id), eq(quizAttempts.userId, userId)));

      if (existingAttempts.length >= quiz.maxAttempts) {
        throw new AppError(403, 'MAX_ATTEMPTS_REACHED', `Maximum attempts (${quiz.maxAttempts}) reached for this quiz`);
      }
    }

    // Get all questions for the quiz
    const questions = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quiz.id))
      .orderBy(quizQuestions.sortOrder);

    if (questions.length === 0) {
      throw AppError.notFound('Quiz has no questions');
    }

    const totalQuestions = questions.length;

    // Get correct options for each question
    const questionCorrectMap = new Map<string, Set<string>>();
    for (const question of questions) {
      const correctOptions = await db
        .select({ id: quizOptions.id })
        .from(quizOptions)
        .where(and(eq(quizOptions.questionId, question.id), eq(quizOptions.isCorrect, true)));

      questionCorrectMap.set(question.id, new Set(correctOptions.map((o) => o.id)));
    }

    // Build answer map from submission
    const answerMap = new Map<string, string[]>();
    for (const answer of data.answers) {
      answerMap.set(answer.question_id, answer.selected_option_ids);
    }

    // Calculate score
    let score = 0;
    for (const question of questions) {
      const correctSet = questionCorrectMap.get(question.id)!;
      const selectedIds = answerMap.get(question.id) ?? []; // Unanswered = empty = incorrect
      const selectedSet = new Set(selectedIds);

      // Correct if selected set exactly matches the correct set
      if (
        selectedSet.size === correctSet.size &&
        [...selectedSet].every((id) => correctSet.has(id))
      ) {
        score++;
      }
    }

    const percentage = Math.round((score / totalQuestions) * 100);

    // Store attempt and answers in a transaction
    const attemptId = await db.transaction(async (tx) => {
      const [attempt] = await tx
        .insert(quizAttempts)
        .values({
          quizId: quiz.id,
          userId,
          score,
          totalQuestions,
        })
        .returning({ id: quizAttempts.id });

      // Store individual answers (one row per selected option)
      const answerValues: Array<{
        attemptId: string;
        questionId: string;
        selectedOptionId: string;
      }> = [];

      for (const answer of data.answers) {
        for (const optionId of answer.selected_option_ids) {
          answerValues.push({
            attemptId: attempt.id,
            questionId: answer.question_id,
            selectedOptionId: optionId,
          });
        }
      }

      if (answerValues.length > 0) {
        await tx.insert(quizAttemptAnswers).values(answerValues);
      }

      return attempt.id;
    });

    // Track activity event
    const passed = percentage >= 70;
    try {
      await activityService.trackEvent({
        userId,
        action: passed ? 'quiz_passed' : 'quiz_failed',
        description: passed
          ? `Passed the quiz "${quiz.title}"`
          : `Failed the quiz "${quiz.title}"`,
        detail: quiz.title,
        metadata: { score, totalQuestions },
      });
    } catch {
      // Activity tracking failures should not break the main quiz submission flow
    }

    return {
      attemptId,
      score,
      totalQuestions,
      percentage,
      passed,
    };
  },

  /**
   * Get attempt history for a learner on a segment's quiz.
   * Returns attempts ordered by completedAt DESC (most recent first).
   * Verifies segment access. Returns empty array if no quiz exists.
   */
  async getAttemptHistory(segmentId: string, userId: string): Promise<AttemptSummary[]> {
    // Verify segment access
    await this.verifySegmentAccess(segmentId, userId);
    const segment = await segmentService.resolveIdentifier(segmentId);

    // Get quiz for segment
    const [quiz] = await db
      .select({ id: quizzes.id })
      .from(quizzes)
      .where(eq(quizzes.segmentId, segment.id))
      .limit(1);

    if (!quiz) {
      return [];
    }

    const attempts = await db
      .select()
      .from(quizAttempts)
      .where(and(eq(quizAttempts.quizId, quiz.id), eq(quizAttempts.userId, userId)))
      .orderBy(desc(quizAttempts.completedAt));

    return attempts.map((attempt) => ({
      id: attempt.id,
      score: attempt.score,
      totalQuestions: attempt.totalQuestions,
      percentage: Math.round((attempt.score / attempt.totalQuestions) * 100),
      completedAt: attempt.completedAt.toISOString(),
    }));
  },

  /**
   * Get detailed breakdown for a specific attempt.
   * Shows per-question results with learner's selection and correct answers.
   * Throws 404 if attempt not found or doesn't belong to user.
   */
  async getAttemptDetail(attemptId: string, userId: string): Promise<AttemptDetail> {
    // Get the attempt and verify ownership in one query
    const [attempt] = await db
      .select()
      .from(quizAttempts)
      .where(and(eq(quizAttempts.id, attemptId), eq(quizAttempts.userId, userId)))
      .limit(1);

    if (!attempt) {
      throw AppError.notFound('Attempt not found');
    }

    // Get all answers for this attempt
    const attemptAnswers = await db
      .select()
      .from(quizAttemptAnswers)
      .where(eq(quizAttemptAnswers.attemptId, attemptId));

    // Group answers by question
    const answersByQuestion = new Map<string, string[]>();
    for (const answer of attemptAnswers) {
      const existing = answersByQuestion.get(answer.questionId) ?? [];
      existing.push(answer.selectedOptionId);
      answersByQuestion.set(answer.questionId, existing);
    }

    // Get all questions for the quiz
    const questions = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, attempt.quizId))
      .orderBy(quizQuestions.sortOrder);

    // Build detailed answer breakdown
    const answers: AttemptAnswerDetail[] = await Promise.all(
      questions.map(async (question) => {
        // Get ALL options for this question (to retrieve text for selected + correct)
        const allOptions = await db
          .select({
            id: quizOptions.id,
            optionText: quizOptions.optionText,
            isCorrect: quizOptions.isCorrect,
          })
          .from(quizOptions)
          .where(eq(quizOptions.questionId, question.id))
          .orderBy(quizOptions.sortOrder);

        const selectedOptionIds = answersByQuestion.get(question.id) ?? [];
        const selectedSet = new Set(selectedOptionIds);

        // Build selected options with text
        const selectedOptions: OptionDetail[] = allOptions
          .filter((opt) => selectedSet.has(opt.id))
          .map((opt) => ({ id: opt.id, optionText: opt.optionText }));

        // Build correct options with text
        const correctOptions: OptionDetail[] = allOptions
          .filter((opt) => opt.isCorrect)
          .map((opt) => ({ id: opt.id, optionText: opt.optionText }));

        // Determine correctness: exact match of selected vs correct sets
        const correctIds = new Set(correctOptions.map((o) => o.id));
        const isCorrect =
          selectedSet.size === correctIds.size &&
          [...selectedSet].every((id) => correctIds.has(id));

        return {
          questionId: question.id,
          questionText: question.questionText,
          questionType: question.questionType as 'single_select' | 'multi_select',
          selectedOptions,
          correctOptions,
          isCorrect,
        };
      })
    );

    return {
      id: attempt.id,
      score: attempt.score,
      totalQuestions: attempt.totalQuestions,
      percentage: Math.round((attempt.score / attempt.totalQuestions) * 100),
      completedAt: attempt.completedAt.toISOString(),
      answers,
    };
  },
};
