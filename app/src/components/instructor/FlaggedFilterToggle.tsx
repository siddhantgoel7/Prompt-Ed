'use client';

import { Flag } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FlaggedFilterToggleVariant = 'compact' | 'full';

export interface FlaggedFilterToggleProps {
  variant: FlaggedFilterToggleVariant;
  flaggedCount: number;
  showFlagged: boolean;
  onToggle: () => void;
  onHide: () => void;
}

const variantStyles = {
  compact: {
    wrapper: 'gap-2',
    button: 'gap-1.5 px-3 py-1.5 text-xs',
    icon: 'w-3 h-3',
    hideBtn: 'text-xs',
  },
  full: {
    wrapper: 'gap-3',
    button: 'gap-2 px-4 py-2 text-sm',
    icon: 'w-3.5 h-3.5',
    hideBtn: 'text-sm',
  },
} as const;

export function FlaggedFilterToggle({
  variant,
  flaggedCount,
  showFlagged,
  onToggle,
  onHide,
}: FlaggedFilterToggleProps) {
  const s = variantStyles[variant];

  return (
    <div className={cn('flex items-center', s.wrapper)}>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'inline-flex items-center font-semibold rounded-full border transition-colors',
          showFlagged
            ? 'bg-red-50 text-red-700 border-red-200'
            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100',
          s.button,
        )}
      >
        <Flag className={s.icon} />
        {showFlagged
          ? `Showing ${flaggedCount} flagged`
          : `Show flagged (${flaggedCount})`}
      </button>
      {showFlagged && (
        <button
          type="button"
          onClick={onHide}
          className={cn('text-gray-400 hover:text-gray-600 transition-colors', s.hideBtn)}
        >
          Hide
        </button>
      )}
    </div>
  );
}
