import { CheckCircle2, Circle, Clock, FileText, Lock, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LessonWithStatus } from '@/types/learner';

interface LessonTimelineProps {
  lessons: LessonWithStatus[];
  onLessonSelect?: (lessonId: string) => void;
}

export function LessonTimeline({ lessons, onLessonSelect }: LessonTimelineProps) {
  const getLessonStatus = (lesson: LessonWithStatus) => {
    if (lesson.completed) return 'completed';
    if (lesson.accessible) return 'current';
    return 'locked';
  };

  const renderStatusDot = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-success-500 fill-success-50" />;
      case 'current':
        return (
          <div className="relative flex items-center justify-center">
            <Circle className="h-4 w-4 text-primary" />
            <div className="absolute h-2 w-2 rounded-full bg-primary" />
          </div>
        );
      case 'locked':
      default:
        return <Circle className="h-4 w-4 text-muted-300" />;
    }
  };

  const renderContentIcon = (contentType: string, status: string) => {
    const iconClass = cn(
      'h-4 w-4',
      status === 'locked' ? 'text-muted-300' : 'text-muted-500'
    );

    if (contentType?.toLowerCase() === 'video') {
      return <Video className={iconClass} />;
    }
    return <FileText className={iconClass} />;
  };

  const formatDuration = (value: number | null, unit: string | null) => {
    if (!value) return null;
    const displayUnit = unit ?? 'min';
    return `${value} ${displayUnit}`;
  };

  return (
    <div className="relative">
      {lessons.map((lesson, index) => {
        const status = getLessonStatus(lesson);
        const isLast = index === lessons.length - 1;
        const duration = formatDuration(lesson.estimatedTimeValue, lesson.estimatedTimeUnit);

        return (
          <div key={lesson.id} className="relative flex gap-3">
            {/* Vertical timeline line */}
            {!isLast && (
              <div
                className="absolute left-[7px] top-5 h-full w-0.5 bg-muted-200"
                aria-hidden="true"
              />
            )}

            {/* Status dot */}
            <div className="relative z-10 mt-0.5 shrink-0">
              {renderStatusDot(status)}
            </div>

            {/* Lesson content */}
            <button
              type="button"
              onClick={() => {
                if (status !== 'locked') {
                  onLessonSelect?.(lesson.id);
                }
              }}
              disabled={status === 'locked'}
              className={cn(
                'flex flex-1 items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors -mt-0.5 mb-2',
                status === 'locked'
                  ? 'cursor-not-allowed opacity-60'
                  : 'hover:bg-muted-50 cursor-pointer',
                status === 'current' && 'bg-teal-50/50'
              )}
            >
              {renderContentIcon(lesson.contentType, status)}

              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-sm truncate',
                    status === 'current'
                      ? 'font-semibold text-secondary'
                      : status === 'locked'
                        ? 'text-muted-400'
                        : 'text-secondary'
                  )}
                >
                  {lesson.title}
                </p>
              </div>

              {/* Duration + lock icon */}
              <div className="flex items-center gap-2 shrink-0">
                {duration && (
                  <span
                    className={cn(
                      'flex items-center gap-1 text-xs',
                      status === 'locked' ? 'text-muted-300' : 'text-muted-500'
                    )}
                  >
                    <Clock className="h-3 w-3" />
                    {duration}
                  </span>
                )}
                {status === 'locked' && (
                  <Lock className="h-3.5 w-3.5 text-muted-300" />
                )}
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}
