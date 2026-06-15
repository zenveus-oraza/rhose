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
  GripVertical,
  Clock,
  Search,
  ClipboardList,
  Settings,
} from 'lucide-react';
import {
  useSegment,
  useModules,
  useLessons,
  useDeleteModule,
  useDeleteLesson,
  useReorderModules,
  useReorderLessons,
  useSegmentAssignments,
  useUpdateSegment,
} from '@/hooks/useAdminApi';
import { useSegmentQuiz, useCreateOrUpdateQuiz, useDeleteQuiz } from '@/hooks/useQuiz';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/ActionMenu';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { ModuleDrawer } from './ModuleDrawer';
import { LessonDrawer } from './LessonDrawer';
import { QuizDrawer } from './QuizDrawer';
import type { ModuleWithLessonCount, Lesson, SegmentStatus } from '@/types/admin';
import type { QuizQuestionInput } from '@/types/quiz';

export function SegmentDetailsPage() {
  const { segmentSlug } = useParams<{ segmentSlug: string }>();
  const navigate = useNavigate();

  // Pagination state
  const [modulePage, setModulePage] = useState(1);
  const [assignmentPage, setAssignmentPage] = useState(1);

  const { data: segment, isLoading, error } = useSegment(segmentSlug!);
  const { data: modulesData } = useModules(segment?.id ?? segmentSlug ?? '', { page: modulePage, limit: 10 });
  const { data: assignmentsData } = useSegmentAssignments(segment?.id ?? '', { page: assignmentPage, limit: 20 });
  const { data: quiz } = useSegmentQuiz(segment?.id ?? '');
  const updateSegment = useUpdateSegment();
  const deleteModule = useDeleteModule();
  const deleteLesson = useDeleteLesson();
  const reorderModules = useReorderModules();

  const modules = modulesData?.data ?? [];
  const assignments = assignmentsData?.data ?? [];

  // User search state for Assigned Users section
  const [userSearch, setUserSearch] = useState('');

  // Drawer state
  const [moduleDrawerOpen, setModuleDrawerOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<ModuleWithLessonCount | null>(null);
  const [lessonDrawerOpen, setLessonDrawerOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [quizDrawerOpen, setQuizDrawerOpen] = useState(false);
  const [editingQuizIndex, setEditingQuizIndex] = useState<number | null>(null);
  const [quizSettingsOpen, setQuizSettingsOpen] = useState(false);
  const createOrUpdateQuiz = useCreateOrUpdateQuiz();
  const deleteQuiz = useDeleteQuiz();

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
    if (!segmentSlug) return;
    updateSegment.mutate({ id: segmentSlug, data: { status: newStatus } });
  }

  function handleReorderModule(currentIndex: number, direction: 'up' | 'down') {
    if (!segmentSlug || !segment || !modules || modules.length < 2) return;
    const newOrder = [...modules];
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;

    // Swap the items
    [newOrder[currentIndex], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[currentIndex]];

    // Submit the new order
    reorderModules.mutate({
      segmentId: segment.id,
      data: { orderedIds: newOrder.map((m) => m.id) },
    });
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
            <h1 className="text-xl font-bold text-navy">{segment.title}</h1>
            {/* Task 10.5: Status badge below heading */}
            <div className="mt-1">
              <StatusBadge variant={segment.status} />
            </div>
            {segment.description && (
              <p className="mt-2 text-body text-muted-600 max-w-2xl">{segment.description}</p>
            )}
            {segment.duration && (
              <div className="mt-2 inline-flex items-center gap-1.5 text-helper text-muted-500">
                <Clock size={14} />
                <span>{segment.duration} days</span>
              </div>
            )}
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
              <>
                <button
                  onClick={() => navigate(`/admin/assign-training?segmentId=${segment.id}`)}
                  className="rounded-lg bg-secondary px-3 py-1.5 text-helper font-medium text-white hover:bg-secondary/90 transition"
                >
                  Assign Users
                </button>
                <button
                  onClick={() => handleStatusChange('archived')}
                  disabled={updateSegment.isPending}
                  className="rounded-lg border border-muted-300 px-3 py-1.5 text-helper font-medium text-muted-700 hover:bg-muted-50 transition disabled:opacity-60"
                >
                  Archive
                </button>
              </>
            )}
            <button
              onClick={() => navigate(`/admin/content/segments/${segment.slug}/edit`)}
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
          <h2 className="text-base font-semibold text-navy">Modules & Lessons</h2>
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
          <>
            <div className="divide-y divide-muted-100">
              {modules.map((mod, index) => (
                <ModuleRow
                  key={mod.id}
                  module={mod}
                  segmentId={segment.id}
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
                    onClick={() => setModulePage(p => Math.max(1, p - 1))}
                    disabled={modulePage <= 1}
                    className="px-3 py-1.5 rounded-lg border border-muted-200 hover:bg-muted-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-helper font-medium text-muted-600"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setModulePage(p => p + 1)}
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
            <p className="mt-3 text-body text-muted-500">No modules yet. Add your first module.</p>
          </div>
        )}
      </div>

      {/* Quiz Section */}
      <div className="mt-6 rounded-xl border border-muted-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-muted-200 px-6 py-4">
          <h2 className="text-base font-semibold text-navy">Quiz Questions</h2>
          <div className="flex items-center gap-2">
            {quiz && (
              <button
                onClick={() => setQuizSettingsOpen(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-muted-300 px-3 py-1.5 text-helper font-medium text-muted-700 hover:bg-muted-50 transition"
              >
                <Settings size={14} />
                <span>Settings</span>
              </button>
            )}
            <button
              onClick={() => {
                setEditingQuizIndex(null);
                setQuizDrawerOpen(true);
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-helper font-medium text-white hover:bg-secondary/90 transition"
            >
              <Plus size={16} />
              <span>Add Question</span>
            </button>
          </div>
        </div>

        {/* Quiz settings summary badge */}
        {quiz && (
          <div className="border-b border-muted-100 px-6 py-2 flex items-center gap-3 bg-muted-50">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${quiz.isRequired ? 'bg-danger-50 text-danger-600' : 'bg-muted-100 text-muted-500'}`}>
              {quiz.isRequired ? 'Required' : 'Optional'}
            </span>
            <span className="text-xs text-muted-500">
              {quiz.maxAttempts !== null ? `${quiz.maxAttempts} attempt${quiz.maxAttempts !== 1 ? 's' : ''} allowed` : 'Unlimited attempts'}
            </span>
          </div>
        )}

        {quiz && quiz.questions.length > 0 ? (
          <div className="divide-y divide-muted-100">
            {quiz.questions
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((question, idx) => (
                <div
                  key={question.id}
                  className="flex items-start justify-between px-6 py-4 hover:bg-muted-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-medium text-navy">
                      Q {idx + 1}: {question.questionText}
                    </p>
                    <p className="text-helper text-muted-500 mt-0.5">
                      {question.questionType === 'single_select' ? 'Single Select' : 'Multi Select'}
                      {' • '}
                      {question.options.length} options
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-3 shrink-0">
                    <button
                      onClick={() => {
                        setEditingQuizIndex(idx);
                        setQuizDrawerOpen(true);
                      }}
                      className="rounded p-1.5 text-muted-400 hover:text-navy hover:bg-muted-100 transition"
                      aria-label={`Edit question ${idx + 1}`}
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => {
                        // Delete this question: rebuild quiz without it
                        const updatedQuestions: QuizQuestionInput[] = quiz.questions
                          .sort((a, b) => a.sortOrder - b.sortOrder)
                          .filter((_, i) => i !== idx)
                          .map((q) => ({
                            question_text: q.questionText,
                            question_type: q.questionType as 'single_select' | 'multi_select',
                            options: q.options.map((o) => ({
                              option_text: o.optionText,
                              is_correct: o.isCorrect,
                            })),
                          }));

                        if (updatedQuestions.length === 0) {
                          // Delete the whole quiz if no questions remain
                          deleteQuiz.mutate(segment?.id ?? '');
                        } else {
                          createOrUpdateQuiz.mutate({ segmentId: segment?.id ?? '', data: { questions: updatedQuestions } });
                        }
                      }}
                      className="rounded p-1.5 text-muted-400 hover:text-danger hover:bg-danger-50 transition"
                      aria-label={`Delete question ${idx + 1}`}
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
              Quiz is optional and does not affect learner progress.
            </p>
          </div>
        )}
      </div>

      {/* Assigned Users & Segment Info - Two Column Layout (Task 10.2 & 10.3) */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/* Left: Assigned Users */}
        <div className="rounded-xl border border-muted-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-muted-200 px-6 py-4">
            <h2 className="text-base font-semibold text-navy">Assigned Users</h2>
            <button
              onClick={() => navigate(`/admin/assign-training?segmentId=${segment?.id ?? ''}`)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-teal px-3 py-1.5 text-helper font-medium text-teal hover:bg-teal-50 transition"
            >
              <Users size={16} />
              <span>Add/Remove User</span>
            </button>
          </div>
          {/* Search bar */}
          <div className="px-6 pt-4 pb-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-400" />
              <input
                type="text"
                placeholder="Search or select a users"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full rounded-lg border border-muted-200 py-2 pl-9 pr-3 text-sm text-navy placeholder:text-muted-400 focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
              />
            </div>
          </div>

          {assignments && assignments.length > 0 ? (
            <>
              <div className="divide-y divide-muted-100">
                {assignments
                  .filter((a) =>
                    !userSearch || a.name.toLowerCase().includes(userSearch.toLowerCase())
                  )
                  .map((assignment) => {
                    // Deterministic pseudo-progress based on userId hash (replace with real progress data when available)
                    const hash = assignment.userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
                    const progress = (hash * 7) % 101;
                    const progressColor = progress >= 70 ? 'bg-success' : 'bg-teal';
                    return (
                      <div key={assignment.id} className="flex items-center justify-between px-6 py-3">
                        <div>
                          <p className="text-sm font-bold text-navy">{assignment.name}</p>
                          <p className="text-helper text-muted-500">{assignment.jobTitle || '—'}</p>
                        </div>
                        <div className="flex items-center gap-3 w-40">
                          <div className="flex-1 h-2 rounded-full bg-muted-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${progressColor}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-muted-600 w-8 text-right">
                            {progress}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Assignment Pagination */}
              {assignmentsData?.pagination && assignmentsData.pagination.totalPages > 1 && (
                <div className="border-t border-muted-200 px-6 py-4 flex items-center justify-between">
                  <p className="text-helper text-muted-500">
                    Page {assignmentsData.pagination.page} of {assignmentsData.pagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAssignmentPage(p => Math.max(1, p - 1))}
                      disabled={assignmentPage <= 1}
                      className="px-3 py-1.5 rounded-lg border border-muted-200 hover:bg-muted-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-helper font-medium text-muted-600"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setAssignmentPage(p => p + 1)}
                      disabled={assignmentPage >= assignmentsData.pagination.totalPages}
                      className="px-3 py-1.5 rounded-lg border border-muted-200 hover:bg-muted-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-helper font-medium text-muted-600"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-6 text-center">
              <Users className="mx-auto h-8 w-8 text-muted-300" />
              <p className="mt-2 text-body text-muted-500">No users assigned yet.</p>
            </div>
          )}
        </div>

        {/* Right: Segment Info Card (Task 10.3) */}
        <div className="rounded-xl border border-muted-200 bg-white shadow-sm p-6 h-fit">
          <h3 className="text-base font-semibold text-navy mb-4">Segment Info</h3>
          <div className="space-y-4">
            <div>
              <p className="text-helper text-muted-500">Created</p>
              <p className="text-sm font-medium text-navy">
                {new Date(segment.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div>
              <p className="text-helper text-muted-500">Users Assigned</p>
              <p className="text-sm font-medium text-navy">{assignmentsData?.pagination?.total ?? assignments.length}</p>
            </div>
            <div>
              <p className="text-helper text-muted-500">Completion Rate</p>
              <p className="text-lg font-bold text-teal">68%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Publish/Unpublish Button (Task 10.4) */}
      <div className="mt-6 flex justify-end">
        {segment.status === 'active' && (
          <button
            onClick={() => handleStatusChange('draft')}
            disabled={updateSegment.isPending}
            className="rounded-lg bg-coral px-5 py-2.5 text-sm font-medium text-white hover:bg-coral/90 transition disabled:opacity-60"
          >
            {updateSegment.isPending ? 'Updating...' : 'Unpublish'}
          </button>
        )}
        {segment.status === 'draft' && (
          <button
            onClick={() => handleStatusChange('active')}
            disabled={updateSegment.isPending}
            className="rounded-lg bg-navy px-5 py-2.5 text-sm font-medium text-white hover:bg-navy/90 transition disabled:opacity-60"
          >
            {updateSegment.isPending ? 'Publishing...' : 'Publish'}
          </button>
        )}
      </div>

      {/* Drawers */}
      <ModuleDrawer
        open={moduleDrawerOpen}
        onClose={() => {
          setModuleDrawerOpen(false);
          setEditingModule(null);
        }}
        segmentId={segment.id}
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

      <QuizDrawer
        open={quizDrawerOpen}
        onClose={() => {
          setQuizDrawerOpen(false);
          setEditingQuizIndex(null);
        }}
        onSave={(question) => {
          // Build the full quiz questions array
          const existingQuestions: QuizQuestionInput[] = quiz?.questions
            ?.sort((a, b) => a.sortOrder - b.sortOrder)
            ?.map((q) => ({
              question_text: q.questionText,
              question_type: q.questionType as 'single_select' | 'multi_select',
              options: q.options.map((o) => ({
                option_text: o.optionText,
                is_correct: o.isCorrect,
              })),
            })) ?? [];

          let allQuestions: QuizQuestionInput[];
          if (editingQuizIndex !== null) {
            // Replace the edited question
            allQuestions = existingQuestions.map((q, i) => (i === editingQuizIndex ? question : q));
          } else {
            // Add new question
            allQuestions = [...existingQuestions, question];
          }

          createOrUpdateQuiz.mutate(
            { segmentId: segment?.id ?? '', data: { questions: allQuestions } },
            {
              onSuccess: () => {
                setQuizDrawerOpen(false);
                setEditingQuizIndex(null);
              },
            }
          );
        }}
        editingQuestion={
          editingQuizIndex !== null && quiz?.questions
            ? (() => {
                const sorted = [...quiz.questions].sort((a, b) => a.sortOrder - b.sortOrder);
                const q = sorted[editingQuizIndex];
                if (!q) return null;
                return {
                  question_text: q.questionText,
                  question_type: q.questionType as 'single_select' | 'multi_select',
                  options: q.options.map((o) => ({
                    option_text: o.optionText,
                    is_correct: o.isCorrect,
                  })),
                };
              })()
            : null
        }
      />

      {/* Quiz Settings Modal */}
      {quizSettingsOpen && quiz && (
        <QuizSettingsModal
          isRequired={quiz.isRequired ?? false}
          maxAttempts={quiz.maxAttempts}
          onClose={() => setQuizSettingsOpen(false)}
          onSave={(settings) => {
            const existingQuestions: QuizQuestionInput[] = quiz.questions
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((q) => ({
                question_text: q.questionText,
                question_type: q.questionType as 'single_select' | 'multi_select',
                options: q.options.map((o) => ({
                  option_text: o.optionText,
                  is_correct: o.isCorrect,
                })),
              }));
            createOrUpdateQuiz.mutate(
              {
                segmentId: segment?.id ?? '',
                data: {
                  questions: existingQuestions,
                  is_required: settings.isRequired,
                  max_attempts: settings.maxAttempts,
                },
              },
              { onSuccess: () => setQuizSettingsOpen(false) }
            );
          }}
          isSaving={createOrUpdateQuiz.isPending}
        />
      )}

      {/* Delete Module Confirmation */}
      <ConfirmationDialog
        open={!!deleteModuleTarget}
        onClose={() => setDeleteModuleTarget(null)}
        onConfirm={() => {
          if (deleteModuleTarget) {
            deleteModule.mutate(
              { id: deleteModuleTarget.id, segmentId: segment.id },
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
      {/* Add Lesson button at the top */}
      <div className="ml-7 mb-3">
        <button
          onClick={onAddLesson}
          className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-helper font-medium text-white hover:bg-secondary/90 transition"
        >
          <Plus size={16} />
          <span>Add Lesson</span>
        </button>
      </div>

      {/* Lesson list area */}
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
              onClick={() => setLessonPage(p => Math.max(1, p - 1))}
              disabled={lessonPage <= 1}
              className="px-2 py-1 rounded text-xs border border-muted-200 hover:bg-muted-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-muted-600"
            >
              Previous
            </button>
            <button
              onClick={() => setLessonPage(p => p + 1)}
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

// --- Quiz Settings Modal ---

function QuizSettingsModal({
  isRequired,
  maxAttempts,
  onClose,
  onSave,
  isSaving,
}: {
  isRequired: boolean;
  maxAttempts: number | null;
  onClose: () => void;
  onSave: (settings: { isRequired: boolean; maxAttempts: number | null }) => void;
  isSaving: boolean;
}) {
  const [localRequired, setLocalRequired] = useState(isRequired);
  const [localMaxAttempts, setLocalMaxAttempts] = useState<string>(
    maxAttempts !== null ? String(maxAttempts) : 'unlimited'
  );

  function handleSave() {
    const max = localMaxAttempts === 'unlimited' ? null : parseInt(localMaxAttempts, 10);
    onSave({ isRequired: localRequired, maxAttempts: max });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-navy mb-5">Quiz Settings</h3>

        <div className="space-y-5">
          {/* Required toggle */}
          <div>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium text-navy">Required Quiz</p>
                <p className="text-xs text-muted-500 mt-0.5">
                  When enabled, learners must complete the quiz
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={localRequired}
                onClick={() => setLocalRequired(!localRequired)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  localRequired ? 'bg-teal' : 'bg-muted-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    localRequired ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
          </div>

          {/* Max Attempts */}
          <div>
            <label className="block text-sm font-medium text-navy mb-1.5">
              Maximum Attempts
            </label>
            <p className="text-xs text-muted-500 mb-2">
              How many times a learner can attempt this quiz
            </p>
            <select
              value={localMaxAttempts}
              onChange={(e) => setLocalMaxAttempts(e.target.value)}
              className="w-full rounded-lg border border-muted-300 px-3 py-2.5 text-sm text-navy focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="unlimited">Unlimited</option>
              <option value="1">1 attempt</option>
              <option value="2">2 attempts</option>
              <option value="3">3 attempts</option>
              <option value="5">5 attempts</option>
              <option value="10">10 attempts</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-muted-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg border border-muted-300 px-4 py-2 text-sm font-medium text-muted-700 hover:bg-muted-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white hover:bg-secondary/90 transition disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
