import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  BookOpen,
  FileText,
  Video,
  Users,
} from 'lucide-react';
import {
  useSegment,
  useModules,
  useLessons,
  useDeleteModule,
  useDeleteLesson,
  useSegmentAssignments,
  useUpdateSegment,
} from '@/hooks/useAdminApi';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/ActionMenu';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { ModuleDrawer } from './ModuleDrawer';
import { LessonDrawer } from './LessonDrawer';
import type { ModuleWithLessonCount, Lesson, SegmentStatus } from '@/types/admin';

export function SegmentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: segment, isLoading, error } = useSegment(id!);
  const { data: modules } = useModules(id!);
  const { data: assignments } = useSegmentAssignments(id!);
  const updateSegment = useUpdateSegment();
  const deleteModule = useDeleteModule();
  const deleteLesson = useDeleteLesson();

  // Drawer state
  const [moduleDrawerOpen, setModuleDrawerOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<ModuleWithLessonCount | null>(null);
  const [lessonDrawerOpen, setLessonDrawerOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);

  // Delete state
  const [deleteModuleTarget, setDeleteModuleTarget] = useState<ModuleWithLessonCount | null>(null);
  const [deleteLessonTarget, setDeleteLessonTarget] = useState<{ lesson: Lesson; moduleId: string } | null>(null);

  // Expanded modules for lesson view
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  function toggleModule(moduleId: string) {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  }

  function handleStatusChange(newStatus: SegmentStatus) {
    if (!id) return;
    updateSegment.mutate({ id, data: { status: newStatus } });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingIndicator label="Loading segment..." />
      </div>
    );
  }

  if (error || !segment) {
    return (
      <div className="p-8">
        <ErrorMessage message={error?.message || 'Segment not found'} />
      </div>
    );
  }

  return (
    <div className="py-4 lg:px-8">
      {/* Header */}
      <div className="mb-5">
        <button
          onClick={() => navigate('/admin/content')}
          className="mb-4 inline-flex items-center gap-1 text-helper text-muted-500 hover:text-navy transition"
        >
          <ArrowLeft size={16} />
          <span>Back to Content</span>
        </button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-heading-page text-navy">{segment.title}</h1>
              <StatusBadge variant={segment.status} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {segment.status === 'draft' && (
              <button
                onClick={() => handleStatusChange('active')}
                disabled={updateSegment.isPending}
                className="rounded-lg bg-success px-3 py-1.5 text-helper font-medium text-white hover:bg-success-600 transition disabled:opacity-60"
              >
                Activate
              </button>
            )}
            {segment.status === 'active' && (
              <button
                onClick={() => handleStatusChange('archived')}
                disabled={updateSegment.isPending}
                className="rounded-lg border border-muted-300 px-3 py-1.5 text-helper font-medium text-muted-700 hover:bg-muted-50 transition disabled:opacity-60"
              >
                Archive
              </button>
            )}
            <button
              onClick={() => navigate(`/admin/content/segments/${id}/edit`)}
              className="rounded-lg border border-muted-300 px-3 py-1.5 text-helper font-medium text-muted-700 hover:bg-muted-50 transition"
            >
              <Edit size={16} />
            </button>
          </div>
        </div>
      </div>
      <div className="border-b border-muted-200 mb-6" />

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-muted-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
              <BookOpen className="h-5 w-5 text-teal" />
            </div>
            <div>
              <p className="text-helper text-muted-500">Modules</p>
              <p className="text-heading-card text-navy">{segment.moduleCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-muted-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-50">
              <FileText className="h-5 w-5 text-navy" />
            </div>
            <div>
              <p className="text-helper text-muted-500">Total Lessons</p>
              <p className="text-heading-card text-navy">
                {modules?.reduce((sum, m) => sum + m.lessonCount, 0) ?? 0}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-muted-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-50">
              <Users className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-helper text-muted-500">Assigned Users</p>
              <p className="text-heading-card text-navy">{assignments?.length ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modules Section */}
      <div className="rounded-xl border border-muted-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-muted-200 px-6 py-4">
          <h2 className="text-heading-card text-navy">Modules & Lessons</h2>
          <button
            onClick={() => {
              setEditingModule(null);
              setModuleDrawerOpen(true);
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-helper font-medium text-white hover:bg-secondary/90 transition"
          >
            <Plus size={16} />
            <span>Add Module</span>
          </button>
        </div>

        {modules && modules.length > 0 ? (
          <div className="divide-y divide-muted-100">
            {modules.map((mod) => (
              <ModuleRow
                key={mod.id}
                module={mod}
                segmentId={id!}
                expanded={expandedModules.has(mod.id)}
                onToggle={() => toggleModule(mod.id)}
                onEdit={() => {
                  setEditingModule(mod);
                  setModuleDrawerOpen(true);
                }}
                onDelete={() => setDeleteModuleTarget(mod)}
                onAddLesson={() => {
                  setActiveModuleId(mod.id);
                  setEditingLesson(null);
                  setLessonDrawerOpen(true);
                }}
                onEditLesson={(lesson) => {
                  setActiveModuleId(mod.id);
                  setEditingLesson(lesson);
                  setLessonDrawerOpen(true);
                }}
                onDeleteLesson={(lesson) => setDeleteLessonTarget({ lesson, moduleId: mod.id })}
              />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-muted-300" />
            <p className="mt-3 text-body text-muted-500">No modules yet. Add your first module.</p>
          </div>
        )}
      </div>

      {/* Assigned Users Section */}
      {assignments && assignments.length > 0 && (
        <div className="mt-6 rounded-xl border border-muted-200 bg-white shadow-sm">
          <div className="border-b border-muted-200 px-6 py-4">
            <h2 className="text-heading-card text-navy">Assigned Users</h2>
          </div>
          <div className="divide-y divide-muted-100">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-body font-medium text-navy">{assignment.name}</p>
                  <p className="text-helper text-muted-500">{assignment.email}</p>
                </div>
                <StatusBadge
                  variant={assignment.status === 'active' ? 'active' : 'deactivated'}
                  label={assignment.status}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drawers */}
      <ModuleDrawer
        open={moduleDrawerOpen}
        onClose={() => {
          setModuleDrawerOpen(false);
          setEditingModule(null);
        }}
        segmentId={id!}
        module={editingModule}
      />

      <LessonDrawer
        open={lessonDrawerOpen}
        onClose={() => {
          setLessonDrawerOpen(false);
          setEditingLesson(null);
          setActiveModuleId(null);
        }}
        moduleId={activeModuleId || ''}
        lesson={editingLesson}
      />

      {/* Delete Module Confirmation */}
      <ConfirmationDialog
        open={!!deleteModuleTarget}
        onClose={() => setDeleteModuleTarget(null)}
        onConfirm={() => {
          if (deleteModuleTarget) {
            deleteModule.mutate(
              { id: deleteModuleTarget.id, segmentId: id! },
              { onSuccess: () => setDeleteModuleTarget(null) }
            );
          }
        }}
        title="Delete Module"
        description={`Are you sure you want to delete "${deleteModuleTarget?.title}"? The module must have no lessons before it can be deleted.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteModule.isPending}
      />

      {/* Delete Lesson Confirmation */}
      <ConfirmationDialog
        open={!!deleteLessonTarget}
        onClose={() => setDeleteLessonTarget(null)}
        onConfirm={() => {
          if (deleteLessonTarget) {
            deleteLesson.mutate(
              { id: deleteLessonTarget.lesson.id, moduleId: deleteLessonTarget.moduleId },
              { onSuccess: () => setDeleteLessonTarget(null) }
            );
          }
        }}
        title="Delete Lesson"
        description={`Are you sure you want to delete "${deleteLessonTarget?.lesson.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteLesson.isPending}
      />
    </div>
  );
}


// --- Module Row Sub-component ---

function ModuleRow({
  module,
  segmentId,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
}: {
  module: ModuleWithLessonCount;
  segmentId: string;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddLesson: () => void;
  onEditLesson: (lesson: Lesson) => void;
  onDeleteLesson: (lesson: Lesson) => void;
}) {
  const moduleActions: ActionMenuItem[] = [
    { label: 'Edit', icon: <Edit size={16} />, onClick: onEdit },
    { label: 'Add Lesson', icon: <Plus size={16} />, onClick: onAddLesson },
    { label: 'Delete', icon: <Trash2 size={16} />, onClick: onDelete, variant: 'danger' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between px-6 py-4 hover:bg-muted-50 transition-colors">
        <button
          onClick={onToggle}
          className="flex flex-1 items-center gap-3 text-left"
        >
          <svg
            className={`h-4 w-4 text-muted-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <div>
            <p className="text-body font-medium text-navy">{module.title}</p>
            <p className="text-helper text-muted-500">
              {module.lessonCount} {module.lessonCount === 1 ? 'lesson' : 'lessons'} · Order #{module.sortOrder}
            </p>
          </div>
        </button>
        <ActionMenu items={moduleActions} />
      </div>

      {expanded && (
        <ModuleLessons
          moduleId={module.id}
          segmentId={segmentId}
          onEditLesson={onEditLesson}
          onDeleteLesson={onDeleteLesson}
          onAddLesson={onAddLesson}
        />
      )}
    </div>
  );
}

function ModuleLessons({
  moduleId,
  segmentId: _segmentId,
  onEditLesson,
  onDeleteLesson,
  onAddLesson,
}: {
  moduleId: string;
  segmentId: string;
  onEditLesson: (lesson: Lesson) => void;
  onDeleteLesson: (lesson: Lesson) => void;
  onAddLesson: () => void;
}) {
  const { data: lessons, isLoading } = useLessons(moduleId);

  if (isLoading) {
    return (
      <div className="px-12 py-4">
        <LoadingIndicator size="sm" label="Loading lessons..." />
      </div>
    );
  }

  if (!lessons || lessons.length === 0) {
    return (
      <div className="px-12 py-4 text-center">
        <p className="text-helper text-muted-500">No lessons yet.</p>
        <button
          onClick={onAddLesson}
          className="mt-2 text-helper font-medium text-primary hover:text-primary/80 transition"
        >
          + Add first lesson
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-muted-100 bg-muted-50 px-6 py-3">
      <div className="ml-7 space-y-2">
        {lessons.map((lesson) => (
          <div
            key={lesson.id}
            className="flex items-center justify-between rounded-lg bg-white px-4 py-2.5 border border-muted-200"
          >
            <div className="flex items-center gap-3">
              {lesson.contentType === 'text' ? (
                <FileText size={16} className="text-teal" />
              ) : (
                <Video size={16} className="text-navy" />
              )}
              <div>
                <p className="text-helper font-medium text-navy">{lesson.title}</p>
                <StatusBadge variant={lesson.contentType} label={lesson.contentType} className="mt-0.5" />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onEditLesson(lesson)}
                className="rounded p-1 text-muted-400 hover:text-navy hover:bg-muted-100 transition"
                aria-label="Edit lesson"
              >
                <Edit size={14} />
              </button>
              <button
                onClick={() => onDeleteLesson(lesson)}
                className="rounded p-1 text-muted-400 hover:text-danger hover:bg-danger-50 transition"
                aria-label="Delete lesson"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
