'use client';

import { Filter, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export type FilterToggleVariant = 'compact' | 'full';

export interface FilterToggleProps {
  variant: FilterToggleVariant;
  selectedCount: number;
  showHighlightedOnly: boolean;
  onToggle: () => void;
}

const variantStyles = {
  compact: {
    wrapper: 'gap-2',
    button: 'gap-1.5 px-3 py-1.5 text-xs',
    icon: 'w-3 h-3',
  },
  full: {
    wrapper: 'gap-3',
    button: 'gap-2 px-4 py-2 text-sm',
    icon: 'w-3.5 h-3.5',
  },
} as const;

export function FilterToggle({
  variant,
  selectedCount,
  showHighlightedOnly,
  onToggle,
}: Readonly<FilterToggleProps>) {
  const s = variantStyles[variant];

  return (
    <div className={cn('flex items-center', s.wrapper)}>
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
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-label="About highlighted filter" />
        </TooltipTrigger>
        <TooltipContent>Show only responses you have highlighted by clicking on them.</TooltipContent>
      </Tooltip>
    </div>
  );
}
