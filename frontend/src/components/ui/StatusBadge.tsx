import { cn } from '@/lib/utils';

export type BadgeVariant = 'draft' | 'active' | 'archived' | 'deactivated' | 'text' | 'video';

const variantStyles: Record<BadgeVariant, string> = {
  draft: 'bg-warning-50 text-warning-700 border-warning-200',
  active: 'bg-success-50 text-success-700 border-success-200',
  archived: 'bg-muted-100 text-muted-600 border-muted-200',
  deactivated: 'bg-danger-50 text-danger-700 border-danger-200',
  text: 'bg-teal-50 text-primary border-teal-200',
  video: 'bg-navy-50 text-navy-600 border-navy-200',
};

interface StatusBadgeProps {
  variant: BadgeVariant;
  label?: string;
  className?: string;
}

export function StatusBadge({ variant, label, className }: StatusBadgeProps) {
  const displayLabel = label ?? variant.charAt(0).toUpperCase() + variant.slice(1);

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize',
        variantStyles[variant],
        className
      )}
    >
      {displayLabel}
    </span>
  );
}
