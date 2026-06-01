import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Drawer({ open, onClose, title, children, className }: DrawerProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div
        className={cn(
          'relative z-50 flex h-full w-full max-w-lg flex-col bg-white shadow-xl',
          'animate-in slide-in-from-right duration-200',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-muted-200 px-6 py-4">
          <h2 className="text-heading-card text-navy">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-400 hover:bg-muted-100 hover:text-muted-600 transition"
            aria-label="Close drawer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}
