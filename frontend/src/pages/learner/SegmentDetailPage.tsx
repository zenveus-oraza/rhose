import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, Lock, ChevronDown, ChevronRight } from 'lucide-react';
import { useSegmentDetail } from '@/hooks/useLearner';
import type { ModuleSummary } from '@/types/learner';

type ModuleStatus = 'completed' | 'current' | 'locked';

function getModuleStatuses(modules: ModuleSummary[]): ModuleStatus[] {
  const sorted = [...modules].sort((a, b) => a.sortOrder - b.sortOrder);
  const statuses: ModuleStatus[] = [];
  let foundCurrent = false;

  for (const mod of sorted) {
    if (mod.completedCount === mod.lessonCount && mod.lessonCount > 0) {
      statuses.push('completed');
    } else if (!foundCurrent) {
      statuses.push('current');
      foundCurrent = true;
    } else {
      statuses.push('locked');
    }
  }

  return statuses;
}

function StatusIcon({ status }: { status: ModuleStatus }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />;
    case 'current':
      return <Clock className="h-5 w-5 text-cyan-500 shrink-0" />;
    case 'locked':
      return <Lock className="h-5 w-5 text-gray-400 shrink-0" />;
  }
}

function ProgressBadge({ completed, total }: { completed: number; total: number }) {
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
      {completed}/{total} Lessons
    </span>
  );
}

interface ModuleRowProps {
  module: ModuleSummary;
  status: ModuleStatus;
  isExpanded: boolean;
  onToggle: () => void;
  segmentId: string;
}

function ModuleRow({ module, status, isExpanded, onToggle, segmentId }: ModuleRowProps) {
  const navigate = useNavigate();
  const isLocked = status === 'locked';

  const handleClick = () => {
    if (isLocked) return;
    onToggle();
  };

  const handleNavigate = () => {
    navigate(`/learner/segments/${segmentId}/modules/${module.id}`);
  };

  return (
    <div className={`border-b last:border-b-0 ${isLocked ? 'opacity-60' : ''}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isLocked}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
          isLocked
            ? 'cursor-not-allowed'
            : 'hover:bg-gray-50 cursor-pointer'
        } ${status === 'current' ? 'bg-cyan-50/50' : ''}`}
      >
        <StatusIcon status={status} />
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium truncate ${
              isLocked ? 'text-gray-400' : 'text-gray-900'
            }`}
          >
            {module.title}
          </p>
          {module.description && (
            <p className="text-xs text-gray-500 truncate mt-0.5">{module.description}</p>
          )}
        </div>
        <ProgressBadge completed={module.completedCount} total={module.lessonCount} />
        {!isLocked && (
          isExpanded
            ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
            : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
        )}
        {isLocked && <Lock className="h-4 w-4 text-gray-300 shrink-0" />}
      </button>

      {isExpanded && !isLocked && (
        <div className="px-4 pb-3 pl-12">
          <button
            type="button"
            onClick={handleNavigate}
            className="text-sm text-cyan-600 hover:text-cyan-700 font-medium hover:underline"
          >
            View Lessons →
          </button>
          {status === 'completed' && (
            <p className="text-xs text-green-600 mt-1">Completed</p>
          )}
          {status === 'current' && (
            <p className="text-xs text-cyan-600 mt-1">In Progress</p>
          )}
        </div>
      )}
    </div>
  );
}

export function SegmentDetailPage() {
  const { segmentId = '' } = useParams<{ segmentId: string }>();
  const { data, isLoading, isError, error } = useSegmentDetail(segmentId);
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm text-red-700">
            {error?.message || 'Failed to load segment details. Please try again.'}
          </p>
        </div>
      </div>
    );
  }

  if (!data?.segment) {
    return (
      <div className="p-8">
        <p className="text-sm text-gray-500">Segment not found.</p>
      </div>
    );
  }

  const { segment } = data;
  const sortedModules = [...segment.modules].sort((a, b) => a.sortOrder - b.sortOrder);
  const statuses = getModuleStatuses(sortedModules);

  const handleToggle = (moduleId: string) => {
    setExpandedModuleId((prev) => (prev === moduleId ? null : moduleId));
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Segment header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{segment.title}</h1>
        {segment.description && (
          <p className="text-sm text-gray-600 mt-2">{segment.description}</p>
        )}
      </div>

      {/* Module Accordion */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">Modules</h2>
        </div>

        {sortedModules.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-gray-500">No modules available yet.</p>
          </div>
        ) : (
          sortedModules.map((mod, index) => (
            <ModuleRow
              key={mod.id}
              module={mod}
              status={statuses[index]}
              isExpanded={expandedModuleId === mod.id}
              onToggle={() => handleToggle(mod.id)}
              segmentId={segmentId}
            />
          ))
        )}
      </div>
    </div>
  );
}
