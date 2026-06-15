import * as Dialog from '@radix-ui/react-dialog';
import { CheckCircle } from 'lucide-react';

interface SuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export function SuccessModal({
  open,
  onOpenChange,
  title,
  description,
  actionLabel = 'Done',
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: SuccessModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[550px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-8 shadow-lg text-center">
          <div className="flex flex-col items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-50">
              <CheckCircle size={32} className="text-success-500" />
            </div>
            <Dialog.Title className="mt-4 text-heading-section text-navy">
              {title}
            </Dialog.Title>
            {description && (
              <Dialog.Description className="mt-2 text-body text-muted-600">
                {description}
              </Dialog.Description>
            )}
            <div className="mt-6 flex flex-col gap-3 w-full max-w-xs">
              <button
                onClick={onAction ?? (() => onOpenChange(false))}
                className="w-full rounded-xl bg-secondary px-6 py-3 text-body font-medium text-white hover:bg-secondary/90 transition-colors"
              >
                {actionLabel}
              </button>
              {secondaryActionLabel && (
                <button
                  onClick={onSecondaryAction ?? (() => onOpenChange(false))}
                  className="w-full rounded-xl border border-muted-200 px-6 py-3 text-body font-medium text-muted-700 hover:bg-muted-50 transition-colors"
                >
                  {secondaryActionLabel}
                </button>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
