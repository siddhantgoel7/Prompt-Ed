// Student-facing countdown timer shown during timed discussions.
// This component is a thin wrapper around the shared CircularTimer — all countdown
// logic, arc rendering, and urgency thresholds live there.
//
// Why a separate wrapper instead of using CircularTimer directly?
// The student view may eventually diverge from the instructor view (e.g. different
// container sizing, additional expired-state messaging). Keeping this file as an
// entry point preserves that flexibility without requiring callers to change.
'use client';

import { CircularTimer } from '@/components/ui/CircularTimer';

interface DiscussionTimerProps {
  /** Absolute epoch milliseconds when the timer expires. */
  timerEndTime: number;
  /** Total discussion duration in seconds — used to calculate arc fill %. */
  timerTotalSeconds: number;
}

/**
 * Student-facing countdown timer — delegates all rendering to the shared CircularTimer.
 * Provides data-testid="student-timer" for Playwright E2E targeting.
 */
export function DiscussionTimer({ timerEndTime, timerTotalSeconds }: DiscussionTimerProps) {
  return (
    <CircularTimer
      timerEndTime={timerEndTime}
      timerTotalSeconds={timerTotalSeconds}
      testId="student-timer"
    />
  );
}
