import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useCompleteLesson } from '@/hooks/useLearner';
import type { CompleteLessonResponse } from '@/types/learner';
import { cn } from '@/lib/utils';

interface MarkCompleteButtonProps {
  lessonId: string;
  segmentId: string;
  moduleId: string;
  isCompleted: boolean;
  disabled?: boolean;
  onCompleted?: (result: CompleteLessonResponse) => void;
}

export function MarkCompleteButton({
  lessonId,
  segmentId,
  moduleId,
  isCompleted,
  disabled = false,
  onCompleted,
}: MarkCompleteButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [completed, setCompleted] = useState(isCompleted);

  const { mutate, isPending } = useCompleteLesson({
    onSuccess: (result) => {
      setCompleted(true);
      setShowConfirm(false);
      onCompleted?.(result);
    },
    onError: () => {
      setShowConfirm(false);
    },
  });

  if (completed) {
    return (
      <div
        className="inline-flex items-center gap-2 rounded-lg bg-success-50 px-6 py-2.5 text-sm font-medium text-success-700"
        aria-label="Lesson completed"
      >
        <CheckCircle2 className="h-4 w-4" />
        Completed
      </div>
    );
  }

  if (showConfirm) {
    return (
      <div className="inline-flex items-center gap-3">
        <span className="text-sm text-muted-600">Are you sure?</span>
        <button
          type="button"
          onClick={() => setShowConfirm(false)}
          disabled={isPending}
          className="rounded-lg border border-muted-300 px-4 py-2 text-sm font-medium text-muted-700 transition-colors hover:bg-muted-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => mutate({ lessonId, segmentId, moduleId })}
          disabled={isPending}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-colors',
            'bg-coral hover:bg-coral-500 disabled:opacity-70'
          )}
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Confirm
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setShowConfirm(true)}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-colors',
        disabled
          ? 'bg-muted-300 cursor-not-allowed'
          : 'bg-coral hover:bg-coral-500'
      )}
    >
      Mark as Complete
    </button>
  );
}
