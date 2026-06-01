import { cn } from '@/lib/utils';

type BadgeVariant = 'active' | 'deactivated' | 'draft' | 'archived' | 'in-progress' | 'completed' | 'not-started' | 'default';

const variantStyles: Record<BadgeVariant, string> = {
  active: 'bg-success-50 text-success-700 border-success-200',
  completed: 'bg-success-50 text-success-700 border-success-200',
  'in-progress': 'bg-teal-50 text-teal-700 border-teal-200',
  draft: 'bg-warning-50 text-warning-700 border-warning-200',
  'not-started': 'bg-muted-100 text-muted-600 border-muted-200',
  archived: 'bg-muted-100 text-muted-600 border-muted-300',
  deactivated: 'bg-danger-50 text-danger-700 border-danger-200',
  default: 'bg-muted-100 text-muted-600 border-muted-200',
};

function getVariant(status: string): BadgeVariant {
  const normalized = status.toLowerCase().replace(/[_\s]/g, '-');
  if (normalized in variantStyles) return normalized as BadgeVariant;
  return 'default';
}

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant = getVariant(status);
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize',
        variantStyles[variant],
        className
      )}
    >
      {status.replace(/[_-]/g, ' ')}
    </span>
  );
}
