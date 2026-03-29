// Dialog that appears when the instructor clicks "Start Discussion".
// Lets the instructor configure discussion settings: timer duration and (for MC) correctness feedback.
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

interface StartDiscussionDialogProps {
  open: boolean;
  onConfirm: (timerSeconds: number | null, feedbackEnabled: boolean) => void;
  onCancel: () => void;
  confirmLabel?: string;
  /** When true, shows the "Show correctness feedback to students" toggle. */
  isMC?: boolean;
}

/** Modal for setting a time limit before starting a discussion. */
export function StartDiscussionDialog({ open, onConfirm, onCancel, confirmLabel = 'Start Discussion', isMC = false }: Readonly<StartDiscussionDialogProps>) {
  const [noLimit, setNoLimit] = React.useState(false);
  const [minutes, setMinutes] = React.useState(1);
  const [seconds, setSeconds] = React.useState(0);
  const [feedbackEnabled, setFeedbackEnabled] = React.useState(false);

  // Reset defaults whenever dialog opens
  React.useEffect(() => {
    if (open) {
      setNoLimit(false);
      setMinutes(1);
      setSeconds(0);
      setFeedbackEnabled(false);
    }
  }, [open]);

  function handleConfirm() {
    if (noLimit) {
      onConfirm(null, feedbackEnabled);
    } else {
      const total = minutes * 60 + seconds;
      onConfirm(total > 0 ? total : 60, feedbackEnabled);
    }
  }

  const totalSeconds = minutes * 60 + seconds;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
      <DialogContent className="sm:max-w-md bg-card text-card-foreground border border-border" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Discussion Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Timer inputs */}
          <div className={`space-y-3 transition-opacity ${noLimit ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
            <p className="text-sm text-muted-foreground">Set timer duration:</p>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-1">
                <label className="text-xs text-muted-foreground" htmlFor="timer-min">Min</label>
                <input
                  id="timer-min"
                  type="number"
                  min={0}
                  max={59}
                  value={minutes}
                  onChange={(e) => setMinutes(Math.max(0, Math.min(59, Number.parseInt(e.target.value, 10) || 0)))}
                  disabled={noLimit}
                  className="w-16 text-center rounded-lg border border-border bg-background text-foreground px-2 py-2 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                  data-testid="timer-minutes"
                />
              </div>
              <span className="text-2xl font-bold text-muted-foreground mt-4">:</span>
              <div className="flex flex-col items-center gap-1">
                <label className="text-xs text-muted-foreground" htmlFor="timer-sec">Sec</label>
                <input
                  id="timer-sec"
                  type="number"
                  min={0}
                  max={59}
                  value={seconds}
                  onChange={(e) => setSeconds(Math.max(0, Math.min(59, Number.parseInt(e.target.value, 10) || 0)))}
                  disabled={noLimit}
                  className="w-16 text-center rounded-lg border border-border bg-background text-foreground px-2 py-2 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                  data-testid="timer-seconds"
                />
              </div>
            </div>
            {!noLimit && totalSeconds === 0 && (
              <p className="text-xs text-destructive">Timer must be at least 1 second, or choose No Time Limit.</p>
            )}
          </div>

          {/* No Time Limit toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={noLimit}
              onChange={() => setNoLimit((v) => !v)}
              className="sr-only"
              data-testid="no-time-limit-checkbox"
            />
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${noLimit ? 'bg-primary border-primary' : 'border-border bg-transparent'
                }`}
            >
              {noLimit && (
                <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                </svg>
              )}
            </div>
            <span className="text-sm font-medium">No Time Limit</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-label="About no time limit" />
              </TooltipTrigger>
              <TooltipContent>Students can keep responding until you manually close the discussion.</TooltipContent>
            </Tooltip>
          </label>

          {/* Show correctness feedback toggle — only for multiple choice questions */}
          {isMC && (
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={feedbackEnabled}
                onChange={() => setFeedbackEnabled((v) => !v)}
                className="sr-only"
                data-testid="feedback-enabled-checkbox"
              />
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${feedbackEnabled ? 'bg-primary border-primary' : 'border-border bg-transparent'}`}
              >
                {feedbackEnabled && (
                  <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                  </svg>
                )}
              </div>
              <span className="text-sm font-medium">Show correctness feedback to students</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-label="About correctness feedback" />
                </TooltipTrigger>
                <TooltipContent>When enabled, students see correct or incorrect feedback immediately after submitting.</TooltipContent>
              </Tooltip>
            </label>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!noLimit && totalSeconds === 0}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
