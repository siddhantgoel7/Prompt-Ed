'use client';

// Shared card component used by ResponseCard (text responses) and MC option rows.
// Layout: [badge] [text — grows on select] [rightLabel — fixed]
//
// Accessibility: Uses a combination of div and native <button> to ensure the card
// remains keyboard-accessible while allowing nested interactive badges (e.g. FlagBadge).

import { cn } from '@/lib/utils';
import type { ReactNode, CSSProperties } from 'react';

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
  return (
    <div
      className={cn(
        'transition-all duration-300 ease-in-out relative group',
        isSelected ? cn(selectedMargin, 'z-10') : 'z-0'
      )}
      data-highlighted={dataHighlighted}
      data-variant={dataVariant}
    >
      <fieldset
        className="w-full flex items-start justify-between rounded-xl transition-all duration-300 ease-in-out"
        style={{ padding, border: 'none', margin: '0', minWidth: '0', ...(isSelected ? selectedStyle : unselectedStyle) }}
        aria-label={ariaLabel}
      >
        {/*
          Left section: contains both the Badge and the Main Button.
        */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="shrink-0 z-20 relative">
            {badge}
          </div>

          <button
            type="button"
            onClick={onClick}
            className={cn(
              'flex-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)] cursor-pointer rounded-lg -m-1 p-1',
              isSelected ? 'cursor-default' : 'cursor-pointer'
            )}
          >
            <span className={cn(
              'transition-all duration-300 whitespace-pre-wrap break-words text-content-primary block',
              isSelected ? selectedTextClassName : unselectedTextClassName,
            )}>
              {text}
            </span>
          </button>
        </div>

        {/* Right label — fixed size, top-anchored */}
        <div className="shrink-0 ml-3">
          {rightLabel}
        </div>
      </fieldset>
    </div>
  );
}
