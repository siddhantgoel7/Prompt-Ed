// Timer tab content for the instructor's right panel.
// Extracted from ActiveRightPanel.tsx — owns the timer display, extend/edit controls,
// and the "Close Discussion" button that ends the active discussion.
//
// States:
//   No active discussion  — empty state with a clock icon
//   Active, with timer    — CircularTimer + Edit / +10s controls + Close Discussion
//   Active, no timer      — "∞ No time limit" pill + Close Discussion
//
// Close Discussion is placed inside the timer card so the instructor always
// sees it without scrolling, regardless of which timer state is active.
'use client';

import * as React from 'react';
import { CircularTimer } from '@/components/ui/CircularTimer';
import { StartDiscussionDialog } from './StartDiscussionDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function TimerTab({
  activeDiscussionId,
  timerEndTime,
  timerTotalSeconds,
  onClose,
  onExtendTimer,
  onEditTimer,
}: Readonly<{
  activeDiscussionId: string | null;
  /** Null when the discussion was started without a time limit. */
  timerEndTime: number | null;
  /** Null when the discussion was started without a time limit. */
  timerTotalSeconds: number | null;
  /** Called with the discussion ID when the instructor closes the discussion manually. */
  onClose: (id: string) => void;
  /** Adds `extra` seconds to the running timer by updating the DB end time. */
  onExtendTimer?: (extra: number) => Promise<void>;
  /** Replaces the timer entirely; pass null to remove the time limit. */
  onEditTimer?: (newSecs: number | null) => Promise<void>;
}>) {
  // Controls whether the edit-timer dialog (StartDiscussionDialog reused) is visible.
  const [showEditDialog, setShowEditDialog] = React.useState(false);

  if (!activeDiscussionId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--color-primary-alpha-08)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-400)" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <p className="text-sm text-content-muted">No active discussion</p>
      </div>
    );
  }

  const hasTimer = timerEndTime !== null && timerTotalSeconds !== null;

  return (
    <div className="flex flex-col gap-3 pt-2">
      {/* Timer card — glass surface, contains all timer controls + close button */}
      <div className="glass rounded-2xl p-5 flex flex-col items-center gap-4">

        {/* Timer display: circular countdown or no-time-limit pill */}
        {hasTimer ? (
          <CircularTimer timerEndTime={timerEndTime} timerTotalSeconds={timerTotalSeconds} testId="instructor-timer" />
        ) : (
          <div
            className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-line-default bg-surface-raised"
            data-testid="no-time-limit-label"
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center border-2 border-brand-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-400)" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="flex flex-col items-start leading-tight">
              <span className="text-base font-bold text-content-primary">∞</span>
              <span className="text-[10px] font-medium text-content-muted">No time limit</span>
            </div>
          </div>
        )}

        {/* Timer controls: Edit + +10s (only shown when a timer is active) */}
        {hasTimer && (
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowEditDialog(true)}
                  data-testid="edit-timer-button"
                  className="px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150"
                  style={{ border: '1px solid var(--color-primary-400)', color: 'var(--color-primary-500)', background: 'var(--color-primary-alpha-06)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-alpha-14)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-alpha-06)'; }}
                >
                  Edit
                </button>
              </TooltipTrigger>
              <TooltipContent>Replace the current timer with a new duration.</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onExtendTimer?.(10)}
                  data-testid="extend-timer-button"
                  className="px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150"
                  style={{ border: '1px solid var(--color-primary-400)', color: 'var(--color-primary-500)', background: 'var(--color-primary-alpha-06)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-alpha-14)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-alpha-06)'; }}
                >
                  +10s
                </button>
              </TooltipTrigger>
              <TooltipContent>Add 10 seconds to the running countdown immediately.</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Divider */}
        <div className="w-full h-px bg-line-subtle" />

        {/* Close Discussion — solid red, compact, inside the card so it's always visible */}
        <button
          onClick={() => onClose(activeDiscussionId)}
          data-testid="close-discussion-button"
          className="px-5 py-1.5 rounded-full text-xs font-semibold text-white transition-all duration-150"
          style={{ background: 'var(--color-error-600)', boxShadow: '0 2px 8px var(--color-error-600-alpha-35)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-error-700)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-error-600)'; }}
        >
          Close Discussion
        </button>
      </div>

      {/* Edit-timer dialog — reuses StartDiscussionDialog with a custom confirm label */}
      <StartDiscussionDialog
        open={showEditDialog}
        onConfirm={(newSecs) => { setShowEditDialog(false); onEditTimer?.(newSecs); }}
        onCancel={() => setShowEditDialog(false)}
        confirmLabel="Update Timer"
      />
    </div>
  );
}
