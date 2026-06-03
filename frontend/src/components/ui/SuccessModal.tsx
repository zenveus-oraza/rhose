import { CheckCircle, X } from 'lucide-react';

interface SuccessModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SuccessModal({
  open,
  onClose,
  title,
  description,
  actionLabel = 'Continue',
  onAction,
}: SuccessModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 w-full max-w-md rounded-2xl bg-white p-8 shadow-xl text-center">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded p-1 text-muted-400 hover:text-muted-600 transition"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-50">
          <CheckCircle className="h-10 w-10 text-success" />
        </div>

        <h2 className="text-heading-card text-navy mb-2">{title}</h2>
        {description && (
          <p className="text-body text-muted-600 mb-6">{description}</p>
        )}

        <button
          onClick={onAction ?? onClose}
          className="rounded-lg bg-secondary px-6 py-2.5 text-body font-medium text-white hover:bg-secondary/90 transition"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
