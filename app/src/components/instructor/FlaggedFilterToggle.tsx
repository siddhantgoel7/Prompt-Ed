'use client';

import { Flag, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
          s.button,
        )}
        style={showFlagged ? {
          background: 'var(--color-error-alpha-10)',
          color: 'var(--recording-text, #dc2626)',
          borderColor: 'rgba(239,68,68,0.30)',
        } : {
          background: 'var(--surface-raised)',
          color: 'var(--text-secondary)',
          borderColor: 'var(--border-default)',
        }}
      >
        <Flag className={s.icon} />
        {showFlagged
          ? `Showing ${flaggedCount} flagged`
          : `Show flagged (${flaggedCount})`}
      </button>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-label="About flagged filter" />
        </TooltipTrigger>
        <TooltipContent>Show only responses you have flagged as inappropriate.</TooltipContent>
      </Tooltip>
      {showFlagged && (
        <button
          type="button"
          onClick={onHide}
          className={cn('transition-colors text-content-muted', s.hideBtn)}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
        >
          Hide
        </button>
      )}
    </div>
  );
}
