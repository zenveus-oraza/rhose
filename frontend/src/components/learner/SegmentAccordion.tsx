import { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ModuleSummary } from '@/types/learner';

interface SegmentAccordionProps {
  modules: ModuleSummary[];
  currentModuleId?: string;
  onModuleSelect?: (moduleId: string) => void;
  children?: (moduleId: string) => React.ReactNode;
}

export function SegmentAccordion({
  modules,
  currentModuleId,
  onModuleSelect,
  children,
}: SegmentAccordionProps) {
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(
    currentModuleId ?? null
  );

  const toggleModule = (moduleId: string) => {
    setExpandedModuleId((prev) => (prev === moduleId ? null : moduleId));
    onModuleSelect?.(moduleId);
  };

  const getModuleStatus = (module: ModuleSummary) => {
    if (module.completedCount === module.lessonCount && module.lessonCount > 0) {
      return 'completed';
    }
    if (module.id === currentModuleId) {
      return 'current';
    }
    if (module.completedCount > 0) {
      return 'in-progress';
    }
    return 'locked';
  };

  const renderStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-success-500" />;
      case 'current':
      case 'in-progress':
        return (
          <div className="h-5 w-5 rounded-full border-2 border-primary bg-teal-50" />
        );
      case 'locked':
      default:
        return <Lock className="h-4 w-4 text-muted-400" />;
    }
  };

  return (
    <div className="space-y-2">
      {modules.map((module) => {
        const isExpanded = expandedModuleId === module.id;
        const status = getModuleStatus(module);

        return (
          <div
            key={module.id}
            className="rounded-xl border border-muted-200 bg-white shadow-sm overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggleModule(module.id)}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted-50',
                isExpanded && 'bg-muted-50'
              )}
              aria-expanded={isExpanded}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-500" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-500" />
              )}

              {renderStatusIcon(status)}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-secondary truncate">
                  {module.title}
                </p>
              </div>

              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                  status === 'completed'
                    ? 'bg-success-50 text-success-700'
                    : 'bg-muted-100 text-muted-600'
                )}
              >
                {module.completedCount}/{module.lessonCount}
              </span>
            </button>

            <div
              className={cn(
                'grid transition-all duration-200 ease-in-out',
                isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              )}
            >
              <div className="overflow-hidden">
                {isExpanded && children && (
                  <div className="border-t border-muted-200 px-4 py-3">
                    {children(module.id)}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
