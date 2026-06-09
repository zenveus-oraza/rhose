import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import type { QuestionType, QuizQuestionInput, QuizOptionInput } from '@/types/quiz';

// --- Types ---

interface OptionRow {
  text: string;
  isCorrect: boolean;
}

interface QuizDrawerErrors {
  questionText?: string;
  options?: string;
  correct?: string;
}

interface QuizDrawerProps {
  open: boolean;
  onClose: () => void;
  onSave: (question: QuizQuestionInput) => void;
  /** If provided, pre-fills for editing */
  editingQuestion?: QuizQuestionInput | null;
}

// --- Component ---

export function QuizDrawer({ open, onClose, onSave, editingQuestion }: QuizDrawerProps) {
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState<QuestionType>('single_select');
  const [options, setOptions] = useState<OptionRow[]>([
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ]);
  const [errors, setErrors] = useState<QuizDrawerErrors>({});

  // Reset form when drawer opens or editingQuestion changes
  useEffect(() => {
    if (open) {
      if (editingQuestion) {
        setQuestionText(editingQuestion.question_text);
        setQuestionType(editingQuestion.question_type);
        setOptions(
          editingQuestion.options.map((o) => ({
            text: o.option_text,
            isCorrect: o.is_correct,
          }))
        );
      } else {
        resetForm();
      }
      setErrors({});
    }
  }, [open, editingQuestion]);

  function resetForm() {
    setQuestionText('');
    setQuestionType('single_select');
    setOptions([
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ]);
    setErrors({});
  }

  function handleAddOption() {
    setOptions((prev) => [...prev, { text: '', isCorrect: false }]);
  }

  function handleRemoveOption(index: number) {
    if (options.length <= 2) return; // Minimum 2 options
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  function handleOptionTextChange(index: number, text: string) {
    setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, text } : o)));
    if (errors.options) setErrors((prev) => ({ ...prev, options: undefined }));
  }

  function handleOptionCorrectChange(index: number, checked: boolean) {
    setOptions((prev) => {
      if (questionType === 'single_select') {
        // Only one can be correct — uncheck all others
        return prev.map((o, i) => ({ ...o, isCorrect: i === index ? checked : false }));
      }
      // Multi-select: toggle individually
      return prev.map((o, i) => (i === index ? { ...o, isCorrect: checked } : o));
    });
    if (errors.correct) setErrors((prev) => ({ ...prev, correct: undefined }));
  }

  function handleQuestionTypeChange(type: QuestionType) {
    setQuestionType(type);
    // Reset correct answers when switching type
    setOptions((prev) => prev.map((o) => ({ ...o, isCorrect: false })));
    if (errors.correct) setErrors((prev) => ({ ...prev, correct: undefined }));
  }

  function validate(): boolean {
    const newErrors: QuizDrawerErrors = {};

    if (!questionText.trim()) {
      newErrors.questionText = 'Question text is required';
    }

    const filledOptions = options.filter((o) => o.text.trim());
    if (filledOptions.length < 2) {
      newErrors.options = 'At least 2 options with text are required';
    }

    const correctCount = options.filter((o) => o.isCorrect && o.text.trim()).length;
    if (questionType === 'single_select') {
      if (correctCount !== 1) {
        newErrors.correct = 'Please mark one correct answer';
      }
    } else {
      if (correctCount < 2) {
        newErrors.correct = 'Please mark at least two correct answers';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSave() {
    if (!validate()) return;

    const questionInput: QuizQuestionInput = {
      question_text: questionText.trim(),
      question_type: questionType,
      options: options
        .filter((o) => o.text.trim())
        .map((o): QuizOptionInput => ({
          option_text: o.text.trim(),
          is_correct: o.isCorrect,
        })),
    };

    onSave(questionInput);
    resetForm();
  }

  return (
    <Drawer open={open} onClose={onClose} title="Add Questions">
      <div className="space-y-5">
        {/* Question Text */}
        <div>
          <label htmlFor="quiz-question-text" className="block text-helper font-medium text-navy mb-1.5">
            Question <span className="text-danger">*</span>
          </label>
          <textarea
            id="quiz-question-text"
            value={questionText}
            onChange={(e) => {
              setQuestionText(e.target.value);
              if (errors.questionText) setErrors((prev) => ({ ...prev, questionText: undefined }));
            }}
            rows={3}
            aria-invalid={!!errors.questionText}
            className={`w-full rounded-lg border px-4 py-2.5 text-body text-navy placeholder:text-muted-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition resize-none ${
              errors.questionText ? 'border-danger-400' : 'border-muted-300'
            }`}
            placeholder="Enter question text"
          />
          {errors.questionText && (
            <p className="mt-1 text-helper text-danger-600">{errors.questionText}</p>
          )}
        </div>

        {/* Question Type Selector */}
        <div>
          <label className="block text-helper font-medium text-navy mb-1.5">Question Type</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleQuestionTypeChange('single_select')}
              className={`flex-1 rounded-lg border px-3 py-2 text-helper font-medium transition ${
                questionType === 'single_select'
                  ? 'border-teal bg-teal/10 text-teal'
                  : 'border-muted-300 text-muted-600 hover:bg-muted-50'
              }`}
            >
              Single Select
            </button>
            <button
              type="button"
              onClick={() => handleQuestionTypeChange('multi_select')}
              className={`flex-1 rounded-lg border px-3 py-2 text-helper font-medium transition ${
                questionType === 'multi_select'
                  ? 'border-teal bg-teal/10 text-teal'
                  : 'border-muted-300 text-muted-600 hover:bg-muted-50'
              }`}
            >
              Multi Select
            </button>
          </div>
        </div>

        {/* Options Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-helper font-medium text-navy">
              Options <span className="text-danger">*</span>
            </label>
            <span className="text-xs text-muted-500">
              {questionType === 'single_select'
                ? 'Check one correct answer'
                : 'Check multiple correct answers'}
            </span>
          </div>

          <div className="space-y-2">
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type={questionType === 'single_select' ? 'radio' : 'checkbox'}
                  name={questionType === 'single_select' ? 'quiz-correct-option' : undefined}
                  checked={option.isCorrect}
                  onChange={(e) => handleOptionCorrectChange(index, e.target.checked)}
                  className={`h-4 w-4 shrink-0 ${
                    option.isCorrect ? 'accent-teal' : ''
                  }`}
                  aria-label={`Mark option ${index + 1} as correct`}
                />
                <input
                  type="text"
                  value={option.text}
                  onChange={(e) => handleOptionTextChange(index, e.target.value)}
                  className="flex-1 rounded-lg border border-muted-300 px-3 py-2 text-body text-navy placeholder:text-muted-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                  placeholder={`Option ${index + 1}`}
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(index)}
                    className="rounded p-1 text-muted-400 hover:text-danger hover:bg-danger-50 transition"
                    aria-label={`Remove option ${index + 1}`}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {errors.options && (
            <p className="mt-1 text-helper text-danger-600">{errors.options}</p>
          )}
          {errors.correct && (
            <p className="mt-1 text-helper text-danger-600">{errors.correct}</p>
          )}

          {/* Add Option button */}
          <button
            type="button"
            onClick={handleAddOption}
            className="mt-3 inline-flex items-center gap-1 rounded-lg border border-dashed border-muted-300 px-3 py-1.5 text-helper font-medium text-muted-600 hover:bg-muted-50 hover:border-muted-400 transition"
          >
            <Plus size={14} />
            <span>Add Option</span>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-muted-200">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-muted-300 px-4 py-2 text-helper font-medium text-muted-700 hover:bg-muted-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-secondary px-4 py-2 text-helper font-medium text-white hover:bg-secondary/90 transition"
          >
            Save Question
          </button>
        </div>
      </div>
    </Drawer>
  );
}
