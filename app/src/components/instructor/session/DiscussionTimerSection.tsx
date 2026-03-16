// Bottom-center instructor section: shows the countdown timer (or "No Time Limit") and
// the Close Discussion button when a discussion is active.
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { StartDiscussionDialog } from './StartDiscussionDialog';

interface DiscussionTimerSectionProps {
  activeDiscussionId: string | null;
  timerEndTime: number | null;
  timerTotalSeconds: number | null;
  onClose: (discussionId: string) => void;
  onExtendTimer?: (extraSeconds: number) => Promise<void>;
  onEditTimer?: (newSeconds: number) => Promise<void>;
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Circular SVG countdown timer for the instructor view. */
function CircularTimer({ remaining, total }: { remaining: number; total: number }) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? Math.max(0, remaining / total) : 0;
  const strokeDashoffset = circumference * (1 - progress);
  const isWarning = remaining <= 10 && remaining > 0;
  const isExpired = remaining <= 0;

  return (
    <div className="flex flex-col items-center gap-1" data-testid="instructor-timer">
      <svg viewBox="0 0 100 100" width="88" height="88" aria-label={`Time remaining: ${formatTime(Math.max(0, remaining))}`}>
        <circle cx="50" cy="50" r={radius} stroke="var(--border)" strokeWidth="8" fill="none" />
        <circle
          cx="50" cy="50" r={radius}
          stroke={isExpired || isWarning ? 'var(--destructive)' : 'var(--primary)'}
          strokeWidth="8" fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s ease' }}
        />
        <text
          x="50" y="50" textAnchor="middle" dominantBaseline="central"
          fontSize="16" fontFamily="monospace" fontWeight="600"
          fill={isExpired || isWarning ? 'var(--destructive)' : 'var(--foreground)'}
        >
          {isExpired ? '00:00' : formatTime(remaining)}
        </text>
      </svg>
      <span className="text-xs text-muted-foreground">
        {isExpired ? 'Time expired' : 'remaining'}
      </span>
    </div>
  );
}

/** Shown at the bottom-center of the instructor session when a discussion is active. */
export function DiscussionTimerSection({
  activeDiscussionId,
  timerEndTime,
  timerTotalSeconds,
  onClose,
  onExtendTimer,
  onEditTimer,
}: DiscussionTimerSectionProps) {
  const [remaining, setRemaining] = React.useState<number>(0);
  const [showEditDialog, setShowEditDialog] = React.useState(false);

  React.useEffect(() => {
    if (!timerEndTime) return;
    function tick() {
      const secs = Math.max(0, Math.ceil((timerEndTime! - Date.now()) / 1000));
      setRemaining(secs);
    }
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [timerEndTime]);

  // If the original timer expires while the edit dialog is open, close the dialog
  // (auto-close interval in useLessonDiscussions handles closing the discussion)
  React.useEffect(() => {
    if (showEditDialog && remaining <= 0 && timerEndTime !== null) {
      setShowEditDialog(false);
    }
  }, [showEditDialog, remaining, timerEndTime]);

  if (!activeDiscussionId) return null;

  const hasTimer = timerEndTime !== null && timerTotalSeconds !== null;

  function handleEditConfirm(newSeconds: number | null) {
    setShowEditDialog(false);
    if (onEditTimer) {
      onEditTimer(newSeconds);
    }
  }

  return (
    <div
      className="border-t border-border bg-card/50 py-4 px-6 flex flex-col items-center gap-3"
      data-testid="discussion-timer-section"
    >
      {hasTimer ? (
        <div className="flex items-center gap-4">
          {/* Edit button — left of timer */}
          <button
            onClick={() => setShowEditDialog(true)}
            title="Edit time limit"
            data-testid="edit-timer-button"
            className="w-10 h-10 rounded-full border-2 border-primary text-primary text-xs font-semibold flex items-center justify-center hover:bg-primary hover:text-white transition-colors shrink-0"
          >
            Edit
          </button>

          <CircularTimer remaining={remaining} total={timerTotalSeconds!} />

          {/* +10s button — right of timer */}
          <button
            onClick={() => onExtendTimer?.(10)}
            title="Add 10 seconds"
            data-testid="extend-timer-button"
            className="w-10 h-10 rounded-full border-2 border-primary text-primary text-xs font-semibold flex items-center justify-center hover:bg-primary hover:text-white transition-colors shrink-0"
          >
            +10s
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1 py-2" data-testid="no-time-limit-label">
          <div className="w-16 h-16 rounded-full border-4 border-primary flex items-center justify-center">
            <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>
          <span className="text-xs text-muted-foreground font-medium">No Time Limit</span>
        </div>
      )}

      <Button
        onClick={() => onClose(activeDiscussionId)}
        variant="outline"
        className="w-full max-w-xs border-destructive text-destructive hover:bg-destructive hover:text-white font-semibold rounded-full"
        data-testid="close-discussion-button"
      >
        Close Discussion
      </Button>

      <StartDiscussionDialog
        open={showEditDialog}
        onConfirm={handleEditConfirm}
        onCancel={() => setShowEditDialog(false)}
        confirmLabel="Update Timer"
      />
    </div>
  );
}
