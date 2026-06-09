import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Plus,
  BookOpen,
  FileText,
  Video,
  ClipboardList,
  Clock,
  Edit,
  Trash2,
  GripVertical,
} from 'lucide-react';
import {
  useCreateSegment,
  useUpdateSegment,
  useModules,
  useLessons,
  useDeleteModule,
  useDeleteLesson,
  useReorderModules,
  useReorderLessons,
  useSegment,
} from '@/hooks/useAdminApi';
import { useCreateOrUpdateQuiz } from '@/hooks/useQuiz';
import { useToast } from '@/components/ui/Toast';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/ActionMenu';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { ModuleDrawer } from './ModuleDrawer';
import { LessonDrawer } from './LessonDrawer';
import { QuizDrawer } from './QuizDrawer';
import type { ModuleWithLessonCount, Lesson } from '@/types/admin';
import type { QuizQuestionInput } from '@/types/quiz';

// --- Types ---

type WizardStep = 0 | 1 | 2 | 3;

interface SegmentFormErrors {
  title?: string;
  duration?: string;
}

const STEP_LABELS = ['Segment Info', 'Modules', 'Quiz', 'Overview'] as const;

// --- Main Component ---

export function SegmentCreateWizard() {
  const navigate = useNavigate();
  const createSegment = useCreateSegment();
  const createOrUpdateQuiz = useCreateOrUpdateQuiz();
  const { toast } = useToast();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>(0);
  const [createdSegmentId, setCreatedSegmentId] = useState<string | null>(null);

  // Step 1 form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('');
  const [fieldErrors, setFieldErrors] = useState<SegmentFormErrors>({});

  // Quiz state (stored locally until final publish/save)
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestionInput[]>([]);

  function validate(): boolean {
    const errors: SegmentFormErrors = {};

    if (!title.trim()) {
      errors.title = 'Title is required';
    }

    const durationNum = Number(duration);
    if (!duration.trim()) {
      errors.duration = 'Duration is required';
    } else if (!Number.isInteger(durationNum) || durationNum <= 0) {
      errors.duration = 'Duration must be a positive integer';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleStep1Submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    createSegment.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        duration: Number(duration),
      },
      {
        onSuccess: (segment) => {
          toast('success', 'Segment created successfully');
          setCreatedSegmentId(segment.id);
          setCurrentStep(1);
        },
      }
    );
  }

  function canNavigateToStep(step: WizardStep): boolean {
    if (step === 0) return true;
    if (step === 1) return !!createdSegmentId;
    if (step === 2) return !!createdSegmentId; // Quiz is viewable but disabled
    if (step === 3) return !!createdSegmentId;
    return false;
  }

  function handleStepClick(step: WizardStep) {
    if (canNavigateToStep(step)) {
      setCurrentStep(step);
    }
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
        <h1 className="text-heading-page text-navy">Create Segment</h1>
      </div>
      <div className="border-b border-muted-200 mb-6" />

      {/* Step Indicator */}
      <StepIndicator
        currentStep={currentStep}
        completedSegment={!!createdSegmentId}
        onStepClick={handleStepClick}
      />

      {/* Step Content */}
      <div className="mt-8">
        {currentStep === 0 && (
          <Step1SegmentInfo
            title={title}
            setTitle={setTitle}
            description={description}
            setDescription={setDescription}
            duration={duration}
            setDuration={setDuration}
            fieldErrors={fieldErrors}
            setFieldErrors={setFieldErrors}
            onSubmit={handleStep1Submit}
            isPending={createSegment.isPending}
            error={createSegment.error?.message}
            onCancel={() => navigate('/admin/content')}
          />
        )}
        {currentStep === 1 && createdSegmentId && (
          <Step2Modules segmentId={createdSegmentId} onContinue={() => setCurrentStep(2)} onBack={() => setCurrentStep(0)} />
        )}
        {currentStep === 2 && (
          <Step3Quiz
            quizQuestions={quizQuestions}
            setQuizQuestions={setQuizQuestions}
            onContinue={() => setCurrentStep(3)}
            onBack={() => setCurrentStep(1)}
          />
        )}
        {currentStep === 3 && createdSegmentId && (
          <Step4Overview
            segmentId={createdSegmentId}
            quizQuestions={quizQuestions}
            onBack={() => setCurrentStep(2)}
            onEditSegmentInfo={() => setCurrentStep(0)}
            onEditModules={() => setCurrentStep(1)}
            onEditQuiz={() => setCurrentStep(2)}
            onFinish={(status: 'active' | 'draft') => {
              if (quizQuestions.length > 0) {
                createOrUpdateQuiz.mutate(
                  { segmentId: createdSegmentId, data: { questions: quizQuestions } },
                  {
                    onSuccess: () => {
                      if (status === 'active') {
                        toast('success', 'Segment published successfully');
                      } else {
                        toast('success', 'Segment saved as draft');
                      }
                      navigate(`/admin/content/segments/${createdSegmentId}`);
                    },
                    onError: () => {
                      toast('error', 'Failed to save quiz');
                    },
                  }
                );
              } else {
                if (status === 'draft') {
                  toast('success', 'Segment saved as draft');
                }
                navigate(`/admin/content/segments/${createdSegmentId}`);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

// --- Step Indicator ---

function StepIndicator({
  currentStep,
  completedSegment,
  onStepClick,
}: {
  currentStep: WizardStep;
  completedSegment: boolean;
  onStepClick: (step: WizardStep) => void;
}) {
  return (
    <div className="flex items-center justify-between max-w-2xl">
      {STEP_LABELS.map((label, index) => {
        const step = index as WizardStep;
        const isActive = currentStep === step;
        const isCompleted = step === 0 && completedSegment;
        const isClickable =
          step === 0 ||
          (step === 1 && completedSegment) ||
          (step === 2 && completedSegment) ||
          (step === 3 && completedSegment);

        return (
          <div key={label} className="flex items-center">
            <button
              onClick={() => onStepClick(step)}
              disabled={!isClickable}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-helper font-medium transition ${
                isActive
                  ? 'bg-teal/10 text-teal border border-teal/30'
                  : isCompleted
                    ? 'text-teal hover:bg-teal/5'
                    : isClickable
                      ? 'text-muted-600 hover:bg-muted-50'
                      : 'text-muted-400 cursor-not-allowed'
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  isActive
                    ? 'bg-teal text-white'
                    : isCompleted
                      ? 'bg-teal text-white'
                      : isClickable
                        ? 'bg-muted-200 text-muted-600'
                        : 'bg-muted-100 text-muted-400'
                }`}
              >
                {isCompleted ? <Check size={12} /> : index + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>

            {index < STEP_LABELS.length - 1 && (
              <div
                className={`mx-2 h-px w-6 sm:w-10 ${
                  completedSegment && index === 0
                    ? 'bg-teal'
                    : 'bg-muted-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// --- Step 1: Segment Info ---

function Step1SegmentInfo({
  title,
  setTitle,
  description,
  setDescription,
  duration,
  setDuration,
  fieldErrors,
  setFieldErrors,
  onSubmit,
  isPending,
  error,
  onCancel,
}: {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  duration: string;
  setDuration: (v: string) => void;
  fieldErrors: SegmentFormErrors;
  setFieldErrors: React.Dispatch<React.SetStateAction<SegmentFormErrors>>;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  error?: string;
  onCancel: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="max-w-lg space-y-5">
      {error && <ErrorMessage message={error || 'Failed to create segment'} />}

      {/* Title */}
      <div>
        <label htmlFor="segment-title" className="block text-helper font-medium text-navy mb-1.5">
          Title <span className="text-danger">*</span>
        </label>
        <input
          id="segment-title"
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (fieldErrors.title) setFieldErrors((prev) => ({ ...prev, title: undefined }));
          }}
          aria-invalid={!!fieldErrors.title}
          aria-describedby={fieldErrors.title ? 'segment-title-error' : undefined}
          className={`w-full rounded-lg border px-4 py-2.5 text-body text-navy placeholder:text-muted-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition ${
            fieldErrors.title ? 'border-danger-400' : 'border-muted-300'
          }`}
          placeholder="Enter segment title"
        />
        {fieldErrors.title && (
          <p id="segment-title-error" className="mt-1 text-helper text-danger-600">
            {fieldErrors.title}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="segment-description" className="block text-helper font-medium text-navy mb-1.5">
          Description
        </label>
        <textarea
          id="segment-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-muted-300 px-4 py-2.5 text-body text-navy placeholder:text-muted-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition resize-none"
          placeholder="Enter a description for this segment (optional)"
        />
      </div>

      {/* Duration */}
      <div>
        <label htmlFor="segment-duration" className="block text-helper font-medium text-navy mb-1.5">
          Duration (days) <span className="text-danger">*</span>
        </label>
        <input
          id="segment-duration"
          type="number"
          min="1"
          step="1"
          value={duration}
          onChange={(e) => {
            setDuration(e.target.value);
            if (fieldErrors.duration) setFieldErrors((prev) => ({ ...prev, duration: undefined }));
          }}
          aria-invalid={!!fieldErrors.duration}
          aria-describedby={fieldErrors.duration ? 'segment-duration-error' : undefined}
          className={`w-full rounded-lg border px-4 py-2.5 text-body text-navy placeholder:text-muted-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition ${
            fieldErrors.duration ? 'border-danger-400' : 'border-muted-300'
          }`}
          placeholder="e.g. 30"
        />
        {fieldErrors.duration && (
          <p id="segment-duration-error" className="mt-1 text-helper text-danger-600">
            {fieldErrors.duration}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-muted-300 px-4 py-2 text-helper font-medium text-muted-700 hover:bg-muted-50 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-secondary px-4 py-2 text-helper font-medium text-white hover:bg-secondary/90 transition disabled:opacity-60"
        >
          {isPending ? 'Creating...' : 'Save & Continue'}
        </button>
      </div>
    </form>
  );
}

// --- Step 2: Modules ---

function Step2Modules({ segmentId, onContinue, onBack }: { segmentId: string; onContinue: () => void; onBack: () => void }) {
  const [modulePage, setModulePage] = useState(1);
  const { data: modulesData, isLoading } = useModules(segmentId, { page: modulePage, limit: 10 });
  const deleteModule = useDeleteModule();
  const deleteLesson = useDeleteLesson();
  const reorderModules = useReorderModules();

  const modules = modulesData?.data ?? [];

  // Drawer state
  const [moduleDrawerOpen, setModuleDrawerOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<ModuleWithLessonCount | null>(null);
  const [lessonDrawerOpen, setLessonDrawerOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);

  // Delete state
  const [deleteModuleTarget, setDeleteModuleTarget] = useState<ModuleWithLessonCount | null>(null);
  const [deleteLessonTarget, setDeleteLessonTarget] = useState<{ lesson: Lesson; moduleId: string } | null>(null);

  // Expanded modules
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

  function handleReorderModule(currentIndex: number, direction: 'up' | 'down') {
    if (!modules || modules.length < 2) return;
    const newOrder = [...modules];
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    [newOrder[currentIndex], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[currentIndex]];
    reorderModules.mutate({
      segmentId,
      data: { orderedIds: newOrder.map((m) => m.id) },
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingIndicator label="Loading modules..." />
      </div>
    );
  }

  return (
    <div>
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

        {modules.length > 0 ? (
          <>
            <div className="divide-y divide-muted-100">
              {modules.map((mod, index) => (
                <WizardModuleRow
                  key={mod.id}
                  module={mod}
                  segmentId={segmentId}
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
                  onMoveUp={() => handleReorderModule(index, 'up')}
                  onMoveDown={() => handleReorderModule(index, 'down')}
                  isFirst={index === 0}
                  isLast={index === modules.length - 1}
                />
              ))}
            </div>

            {/* Module Pagination */}
            {modulesData?.pagination && modulesData.pagination.totalPages > 1 && (
              <div className="border-t border-muted-200 px-6 py-4 flex items-center justify-between">
                <p className="text-helper text-muted-500">
                  Page {modulesData.pagination.page} of {modulesData.pagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setModulePage((p) => Math.max(1, p - 1))}
                    disabled={modulePage <= 1}
                    className="px-3 py-1.5 rounded-lg border border-muted-200 hover:bg-muted-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-helper font-medium text-muted-600"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setModulePage((p) => p + 1)}
                    disabled={modulePage >= modulesData.pagination.totalPages}
                    className="px-3 py-1.5 rounded-lg border border-muted-200 hover:bg-muted-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-helper font-medium text-muted-600"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-8 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-muted-300" />
            <p className="mt-3 text-body text-muted-500">
              No modules yet. Add your first module to continue.
            </p>
          </div>
        )}
      </div>

      {/* Drawers */}
      <ModuleDrawer
        open={moduleDrawerOpen}
        onClose={() => {
          setModuleDrawerOpen(false);
          setEditingModule(null);
        }}
        segmentId={segmentId}
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
              { id: deleteModuleTarget.id, segmentId },
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

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-6">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-muted-300 px-4 py-2 text-helper font-medium text-muted-700 hover:bg-muted-50 transition"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="rounded-lg bg-secondary px-4 py-2 text-helper font-medium text-white hover:bg-secondary/90 transition"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

// --- Module Row (for Step 2) ---

function WizardModuleRow({
  module,
  segmentId,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
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
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const moduleActions: ActionMenuItem[] = [
    { label: 'Edit', icon: <Edit size={16} />, onClick: onEdit },
    { label: 'Add Lesson', icon: <Plus size={16} />, onClick: onAddLesson },
    { label: 'Move Up', icon: <GripVertical size={16} />, onClick: onMoveUp, disabled: isFirst },
    { label: 'Move Down', icon: <GripVertical size={16} />, onClick: onMoveDown, disabled: isLast },
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
              {module.lessonCount} {module.lessonCount === 1 ? 'lesson' : 'lessons'}
            </p>
          </div>
        </button>
        <ActionMenu items={moduleActions} />
      </div>

      {expanded && (
        <WizardModuleLessons
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

// --- Module Lessons (for Step 2) ---

function WizardModuleLessons({
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
  const [lessonPage, setLessonPage] = useState(1);
  const { data: lessonsData, isLoading } = useLessons(moduleId, { page: lessonPage, limit: 10 });
  const lessons = lessonsData?.data ?? [];
  const reorderLessons = useReorderLessons();

  function handleReorderLesson(currentIndex: number, direction: 'up' | 'down') {
    if (!lessons || lessons.length < 2) return;
    const newOrder = [...lessons];
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    [newOrder[currentIndex], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[currentIndex]];
    reorderLessons.mutate({
      moduleId,
      data: { orderedIds: newOrder.map((l) => l.id) },
    });
  }

  if (isLoading) {
    return (
      <div className="px-12 py-4">
        <LoadingIndicator size="sm" label="Loading lessons..." />
      </div>
    );
  }

  return (
    <div className="border-t border-muted-100 bg-muted-50 px-6 py-4">
      {/* Add Lesson button */}
      <div className="ml-7 mb-3">
        <button
          onClick={onAddLesson}
          className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-helper font-medium text-white hover:bg-secondary/90 transition"
        >
          <Plus size={16} />
          <span>Add Lesson</span>
        </button>
      </div>

      {/* Lesson list */}
      <div className="ml-7 rounded-lg bg-muted-100 border border-muted-200 p-3 min-h-[80px]">
        {!lessons || lessons.length === 0 ? (
          <div className="flex items-center justify-center py-4">
            <p className="text-helper text-muted-500">Saved lessons will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {lessons.map((lesson, index) => (
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
                    <div className="flex items-center gap-2 mt-0.5">
                      <StatusBadge variant={lesson.contentType} label={lesson.contentType} />
                      {lesson.estimatedTimeValue && lesson.estimatedTimeUnit && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-500">
                          <Clock size={12} />
                          {(() => {
                            const totalMinutes = lesson.estimatedTimeUnit === 'hours'
                              ? lesson.estimatedTimeValue * 60
                              : lesson.estimatedTimeValue;
                            const h = Math.floor(totalMinutes / 60);
                            const m = totalMinutes % 60;
                            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                          })()}
                        </span>
                      )}

                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleReorderLesson(index, 'up')}
                    disabled={index === 0}
                    className="rounded p-1 text-muted-400 hover:text-navy hover:bg-muted-100 transition disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Move lesson up"
                  >
                    <GripVertical size={14} />
                  </button>
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
        )}
      </div>

      {/* Lesson Pagination */}
      {lessonsData?.pagination && lessonsData.pagination.totalPages > 1 && (
        <div className="ml-7 mt-3 flex items-center justify-between border-t border-muted-200 pt-2">
          <p className="text-helper text-muted-500">
            Page {lessonsData.pagination.page} of {lessonsData.pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setLessonPage((p) => Math.max(1, p - 1))}
              disabled={lessonPage <= 1}
              className="px-2 py-1 rounded text-xs border border-muted-200 hover:bg-muted-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-muted-600"
            >
              Previous
            </button>
            <button
              onClick={() => setLessonPage((p) => p + 1)}
              disabled={lessonPage >= lessonsData.pagination.totalPages}
              className="px-2 py-1 rounded text-xs border border-muted-200 hover:bg-muted-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-muted-600"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Step 3: Quiz ---

function Step3Quiz({
  quizQuestions,
  setQuizQuestions,
  onContinue,
  onBack,
}: {
  quizQuestions: QuizQuestionInput[];
  setQuizQuestions: React.Dispatch<React.SetStateAction<QuizQuestionInput[]>>;
  onContinue: () => void;
  onBack: () => void;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  function handleSaveQuestion(question: QuizQuestionInput) {
    if (editingIndex !== null) {
      setQuizQuestions((prev) =>
        prev.map((q, i) => (i === editingIndex ? question : q))
      );
      setEditingIndex(null);
    } else {
      setQuizQuestions((prev) => [...prev, question]);
    }
    setDrawerOpen(false);
  }

  function handleEditQuestion(index: number) {
    setEditingIndex(index);
    setDrawerOpen(true);
  }

  function handleDeleteQuestion(index: number) {
    setQuizQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="rounded-xl border border-muted-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-muted-200 px-6 py-4">
          <h2 className="text-heading-card text-navy">Quiz Questions</h2>
          <button
            onClick={() => {
              setEditingIndex(null);
              setDrawerOpen(true);
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-helper font-medium text-white hover:bg-secondary/90 transition"
          >
            <Plus size={16} />
            <span>Add Question</span>
          </button>
        </div>

        {quizQuestions.length > 0 ? (
          <div className="divide-y divide-muted-100">
            {quizQuestions.map((question, index) => (
              <div
                key={index}
                className="flex items-start justify-between px-6 py-4 hover:bg-muted-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-body font-medium text-navy">
                    Q {index + 1}: {question.question_text}
                  </p>
                  <p className="text-helper text-muted-500 mt-0.5">
                    {question.question_type === 'single_select' ? 'Single Select' : 'Multi Select'}
                    {' • '}
                    {question.options.length} options
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-3 shrink-0">
                  <button
                    onClick={() => handleEditQuestion(index)}
                    className="rounded p-1.5 text-muted-400 hover:text-navy hover:bg-muted-100 transition"
                    aria-label={`Edit question ${index + 1}`}
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteQuestion(index)}
                    className="rounded p-1.5 text-muted-400 hover:text-danger hover:bg-danger-50 transition"
                    aria-label={`Delete question ${index + 1}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <ClipboardList className="mx-auto h-10 w-10 text-muted-300" />
            <p className="mt-3 text-body text-muted-500">
              No quiz questions yet. Add questions to create a quiz for this segment.
            </p>
            <p className="mt-1 text-helper text-muted-400">
              Quiz is optional — you can skip this step.
            </p>
          </div>
        )}
      </div>

      {/* Quiz Drawer */}
      <QuizDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingIndex(null);
        }}
        onSave={handleSaveQuestion}
        editingQuestion={editingIndex !== null ? quizQuestions[editingIndex] : null}
      />

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-6">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-muted-300 px-4 py-2 text-helper font-medium text-muted-700 hover:bg-muted-50 transition"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="rounded-lg bg-secondary px-4 py-2 text-helper font-medium text-white hover:bg-secondary/90 transition"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

// --- Step 4: Overview ---

function Step4Overview({
  segmentId,
  quizQuestions,
  onBack,
  onEditSegmentInfo,
  onEditModules,
  onEditQuiz,
  onFinish,
}: {
  segmentId: string;
  quizQuestions: QuizQuestionInput[];
  onBack: () => void;
  onEditSegmentInfo: () => void;
  onEditModules: () => void;
  onEditQuiz: () => void;
  onPublish?: () => void;
  onFinish: (status: 'active' | 'draft') => void;
}) {
  const { data: segment, isLoading: segmentLoading } = useSegment(segmentId);
  const { data: modulesData, isLoading: modulesLoading } = useModules(segmentId, { page: 1, limit: 50 });
  const updateSegment = useUpdateSegment();
  const { toast } = useToast();

  const modules = modulesData?.data ?? [];
  const totalLessons = modules.reduce((sum, m) => sum + m.lessonCount, 0);

  function handlePublish() {
    updateSegment.mutate(
      { id: segmentId, data: { status: 'active' } },
      {
        onSuccess: () => {
          toast('success', 'Segment published successfully');
          onFinish('active');
        },
      }
    );
  }

  function handleSaveAsDraft() {
    onFinish('draft');
  }

  if (segmentLoading || modulesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingIndicator label="Loading overview..." />
      </div>
    );
  }

  if (!segment) {
    return <ErrorMessage message="Segment not found" />;
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Segment Info Section */}
      <div className="rounded-xl border border-muted-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-heading-card text-navy">Segment Info</h3>
          <button
            onClick={onEditSegmentInfo}
            className="rounded p-1.5 text-muted-400 hover:text-navy hover:bg-muted-100 transition"
            aria-label="Edit segment info"
          >
            <Edit size={16} />
          </button>
        </div>
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <span className="text-helper text-muted-500">Title</span>
            <span className="text-body font-medium text-navy text-right">{segment.title}</span>
          </div>
          {segment.description && (
            <div className="flex items-start justify-between">
              <span className="text-helper text-muted-500">Description</span>
              <span className="text-body text-navy text-right max-w-sm">{segment.description}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-helper text-muted-500">Duration</span>
            <span className="text-body text-navy">{segment.duration} days</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-helper text-muted-500">Status</span>
            <StatusBadge variant={segment.status} />
          </div>
        </div>
      </div>

      {/* Modules Section */}
      <div className="rounded-xl border border-muted-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-heading-card text-navy">Modules</h3>
          <button
            onClick={onEditModules}
            className="rounded p-1.5 text-muted-400 hover:text-navy hover:bg-muted-100 transition"
            aria-label="Edit modules"
          >
            <Edit size={16} />
          </button>
        </div>
        {modules.length > 0 ? (
          <div className="space-y-2">
            {modules.map((mod) => (
              <div
                key={mod.id}
                className="flex items-center justify-between rounded-lg border border-muted-200 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <BookOpen size={16} className="text-teal" />
                  <span className="text-body font-medium text-navy">{mod.title}</span>
                </div>
                <span className="text-helper text-muted-500">
                  {mod.lessonCount} {mod.lessonCount === 1 ? 'lesson' : 'lessons'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-body text-muted-500">No modules added.</p>
        )}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-muted-100">
          <span className="text-helper text-muted-500">Total Lessons</span>
          <span className="text-body font-medium text-navy">{totalLessons}</span>
        </div>
      </div>

      {/* Quiz Section */}
      <div className="rounded-xl border border-muted-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-heading-card text-navy">Quiz</h3>
          <button
            onClick={onEditQuiz}
            className="rounded p-1.5 text-muted-400 hover:text-navy hover:bg-muted-100 transition"
            aria-label="Edit quiz"
          >
            <Edit size={16} />
          </button>
        </div>
        {quizQuestions.length > 0 ? (
          <div className="space-y-2">
            {quizQuestions.map((question, index) => (
              <div
                key={index}
                className="rounded-lg border border-muted-200 px-4 py-3"
              >
                <p className="text-body text-navy">
                  <span className="font-medium">Q {index + 1}:</span>{' '}
                  {question.question_text}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-body text-muted-500">No quiz questions added.</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-muted-300 px-4 py-2 text-helper font-medium text-muted-700 hover:bg-muted-50 transition"
        >
          Back
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveAsDraft}
            className="rounded-lg border border-muted-300 px-4 py-2 text-helper font-medium text-muted-700 hover:bg-muted-50 transition"
          >
            Save as Draft
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={updateSegment.isPending}
            className="rounded-lg bg-secondary px-4 py-2 text-helper font-medium text-white hover:bg-secondary/90 transition disabled:opacity-60"
          >
            {updateSegment.isPending ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  );
}
