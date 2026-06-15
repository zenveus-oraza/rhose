import { useState, useEffect } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { useCreateModule, useUpdateModule } from '@/hooks/useAdminApi';
import type { ModuleWithLessonCount } from '@/types/admin';

interface ModuleDrawerProps {
  open: boolean;
  onClose: () => void;
  segmentId: string;
  module?: ModuleWithLessonCount | null;
}

export function ModuleDrawer({ open, onClose, segmentId, module }: ModuleDrawerProps) {
  const isEditing = !!module;
  const createModule = useCreateModule();
  const updateModule = useUpdateModule();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ title?: string }>({});

  useEffect(() => {
    if (module) {
      setTitle(module.title);
      setDescription(module.description || '');
    } else {
      setTitle('');
      setDescription('');
    }
    setFieldErrors({});
  }, [module, open]);

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
    if (!validate()) return;

    const data = {
      title: title.trim(),
      description: description.trim() || undefined,
    };

    if (isEditing && module) {
      updateModule.mutate(
        { id: module.id, data },
        { onSuccess: () => onClose() }
      );
    } else {
      createModule.mutate(
        { segmentId, data },
        { onSuccess: () => onClose() }
      );
    }
  }

  const isPending = createModule.isPending || updateModule.isPending;
  const error = createModule.error || updateModule.error;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Module' : 'Add Module'}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <ErrorMessage message={error.message || 'An error occurred'} />
        )}

        <div>
          <label htmlFor="module-title" className="block text-helper font-medium text-navy mb-1.5">
            Title <span className="text-danger">*</span>
          </label>
          <input
            id="module-title"
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
            placeholder="Enter module title"
          />
          {fieldErrors.title && (
            <p className="mt-1 text-helper text-danger-600">{fieldErrors.title}</p>
          )}
        </div>

        <div>
          <label htmlFor="module-description" className="block text-helper font-medium text-navy mb-1.5">
            Description
          </label>
          <textarea
            id="module-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-muted-300 px-4 py-2.5 text-body text-navy placeholder:text-muted-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition resize-none"
            placeholder="Enter a description (optional)"
          />
        </div>

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
            className="rounded-lg bg-secondary px-4 py-2 text-helper font-medium text-white hover:bg-secondary/90 transition disabled:opacity-60"
          >
            {isPending ? 'Saving...' : isEditing ? 'Update Module' : 'Add Module'}
          </button>
        </div>
      </form>
    </Drawer>
  );
}
