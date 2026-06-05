import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LessonWithStatus } from '@/types/learner';

interface LessonNavigationProps {
  lessons: LessonWithStatus[];
  currentLessonId: string;
  segmentId: string;
  moduleId: string;
}

export function LessonNavigation({
  lessons,
  currentLessonId,
  segmentId,
  moduleId,
}: LessonNavigationProps) {
  const navigate = useNavigate();

  const currentIndex = lessons.findIndex((l) => l.id === currentLessonId);
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;

  const isNextDisabled = !nextLesson || !nextLesson.accessible;
  const isPrevDisabled = !prevLesson;

  const buildLessonPath = (lessonId: string) =>
    `/learner/segments/${segmentId}/modules/${moduleId}/lessons/${lessonId}`;

  const handlePrevious = () => {
    if (prevLesson) {
      navigate(buildLessonPath(prevLesson.id));
    }
  };

  const handleNext = () => {
    if (nextLesson && nextLesson.accessible) {
      navigate(buildLessonPath(nextLesson.id));
    }
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <button
        type="button"
        onClick={handlePrevious}
        disabled={isPrevDisabled}
        aria-label="Previous lesson"
        className={cn(
          'inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors',
          isPrevDisabled
            ? 'cursor-not-allowed border-muted-200 bg-muted-50 text-muted-400'
            : 'border-muted-300 text-secondary hover:bg-muted-50'
        )}
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </button>

      <button
        type="button"
        onClick={handleNext}
        disabled={isNextDisabled}
        aria-label="Next lesson"
        className={cn(
          'inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors',
          isNextDisabled
            ? 'cursor-not-allowed border-muted-200 bg-muted-50 text-muted-400'
            : 'border-muted-300 text-secondary hover:bg-muted-50'
        )}
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
