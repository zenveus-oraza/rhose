import { CheckCircle2, XCircle, RotateCcw, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { AttemptDetail, AttemptAnswerDetail } from '@/types/quiz';

interface QuizResultsProps {
  result: AttemptDetail;
  onRetake: () => void;
  onContinue: () => void;
}

/**
 * QuizResults — Displays quiz results after submission.
 * Shows overall score with percentage, and per-question breakdown
 * indicating which answers were correct/incorrect.
 */
export function QuizResults({ result, onRetake, onContinue }: QuizResultsProps) {
  const isPassing = result.percentage >= 70;

  return (
    <div className="space-y-6">
      {/* Overall Score Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
        <div
          className={`inline-flex items-center justify-center h-16 w-16 rounded-full mb-4 ${
            isPassing ? 'bg-green-100' : 'bg-red-100'
          }`}
        >
          {isPassing ? (
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          ) : (
            <XCircle className="h-8 w-8 text-red-500" />
          )}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          {isPassing ? 'Great job!' : 'Keep trying!'}
        </h3>
        <p className="text-2xl font-bold text-gray-900">
          {result.score} out of {result.totalQuestions}
        </p>
        <p className="text-sm text-gray-500 mt-1">{result.percentage}% correct</p>
      </div>

      {/* Per-question Breakdown */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-700">Question Breakdown</h4>
        {result.answers.map((answer, index) => (
          <QuestionResult key={answer.questionId} answer={answer} index={index} />
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <Button variant="outline" onClick={onRetake}>
          <span className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Retake Quiz
          </span>
        </Button>
        <Button variant="primary" onClick={onContinue}>
          <span className="flex items-center gap-2">
            Continue
            <ArrowRight className="h-4 w-4" />
          </span>
        </Button>
      </div>
    </div>
  );
}

// --- QuestionResult sub-component ---

interface QuestionResultProps {
  answer: AttemptAnswerDetail;
  index: number;
}

function QuestionResult({ answer, index }: QuestionResultProps) {
  const selectedText = answer.selectedOptions.length > 0
    ? answer.selectedOptions.map((o) => o.optionText).join(', ')
    : 'No answer';
  const correctText = answer.correctOptions.map((o) => o.optionText).join(', ');

  return (
    <div
      className={`rounded-lg border p-4 ${
        answer.isCorrect ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'
      }`}
    >
      <div className="flex items-start gap-3">
        {answer.isCorrect ? (
          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
        ) : (
          <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">
            Q{index + 1}: {answer.questionText}
          </p>
          <div className="mt-2 space-y-1">
            <p className="text-xs text-gray-600">
              <span className="font-medium">Your answer:</span>{' '}
              <span className={answer.isCorrect ? 'text-green-700' : 'text-red-600'}>
                {selectedText}
              </span>
            </p>
            {!answer.isCorrect && (
              <p className="text-xs text-gray-600">
                <span className="font-medium">Correct answer:</span>{' '}
                <span className="text-green-700">{correctText}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
