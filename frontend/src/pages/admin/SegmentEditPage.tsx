import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useSegment, useUpdateSegment } from '@/hooks/useAdminApi';
import { useToast } from '@/components/ui/Toast';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import type { SegmentStatus } from '@/types/admin';

interface SegmentFormErrors {
  title?: string;
  duration?: string;
}

export function SegmentEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: segment, isLoading, error } = useSegment(id!);
  const updateSegment = useUpdateSegment();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('');
  const [status, setStatus] = useState<SegmentStatus>('draft');
  const [fieldErrors, setFieldErrors] = useState<SegmentFormErrors>({});

  useEffect(() => {
    if (segment) {
      setTitle(segment.title);
      setDescription(segment.description || '');
      setDuration(segment.duration != null ? String(segment.duration) : '');
      setStatus(segment.status);
    }
  }, [segment]);

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !id) return;

    updateSegment.mutate(
      {
        id,
        data: {
          title: title.trim(),
          description: description.trim() || undefined,
          duration: Number(duration),
          status,
        },
      },
      {
        onSuccess: () => {
          toast('success', 'Segment updated successfully');
          navigate(`/admin/content/segments/${id}`);
        },
      }
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

        {/* Title */}
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
              if (fieldErrors.title) setFieldErrors((prev) => ({ ...prev, title: undefined }));
            }}
            aria-invalid={!!fieldErrors.title}
            aria-describedby={fieldErrors.title ? 'edit-title-error' : undefined}
            className={`w-full rounded-lg border px-4 py-2.5 text-body text-navy placeholder:text-muted-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition ${
              fieldErrors.title ? 'border-danger-400' : 'border-muted-300'
            }`}
          />
          {fieldErrors.title && (
            <p id="edit-title-error" className="mt-1 text-helper text-danger-600">
              {fieldErrors.title}
            </p>
          )}
        </div>

        {/* Description */}
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
            placeholder="Enter a description for this segment (optional)"
          />
        </div>

        {/* Duration */}
        <div>
          <label htmlFor="edit-duration" className="block text-helper font-medium text-navy mb-1.5">
            Duration (days) <span className="text-danger">*</span>
          </label>
          <input
            id="edit-duration"
            type="number"
            min="1"
            step="1"
            value={duration}
            onChange={(e) => {
              setDuration(e.target.value);
              if (fieldErrors.duration) setFieldErrors((prev) => ({ ...prev, duration: undefined }));
            }}
            aria-invalid={!!fieldErrors.duration}
            aria-describedby={fieldErrors.duration ? 'edit-duration-error' : undefined}
            className={`w-full rounded-lg border px-4 py-2.5 text-body text-navy placeholder:text-muted-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition ${
              fieldErrors.duration ? 'border-danger-400' : 'border-muted-300'
            }`}
            placeholder="e.g. 30"
          />
          {fieldErrors.duration && (
            <p id="edit-duration-error" className="mt-1 text-helper text-danger-600">
              {fieldErrors.duration}
            </p>
          )}
        </div>

        {/* Status */}
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

        {/* Actions */}
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
    </div>
  );
}
