import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronRight,
  Lock,
  Presentation,
  Video,
  FileText,
} from 'lucide-react';
import ReactPlayer from 'react-player/lazy';
import {
  useLessonContent,
  useSegmentDetail,
  useModuleLessons,
  useLessonProgress,
  useReportLessonProgress,
} from '@/hooks/useLearner';
import { MarkCompleteButton } from '@/components/learner/MarkCompleteButton';
import type { ModuleSummary } from '@/types/learner';

// --- Helpers ---

function ModuleStatusIcon({ module }: { module: ModuleSummary }) {
  if (!module.accessible) {
    return <Lock className="h-4 w-4 text-gray-400 shrink-0" />;
  }
  if (module.completedCount === module.lessonCount && module.lessonCount > 0) {
    return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
  }
  if (module.completedCount > 0) {
    return <Clock className="h-4 w-4 text-cyan-500 shrink-0" />;
  }
  return <div className="h-4 w-4 rounded-full border-2 border-muted-300 shrink-0" />;
}

function LessonTypeIcon({ contentType }: { contentType: string }) {
  switch (contentType?.toLowerCase()) {
    case 'video':
      return <Video className="h-3.5 w-3.5" />;
    case 'slides':
      return <Presentation className="h-3.5 w-3.5" />;
    default:
      return <FileText className="h-3.5 w-3.5" />;
  }
}

// --- Video Player with progress tracking ---

function VideoContent({ videoUrl, lessonId }: { videoUrl: string; lessonId: string }) {
  const reportProgress = useReportLessonProgress();
  const maxProgressRef = useRef(0);

  // For uploaded files, build the full URL
  const resolvedUrl = videoUrl.startsWith('/uploads/')
    ? `${window.location.origin}${videoUrl}`
    : videoUrl;

  const handleProgress = useCallback(
    (state: { played: number }) => {
      const percent = Math.round(state.played * 100);
      if (percent > maxProgressRef.current) {
        maxProgressRef.current = percent;
        if (percent % 5 === 0 || percent >= 75) {
          reportProgress.mutate({ lessonId, progressPercent: percent });
        }
      }
    },
    [lessonId, reportProgress]
  );

  const handleEnded = () => {
    reportProgress.mutate({ lessonId, progressPercent: 100 });
  };

  return (
    <div className="aspect-video w-full rounded-lg overflow-hidden shadow-md bg-black">
      <ReactPlayer
        url={resolvedUrl}
        width="100%"
        height="100%"
        controls
        onProgress={handleProgress}
        onEnded={handleEnded}
        progressInterval={3000}
      />
    </div>
  );
}

// --- Slides Viewer with progress tracking ---

function getSlideViewerUrl(slidesUrl: string): { url: string; type: 'pdf' | 'pptx' | 'embed' } {
  if (slidesUrl.startsWith('/uploads/')) {
    const ext = slidesUrl.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') {
      return { url: slidesUrl, type: 'pdf' };
    }
    // PPTX/PPT files — served directly, rendered with <object> tag
    return { url: slidesUrl, type: 'pptx' };
  }
  // External URL (Google Slides, etc.)
  return { url: slidesUrl, type: 'embed' };
}

