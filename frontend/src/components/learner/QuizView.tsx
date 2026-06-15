import { useState, useCallback } from 'react';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type {
  LearnerQuiz,
  LearnerQuizQuestion,
  AnswerInput,
  AttemptSummary,
} from '@/types/quiz';

interface QuizViewProps {
  quiz: LearnerQuiz;
  attempts: AttemptSummary[];
  isSubmitting: boolean;
  onSubmit: (answers: AnswerInput[]) => void;
  onSkip: () => void;
}

/**
 * QuizView — Renders quiz questions with radio/checkbox inputs for learners.
 * Handles single_select (radio) and multi_select (checkbox) question types.
 * Shows previous best score with retake option when applicable.
 */
export function QuizView({ quiz, attempts, isSubmitting, onSubmit, onSkip }: QuizViewProps) {
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [showRetake, setShowRetake] = useState(attempts.length > 0);

  const bestAttempt = attempts.length > 0
    ? attempts.reduce((best, a) => (a.percentage > best.percentage ? a : best), attempts[0])
    : null;

  const handleSingleSelect = useCallback((questionId: string, optionId: string) => {
    setSelections((prev) => ({ ...prev, [questionId]: [optionId] }));
  }, []);

  const handleMultiSelect = useCallback((questionId: string, optionId: string) => {
    setSelections((prev) => {
      const current = prev[questionId] || [];
      const updated = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return { ...prev, [questionId]: updated };
    });
  }, []);

  const handleSubmit = () => {
    const answers: AnswerInput[] = quiz.questions.map((q) => ({
      question_id: q.id,
      selected_option_ids: selections[q.id] || [],
    }));
    onSubmit(answers);
  };

  const handleRetake = () => {
    setSelections({});
    setShowRetake(false);
  };

  // If user has previous attempts, show best score with retake option
  if (showRetake && bestAttempt) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
          <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Quiz Previously Attempted</h3>
          <p className="text-sm text-gray-600 mb-2">
            Your best score: <span className="font-bold text-cyan-600">{bestAttempt.score} out of {bestAttempt.totalQuestions}</span>{' '}
            ({bestAttempt.percentage}%)
          </p>
          <p className="text-xs text-gray-500 mb-4">
            Attempts: {attempts.length}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="primary" onClick={handleRetake}>
              <span className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                Retake Quiz
              </span>
            </Button>
            <button
              type="button"
              onClick={onSkip}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Skip Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Questions list */}
      {quiz.questions.map((question, index) => (
        <QuestionCard
          key={question.id}
          question={question}
          index={index}
          selections={selections[question.id] || []}
          onSingleSelect={handleSingleSelect}
          onMultiSelect={handleMultiSelect}
        />
      ))}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Skip Quiz
        </button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          Submit Quiz
        </Button>
      </div>
    </div>
  );
}

// --- QuestionCard sub-component ---

interface QuestionCardProps {
  question: LearnerQuizQuestion;
  index: number;
  selections: string[];
  onSingleSelect: (questionId: string, optionId: string) => void;
  onMultiSelect: (questionId: string, optionId: string) => void;
}

function QuestionCard({
  question,
  index,
  selections,
  onSingleSelect,
  onMultiSelect,
}: QuestionCardProps) {
  const isSingle = question.questionType === 'single_select';
  const typeLabel = isSingle ? 'Select one answer' : 'Select all correct answers';

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-3">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Question {index + 1}
        </span>
        <h4 className="text-sm font-medium text-gray-900 mt-1">{question.questionText}</h4>
        <p className="text-xs text-gray-500 mt-0.5 italic">{typeLabel}</p>
      </div>

      <div className="space-y-2">
        {question.options.map((option) => {
          const isSelected = selections.includes(option.id);
          return (
            <label
              key={option.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                isSelected
                  ? 'border-cyan-400 bg-cyan-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {isSingle ? (
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  checked={isSelected}
                  onChange={() => onSingleSelect(question.id, option.id)}
                  className="h-4 w-4 text-cyan-600 border-gray-300 focus:ring-cyan-500"
                />
              ) : (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onMultiSelect(question.id, option.id)}
                  className="h-4 w-4 text-cyan-600 rounded border-gray-300 focus:ring-cyan-500"
                />
              )}
              <span className="text-sm text-gray-700">{option.optionText}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
