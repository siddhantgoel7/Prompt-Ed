'use client';

import { Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onToggle}
            className={cn(
              'inline-flex items-center font-semibold rounded-full border transition-colors',
              s.button,
            )}
            style={showHighlightedOnly ? {
              background: 'rgba(250,204,21,0.15)',
              color: 'oklch(0.55 0.15 85)',
              borderColor: 'rgba(250,204,21,0.45)',
            } : {
              background: 'var(--surface-raised)',
              color: 'var(--text-secondary)',
              borderColor: 'var(--border-default)',
            }}
          >
            <Filter className={s.icon} />
            {showHighlightedOnly
              ? `Showing ${selectedCount} highlighted`
              : `Show highlighted only (${selectedCount})`}
          </button>
        </TooltipTrigger>
        <TooltipContent>Show only responses you have highlighted by clicking on them.</TooltipContent>
      </Tooltip>
      {showHighlightedOnly && (
        <button
          type="button"
          onClick={onShowAll}
          className={cn('transition-colors text-content-muted', s.showAll)}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
        >
          Show all
        </button>
      )}
    </div>
  );
}
