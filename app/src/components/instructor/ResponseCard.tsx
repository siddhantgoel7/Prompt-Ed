'use client';

import { Flag, RotateCcw } from 'lucide-react';
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
  onFlag?: () => void;
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
  let label = 'Flag as Inappropriate';
  if (isFlagged) {
    if (isBeingFlagged) {
      label = 'Restoring...';
    } else {
      label = 'Unflag';
    }
  } else if (isBeingFlagged) {
    label = 'Removing...';
  }

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
        className,
      )}
      style={isFlagged ? {
        color: 'var(--color-primary-600)',
        background: 'var(--color-primary-alpha-10)',
        border: '1px solid var(--color-primary-alpha-25)',
      } : {
        color: 'var(--recording-text, #dc2626)',
        background: 'var(--color-error-alpha-08)',
        border: '1px solid var(--error-border)',
      }}
    >
      {isFlagged ? <RotateCcw className={iconClassName} /> : <Flag className={iconClassName} />}
      {label}
    </button>
  );
}

function ResponseCardContent({
  variant,
  isSelected,
  responseText,
  timeString,
}: {
  variant: ResponseCardVariant;
  isSelected: boolean;
  responseText: string;
  timeString: string;
}) {
  const s = variantStyles[variant];

  const textClassName = cn(
    'whitespace-pre-wrap break-words transition-all duration-300 text-content-primary',
    isSelected ? s.selectedText : s.unselectedText,
    variant === 'full' && 'leading-relaxed',
  );

  const timestampClassName = cn(
    'font-medium transition-all duration-300 text-content-muted',
    isSelected ? s.selectedTimestamp : s.unselectedTimestamp,
  );

  if (variant === 'compact') {
    return (
      <>
        <p className={textClassName}>{responseText}</p>
        <p className={cn(timestampClassName, 'uppercase tracking-wider')}>
          {timeString}
        </p>
      </>
    );
  }

  return (
    <>
      <p className={textClassName}>{responseText}</p>
      <div className={cn(timestampClassName, 'flex justify-end items-center gap-2')}>
        <span suppressHydrationWarning>{timeString}</span>
      </div>
    </>
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

  let background = 'var(--color-highlight-alpha-10)';
  let border = '2px solid var(--color-highlight-alpha-55)';
  let boxShadow = '0 4px 24px var(--color-highlight-alpha-12)';
  if (isFlagged) {
    background = 'var(--color-error-alpha-10)';
    border = '2px solid var(--color-error-alpha-50)';
    boxShadow = '0 4px 24px var(--color-error-alpha-12)';
  }

  const selectedStyle = { background, border, boxShadow };
  const unselectedStyle = {
    background: 'var(--surface-raised)',
    border: '1px solid var(--border-default)',
  };

  let dataVariant: string | undefined = undefined;
  if (isSelected) {
    if (isFlagged) {
      dataVariant = 'flagged-selected';
    } else {
      dataVariant = 'highlighted-selected';
    }
  }

  return (
    <div
      className={cn(
        'relative block transition-all duration-300 ease-in-out',
        isSelected ? 'my-4 z-10' : 'z-0',
      )}
    >
      <button
        type="button"
        className={cn(
          'rounded-xl text-left appearance-none p-0 border-none transition-all duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary w-full cursor-pointer',
          isSelected ? s.selectedPadding : s.unselectedPadding,
        )}
        data-highlighted={isSelected ? 'true' : undefined}
        data-variant={dataVariant}
        style={isSelected ? selectedStyle : unselectedStyle}
        onClick={onToggle}
        aria-label={isSelected ? 'Deselect response' : 'Select response'}
      >
        <ResponseCardContent
          variant={variant}
          isSelected={isSelected}
          responseText={responseText}
          timeString={timeString}
        />
      </button>

      {isSelected && (
        <div className="absolute bottom-5 right-5 z-20">
          {onFlag ? (
            <ActionButton
              mode={mode}
              isBeingFlagged={isBeingFlagged}
              onFlag={onFlag}
              className={s.flagButton}
              iconClassName={s.flagIcon}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
