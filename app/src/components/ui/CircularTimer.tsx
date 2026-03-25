// Pill-shaped circular countdown timer shared between the student and instructor session views.
// Previously, DiscussionTimer (student) and InstructorTimer (instructor) were identical components
// living in separate files. This shared version eliminates that duplication and ensures both
// roles always see the same visual behaviour and urgency thresholds.
//
// Architecture:
//   DiscussionTimer  (student)    → thin wrapper, passes testId="student-timer"
//   ActiveRightPanel (instructor) → uses directly,  passes testId="instructor-timer"
'use client';

import * as React from 'react';

interface CircularTimerProps {
  /** Absolute epoch milliseconds when the timer expires (Date.now() equivalent at end). */
  timerEndTime: number;
  /**
   * Total discussion duration in seconds. Used to compute the arc fill percentage:
   *   progress = remaining / timerTotalSeconds
   * Must stay constant for the lifetime of a discussion — do not recalculate it from
   * the live remaining value or the arc will never reach 0%.
   */
  timerTotalSeconds: number;
  /**
   * Value forwarded to data-testid on the root element.
   * Use "student-timer" for the student view and "instructor-timer" for the instructor view
   * so Playwright tests can target each independently.
   */
  testId?: string;
}

/** Formats a raw second count as MM:SS (e.g. 125 → "02:05"). */
function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Pill-shaped circular countdown timer shared across student and instructor views.
 *
 * Visual behaviour:
 *   - Arc fills from full (100%) and drains as time elapses.
 *   - Arc colour shifts from primary green → blush red when < 20% remains (isUrgent).
 *   - At 0 s the arc stays blush red and text shows "00:00" / "Time's up".
 *
 * Urgency threshold: < 20% of total time (e.g. last 12 s of a 60 s quiz, last 60 s of
 * a 5-minute discussion). This is intentionally proportional rather than a fixed-second
 * cutoff, so short quizzes still show a meaningful warning window.
 *
 * Accessibility: the root element carries aria-label with the live remaining time so
 * screen readers can announce it. The SVG arc is aria-hidden because it is decorative.
 */
export function CircularTimer({ timerEndTime, timerTotalSeconds, testId }: Readonly<CircularTimerProps>) {
  // Initialise synchronously so there is no flash of "00:00" on first render.
  const [remaining, setRemaining] = React.useState<number>(() =>
    Math.max(0, Math.ceil((timerEndTime - Date.now()) / 1000))
  );

  // Tick every 500 ms — twice per second is enough for smooth UX without hammering
  // React's reconciler. The CSS transition on strokeDashoffset (0.9 s linear) smooths
  // the visual arc between ticks.
  React.useEffect(() => {
    function tick() {
      setRemaining(Math.max(0, Math.ceil((timerEndTime - Date.now()) / 1000)));
    }
    tick(); // Sync immediately in case the effect fires late after mount.
    const id = setInterval(tick, 500);
    return () => clearInterval(id); // Clean up on unmount or when timerEndTime changes.
  }, [timerEndTime]);

  const radius = 22;
  const circumference = 2 * Math.PI * radius; // Full arc length in SVG units.
  const progress = timerTotalSeconds > 0 ? Math.max(0, remaining / timerTotalSeconds) : 0;
  // strokeDashoffset = 0 → full arc visible (full time); = circumference → arc hidden (expired).
  const strokeDashoffset = circumference * (1 - progress);
  const isExpired = remaining <= 0;
  // Warn when < 20% of time remains — proportional to total duration, not a fixed cutoff.
  const isUrgent = progress < 0.2 && !isExpired;

  // --accent-blush is defined in :root but not overridden in .dark; see globals.css note.
  const arcColor = isExpired || isUrgent ? 'var(--accent-blush)' : 'var(--color-primary-400)';
  const textColor = isExpired || isUrgent ? 'var(--color-timer-expired)' : 'var(--text-primary)';

  return (
    <div
      className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-line-default bg-surface-glass backdrop-blur"
      data-testid={testId}
      aria-label={isExpired ? "Time's up" : `Time remaining: ${formatTime(remaining)}`}
    >
      {/* Circular SVG arc — purely decorative; aria-label on the wrapper covers accessibility. */}
      <svg viewBox="0 0 52 52" width="40" height="40" aria-hidden="true" className="shrink-0">
        {/* Static background track ring */}
        <circle cx="26" cy="26" r={radius} fill="none" stroke="var(--border-default)" strokeWidth="4" />
        {/* Animated progress arc — rotated -90° so it starts at 12 o'clock */}
        <circle
          cx="26" cy="26" r={radius}
          fill="none"
          stroke={arcColor}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 26 26)"
          style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.4s ease' }}
        />
      </svg>

      {/* Numeric countdown + status label */}
      <div className="flex flex-col items-start leading-tight">
        <span className="text-base font-bold font-mono tabular-nums" style={{ color: textColor }}>
          {isExpired ? '00:00' : formatTime(remaining)}
        </span>
        <span className="text-[10px] font-medium text-content-muted">
          {isExpired ? "Time's up" : 'remaining'}
        </span>
      </div>
    </div>
  );
}
