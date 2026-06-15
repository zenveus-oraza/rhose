import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchableDropdownProps<T extends { id: string }> {
  items: T[];
  value: T | null;
  onChange: (item: T) => void;
  renderLabel: (item: T) => string;
  placeholder?: string;
  isLoading?: boolean;
  onSearch?: (query: string) => void;
  className?: string;
  disabled?: boolean;
}

export function SearchableDropdown<T extends { id: string }>({
  items,
  value,
  onChange,
  renderLabel,
  placeholder = 'Search...',
  isLoading = false,
  onSearch,
  className = '',
  disabled = false,
}: SearchableDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Filter items based on search
  const filtered = search
    ? items.filter(item =>
        renderLabel(item).toLowerCase().includes(search.toLowerCase())
      )
    : items;

  // Reset highlighted index when filtered items change or dropdown opens/closes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [search, open]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[role="option"]');
      const highlighted = items[highlightedIndex] as HTMLElement | undefined;
      highlighted?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus search input when opening
      setTimeout(() => inputRef.current?.focus(), 0);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [open]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
      } else {
        setHighlightedIndex(prev =>
          prev >= filtered.length - 1 ? 0 : prev + 1
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (open) {
        setHighlightedIndex(prev =>
          prev <= 0 ? filtered.length - 1 : prev - 1
        );
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && highlightedIndex >= 0 && highlightedIndex < filtered.length) {
        onChange(filtered[highlightedIndex]);
        setOpen(false);
        setSearch('');
      }
    }
  };

  const activeDescendantId =
    open && highlightedIndex >= 0 && highlightedIndex < filtered.length
      ? `searchable-dropdown-option-${filtered[highlightedIndex].id}`
      : undefined;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        onKeyDown={handleKeyDown}
        className="w-full flex items-center justify-between rounded-xl border border-muted-200 bg-white px-4 py-2.5 text-body text-left text-muted-800 hover:border-muted-300 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-activedescendant={activeDescendantId}
      >
        <span className={value ? 'text-navy' : 'text-muted-400'}>
          {value ? renderLabel(value) : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={cn(
            'shrink-0 transition-transform',
            open ? 'rotate-180' : ''
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-muted-200 rounded-xl shadow-lg z-50">
          {/* Search Input */}
          <div className="p-2 border-b border-muted-200">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-400 pointer-events-none"
              />
              <input
                ref={inputRef}
                type="text"
                placeholder={placeholder}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  onSearch?.(e.target.value);
                }}
                onKeyDown={handleKeyDown}
                className="w-full pl-9 pr-4 py-2 border border-muted-200 rounded-lg text-body focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                aria-activedescendant={activeDescendantId}
                aria-controls="searchable-dropdown-listbox"
                role="combobox"
                aria-expanded={open}
                aria-autocomplete="list"
              />
            </div>
          </div>

          {/* Items List */}
          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 flex items-center justify-center text-helper text-muted-500">
                <Loader2 size={16} className="animate-spin mr-2" />
                Loading...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-center text-helper text-muted-500">
                No items found
              </div>
            ) : (
              <ul
                ref={listRef}
                className="divide-y divide-muted-100"
                role="listbox"
                id="searchable-dropdown-listbox"
              >
                {filtered.map((item, index) => (
                  <li key={item.id}>
                    <button
                      id={`searchable-dropdown-option-${item.id}`}
                      onClick={() => {
                        onChange(item);
                        setOpen(false);
                        setSearch('');
                      }}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={cn(
                        'w-full px-4 py-2.5 text-left text-body text-muted-800 transition-colors focus:outline-none',
                        index === highlightedIndex
                          ? 'bg-teal-50'
                          : 'hover:bg-muted-50'
                      )}
                      role="option"
                      aria-selected={value?.id === item.id}
                    >
                      {renderLabel(item)}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
