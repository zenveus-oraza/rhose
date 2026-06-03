import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  isLoading?: boolean;
}

export function ConfirmationDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  isLoading = false,
}: ConfirmationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <dialog
        ref={dialogRef}
        className="relative z-50 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border-0"
        onClose={onClose}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded p-1 text-muted-400 hover:text-muted-600 transition"
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>

        <h2 className="text-heading-card text-navy mb-2">{title}</h2>
        <p className="text-body text-muted-600 mb-6">{description}</p>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg border border-muted-300 px-4 py-2 text-helper font-medium text-muted-700 hover:bg-muted-50 transition disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`rounded-lg px-4 py-2 text-helper font-medium text-white transition disabled:opacity-60 disabled:cursor-not-allowed ${
              variant === 'danger'
                ? 'bg-danger hover:bg-danger-600'
                : 'bg-primary hover:bg-secondary/90'
            }`}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </dialog>
    </div>
  );
}
