'use client';

import { useState } from 'react';
import { Flag, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExpandableCard } from '@/components/instructor/ExpandableCard';

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
    padding: '12px',
    selectedText: 'text-2xl leading-relaxed font-semibold',
    unselectedText: 'text-sm line-clamp-3',
    timestamp: 'text-[10px] uppercase tracking-wider',
    badgeIconSize: 'w-3 h-3',
  },
  full: {
    padding: '20px',
    selectedText: 'text-3xl md:text-4xl font-semibold leading-relaxed',
    unselectedText: 'text-base',
    timestamp: 'text-xs',
    badgeIconSize: 'w-3.5 h-3.5',
  },
} as const;

/** Circular flag icon that expands to full label on first click, fires action on second click. */
function FlagBadge({
  mode,
  isBeingFlagged,
  onFlag,
  variant,
}: Readonly<{
  mode: ResponseCardMode;
  isBeingFlagged: boolean;
  onFlag: () => void;
  variant: ResponseCardVariant;
}>) {
  const [expanded, setExpanded] = useState(false);
  const s = variantStyles[variant];
  const isFlagged = mode === 'flagged';

  const icon = isFlagged
    ? <RotateCcw className={s.badgeIconSize} />
    : <Flag className={s.badgeIconSize} />;

  const label = isFlagged
    ? (isBeingFlagged ? 'Restoring...' : 'Unflag')
    : (isBeingFlagged ? 'Removing...' : 'Flag as Inappropriate');

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (expanded) {
      onFlag();
      setExpanded(false);
    } else {
      setExpanded(true);
    }
  };

  return (
    <button
      type="button"
      disabled={isBeingFlagged}
      onClick={handleClick}
      onBlur={() => setExpanded(false)}
      title={label}
      className="shrink-0 inline-flex items-center rounded-full font-semibold overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
      style={{
        height: '24px',
        color: isFlagged ? 'var(--color-primary-600)' : 'var(--recording-text, #dc2626)',
        background: isFlagged ? 'var(--color-primary-alpha-10)' : 'var(--color-error-alpha-08)',
        border: isFlagged ? '1px solid var(--color-primary-alpha-25)' : '1px solid var(--error-border)',
      }}
    >
      {/* Icon — always 24×24, centered. Button width = this alone when collapsed → circle. */}
      <span className="w-6 h-6 shrink-0 flex items-center justify-center">
        {icon}
      </span>
      {/* Grid trick: 0fr→1fr, no pixel widths. padding-right only applied when expanded so it never adds width at rest. */}
      <span
        style={{
          display: 'grid',
          gridTemplateColumns: expanded ? '1fr' : '0fr',
          transition: 'grid-template-columns 200ms ease-in-out',
        }}
      >
        <span
          className="overflow-hidden whitespace-nowrap text-xs"
          style={{
            paddingRight: expanded ? '8px' : '0',
            transition: 'padding-right 200ms ease-in-out',
          }}
        >
          {label}
        </span>
      </span>
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
}: Readonly<ResponseCardProps>) {
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
    dataVariant = isFlagged ? 'flagged-selected' : 'highlighted-selected';
  }

  const badge = onFlag ? (
    <FlagBadge
      mode={mode}
      isBeingFlagged={isBeingFlagged}
      onFlag={onFlag}
      variant={variant}
    />
  ) : (
    // Placeholder to keep layout consistent when no flag action available
    <div className="shrink-0 w-6 h-6" />
  );

  const rightLabel = (
    <span className={cn('font-medium text-content-muted', s.timestamp)} suppressHydrationWarning>
      {timeString}
    </span>
  );

  return (
    <ExpandableCard
      badge={badge}
      text={responseText}
      rightLabel={rightLabel}
      isSelected={isSelected}
      onClick={onToggle}
      padding={s.padding}
      selectedStyle={selectedStyle}
      unselectedStyle={unselectedStyle}
      selectedTextClassName={s.selectedText}
      unselectedTextClassName={s.unselectedText}
      selectedMargin="my-4"
      data-highlighted={isSelected ? 'true' : undefined}
      data-variant={dataVariant}
      ariaLabel={isSelected ? 'Deselect response' : 'Select response'}
    />
  );
}
