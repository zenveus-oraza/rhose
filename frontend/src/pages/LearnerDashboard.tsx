import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, ChevronRight, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAssignedSegments, useSegmentDetail, useCurrentLesson } from '@/hooks/useLearner';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import type { LearnerSegment } from '@/types/learner';
import type { ModuleSummary } from '@/types/learner';

// --- Sub-components ---

function ProgressBar({ percentage }: { percentage: number }) {
  return (
    <div className="w-full bg-muted-200 rounded-full h-2.5" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
      <div
        className="h-2.5 rounded-full bg-teal transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
      />
    </div>
  );
}

function SegmentDetailsCards({ segment }: { segment: LearnerSegment }) {
  const assignedDate = new Date(segment.assigned_at);
  const durationWeeks = 4;
  const deadline = new Date(assignedDate.getTime() + durationWeeks * 7 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const deadlineStr = deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="flex gap-4">
      <div className="flex flex-col border border-muted-200 rounded-lg px-5 py-3 min-w-[120px]">
        <span className="text-xs text-muted-500">Duration:</span>
        <span className="text-base font-semibold text-navy">{durationWeeks} Weeks</span>
      </div>
      <div className="flex flex-col border border-muted-200 rounded-lg px-5 py-3 min-w-[120px]">
        <span className="text-xs text-muted-500">Deadline:</span>
        <span className="text-base font-semibold text-navy">{deadlineStr}</span>
      </div>
      <div className="flex flex-col border border-muted-200 rounded-lg px-5 py-3 min-w-[120px]">
        <span className="text-xs text-muted-500">Time Left:</span>
        <span className="text-base font-semibold text-navy">{daysLeft} Days</span>
      </div>
    </div>
  );
}

function ModuleStatusIcon({ module }: { module: ModuleSummary }) {
  if (!module.accessible) {
    return <Lock className="h-5 w-5 text-gray-400 shrink-0" />;
  }
  if (module.completedCount === module.lessonCount && module.lessonCount > 0) {
    return <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />;
  }
  if (module.completedCount > 0) {
    return <Clock className="h-5 w-5 text-cyan-500 shrink-0" />;
  }
  return <div className="h-5 w-5 rounded-full border-2 border-muted-300 shrink-0" />;
}

// --- Main Component ---

export function LearnerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading, error, refetch } = useAssignedSegments({ page: 1, limit: 1 });

  const activeSegment = data?.segments?.find((s) => s.access_status === 'active') ?? data?.segments?.[0];

  const { data: segmentDetailData } = useSegmentDetail(activeSegment?.segmentId ?? '');
  const { data: currentLessonData } = useCurrentLesson(activeSegment?.segmentId ?? '');

  if (isLoading && !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <LoadingIndicator size="lg" label="Loading your training..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <ErrorMessage
          message={error.message || 'Failed to load your training assignments.'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (!activeSegment) {
    return (
      <div className="pb-4 pt-1 lg:px-8">
        <div className="mb-2">
          <p className="text-body text-muted-500">Welcome back, <span className="font-semibold text-navy">{user?.name || 'Learner'}</span> 👋</p>
          <h1 className="text-heading-page text-navy">Your Active Training</h1>
        </div>
        <div className="border-b border-muted-200 mb-6" />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h2 className="text-lg font-semibold text-navy mb-2">No training assigned yet</h2>
          <p className="text-sm text-muted-500 max-w-md">
            You don't have any training segments assigned. Once your administrator assigns training to you, it will appear here.
          </p>
        </div>
      </div>
    );
  }

  const segment = segmentDetailData?.segment;
  const sortedModules = segment?.modules
    ? [...segment.modules].sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  const handleResume = () => {
    if (currentLessonData?.currentLesson) {
      const { moduleId, lessonId } = currentLessonData.currentLesson;
      navigate(`/learner/segments/${activeSegment.segmentId}/modules/${moduleId}/lessons/${lessonId}`);
    } else {
      navigate(`/learner/learning`);
    }
  };

  return (
    <div className="pb-4 pt-1 lg:px-8">
      {/* Welcome and heading */}
      <div className="mb-2">
        <p className="text-body text-muted-500">
          Welcome back, <span className="font-semibold text-navy">{user?.name || 'Learner'}</span> 👋
        </p>
        <h1 className="text-heading-page text-navy">Your Active Training</h1>
      </div>

      {/* Divider */}
      <div className="border-b border-muted-200 mb-6" />

      {/* Segment title and description */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-teal mb-2">{activeSegment.title}</h2>
        {activeSegment.description && (
          <p className="text-sm text-muted-600 leading-relaxed">{activeSegment.description}</p>
        )}
      </div>

      {/* Progress card */}
      <div className="border border-muted-200 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-navy">Progress</span>
          <span className="text-sm font-semibold text-teal">{activeSegment.progress_percentage}%</span>
        </div>
        <ProgressBar percentage={activeSegment.progress_percentage} />
        <p className="text-xs text-muted-500 mt-2">
          {activeSegment.completed_lessons} of {activeSegment.total_lessons} Lessons completed
        </p>
      </div>

      {/* Resume Lesson button */}
      <button
        onClick={handleResume}
        className="bg-secondary text-white font-medium px-6 py-3 rounded-lg hover:bg-secondary/90 transition-colors mb-8"
      >
        Resume Lesson
      </button>

      {/* Segment Details */}
      <div className="mb-8">
        <h3 className="text-base font-semibold text-navy mb-4">Segment Details</h3>
        <SegmentDetailsCards segment={activeSegment} />
      </div>

      {/* Segment Content — Module overview (non-expandable, just status list) */}
      <div>
        <h3 className="text-base font-semibold text-navy mb-4">Segment Content</h3>
        <div className="flex flex-col gap-3">
          {sortedModules.map((mod, index) => (
            <div
              key={mod.id}
              className={`border border-muted-200 rounded-lg bg-white px-5 py-4 flex items-center gap-3 transition-colors ${
                mod.accessible
                  ? 'cursor-pointer hover:bg-muted-50'
                  : 'opacity-60 cursor-not-allowed'
              }`}
              onClick={() => mod.accessible && navigate(`/learner/learning`)}
            >
              <ChevronRight className={`h-4 w-4 shrink-0 ${mod.accessible ? 'text-muted-400' : 'text-muted-300'}`} />
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-medium ${mod.accessible ? 'text-navy' : 'text-muted-400'}`}>
                  MODULES {index + 1}:{' '}
                </span>
                <span className={`text-sm ${mod.accessible ? 'text-navy' : 'text-muted-400'}`}>{mod.title}</span>
              </div>
              <ModuleStatusIcon module={mod} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
