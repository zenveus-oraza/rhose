import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Lock,
  Video,
  FileText,
  Presentation,
  FileQuestion,
} from 'lucide-react';
import { useAssignedSegments, useSegmentDetail, useModuleLessons } from '@/hooks/useLearner';
import { useLearnerQuiz, useQuizAttemptHistory } from '@/hooks/useQuiz';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import type { ModuleSummary } from '@/types/learner';

// --- Helpers ---

function LessonIcon({ contentType }: { contentType: string }) {
  switch (contentType?.toLowerCase()) {
    case 'video':
      return <Video className="h-4 w-4 text-muted-500" />;
    case 'slides':
      return <Presentation className="h-4 w-4 text-muted-500" />;
    default:
      return <FileText className="h-4 w-4 text-muted-500" />;
  }
}

// --- Lesson List (fetches its own data) ---

function ModuleLessonList({ segmentId, moduleId }: { segmentId: string; moduleId: string }) {
  const { data, isLoading } = useModuleLessons(segmentId, moduleId);

  if (isLoading) {
    return (
      <div className="pl-10 py-2">
        <div className="h-4 w-48 bg-muted-100 rounded animate-pulse mb-2" />
        <div className="h-4 w-40 bg-muted-100 rounded animate-pulse" />
      </div>
    );
  }

  const lessons = data?.lessons ?? [];

  if (lessons.length === 0) {
    return (
      <div className="pl-10 py-2">
        <p className="text-xs text-muted-400">No lessons in this module.</p>
      </div>
    );
  }

  return (
    <div className="pl-8 py-2 space-y-1">
      {lessons.map((lesson) => (
        <Link
          key={lesson.id}
          to={`/learner/segments/${segmentId}/modules/${moduleId}/lessons/${lesson.id}`}
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted-50 transition-colors group"
        >
          <LessonIcon contentType={lesson.contentType} />
          <span className="text-sm text-navy group-hover:text-teal transition-colors flex-1 truncate">
            {lesson.title}
          </span>
          {lesson.completed ? (
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
          ) : (
            <div className="h-4 w-4 rounded-full border-2 border-muted-300 shrink-0" />
          )}
        </Link>
      ))}
    </div>
  );
}

// --- Module Accordion ---

