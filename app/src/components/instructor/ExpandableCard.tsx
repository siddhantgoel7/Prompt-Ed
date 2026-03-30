'use client';

// Shared card component used by ResponseCard (text responses) and MC option rows.
// Layout: [badge] [text — grows on select] [rightLabel — fixed]
// Uses div[role=button] — a native <button> is not used here because the nested interactive
// badge (FlagBadge) would be invalid HTML inside a <button>. // NOSONAR suppresses the Sonar rule.

import { cn } from '@/lib/utils';
import type { ReactNode, CSSProperties, KeyboardEvent } from 'react';

export interface ExpandableCardProps {
  /** Left slot — badge or icon, always top-anchored. */
  badge: ReactNode;
  /** Center text — grows when selected. */
  text: string;
  /** Right slot — count or timestamp, fixed size, always top-anchored. */
  rightLabel: ReactNode;
  isSelected: boolean;
  onClick: () => void;
  /** Constant padding applied in both selected and unselected states. */
  padding: string;
  selectedStyle: CSSProperties;
  unselectedStyle: CSSProperties;
  /** Tailwind text classes applied to center text when selected. */
  selectedTextClassName: string;
  /** Tailwind text classes applied to center text when unselected. */
  unselectedTextClassName: string;
  /** Margin added to wrapper when selected (default: my-2). */
  selectedMargin?: string;
  'data-highlighted'?: string;
  'data-variant'?: string;
  ariaLabel?: string;
}

export function ExpandableCard({
  badge,
  text,
  rightLabel,
  isSelected,
  onClick,
  padding,
  selectedStyle,
  unselectedStyle,
  selectedTextClassName,
  unselectedTextClassName,
  selectedMargin = 'my-2',
  'data-highlighted': dataHighlighted,
  'data-variant': dataVariant,
  ariaLabel,
}: Readonly<ExpandableCardProps>) {
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div className={cn('transition-all duration-300 ease-in-out', isSelected ? cn(selectedMargin, 'z-10') : 'z-0')}>
      <div
        role="button" // NOSONAR - nested interactive badge (FlagBadge) prevents using a native <button> element
        tabIndex={0}
        aria-label={ariaLabel}
        data-highlighted={dataHighlighted}
        data-variant={dataVariant}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        className="w-full text-left flex items-start justify-between rounded-xl transition-all duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)] cursor-pointer"
        style={{ padding, ...(isSelected ? selectedStyle : unselectedStyle) }}
      >
        {/* Left badge — top-anchored */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {badge}
          <span className={cn(
            'transition-all duration-300 whitespace-pre-wrap break-words text-content-primary',
            isSelected ? selectedTextClassName : unselectedTextClassName,
          )}>
            {text}
          </span>
        </div>
        {/* Right label — fixed size, top-anchored */}
        <div className="shrink-0 ml-3">
          {rightLabel}
        </div>
      </div>
    </div>
  );
}
