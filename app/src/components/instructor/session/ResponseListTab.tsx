// Response list tab for the instructor's right panel.
// Extracted from ActiveRightPanel.tsx — handles live response display,
// flagged-response management, MC option breakdown, and filter toggles.
//
// State owned here:
//   showFlagged         — toggles between live and flagged response lists
//   flaggedSelectedIds  — tracks which flagged responses are checked for restore
//   restoringId         — which response is mid-restore (for loading state)
//
// All other state (responses, activeDiscussion, selection) is passed as props
// from ActiveRightPanel, which coordinates the full panel layout.
'use client';

import * as React from 'react';
import type { Response } from '@/types/response';
import type { Discussion } from '@/types/discussion';
import { ResponseCard } from '@/components/instructor/ResponseCard';
import { FilterToggle } from '@/components/instructor/FilterToggle';
import { FlaggedFilterToggle } from '@/components/instructor/FlaggedFilterToggle';

export interface ResponseListTabProps {
  activeDiscussion: Discussion | null;
  responses: Response[];
  flaggedResponses: Response[];
  isMC: boolean;
  /** Pre-computed per-option response counts for MC distributions. */
  distribution: Record<string, number>;
  restoreResponse?: (id: string) => Promise<void>;
  // From useResponseSelection
  selectedIds: string[];
  showHighlightedOnly: boolean;
  flaggingId: string | null;
  toggleSelected: (id: string) => void;
  handleFlagInappropriate: (id: string) => Promise<void>;
  setShowHighlightedOnly: (show: boolean) => void;
  filterResponses: (responses: Response[]) => Response[];
}

export function ResponseListTab({
  activeDiscussion,
  responses,
  flaggedResponses,
  isMC,
  distribution,
  restoreResponse,
  selectedIds,
  showHighlightedOnly,
  flaggingId,
  toggleSelected,
  handleFlagInappropriate,
  setShowHighlightedOnly,
  filterResponses,
}: Readonly<ResponseListTabProps>) {
  const [showFlagged, setShowFlagged] = React.useState(false);

  // Separate selection/flagging state for the flagged view — flaggedSelectedIds tracks
  // which flagged responses are checked for restore, independent of the normal selection.
  const [flaggedSelectedIds, setFlaggedSelectedIds] = React.useState<string[]>([]);
  const [restoringId, setRestoringId] = React.useState<string | null>(null);

  // Auto-switch back to normal view when all flagged responses are restored.
  React.useEffect(() => {
    if (flaggedResponses.length === 0 && showFlagged) {
      setShowFlagged(false);
    }
  }, [flaggedResponses.length, showFlagged]);

  const toggleFlaggedSelected = React.useCallback((id: string) => {
    setFlaggedSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const handleRestore = async (responseId: string) => {
    if (!restoreResponse) return;
    setRestoringId(responseId);
    try {
      await restoreResponse(responseId);
      setFlaggedSelectedIds(prev => prev.filter(x => x !== responseId));
    } catch (err) {
      console.error('Failed to restore response:', err);
    } finally {
      setRestoringId(null);
    }
  };

  if (!activeDiscussion) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div>
          <div
            className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
            style={{ background: 'rgba(45,158,45,0.08)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-400)" strokeWidth="1.8" strokeLinecap="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <p className="text-sm text-content-muted">No active discussion</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* MC options + distribution breakdown */}
      {isMC && activeDiscussion?.mc_options && (
        <div
          className="mb-3 p-3 rounded-xl"
          style={{
            background: 'rgba(45,158,45,0.06)',
            border: '1px solid rgba(45,158,45,0.15)',
          }}
        >
          <div className="text-xs font-semibold mb-2 text-content-secondary">
            Options
          </div>
          <div className="space-y-1.5 mb-3">
            {activeDiscussion.mc_options.map((opt) => (
              <div key={opt.label} className="text-xs flex items-start gap-1.5">
                <span className="font-bold w-4 flex-shrink-0 text-brand-600">
                  {opt.label}.
                </span>
                <span
                  className={activeDiscussion.correct_option === opt.label ? 'font-semibold text-brand-600' : 'text-content-secondary'}
                >
                  {opt.text}
                  {activeDiscussion.correct_option === opt.label && (
                    <span
                      className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-brand-600"
                      style={{ background: 'rgba(45,158,45,0.15)' }}
                    >
                      Correct
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2.5" style={{ borderTop: '1px solid rgba(45,158,45,0.15)' }}>
            <div className="text-xs font-semibold mb-1.5 text-content-secondary">
              Distribution
            </div>
            {Object.entries(distribution).map(([label, count]) => (
              <div key={label} className="flex justify-between items-center text-xs mb-1">
                <span className="text-content-muted">Option {label}</span>
                <span className="font-semibold text-content-primary">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter toggle bar */}
      <div className="flex flex-col gap-2 mb-2">
        {selectedIds.length > 0 && responses.length > 0 && !showFlagged && (
          <FilterToggle
            variant="compact"
            selectedCount={selectedIds.length}
            showHighlightedOnly={showHighlightedOnly}
            onToggle={() => setShowHighlightedOnly(!showHighlightedOnly)}
          />
        )}
        {flaggedResponses.length > 0 && (
          <FlaggedFilterToggle
            variant="compact"
            flaggedCount={flaggedResponses.length}
            showFlagged={showFlagged}
            onToggle={() => setShowFlagged(prev => !prev)}
            onHide={() => setShowFlagged(false)}
          />
        )}
      </div>

      {/* Response cards */}
      {responses.length === 0 && flaggedResponses.length === 0 ? (
        <p className="text-sm py-8 text-center text-content-muted">
          Waiting for student responses…
        </p>
      ) : (
        <div className="space-y-2 min-w-0 w-full overflow-hidden">
          {!showFlagged && filterResponses(responses).map((r) => (
            <ResponseCard
              key={r.id}
              variant="compact"
              responseText={r.response_text}
              createdAt={r.created_at}
              isSelected={selectedIds.includes(r.id)}
              isBeingFlagged={flaggingId === r.id}
              onToggle={() => toggleSelected(r.id)}
              onFlag={isMC ? undefined : () => void handleFlagInappropriate(r.id)}
            />
          ))}
          {showFlagged && flaggedResponses.map((r) => (
            <ResponseCard
              key={r.id}
              variant="compact"
              mode="flagged"
              responseText={r.response_text}
              createdAt={r.created_at}
              isSelected={flaggedSelectedIds.includes(r.id)}
              isBeingFlagged={restoringId === r.id}
              onToggle={() => toggleFlaggedSelected(r.id)}
              onFlag={() => void handleRestore(r.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}
