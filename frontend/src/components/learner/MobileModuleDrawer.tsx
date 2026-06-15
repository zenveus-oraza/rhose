import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SegmentAccordion } from './SegmentAccordion';
import { LessonTimeline } from './LessonTimeline';
import { useModuleLessons } from '@/hooks/useLearner';
import type { ModuleSummary } from '@/types/learner';

interface MobileModuleDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  segmentId: string;
  moduleId: string;
  lessonId: string;
  modules: ModuleSummary[];
  segmentTitle?: string;
  onLessonNavigate: (moduleId: string, lessonId: string) => void;
}

function DrawerLessonTimeline({
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

  const lessons = data.lessons.map((l) => ({
    ...l,
    accessible: l.accessible || l.id === currentLessonId,
  }));

  return <LessonTimeline lessons={lessons} onLessonSelect={onLessonSelect} />;
}

export function MobileModuleDrawer({
  isOpen,
  onClose,
  segmentId,
  moduleId,
  lessonId,
  modules,
  segmentTitle,
  onLessonNavigate,
}: MobileModuleDrawerProps) {
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 z-40 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={cn(
          'fixed right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Module navigation"
      >
        {/* Drawer header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            {segmentTitle && (
              <h2 className="text-sm font-semibold text-gray-900 truncate">
                {segmentTitle}
              </h2>
            )}
            <p className="text-xs text-gray-500 mt-0.5">Module Navigation</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-3 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer content */}
        <div className="p-4">
          <SegmentAccordion
            modules={[...modules].sort((a, b) => a.sortOrder - b.sortOrder)}
            currentModuleId={moduleId}
          >
            {(expandedModuleId) => (
              <DrawerLessonTimeline
                segmentId={segmentId}
                moduleId={expandedModuleId}
                currentLessonId={lessonId}
                onLessonSelect={(lid) => {
                  onLessonNavigate(expandedModuleId, lid);
                  onClose();
                }}
              />
            )}
          </SegmentAccordion>
        </div>
      </div>
    </>
  );
}
