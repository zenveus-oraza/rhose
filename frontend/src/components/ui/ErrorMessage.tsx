import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorMessageProps {
  message: string;
  className?: string;
  onRetry?: () => void;
}

export function ErrorMessage({ message, className, onRetry }: ErrorMessageProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3',
        className
      )}
    >
      <AlertCircle className="h-5 w-5 shrink-0 text-danger-500 mt-0.5" />
      <div className="flex-1">
        <p className="text-helper text-danger-700">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 text-helper font-medium text-danger-600 hover:text-danger-700 underline transition"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
