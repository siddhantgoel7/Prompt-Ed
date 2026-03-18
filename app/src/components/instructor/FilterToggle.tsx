'use client';

import { Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FilterToggleVariant = 'compact' | 'full';

export interface FilterToggleProps {
  variant: FilterToggleVariant;
  selectedCount: number;
  showHighlightedOnly: boolean;
  onToggle: () => void;
  onShowAll: () => void;
}

const variantStyles = {
  compact: {
    wrapper: 'gap-2',
    button: 'gap-1.5 px-3 py-1.5 text-xs',
    icon: 'w-3 h-3',
    showAll: 'text-xs',
  },
  full: {
    wrapper: 'gap-3',
    button: 'gap-2 px-4 py-2 text-sm',
    icon: 'w-3.5 h-3.5',
    showAll: 'text-sm',
  },
} as const;

export function FilterToggle({
  variant,
  selectedCount,
  showHighlightedOnly,
  onToggle,
  onShowAll,
}: FilterToggleProps) {
  const s = variantStyles[variant];

  return (
    <div className={cn('flex items-center', s.wrapper)}>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'inline-flex items-center font-semibold rounded-full border transition-colors',
          showHighlightedOnly
            ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100',
          s.button,
        )}
      >
        <Filter className={s.icon} />
        {showHighlightedOnly
          ? `Showing ${selectedCount} highlighted`
          : `Show highlighted only (${selectedCount})`}
      </button>
      {showHighlightedOnly && (
        <button
          type="button"
          onClick={onShowAll}
          className={cn('text-gray-400 hover:text-gray-600 transition-colors', s.showAll)}
        >
          Show all
        </button>
      )}
    </div>
  );
}
