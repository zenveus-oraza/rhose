import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, FileText, Menu, Video } from 'lucide-react';
import { useLessonContent, useSegmentDetail, useModuleLessons } from '@/hooks/useLearner';
import { SegmentAccordion } from '@/components/learner/SegmentAccordion';
import { LessonTimeline } from '@/components/learner/LessonTimeline';
import { MobileModuleDrawer } from '@/components/learner/MobileModuleDrawer';

// --- Video URL helpers ---

function extractYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    // youtube.com/watch?v=ID
    if (parsed.hostname.includes('youtube.com')) {
      return parsed.searchParams.get('v');
    }
    // youtu.be/ID
    if (parsed.hostname === 'youtu.be') {
      return parsed.pathname.slice(1) || null;
    }
  } catch {
    // invalid URL
  }
  return null;
}

function extractVimeoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('vimeo.com')) {
      const match = parsed.pathname.match(/\/(\d+)/);
      return match ? match[1] : null;
    }
  } catch {
    // invalid URL
  }
  return null;
}

function getEmbedUrl(videoUrl: string): { embedUrl: string; provider: string } | null {
  const ytId = extractYouTubeId(videoUrl);
  if (ytId) {
    return { embedUrl: `https://www.youtube.com/embed/${ytId}`, provider: 'YouTube' };
  }

  const vimeoId = extractVimeoId(videoUrl);
  if (vimeoId) {
    return { embedUrl: `https://player.vimeo.com/video/${vimeoId}`, provider: 'Vimeo' };
  }

  return null;
}

// --- Components ---