function ModuleAccordion({
  module,
  index,
  segmentId,
  isExpanded,
  onToggle,
}: {
  module: ModuleSummary;
  index: number;
  segmentId: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const isComplete = module.completedCount === module.lessonCount && module.lessonCount > 0;
  const inProgress = module.completedCount > 0 && !isComplete;
  const isLocked = !module.accessible;

  return (
    <div className={`border border-muted-200 rounded-lg bg-white overflow-hidden ${isLocked ? 'opacity-60' : ''}`}>
      <button
        type="button"
        onClick={() => !isLocked && onToggle()}
        disabled={isLocked}
        className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${
          isLocked ? 'cursor-not-allowed' : 'hover:bg-muted-50'
        }`}
      >
        {isLocked ? (
          <Lock className="h-4 w-4 text-muted-400 shrink-0" />
        ) : isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-500 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-500 shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <span className={`text-sm font-medium ${isLocked ? 'text-muted-400' : 'text-navy'}`}>
            Module {index + 1}:{' '}
          </span>
          <span className={`text-sm ${isLocked ? 'text-muted-400' : 'text-navy'}`}>{module.title}</span>
        </div>

        <span className="text-xs text-muted-500 shrink-0 mr-2">
          {module.completedCount}/{module.lessonCount}
        </span>

        {isLocked ? (
          <Lock className="h-5 w-5 text-gray-400 shrink-0" />
        ) : isComplete ? (
          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
        ) : inProgress ? (
          <Clock className="h-5 w-5 text-cyan-500 shrink-0" />
        ) : (
          <div className="h-5 w-5 rounded-full border-2 border-muted-300 shrink-0" />
        )}
      </button>

      {isExpanded && !isLocked && (
        <div className="border-t border-muted-100">
          <ModuleLessonList segmentId={segmentId} moduleId={module.id} />
        </div>
      )}
    </div>
  );
}

// --- Segment Section ---

function SegmentSection({ segmentId, title, description, progressPercentage, completedLessons, totalLessons }: {
  segmentId: string;
  title: string;
  description: string | null;
  progressPercentage: number;
  completedLessons: number;
  totalLessons: number;
}) {
  const { data, isLoading } = useSegmentDetail(segmentId);
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);

  const sortedModules = data?.segment?.modules
    ? [...data.segment.modules].sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  return (
    <div className="border border-muted-200 rounded-xl p-6 bg-white">
      {/* Segment header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-teal">{title}</h3>
          {description && (
            <p className="text-sm text-muted-500 mt-1 line-clamp-2">{description}</p>
          )}
        </div>
        <div className="text-right shrink-0 ml-4">
          <span className="text-sm font-semibold text-teal">{progressPercentage}%</span>
          <p className="text-xs text-muted-500">{completedLessons}/{totalLessons} lessons</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-muted-200 rounded-full h-2 mb-5">
        <div
          className="h-2 rounded-full bg-teal transition-all duration-300"
          style={{ width: `${Math.min(100, progressPercentage)}%` }}
        />
      </div>

      {/* Modules */}
      {isLoading ? (
        <div className="space-y-2">
          <div className="h-12 bg-muted-100 rounded-lg animate-pulse" />
          <div className="h-12 bg-muted-100 rounded-lg animate-pulse" />
        </div>
      ) : (
        <div className="space-y-2">
          {sortedModules.map((mod, index) => (
            <ModuleAccordion
              key={mod.id}
              module={mod}
              index={index}
              segmentId={segmentId}
              isExpanded={expandedModuleId === mod.id}
              onToggle={() => setExpandedModuleId((prev) => (prev === mod.id ? null : mod.id))}
            />
          ))}
        </div>
      )}

      {/* Quiz Card */}
      <SegmentQuizCard segmentId={segmentId} />
    </div>
  );
}

// --- Quiz Card for a Segment ---

function SegmentQuizCard({ segmentId }: { segmentId: string }) {
  const navigate = useNavigate();
  const { data: quiz, isLoading } = useLearnerQuiz(segmentId);
  const { data: attempts = [] } = useQuizAttemptHistory(segmentId);

  if (isLoading || !quiz) return null;

  const bestAttempt = attempts.length > 0
    ? attempts.reduce((best, a) => (a.percentage > best.percentage ? a : best), attempts[0])
    : null;

  return (
    <div className="mt-4 border border-muted-200 rounded-lg bg-muted-50 px-5 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileQuestion className="h-5 w-5 text-teal shrink-0" />
          <div>
            <p className="text-sm font-medium text-navy">{quiz.title || 'Segment Quiz'}</p>
            <p className="text-xs text-muted-500">
              {quiz.questions.length} question{quiz.questions.length !== 1 ? 's' : ''} • Optional
              {bestAttempt && (
                <span className="ml-2 text-teal font-medium">
                  Best: {bestAttempt.percentage}%
                </span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate(`/learner/segments/${segmentId}`)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-helper font-medium text-white hover:bg-secondary/90 transition"
        >
          {attempts.length > 0 ? 'Retake' : 'Take Quiz'}
        </button>
      </div>
    </div>
  );
}

// --- Main Page ---

export function MyLearningPage() {
  const { data, isLoading, error, refetch } = useAssignedSegments({ page: 1, limit: 50 });

  if (isLoading && !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <LoadingIndicator size="lg" label="Loading your learning..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <ErrorMessage
          message={error.message || 'Failed to load your learning.'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const segments = data?.segments ?? [];

  return (
    <div className="pb-4 pt-1 lg:px-8">
      <div className="mb-2">
        <h1 className="text-heading-page text-navy">My Learning</h1>
        <p className="text-body text-muted-500 mt-1">
          All your assigned segments, modules, and lessons in one place.
        </p>
      </div>

      {/* Divider */}
      <div className="border-b border-muted-200 mb-6" />

      {segments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen className="h-16 w-16 text-muted-300 mb-4" />
          <h2 className="text-lg font-semibold text-navy mb-2">No training assigned yet</h2>
          <p className="text-sm text-muted-500 max-w-md">
            Once your administrator assigns training to you, it will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {segments.map((segment) => (
            <SegmentSection
              key={segment.segmentId}
              segmentId={segment.segmentId}
              title={segment.title}
              description={segment.description}
              progressPercentage={segment.progress_percentage}
              completedLessons={segment.completed_lessons}
              totalLessons={segment.total_lessons}
            />
          ))}
        </div>
      )}
    </div>
  );
}
