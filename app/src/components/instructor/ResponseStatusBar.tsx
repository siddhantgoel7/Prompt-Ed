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
