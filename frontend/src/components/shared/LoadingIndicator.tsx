import { cn } from '@/lib/utils';

interface LoadingIndicatorProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-3',
};

export function LoadingIndicator({ className, size = 'md', label }: LoadingIndicatorProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-muted-200 border-t-teal',
          sizeClasses[size]
        )}
        role="status"
        aria-label={label ?? 'Loading'}
      />
      {label && <p className="text-helper text-muted-500">{label}</p>}
    </div>
  );
}
