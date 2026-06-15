import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { MoreVertical } from 'lucide-react';
import type { ReactNode } from 'react';

export interface ActionMenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
}

export function ActionMenu({ items }: ActionMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="rounded-lg p-2 text-muted-400 hover:bg-muted-100 hover:text-muted-700 transition-colors"
          aria-label="Actions"
        >
          <MoreVertical size={18} />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 min-w-[180px] rounded-xl border border-muted-200 bg-white p-1.5 shadow-lg"
          align="end"
          sideOffset={4}
        >
          {items.map((item) => (
            <DropdownMenu.Item
              key={item.label}
              onClick={item.onClick}
              disabled={item.disabled}
              className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-helper outline-none transition-colors ${
                item.variant === 'danger'
                  ? 'text-danger-500 hover:bg-danger-50 focus:bg-danger-50'
                  : 'text-muted-700 hover:bg-muted-50 focus:bg-muted-50'
              } ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {item.icon && <span className="shrink-0">{item.icon}</span>}
              <span>{item.label}</span>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
