import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { quizzes, quizQuestions, quizOptions } from '../db/schema/quizzes.js';
import { AppError } from '../utils/AppError.js';
import type { CreateQuizInput } from '../schemas/quiz.schemas.js';
import { segmentService } from './segment.service.js';

/**
 * QuizAdminService — handles admin CRUD operations for per-segment quizzes.
 */
export const quizAdminService = {
  /**
   * Create or update a quiz for a given segment.
   * If a quiz already exists for the segment, it replaces questions/options entirely.
   * Runs inside a transaction to ensure atomicity.
   */
  async createOrUpdateQuiz(segmentId: string, data: CreateQuizInput) {
    const segment = await segmentService.resolveIdentifier(segmentId);

    await db.transaction(async (tx) => {
      // Check if quiz already exists for this segment
      const [existingQuiz] = await tx
        .select({ id: quizzes.id })
        .from(quizzes)
        .where(eq(quizzes.segmentId, segment.id))
        .limit(1);

      if (existingQuiz) {
        // Delete existing quiz (cascades to questions, options, attempts)
        await tx.delete(quizzes).where(eq(quizzes.id, existingQuiz.id));
      }

      // Create new quiz
      const [quiz] = await tx
        .insert(quizzes)
        .values({
          title: data.title,
          description: data.description ?? null,
          segmentId: segment.id,
          isRequired: data.is_required ?? false,
          maxAttempts: data.max_attempts ?? null,
        })
        .returning();

      // Create questions and options
      for (let qIndex = 0; qIndex < data.questions.length; qIndex++) {
        const questionData = data.questions[qIndex];

        const [question] = await tx
          .insert(quizQuestions)
          .values({
            quizId: quiz.id,
            questionText: questionData.question_text,
            questionType: questionData.question_type,
            sortOrder: qIndex + 1,
          })
          .returning();

        // Create options for this question
        const optionValues = questionData.options.map((opt, optIndex) => ({
          questionId: question.id,
          optionText: opt.option_text,
          isCorrect: opt.is_correct,
          sortOrder: optIndex + 1,
        }));

        await tx.insert(quizOptions).values(optionValues);
      }
    });

    // Return the full quiz with questions and options
    return this.getQuizForSegment(segmentId);
  },

  /**
   * Get the quiz for a segment with all questions and options (including is_correct for admin).
   * Returns null if no quiz exists for the segment.
   */
  async getQuizForSegment(segmentId: string) {
    const segment = await segmentService.resolveIdentifier(segmentId);

    // Get quiz for segment
    const [quiz] = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.segmentId, segment.id))
      .limit(1);

    if (!quiz) {
      return null;
    }

    // Get questions ordered by sort_order
    const questions = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quiz.id))
      .orderBy(quizQuestions.sortOrder);

    // Get options for all questions
    const questionsWithOptions = await Promise.all(
      questions.map(async (question) => {
        const options = await db
          .select()
          .from(quizOptions)
          .where(eq(quizOptions.questionId, question.id))
          .orderBy(quizOptions.sortOrder);

        return {
          id: question.id,
          questionText: question.questionText,
          questionType: question.questionType,
          sortOrder: question.sortOrder,
          options: options.map((opt) => ({
            id: opt.id,
            optionText: opt.optionText,
            isCorrect: opt.isCorrect,
            sortOrder: opt.sortOrder,
          })),
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
      createdAt: quiz.createdAt,
      updatedAt: quiz.updatedAt,
      questions: questionsWithOptions,
    };
  },

  /**
   * Delete the quiz for a segment (cascades to questions, options, and attempts).
   * Throws 404 if segment or quiz not found.
   */
  async deleteQuiz(segmentId: string) {
    const segment = await segmentService.resolveIdentifier(segmentId);

    // Find the quiz
    const [quiz] = await db
      .select({ id: quizzes.id })
      .from(quizzes)
      .where(eq(quizzes.segmentId, segment.id))
      .limit(1);

    if (!quiz) {
      throw AppError.notFound('Quiz not found');
    }

    // Delete quiz (cascades to questions, options, attempts)
    await db.delete(quizzes).where(eq(quizzes.id, quiz.id));
  },
};
