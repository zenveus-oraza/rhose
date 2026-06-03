import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useSegment, useUpdateSegment } from '@/hooks/useAdminApi';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { SuccessModal } from '@/components/ui/SuccessModal';
import type { SegmentStatus } from '@/types/admin';

export function SegmentEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: segment, isLoading, error } = useSegment(id!);
  const updateSegment = useUpdateSegment();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<SegmentStatus>('draft');
  const [fieldErrors, setFieldErrors] = useState<{ title?: string }>({});
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (segment) {
      setTitle(segment.title);
      setDescription(segment.description || '');
      setStatus(segment.status);
    }
  }, [segment]);

  function validate(): boolean {
    const errors: { title?: string } = {};
    if (!title.trim()) {
      errors.title = 'Title is required';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !id) return;

    updateSegment.mutate(
      {
        id,
        data: {
          title: title.trim(),
          description: description.trim() || undefined,
          status,
        },
      },
      { onSuccess: () => setShowSuccess(true) }
    );
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

  const statusOptions: { value: SegmentStatus; label: string; disabled: boolean }[] = [
    { value: 'draft', label: 'Draft', disabled: segment.status === 'archived' },
    { value: 'active', label: 'Active', disabled: segment.status === 'archived' },
    { value: 'archived', label: 'Archived', disabled: false },
  ];

  return (
    <div className="py-4 lg:px-8">
      <div className="mb-5">
        <button
          onClick={() => navigate(`/admin/content/segments/${id}`)}
          className="mb-4 inline-flex items-center gap-1 text-helper text-muted-500 hover:text-navy transition"
        >
          <ArrowLeft size={16} />
          <span>Back to Segment</span>
        </button>

        <h1 className="text-heading-page text-navy">Edit Segment</h1>
      </div>
      <div className="border-b border-muted-200 mb-6" />

      <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
        {updateSegment.error && (
          <ErrorMessage message={updateSegment.error.message || 'Failed to update segment'} />
        )}

        <div>
          <label htmlFor="edit-title" className="block text-helper font-medium text-navy mb-1.5">
            Title <span className="text-danger">*</span>
          </label>
          <input
            id="edit-title"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (fieldErrors.title) setFieldErrors({});
            }}
            aria-invalid={!!fieldErrors.title}
            className={`w-full rounded-lg border px-4 py-2.5 text-body text-navy placeholder:text-muted-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition ${
              fieldErrors.title ? 'border-danger-400' : 'border-muted-300'
            }`}
          />
          {fieldErrors.title && (
            <p className="mt-1 text-helper text-danger-600">{fieldErrors.title}</p>
          )}
        </div>

        <div>
          <label htmlFor="edit-description" className="block text-helper font-medium text-navy mb-1.5">
            Description
          </label>
          <textarea
            id="edit-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-muted-300 px-4 py-2.5 text-body text-navy placeholder:text-muted-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition resize-none"
          />
        </div>

        <div>
          <label htmlFor="edit-status" className="block text-helper font-medium text-navy mb-1.5">
            Status
          </label>
          <select
            id="edit-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as SegmentStatus)}
            className="w-full rounded-lg border border-muted-300 px-4 py-2.5 text-body text-navy focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          {segment.status === 'archived' && (
            <p className="mt-1 text-helper text-muted-500">
              Archived segments cannot change status.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate(`/admin/content/segments/${id}`)}
            className="rounded-lg border border-muted-300 px-4 py-2 text-helper font-medium text-muted-700 hover:bg-muted-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={updateSegment.isPending}
            className="rounded-lg bg-secondary px-4 py-2 text-helper font-medium text-white hover:bg-secondary/90 transition disabled:opacity-60"
          >
            {updateSegment.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      <SuccessModal
        open={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          navigate(`/admin/content/segments/${id}`);
        }}
        title="Segment Updated"
        description="Your changes have been saved successfully."
        actionLabel="View Segment"
        onAction={() => {
          setShowSuccess(false);
          navigate(`/admin/content/segments/${id}`);
        }}
      />
    </div>
  );
}