function SlidesContent({
  slidesUrl,
  totalSlides,
  lessonId,
}: {
  slidesUrl: string;
  totalSlides: number;
  lessonId: string;
}) {
  const [currentSlide, setCurrentSlide] = useState(1);
  const [viewedSlides, setViewedSlides] = useState<Set<number>>(new Set([1]));
  const reportProgress = useReportLessonProgress();

  const reportSlideProgress = useCallback(
    (viewed: Set<number>) => {
      const percent = Math.round((viewed.size / totalSlides) * 100);
      reportProgress.mutate({ lessonId, progressPercent: percent });
    },
    [lessonId, totalSlides, reportProgress]
  );

  const goToSlide = (slide: number) => {
    if (slide < 1 || slide > totalSlides) return;
    setCurrentSlide(slide);
    setViewedSlides((prev) => {
      const next = new Set(prev);
      next.add(slide);
      reportSlideProgress(next);
      return next;
    });
  };

  const slideThumbnails = Array.from({ length: totalSlides }, (_, i) => i + 1);
  const viewer = getSlideViewerUrl(slidesUrl);

  return (
    <div>
      <div className="aspect-[16/9] w-full rounded-lg overflow-hidden shadow-md border border-muted-200 bg-white">
        {viewer.type === 'pdf' ? (
          <iframe
            src={viewer.url}
            title={`Slide ${currentSlide}`}
            className="h-full w-full"
          />
        ) : viewer.type === 'pptx' ? (
          <div className="h-full w-full flex flex-col items-center justify-center bg-muted-50 p-6">
            <Presentation className="h-16 w-16 text-muted-300 mb-4" />
            <p className="text-sm text-navy font-medium mb-2">Presentation File</p>
            <p className="text-xs text-muted-500 mb-4 text-center">
              Click the slides below to track your progress, then download to view.
            </p>
            <a
              href={viewer.url}
              download
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-white text-sm font-medium hover:bg-secondary/90 transition"
            >
              <ArrowLeft className="h-4 w-4 rotate-[270deg]" />
              Download Slides
            </a>
          </div>
        ) : (
          <iframe
            src={viewer.url}
            title={`Slide ${currentSlide}`}
            className="h-full w-full"
            allowFullScreen
          />
        )}
      </div>

      <div className="mt-4">
        <p className="text-sm font-medium text-navy mb-3">Slides</p>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {slideThumbnails.map((slideNum) => (
            <button
              key={slideNum}
              type="button"
              onClick={() => goToSlide(slideNum)}
              className={`flex-shrink-0 flex flex-col items-center gap-1 ${
                currentSlide === slideNum ? 'ring-2 ring-teal rounded-lg' : ''
              }`}
            >
              <div
                className={`w-24 h-16 rounded-md border flex items-center justify-center text-xs ${
                  viewedSlides.has(slideNum)
                    ? 'bg-teal-50 border-teal-200'
                    : 'bg-muted-50 border-muted-200'
                }`}
              >
                <Presentation className="h-5 w-5 text-muted-400" />
              </div>
              <span className={`text-xs ${currentSlide === slideNum ? 'text-teal font-medium' : 'text-muted-500'}`}>
                {slideNum}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Text Content with scroll progress tracking ---

function TextContent({ content, lessonId }: { content: string; lessonId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reportProgress = useReportLessonProgress();
  const maxScrollRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const scrollableHeight = scrollHeight - clientHeight;
      if (scrollableHeight <= 0) {
        if (maxScrollRef.current < 100) {
          maxScrollRef.current = 100;
          reportProgress.mutate({ lessonId, progressPercent: 100 });
        }
        return;
      }
      const percent = Math.round((scrollTop / scrollableHeight) * 100);
      if (percent > maxScrollRef.current) {
        maxScrollRef.current = percent;
        if (percent % 10 === 0 || percent >= 75) {
          reportProgress.mutate({ lessonId, progressPercent: percent });
        }
      }
    };

    container.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => container.removeEventListener('scroll', handleScroll);
  }, [lessonId, reportProgress]);

  return (
    <div
      ref={containerRef}
      className="prose prose-gray max-w-none max-h-[60vh] overflow-y-auto rounded-lg border border-muted-200 p-6 bg-white"
    >
      <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">{content}</div>
    </div>
  );
}

// --- Sidebar Module with lessons ---

function SidebarModule({
  module,
  index,
  segmentId,
  currentModuleId,
  currentLessonId,
  isExpanded,
  onToggle,
}: {
  module: ModuleSummary;
  index: number;
  segmentId: string;
  currentModuleId: string;
  currentLessonId: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { data } = useModuleLessons(segmentId, module.id);
  const lessons = data?.lessons ?? [];
  const isCurrentModule = module.id === currentModuleId;
  const isLocked = !module.accessible;

  return (
    <div className={`rounded-lg border ${
      isLocked ? 'border-muted-200 bg-muted-50 opacity-60' :
      isCurrentModule ? 'border-teal-200 bg-teal-50/30' : 'border-muted-200 bg-white'
    }`}>
      <button
        type="button"
        onClick={() => !isLocked && onToggle()}
        disabled={isLocked}
        className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors rounded-lg ${
          isLocked ? 'cursor-not-allowed' : 'hover:bg-muted-50/50'
        }`}
      >
        {isLocked ? (
          <Lock className="h-3.5 w-3.5 text-muted-400 shrink-0" />
        ) : isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-500 shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-500 shrink-0" />
        )}
        <span className={`text-xs font-medium truncate flex-1 ${isLocked ? 'text-muted-400' : 'text-navy'}`}>
          M{index + 1}: {module.title}
        </span>
        <ModuleStatusIcon module={module} />
      </button>

      {isExpanded && !isLocked && lessons.length > 0 && (
        <div className="px-2 pb-2 space-y-0.5">
          {lessons.map((lesson) => (
            <Link
              key={lesson.id}
              to={`/learner/segments/${segmentId}/modules/${module.id}/lessons/${lesson.id}`}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors ${
                lesson.id === currentLessonId
                  ? 'bg-teal text-white font-medium'
                  : 'text-muted-600 hover:bg-muted-100 hover:text-navy'
              }`}
            >
              <LessonTypeIcon contentType={lesson.contentType} />
              <span className="truncate flex-1">{lesson.title}</span>
              {lesson.completed && (
                <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${lesson.id === currentLessonId ? 'text-white' : 'text-green-500'}`} />
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Loading Skeleton ---

function LessonSkeleton() {
  return (
    <div className="flex h-full animate-pulse">
      <div className="w-64 border-r border-gray-200 p-4">
        <div className="h-4 w-24 bg-gray-200 rounded mb-6" />
        <div className="h-6 w-48 bg-gray-200 rounded mb-4" />
        <div className="space-y-3">
          <div className="h-10 bg-gray-200 rounded-lg" />
          <div className="h-10 bg-gray-200 rounded-lg" />
        </div>
      </div>
      <div className="flex-1 p-8">
        <div className="h-8 w-64 bg-gray-200 rounded mb-4" />
        <div className="aspect-video bg-gray-200 rounded-lg" />
      </div>
    </div>
  );
}

// --- Main Page ---

export function LessonPage() {
  const { segmentId = '', moduleId = '', lessonId = '' } = useParams<{
    segmentId: string;
    moduleId: string;
    lessonId: string;
  }>();
  const navigate = useNavigate();
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(moduleId);

  const {
    data: lessonData,
    isLoading: lessonLoading,
    isError: lessonError,
    error: lessonErr,
  } = useLessonContent(segmentId, moduleId, lessonId);

  const { data: segmentData, isLoading: segmentLoading } = useSegmentDetail(segmentId);
  const { data: moduleLessonsData } = useModuleLessons(segmentId, moduleId);
  const { data: progressData } = useLessonProgress(lessonId);

  const isLoading = lessonLoading || segmentLoading;

  if (isLoading) {
    return <LessonSkeleton />;
  }

  if (lessonError) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 max-w-lg mx-auto">
          <p className="text-sm text-red-700">
            {lessonErr?.message || 'Failed to load lesson content. Please try again.'}
          </p>
          <Link
            to="/learner/learning"
            className="mt-3 inline-flex items-center gap-1.5 text-sm text-red-600 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to My Learning
          </Link>
        </div>
      </div>
    );
  }

  const lesson = lessonData?.lesson;
  const segment = segmentData?.segment;
  const moduleLessons = moduleLessonsData?.lessons ?? [];
  const currentModule = segment?.modules.find((m) => m.id === moduleId);

  const sortedModules = segment?.modules
    ? [...segment.modules].sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  // Progress for the segment
  const totalSegmentLessons = segment?.modules.reduce((sum, m) => sum + m.lessonCount, 0) ?? 0;
  const completedSegmentLessons = segment?.modules.reduce((sum, m) => sum + m.completedCount, 0) ?? 0;
  const progressPercent = totalSegmentLessons > 0
    ? Math.round((completedSegmentLessons / totalSegmentLessons) * 100)
    : 0;

  const isLessonCompleted = moduleLessons.find((l) => l.id === lessonId)?.completed ?? false;
  const currentModuleIndex = sortedModules.findIndex((m) => m.id === moduleId);

  return (
    <div className="flex h-full min-h-[calc(100vh-80px)]">
      {/* Left Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-72 border-r border-muted-200 bg-white overflow-y-auto p-4">
        <Link
          to="/learner"
          className="inline-flex items-center gap-1.5 text-xs text-muted-500 hover:text-navy transition-colors mb-4"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Dashboard
        </Link>

        {segment && (
          <div className="mb-4">
            <h2 className="text-sm font-bold text-teal leading-snug">{segment.title}</h2>
            {segment.description && (
              <p className="text-xs text-muted-500 mt-1 line-clamp-2">{segment.description}</p>
            )}
          </div>
        )}

        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-navy">Progress</span>
            <span className="text-xs font-semibold text-teal">{progressPercent}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-teal transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-muted-500 mt-1">
            {completedSegmentLessons}/{totalSegmentLessons} Steps
          </p>
        </div>

        {/* Module list with lessons */}
        <div className="flex flex-col gap-2">
          {sortedModules.map((mod, index) => (
            <SidebarModule
              key={mod.id}
              module={mod}
              index={index}
              segmentId={segmentId}
              currentModuleId={moduleId}
              currentLessonId={lessonId}
              isExpanded={expandedModuleId === mod.id}
              onToggle={() => setExpandedModuleId((prev) => (prev === mod.id ? null : mod.id))}
            />
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-muted-500 mb-1">
                Modules {currentModuleIndex + 1} • {currentModule?.title}
              </p>
              <h1 className="text-xl font-bold text-navy">{lesson?.title}</h1>
            </div>
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${
              isLessonCompleted
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-cyan-50 text-cyan-700 border-cyan-200'
            }`}>
              {isLessonCompleted ? 'Completed' : 'In Progress'}
            </span>
          </div>

          {/* Content body */}
          <div className="mb-8">
            {lesson?.contentType?.toLowerCase() === 'video' && lesson.videoUrl ? (
              <VideoContent videoUrl={lesson.videoUrl} lessonId={lessonId} />
            ) : lesson?.contentType?.toLowerCase() === 'slides' && lesson.slidesUrl ? (
              <SlidesContent
                slidesUrl={lesson.slidesUrl}
                totalSlides={lesson.totalSlides ?? 1}
                lessonId={lessonId}
              />
            ) : lesson?.contentBody ? (
              <TextContent content={lesson.contentBody} lessonId={lessonId} />
            ) : (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
                <p className="text-sm text-gray-500">No content available for this lesson.</p>
              </div>
            )}
          </div>

          {/* Mark as Complete button — standard size, gated by 75% progress */}
          {!isLessonCompleted && (
            <div>
              {progressData && !progressData.canComplete && (
                <p className="text-xs text-muted-500 mb-2">
                  Complete at least 75% of the content to mark as done.
                  Current progress: {progressData.progressPercent}%
                </p>
              )}
              <MarkCompleteButton
                lessonId={lessonId}
                segmentId={segmentId}
                moduleId={moduleId}
                isCompleted={false}
                disabled={!progressData?.canComplete}
                onCompleted={(result) => {
                  if (result.nextLessonId) {
                    navigate(`/learner/segments/${segmentId}/modules/${moduleId}/lessons/${result.nextLessonId}`);
                  } else if (result.segmentComplete) {
                    navigate('/learner');
                  }
                }}
              />
            </div>
          )}

          {isLessonCompleted && (
            <div className="inline-flex items-center gap-2 rounded-lg bg-green-50 px-6 py-2.5 text-sm font-medium text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              Completed
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
