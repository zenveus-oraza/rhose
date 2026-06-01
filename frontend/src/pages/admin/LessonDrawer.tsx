import { useState, useEffect } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { useCreateLesson, useUpdateLesson } from '@/hooks/useAdminApi';
import type { Lesson, LessonContentType } from '@/types/admin';

interface LessonDrawerProps {
  open: boolean;
  onClose: () => void;
  moduleId: string;
  lesson?: Lesson | null;
}

interface LessonFormData {
  title: string;
  contentType: LessonContentType;
  contentBody: string;
  videoUrl: string;
}

interface LessonFieldErrors {
  title?: string;
  contentBody?: string;
  videoUrl?: string;
}

export function LessonDrawer({ open, onClose, moduleId, lesson }: LessonDrawerProps) {
  const isEditing = !!lesson;
  const createLesson = useCreateLesson();
  const updateLesson = useUpdateLesson();

  const [formData, setFormData] = useState<LessonFormData>({
    title: '',
    contentType: 'text',
    contentBody: '',
    videoUrl: '',
  });
  const [fieldErrors, setFieldErrors] = useState<LessonFieldErrors>({});

  useEffect(() => {
    if (lesson) {
      setFormData({
        title: lesson.title,
        contentType: lesson.contentType,
        contentBody: lesson.contentBody || '',
        videoUrl: lesson.videoUrl || '',
      });
    } else {
      setFormData({ title: '', contentType: 'text', contentBody: '', videoUrl: '' });
    }
    setFieldErrors({});
  }, [lesson, open]);

  function validate(): boolean {
    const errors: LessonFieldErrors = {};

    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    }

    if (formData.contentType === 'text' && !formData.contentBody.trim()) {
      errors.contentBody = 'Content body is required for text lessons';
    }

    if (formData.contentType === 'video') {
      if (!formData.videoUrl.trim()) {
        errors.videoUrl = 'Video URL is required for video lessons';
      } else {
        try {
          new URL(formData.videoUrl.trim());
        } catch {
          errors.videoUrl = 'Please enter a valid URL';
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const data = {
      title: formData.title.trim(),
      content_type: formData.contentType,
      ...(formData.contentType === 'text'
        ? { content_body: formData.contentBody.trim() }
        : { video_url: formData.videoUrl.trim() }),
    };

    if (isEditing && lesson) {
      updateLesson.mutate(
        { id: lesson.id, data },
        { onSuccess: () => onClose() }
      );
    } else {
      createLesson.mutate(
        { moduleId, data },
        { onSuccess: () => onClose() }
      );
    }
  }

  const isPending = createLesson.isPending || updateLesson.isPending;
  const error = createLesson.error || updateLesson.error;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Lesson' : 'Add Lesson'}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <ErrorMessage message={error.message || 'An error occurred'} />
        )}

        {/* Title */}
        <div>
          <label htmlFor="lesson-title" className="block text-helper font-medium text-navy mb-1.5">
            Title <span className="text-danger">*</span>
          </label>
          <input
            id="lesson-title"
            type="text"
            value={formData.title}
            onChange={(e) => {
              setFormData({ ...formData, title: e.target.value });
              if (fieldErrors.title) setFieldErrors((prev) => ({ ...prev, title: undefined }));
            }}
            aria-invalid={!!fieldErrors.title}
            className={`w-full rounded-lg border px-4 py-2.5 text-body text-navy placeholder:text-muted-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition ${
              fieldErrors.title ? 'border-danger-400' : 'border-muted-300'
            }`}
            placeholder="Enter lesson title"
          />
          {fieldErrors.title && (
            <p className="mt-1 text-helper text-danger-600">{fieldErrors.title}</p>
          )}
        </div>

        {/* Content Type */}
        <div>
          <label className="block text-helper font-medium text-navy mb-1.5">
            Content Type <span className="text-danger">*</span>
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="contentType"
                value="text"
                checked={formData.contentType === 'text'}
                onChange={() => setFormData({ ...formData, contentType: 'text' })}
                className="h-4 w-4 text-teal accent-teal"
              />
              <span className="text-body text-navy">Text</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="contentType"
                value="video"
                checked={formData.contentType === 'video'}
                onChange={() => setFormData({ ...formData, contentType: 'video' })}
                className="h-4 w-4 text-teal accent-teal"
              />
              <span className="text-body text-navy">Video</span>
            </label>
          </div>
        </div>

        {/* Conditional Content Fields */}
        {formData.contentType === 'text' && (
          <div>
            <label htmlFor="lesson-content" className="block text-helper font-medium text-navy mb-1.5">
              Content Body <span className="text-danger">*</span>
            </label>
            <textarea
              id="lesson-content"
              value={formData.contentBody}
              onChange={(e) => {
                setFormData({ ...formData, contentBody: e.target.value });
                if (fieldErrors.contentBody) setFieldErrors((prev) => ({ ...prev, contentBody: undefined }));
              }}
              rows={6}
              aria-invalid={!!fieldErrors.contentBody}
              className={`w-full rounded-lg border px-4 py-2.5 text-body text-navy placeholder:text-muted-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition resize-none ${
                fieldErrors.contentBody ? 'border-danger-400' : 'border-muted-300'
              }`}
              placeholder="Enter the lesson content"
            />
            {fieldErrors.contentBody && (
              <p className="mt-1 text-helper text-danger-600">{fieldErrors.contentBody}</p>
            )}
          </div>
        )}

        {formData.contentType === 'video' && (
          <div>
            <label htmlFor="lesson-video-url" className="block text-helper font-medium text-navy mb-1.5">
              Video URL <span className="text-danger">*</span>
            </label>
            <input
              id="lesson-video-url"
              type="url"
              value={formData.videoUrl}
              onChange={(e) => {
                setFormData({ ...formData, videoUrl: e.target.value });
                if (fieldErrors.videoUrl) setFieldErrors((prev) => ({ ...prev, videoUrl: undefined }));
              }}
              aria-invalid={!!fieldErrors.videoUrl}
              className={`w-full rounded-lg border px-4 py-2.5 text-body text-navy placeholder:text-muted-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition ${
                fieldErrors.videoUrl ? 'border-danger-400' : 'border-muted-300'
              }`}
              placeholder="https://example.com/video"
            />
            {fieldErrors.videoUrl && (
              <p className="mt-1 text-helper text-danger-600">{fieldErrors.videoUrl}</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-muted-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg border border-muted-300 px-4 py-2 text-helper font-medium text-muted-700 hover:bg-muted-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-navy px-4 py-2 text-helper font-medium text-white hover:bg-navy-600 transition disabled:opacity-60"
          >
            {isPending ? 'Saving...' : isEditing ? 'Update Lesson' : 'Add Lesson'}
          </button>
        </div>
      </form>
    </Drawer>
  );
}
