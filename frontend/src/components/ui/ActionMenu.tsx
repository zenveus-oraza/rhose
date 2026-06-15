import { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ActionMenuItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  className?: string;
}

export function ActionMenu({ items, className }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={menuRef} className={cn('relative', className)}>
      <button
        onClick={() => setOpen(!open)}
        className="rounded-lg p-1.5 text-muted-500 hover:bg-muted-100 hover:text-muted-700 transition"
        aria-label="Actions"
        aria-expanded={open}
      >
        <MoreVertical size={18} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-[180px] rounded-xl border border-muted-200 bg-white py-1 shadow-lg">
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
              disabled={item.disabled}
              className={cn(
                'flex w-full items-center gap-2 px-4 py-2.5 text-helper transition',
                item.variant === 'danger'
                  ? 'text-danger-600 hover:bg-danger-50'
                  : 'text-muted-700 hover:bg-muted-50',
                item.disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