function LessonSkeleton() {
  return (
    <div className="flex h-full animate-pulse">
      <div className="w-80 border-r border-gray-200 p-6">
        <div className="h-4 w-24 bg-gray-200 rounded mb-6" />
        <div className="h-6 w-48 bg-gray-200 rounded mb-4" />
        <div className="h-3 w-32 bg-gray-200 rounded mb-8" />
        <div className="space-y-3">
          <div className="h-12 bg-gray-200 rounded-xl" />
          <div className="h-12 bg-gray-200 rounded-xl" />
          <div className="h-12 bg-gray-200 rounded-xl" />
        </div>
      </div>
      <div className="flex-1 p-8">
        <div className="h-8 w-64 bg-gray-200 rounded mb-4" />
        <div className="h-4 w-32 bg-gray-200 rounded mb-8" />
        <div className="space-y-3">
          <div className="h-4 w-full bg-gray-200 rounded" />
          <div className="h-4 w-5/6 bg-gray-200 rounded" />
          <div className="h-4 w-4/6 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}

function VideoEmbed({ videoUrl }: { videoUrl: string }) {
  const embed = getEmbedUrl(videoUrl);

  if (embed) {
    return (
      <div className="aspect-video w-full rounded-lg overflow-hidden shadow-md">
        <iframe
          src={embed.embedUrl}
          title="Lesson video"
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  // Unsupported format — show as external link
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 flex items-center gap-3">
      <Video className="h-5 w-5 text-gray-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-600 mb-1">External video link</p>
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-cyan-600 hover:text-cyan-700 hover:underline inline-flex items-center gap-1.5 break-all"
        >
          {videoUrl}
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
        </a>
      </div>
    </div>
  );
}

function TextContent({ content }: { content: string }) {
  return (
    <div className="prose prose-gray max-w-none">
      <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">{content}</div>
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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const {
    data: lessonData,
    isLoading: lessonLoading,
    isError: lessonError,
    error: lessonErr,
  } = useLessonContent(segmentId, moduleId, lessonId);

  const { data: segmentData, isLoading: segmentLoading } = useSegmentDetail(segmentId);

  const { data: moduleLessonsData, isLoading: lessonsLoading } = useModuleLessons(
    segmentId,
    moduleId
  );

  const isLoading = lessonLoading || segmentLoading || lessonsLoading;

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
            to={`/learner/segments/${segmentId}`}
            className="mt-3 inline-flex items-center gap-1.5 text-sm text-red-600 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to segment
          </Link>
        </div>
      </div>
    );
  }

  const lesson = lessonData?.lesson;
  const segment = segmentData?.segment;
  const moduleLessons = moduleLessonsData?.lessons ?? [];

  // Determine lesson position
  const lessonIndex = moduleLessons.findIndex((l) => l.id === lessonId);
  const lessonPosition = lessonIndex >= 0 ? lessonIndex + 1 : null;
  const totalLessons = moduleLessons.length;

  // Find current module title
  const currentModule = segment?.modules.find((m) => m.id === moduleId);

  // Progress for the segment
  const totalSegmentLessons = segment?.modules.reduce((sum, m) => sum + m.lessonCount, 0) ?? 0;
  const completedSegmentLessons =
    segment?.modules.reduce((sum, m) => sum + m.completedCount, 0) ?? 0;
  const progressPercent =
    totalSegmentLessons > 0
      ? Math.round((completedSegmentLessons / totalSegmentLessons) * 100)
      : 0;

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh-80px)]">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link
          to={`/learner/segments/${segmentId}`}
          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label="Back to segment"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <div className="flex-1 min-w-0">
          {currentModule && (
            <p className="text-xs text-gray-500 truncate">{currentModule.title}</p>
          )}
          {lessonPosition !== null && (
            <p className="text-sm font-medium text-gray-900">
              Lesson {lessonPosition} of {totalLessons}
            </p>
          )}
        </div>

        {lesson?.contentType && (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 shrink-0">
            {lesson.contentType.toLowerCase() === 'video' ? (
              <Video className="h-3 w-3" />
            ) : (
              <FileText className="h-3 w-3" />
            )}
            {lesson.contentType}
          </span>
        )}

        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label="Open module navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile Module Drawer */}
      {segment && (
        <MobileModuleDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          segmentId={segmentId}
          moduleId={moduleId}
          lessonId={lessonId}
          modules={segment.modules}
          segmentTitle={segment.title}
          onLessonNavigate={(navModuleId, navLessonId) => {
            navigate(
              `/learner/segments/${segmentId}/modules/${navModuleId}/lessons/${navLessonId}`
            );
          }}
        />
      )}
      {/* Left Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-80 max-w-sm border-r border-gray-200 bg-white overflow-y-auto">
        <div className="p-5 space-y-5">
          {/* Back link */}
          <Link
            to={`/learner/segments/${segmentId}`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to dashboard
          </Link>

          {/* Segment title */}
          {segment && (
            <div>
              <h2 className="text-sm font-semibold text-gray-900 leading-snug">
                {segment.title}
              </h2>
            </div>
          )}

          {/* Progress indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Progress</span>
              <span className="text-xs font-medium text-gray-700">{progressPercent}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-cyan-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">
              {completedSegmentLessons} of {totalSegmentLessons} lessons completed
            </p>
          </div>

          {/* Module accordion with lesson timelines */}
          {segment && (
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                Modules
              </h3>
              <SegmentAccordion
                modules={[...segment.modules].sort((a, b) => a.sortOrder - b.sortOrder)}
                currentModuleId={moduleId}
              >
                {(expandedModuleId) => (
                  <SidebarLessonTimeline
                    segmentId={segmentId}
                    moduleId={expandedModuleId}
                    currentLessonId={lessonId}
                    onLessonSelect={(lid) => {
                      navigate(
                        `/learner/segments/${segmentId}/modules/${expandedModuleId}/lessons/${lid}`
                      );
                    }}
                  />
                )}
              </SegmentAccordion>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          {/* Navigation context */}
          <div className="mb-6">
            {currentModule && (
              <p className="text-sm text-gray-500 mb-1">{currentModule.title}</p>
            )}
            <h1 className="text-2xl font-bold text-gray-900">{lesson?.title}</h1>
            <div className="mt-2 flex items-center gap-3">
              {lesson?.contentType && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                  {lesson.contentType.toLowerCase() === 'video' ? (
                    <Video className="h-3 w-3" />
                  ) : (
                    <FileText className="h-3 w-3" />
                  )}
                  {lesson.contentType}
                </span>
              )}
              {lessonPosition !== null && (
                <span className="text-xs text-gray-500">
                  Lesson {lessonPosition} of {totalLessons}
                </span>
              )}
            </div>
          </div>

          {/* Content body */}
          <div className="mt-6">
            {lesson?.contentType?.toLowerCase() === 'video' && lesson.videoUrl ? (
              <VideoEmbed videoUrl={lesson.videoUrl} />
            ) : lesson?.contentBody ? (
              <TextContent content={lesson.contentBody} />
            ) : (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
                <p className="text-sm text-gray-500">No content available for this lesson.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// --- Sidebar Lesson Timeline (fetches its own data) ---

function SidebarLessonTimeline({
  segmentId,
  moduleId,
  currentLessonId,
  onLessonSelect,
}: {
  segmentId: string;
  moduleId: string;
  currentLessonId: string;
  onLessonSelect: (lessonId: string) => void;
}) {
  const { data, isLoading } = useModuleLessons(segmentId, moduleId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-6 w-full bg-gray-100 rounded animate-pulse" />
        <div className="h-6 w-full bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  if (!data?.lessons?.length) {
    return <p className="text-xs text-gray-400">No lessons</p>;
  }

  // Mark the current lesson as the "current" one for visual highlighting
  const lessons = data.lessons.map((l) => ({
    ...l,
    accessible: l.accessible || l.id === currentLessonId,
  }));

  return <LessonTimeline lessons={lessons} onLessonSelect={onLessonSelect} />;
}
