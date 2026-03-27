'use client';

import { FilterToggle } from '@/components/instructor/FilterToggle';

interface ResponseStatusBarProps {
  isConnected: boolean;
  /** When omitted, no total count is shown. */
  totalCount?: number;
  /** Label shown before the count. Defaults to "Total:". */
  totalLabel?: string;
  /** When > 0, the highlight filter button becomes visible. */
  selectedCount?: number;
  showHighlightedOnly?: boolean;
  onToggleHighlight?: () => void;
}

/** Single-row bar showing realtime connection status, optional response count, and optional highlight filter. */
export function ResponseStatusBar({
  isConnected,
  totalCount,
  totalLabel = 'Total:',
  selectedCount = 0,
  showHighlightedOnly = false,
  onToggleHighlight,
}: Readonly<ResponseStatusBarProps>) {
  return (
    <div className="flex items-center justify-between text-sm flex-wrap gap-2">
      <div className="flex items-center gap-3">
        {/* Pill badge matching the session dashboard ConnectionStatus style */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={isConnected ? {
            background: 'var(--surface-glass)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--color-primary-alpha-25)',
            boxShadow: '0 2px 12px var(--color-black-alpha-10)',
          } : {
            background: 'var(--color-error-alpha-08)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--color-error-alpha-25)',
            boxShadow: '0 2px 12px var(--color-black-alpha-10)',
          }}
        >
          <span
            className="h-2 w-2 rounded-full animate-pulse shrink-0"
            style={{ background: isConnected ? 'var(--color-primary-400)' : '#ef4444' }}
          />
          <span
            className="text-xs font-medium"
            style={{ color: isConnected ? 'var(--brand-600, var(--color-primary-500))' : '#dc2626' }}
          >
            {isConnected ? 'Connected' : 'Connecting…'}
          </span>
        </div>

        {totalCount !== undefined && (
          <span className="text-content-muted">{totalLabel} {totalCount}</span>
        )}
      </div>

      {/* Always rendered so the bar height stays constant; hidden via visibility when inactive */}
      <div style={{ visibility: selectedCount > 0 ? 'visible' : 'hidden' }}>
        <FilterToggle
          variant="compact"
          selectedCount={selectedCount}
          showHighlightedOnly={showHighlightedOnly}
          onToggle={onToggleHighlight ?? (() => {})}
        />
      </div>
    </div>
  );
}
