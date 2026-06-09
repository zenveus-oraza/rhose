import { useState, useCallback } from 'react';
import { FileQuestion, Loader2 } from 'lucide-react';
import { useLearnerQuiz, useSubmitQuizAttempt, useQuizAttemptHistory } from '@/hooks/useQuiz';
import { getAttemptDetail } from '@/services/quiz.service';
import { QuizView } from './QuizView';
import { QuizResults } from './QuizResults';
import type { AnswerInput, AttemptDetail } from '@/types/quiz';

type QuizPhase = 'idle' | 'taking' | 'results';

interface QuizSectionProps {
  segmentId: string;
  onContinue?: () => void;
}

/**
 * QuizSection — Container component that orchestrates the learner quiz flow.
 * Placed in the segment detail page. Handles loading quiz data, taking the quiz,
 * submitting, and displaying results. Clearly marked as optional.
 */
export function QuizSection({ segmentId, onContinue }: QuizSectionProps) {
  const { data: quiz, isLoading: quizLoading, isError: quizError } = useLearnerQuiz(segmentId);
  const { data: attempts = [], isLoading: attemptsLoading } = useQuizAttemptHistory(segmentId);
  const submitMutation = useSubmitQuizAttempt();
  const [phase, setPhase] = useState<QuizPhase>('idle');
  const [attemptResult, setAttemptResult] = useState<AttemptDetail | null>(null);

  const handleStartQuiz = useCallback(() => {
    setPhase('taking');
    setAttemptResult(null);
  }, []);

  const handleSkip = useCallback(() => {
    setPhase('idle');
    onContinue?.();
  }, [onContinue]);

  const handleSubmit = useCallback(
    async (answers: AnswerInput[]) => {
      try {
        const result = await submitMutation.mutateAsync({
          segmentId,
          data: { answers },
        });
        // Fetch attempt detail for the per-question breakdown
        const detail = await getAttemptDetail(segmentId, result.attemptId);
        setAttemptResult(detail);
        setPhase('results');
      } catch {
        // Error handled by React Query — submitMutation.isError will be true
      }
    },
    [segmentId, submitMutation]
  );

  const handleRetake = useCallback(() => {
    setPhase('taking');
    setAttemptResult(null);
  }, []);

  const handleContinue = useCallback(() => {
    setPhase('idle');
    onContinue?.();
  }, [onContinue]);

  // Loading state
  if (quizLoading || attemptsLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading quiz...</span>
        </div>
      </div>
    );
  }

  // No quiz available for this segment
  if (quizError || !quiz) {
    return null;
  }

  // Results phase
  if (phase === 'results' && attemptResult) {
    return (
      <div className="space-y-4">
        <QuizSectionHeader isRequired={quiz.isRequired} />
        <QuizResults
          result={attemptResult}
          onRetake={handleRetake}
          onContinue={handleContinue}
        />
      </div>
    );
  }

  // Taking phase
  if (phase === 'taking') {
    return (
      <div className="space-y-4">
        <QuizSectionHeader isRequired={quiz.isRequired} />
        {submitMutation.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">
              Failed to submit quiz. Please try again.
            </p>
          </div>
        )}
        <QuizView
          quiz={quiz}
          attempts={attempts}
          isSubmitting={submitMutation.isPending}
          onSubmit={handleSubmit}
          onSkip={handleSkip}
        />
      </div>
    );
  }

  // Check if max attempts reached
  const maxAttemptsReached = quiz.maxAttempts !== null && attempts.length >= quiz.maxAttempts;

  // Idle phase — show quiz prompt card
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <QuizSectionHeader isRequired={quiz.isRequired} />
      <div className="mt-4 flex flex-col items-center text-center">
        <FileQuestion className="h-10 w-10 text-cyan-500 mb-3" />
        <h3 className="text-base font-semibold text-gray-900 mb-1">
          {quiz.title || 'Segment Quiz'}
        </h3>
        <p className="text-sm text-gray-600 mb-1">
          {quiz.questions.length} question{quiz.questions.length !== 1 ? 's' : ''}
          {quiz.maxAttempts !== null && (
            <span className="ml-1">• {quiz.maxAttempts} attempt{quiz.maxAttempts !== 1 ? 's' : ''} allowed</span>
          )}
        </p>
        {attempts.length > 0 && (
          <p className="text-xs text-gray-500 mb-3">
            Best score:{' '}
            <span className="font-medium text-cyan-600">
              {Math.max(...attempts.map((a) => a.percentage))}%
            </span>{' '}
            ({attempts.length} attempt{attempts.length !== 1 ? 's' : ''}{quiz.maxAttempts !== null ? ` of ${quiz.maxAttempts}` : ''})
          </p>
        )}
        {maxAttemptsReached ? (
          <p className="mt-2 text-sm text-red-600 font-medium">
            Maximum attempts reached
          </p>
        ) : (
          <button
            type="button"
            onClick={handleStartQuiz}
            className="mt-2 inline-flex items-center gap-2 rounded-md bg-secondary px-4 py-2.5 text-sm font-medium text-white hover:bg-secondary/90 transition"
          >
            {attempts.length > 0 ? 'Retake Quiz' : 'Start Quiz'}
          </button>
        )}
      </div>
    </div>
  );
}

/** Shared header that communicates quiz is required or optional */
function QuizSectionHeader({ isRequired }: { isRequired?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <FileQuestion className="h-4 w-4 text-gray-400" />
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        Quiz
      </span>
      <span className={`ml-auto text-xs italic ${isRequired ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
        {isRequired
          ? 'This quiz is required'
          : 'This quiz is optional and does not affect your progress'}
      </span>
    </div>
  );
}
