import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorMessageProps {
  message: string;
  className?: string;
  onRetry?: () => void;
}

export function ErrorMessage({ message, className, onRetry }: ErrorMessageProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3',
        className
      )}
      role="alert"
    >
      <AlertTriangle size={18} className="shrink-0 text-danger-500" />
      <p className="flex-1 text-helper text-danger-700">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-helper font-medium text-danger-600 hover:text-danger-700 underline"
        >
          Retry
        </button>
      )}
    </div>
  );
}
