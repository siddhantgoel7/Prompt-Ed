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

export interface MultipleResponseSettings {
  allowMultipleResponses: boolean;
  responseLimit: number | null;
}

interface StartDiscussionDialogProps {
  open: boolean;
  onConfirm: (timerSeconds: number | null, feedbackEnabled: boolean, multipleResponseSettings?: MultipleResponseSettings) => void;
  onCancel: () => void;
  confirmLabel?: string;
  /** When true (MC questions), shows feedback toggle and hides multiple-responses toggle. */
  isMultipleChoice?: boolean;
}

/** Modal for setting a time limit before starting a discussion. */
export function StartDiscussionDialog({ open, onConfirm, onCancel, confirmLabel = 'Start Discussion', isMultipleChoice = false }: Readonly<StartDiscussionDialogProps>) {
  const [noLimit, setNoLimit] = React.useState(false);
  const [minutes, setMinutes] = React.useState(1);
  const [seconds, setSeconds] = React.useState(0);
  const [feedbackEnabled, setFeedbackEnabled] = React.useState(false);
  const [allowMultiple, setAllowMultiple] = React.useState(false);
  const [hasResponseLimit, setHasResponseLimit] = React.useState(false);
  const [responseLimit, setResponseLimit] = React.useState(3);

  // Reset defaults whenever dialog opens
  React.useEffect(() => {
    if (open) {
      setNoLimit(false);
      setMinutes(1);
      setSeconds(0);
      setFeedbackEnabled(false);
      setAllowMultiple(false);
      setHasResponseLimit(false);
      setResponseLimit(3);
    }
  }, [open]);

  function handleConfirm() {
    const timerSecs = noLimit ? null : (() => { const total = minutes * 60 + seconds; return total > 0 ? total : 60; })();
    const multipleResponseSettings: MultipleResponseSettings = {
      allowMultipleResponses: allowMultiple,
      responseLimit: allowMultiple && hasResponseLimit ? responseLimit : null,
    };
    onConfirm(timerSecs, feedbackEnabled, isMultipleChoice ? undefined : multipleResponseSettings);
  }

  const totalSeconds = minutes * 60 + seconds;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
      <DialogContent className="sm:max-w-md bg-card text-card-foreground border border-border" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Set Time Limit</DialogTitle>
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
          {isMultipleChoice && (
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

          {/* Allow Multiple Responses toggle — hidden for MC questions */}
          {!isMultipleChoice && (
            <div>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allowMultiple}
                  onChange={() => setAllowMultiple((v) => !v)}
                  className="sr-only"
                  data-testid="allow-multiple-responses-checkbox"
                />
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${allowMultiple ? 'bg-primary border-primary' : 'border-border bg-transparent'}`}>
                  {allowMultiple && (
                    <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                    </svg>
                  )}
                </div>
                <span className="text-sm font-medium">Allow Multiple Responses</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-label="About multiple responses" />
                  </TooltipTrigger>
                  <TooltipContent>Students can submit more than one response to this question.</TooltipContent>
                </Tooltip>
              </label>

              {/* Sub-options: grid-rows trick for smooth height animation */}
              <div className={`grid transition-all duration-200 ease-in-out ${allowMultiple ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                  <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={hasResponseLimit}
                        onChange={() => setHasResponseLimit((v) => !v)}
                        className="sr-only"
                        data-testid="response-limit-checkbox"
                      />
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${hasResponseLimit ? 'bg-primary border-primary' : 'border-border bg-transparent'}`}>
                        {hasResponseLimit && (
                          <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">Limit responses per student</span>
                    </label>

                    {/* Limit value row — CSS-only hide so input stays in DOM for tests */}
                    <div className={`transition-all duration-150 overflow-hidden ${hasResponseLimit ? 'max-h-12 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Max per student</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setResponseLimit((v) => Math.max(2, v - 1))}
                            className="w-7 h-7 rounded border border-border bg-background flex items-center justify-center text-sm font-bold hover:bg-accent transition-colors"
                          >−</button>
                          <input
                            type="number"
                            min={2}
                            max={20}
                            value={responseLimit}
                            onChange={(e) => setResponseLimit(Math.max(2, Math.min(20, Number.parseInt(e.target.value, 10) || 2)))}
                            className="w-10 text-center rounded border border-border bg-background text-foreground py-1 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                            data-testid="response-limit-input"
                          />
                          <button
                            type="button"
                            onClick={() => setResponseLimit((v) => Math.min(20, v + 1))}
                            className="w-7 h-7 rounded border border-border bg-background flex items-center justify-center text-sm font-bold hover:bg-accent transition-colors"
                          >+</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
