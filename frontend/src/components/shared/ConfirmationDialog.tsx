import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  isLoading?: boolean;
  variant?: 'danger' | 'warning';
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  isLoading = false,
  variant = 'danger',
}: ConfirmationDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-lg">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                variant === 'danger' ? 'bg-danger-50' : 'bg-warning-50'
              }`}
            >
              <AlertTriangle
                size={20}
                className={variant === 'danger' ? 'text-danger-500' : 'text-warning-500'}
              />
            </div>
            <div className="flex-1">
              <Dialog.Title className="text-heading-card text-navy">
                {title}
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-body text-muted-600">
                {description}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                className="rounded p-1 text-muted-400 hover:text-muted-600"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Dialog.Close asChild>
              <button
                className="rounded-xl border border-muted-200 px-4 py-2.5 text-body font-medium text-muted-700 hover:bg-muted-50 transition-colors"
                disabled={isLoading}
              >
                {cancelLabel}
              </button>
            </Dialog.Close>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`rounded-xl px-4 py-2.5 text-body font-medium text-white transition-colors disabled:opacity-50 ${
                variant === 'danger'
                  ? 'bg-danger-500 hover:bg-danger-600'
                  : 'bg-warning-500 hover:bg-warning-600'
              }`}
            >
              {isLoading ? 'Processing...' : confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
