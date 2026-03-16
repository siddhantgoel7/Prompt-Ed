'use client';

import { Flag, RotateCcw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type ResponseCardVariant = 'compact' | 'full';

/** "normal" = default highlight/flag behaviour; "flagged" = red styling with Unflag action. */
export type ResponseCardMode = 'normal' | 'flagged';

export interface ResponseCardProps {
  /** "compact" for sidebar panels, "full" for full-page views. */
  variant: ResponseCardVariant;
  /** Visual mode — "normal" (yellow highlight + Flag) or "flagged" (red highlight + Unflag). */
  mode?: ResponseCardMode;
  responseText: string;
  createdAt: string;
  isSelected: boolean;
  isBeingFlagged: boolean;
  onToggle: () => void;
  onFlag: () => void;
}

const variantStyles = {
  compact: {
    selectedPadding: 'p-6',
    unselectedPadding: 'p-3',
    selectedText: 'text-2xl leading-relaxed font-semibold',
    unselectedText: 'text-sm line-clamp-3',
    selectedTimestamp: 'text-xs mt-4',
    unselectedTimestamp: 'text-[10px] mt-1.5',
    actionBarSpacing: 'mt-4 pt-4',
    flagButton: 'gap-1.5 px-3 py-1.5 text-xs',
    flagIcon: 'w-3 h-3',
  },
  full: {
    selectedPadding: 'p-8 md:p-10',
    unselectedPadding: 'p-5',
    selectedText: 'text-3xl md:text-4xl font-semibold',
    unselectedText: 'text-base',
    selectedTimestamp: 'mt-6 text-sm',
    unselectedTimestamp: 'mt-3 text-xs',
    actionBarSpacing: 'mt-6 pt-5',
    flagButton: 'gap-2 px-5 py-2.5 text-sm',
    flagIcon: 'w-4 h-4',
  },
} as const;

function ActionButton({
  mode,
  isBeingFlagged,
  onFlag,
  className,
  iconClassName,
}: {
  mode: ResponseCardMode;
  isBeingFlagged: boolean;
  onFlag: () => void;
  className: string;
  iconClassName: string;
}) {
  const isFlagged = mode === 'flagged';
  return (
    <button
      type="button"
      disabled={isBeingFlagged}
      onClick={(e) => {
        e.stopPropagation();
        onFlag();
      }}
      className={cn(
        'inline-flex items-center font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        isFlagged
          ? 'text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 hover:border-green-300'
          : 'text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 hover:border-red-300',
        className,
      )}
    >
      {isFlagged ? <RotateCcw className={iconClassName} /> : <Flag className={iconClassName} />}
      {isFlagged
        ? (isBeingFlagged ? 'Restoring...' : 'Unflag')
        : (isBeingFlagged ? 'Removing...' : 'Flag as Inappropriate')}
    </button>
  );
}

export function ResponseCard({
  variant,
  mode = 'normal',
  responseText,
  createdAt,
  isSelected,
  isBeingFlagged,
  onToggle,
  onFlag,
}: ResponseCardProps) {
  const s = variantStyles[variant];
  const isFlagged = mode === 'flagged';

  const timeString = new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Colour tokens that differ between normal (yellow) and flagged (red) mode
  const selectedBg = isFlagged ? 'bg-red-50' : 'bg-yellow-50';
  const selectedBorder = isFlagged ? 'border-red-400' : 'border-black';
  const selectedRing = isFlagged ? 'ring-red-200' : 'ring-black/15';

  const content = (
    <>
      <p className={cn(
        'whitespace-pre-wrap break-words text-gray-800 transition-all duration-300',
        isSelected ? s.selectedText : s.unselectedText,
        variant === 'full' && 'leading-relaxed',
      )}>
        {responseText}
      </p>

      {variant === 'compact' ? (
        <p className={cn(
          'text-gray-400 font-medium uppercase tracking-wider transition-all duration-300',
          isSelected ? s.selectedTimestamp : s.unselectedTimestamp,
        )}>
          {timeString}
        </p>
      ) : (
        <div className={cn(
          'flex justify-end items-center gap-2 text-gray-400 font-medium transition-all duration-300',
          isSelected ? s.selectedTimestamp : s.unselectedTimestamp,
        )}>
          <span suppressHydrationWarning>{timeString}</span>
        </div>
      )}

      {isSelected && (
        <div className={cn(
          s.actionBarSpacing,
          'border-t border-gray-300 flex items-center justify-end animate-in fade-in slide-in-from-top-1 duration-200',
        )}>
          <ActionButton
            mode={mode}
            isBeingFlagged={isBeingFlagged}
            onFlag={onFlag}
            className={s.flagButton}
            iconClassName={s.flagIcon}
          />
        </div>
      )}
    </>
  );

  if (variant === 'compact') {
    return (
      <Card
        className={cn(
          'cursor-pointer transition-all duration-300 ease-in-out',
          isSelected
            ? `border-2 ${selectedBorder} ring-4 ${selectedRing} ${selectedBg} shadow-xl z-10 relative my-4`
            : 'shadow-sm border-gray-200 hover:border-gray-400',
        )}
        onClick={onToggle}
      >
        <CardContent className={cn(
          'transition-all duration-300',
          isSelected ? s.selectedPadding : s.unselectedPadding,
        )}>
          {content}
        </CardContent>
      </Card>
    );
  }

  // full variant — plain div (matches DiscussionPage's existing DOM)
  return (
    <div
      className={cn(
        'rounded-xl cursor-pointer transition-all duration-300 ease-in-out',
        isSelected
          ? `${selectedBg} border-2 ${selectedBorder} ring-4 ${selectedRing} shadow-2xl ${s.selectedPadding} my-4 z-10 relative`
          : `bg-white border border-gray-200 hover:border-gray-400 shadow-sm ${s.unselectedPadding}`,
      )}
      onClick={onToggle}
    >
      {content}
    </div>
  );
}
