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
  User,
} from 'lucide-react';
import ReactPlayer from 'react-player/lazy';
import { getStoredToken } from '@/services/api';
import {
  useLessonContent,
  useSegmentDetail,
  useModuleLessons,
  useLessonProgress,
  useReportLessonProgress,
} from '@/hooks/useLearner';
import { MarkCompleteButton } from '@/components/learner/MarkCompleteButton';
import type { ModuleSummary, UploadedAssetMetadata } from '@/types/learner';

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

function VideoContent({
  videoUrl,
  videoAsset,
  lessonId,
}: {
  videoUrl: string;
  videoAsset: UploadedAssetMetadata | null;
  lessonId: string;
}) {
  const reportProgress = useReportLessonProgress();
  const maxProgressRef = useRef(0);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!videoAsset) {
      setBlobUrl(null);
      return;
    }

    const controller = new AbortController();
    const token = getStoredToken();
    let currentObjectUrl: string | null = null;

    (async () => {
      try {
        const response = await fetch(`/api/learner/lessons/${lessonId}/video`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to load video');
        }

        const blob = await response.blob();
        currentObjectUrl = URL.createObjectURL(blob);
        setBlobUrl(currentObjectUrl);
      } catch {
        setBlobUrl(null);
      }
    })();

    return () => {
      controller.abort();
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
      }
    };
  }, [lessonId, videoAsset]);

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
      {videoAsset ? (
        <video
          src={blobUrl ?? undefined}
          className="h-full w-full"
          controls
          playsInline
          preload="metadata"
          onTimeUpdate={(event) => {
            const { currentTime, duration } = event.currentTarget;
            if (!duration || Number.isNaN(duration) || duration <= 0) return;
            const percent = Math.round((currentTime / duration) * 100);
            if (percent > maxProgressRef.current) {
              maxProgressRef.current = percent;
              if (percent % 5 === 0 || percent >= 75) {
                reportProgress.mutate({ lessonId, progressPercent: percent });
              }
            }
          }}
          onEnded={handleEnded}
        />
      ) : (
        <ReactPlayer
          url={videoUrl}
          width="100%"
          height="100%"
          controls
          onProgress={handleProgress}
          onEnded={handleEnded}
          progressInterval={3000}
        />
      )}
    </div>
  );
}

// --- Slides Viewer with progress tracking ---

function getSlideViewerUrl(
  slidesUrl: string,
  slidesAsset: UploadedAssetMetadata | null
): { url: string; type: 'pdf' | 'pptx' | 'embed' } {
  if (slidesAsset) {
    if (slidesAsset.mimeType === 'application/pdf' || slidesAsset.originalName.toLowerCase().endsWith('.pdf')) {
      return { url: slidesUrl, type: 'pdf' };
    }
    return { url: slidesUrl, type: 'pptx' };
  }
  // External URL (Google Slides, etc.)
  return { url: slidesUrl, type: 'embed' };
}

function SlidesContent({
  slidesUrl,
  slidesAsset,
  totalSlides,
  lessonId,
}: {
  slidesUrl: string;
  slidesAsset: UploadedAssetMetadata | null;
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
  const viewer = getSlideViewerUrl(slidesUrl, slidesAsset);

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
  currentLessonId,
  isExpanded,
  onToggle,
}: {
  module: ModuleSummary;
  index: number;
  segmentId: string;
  currentLessonId: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { data } = useModuleLessons(segmentId, module.id);
  const lessons = data?.lessons ?? [];
  const isLocked = !module.accessible;

  return (
    <div className={isLocked ? 'opacity-50' : ''}>
      <button
        type="button"
        onClick={() => !isLocked && onToggle()}
        disabled={isLocked}
        className={`w-full flex items-center gap-2 py-2 text-left transition-colors ${
          isLocked ? 'cursor-not-allowed' : 'hover:bg-muted-50'
        }`}
      >
        {isLocked ? (
          <Lock className="h-3.5 w-3.5 text-muted-400 shrink-0" />
        ) : isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-500 shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-500 shrink-0" />
        )}
        <span className={`text-xs truncate flex-1 ${isLocked ? 'text-muted-400' : 'text-navy'}`}>
          <span className="font-bold">MODULES {index + 1}:</span>{' '}
          {module.title}
        </span>
        <ModuleStatusIcon module={module} />
      </button>

      {isExpanded && !isLocked && lessons.length > 0 && (
        <div className="pl-6 pb-2 space-y-0.5">
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
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

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

  // Truncate description
  const maxDescLength = 80;
  const description = segment?.description ?? '';
  const isTruncatable = description.length > maxDescLength;
  const displayDescription = descriptionExpanded || !isTruncatable
    ? description
    : description.slice(0, maxDescLength) + '...';

  return (
    <div className="flex h-full min-h-screen">
      {/* Left Panel */}
      <aside className="hidden lg:flex lg:flex-col w-[270px] min-w-[270px] rounded-2xl border border-muted-200 bg-[#F8FAFC] overflow-y-auto p-5">
        {/* Back to Dashboard */}
        <Link
          to="/learner"
          className="inline-flex items-center gap-1.5 text-sm text-muted-500 hover:text-navy transition-colors mb-5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </Link>

        {/* Segment Title */}
        {segment && (
          <div className="mb-4">
            <h2 className="text-base font-bold text-teal leading-snug">{segment.title}</h2>
            {description && (
              <div className="mt-2">
                <p className="text-xs text-muted-500 leading-relaxed">
                  {displayDescription}
                </p>
                {isTruncatable && (
                  <button
                    type="button"
                    onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                    className="text-xs text-teal font-medium hover:underline mt-0.5"
                  >
                    {descriptionExpanded ? 'See less' : 'See more...'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Instructor Block */}
        <div className="mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted-200 flex items-center justify-center shrink-0">
              <User className="h-5 w-5 text-muted-400" />
            </div>
            <div>
              <p className="text-xs text-muted-500">Instructor</p>
              <p className="text-sm font-medium text-navy">Victor</p>
            </div>
          </div>
        </div>

        {/* Horizontal Divider */}
        <hr className="border-muted-200 mb-4" />

        {/* Progress Section */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-navy">Progress</span>
            <span className="text-xs font-bold text-teal">{progressPercent}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-teal transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-muted-500 mt-1.5">
            {completedSegmentLessons}/{totalSegmentLessons} Steps
          </p>
        </div>

        {/* Module Accordion List */}
        <div className="flex flex-col">
          {sortedModules.map((mod, index) => (
            <SidebarModule
              key={mod.id}
              module={mod}
              index={index}
              segmentId={segmentId}
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
              <VideoContent videoUrl={lesson.videoUrl} videoAsset={lesson.videoAsset} lessonId={lessonId} />
            ) : lesson?.contentType?.toLowerCase() === 'slides' && lesson.slidesUrl ? (
              <SlidesContent
                slidesUrl={lesson.slidesUrl}
                slidesAsset={lesson.slidesAsset}
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
