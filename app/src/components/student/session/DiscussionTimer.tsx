// Pill-shaped countdown timer shown to students during timed discussions.
// Circular arc shows elapsed vs remaining time; turns blush red when < 20% remains.
// src/components/student/session/DiscussionTimer.tsx
'use client';

import * as React from 'react';

interface DiscussionTimerProps {
  timerEndTime: number;       // absolute ms epoch
  timerTotalSeconds: number;  // total duration in seconds
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Pill-shaped countdown timer for the student discussion view. */
export function DiscussionTimer({ timerEndTime, timerTotalSeconds }: DiscussionTimerProps) {
  const [remaining, setRemaining] = React.useState<number>(() =>
    Math.max(0, Math.ceil((timerEndTime - Date.now()) / 1000))
  );

  React.useEffect(() => {
    function tick() {
      const secs = Math.max(0, Math.ceil((timerEndTime - Date.now()) / 1000));
      setRemaining(secs);
    }
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [timerEndTime]);

  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const progress = timerTotalSeconds > 0 ? Math.max(0, remaining / timerTotalSeconds) : 0;
  const strokeDashoffset = circumference * (1 - progress);
  const isExpired = remaining <= 0;
  const isUrgent = progress < 0.20 && !isExpired;

  const arcColor = isExpired
    ? 'var(--accent-blush)'
    : isUrgent
    ? 'var(--accent-blush)'
    : 'var(--color-primary-400)';

  const textColor = isExpired || isUrgent
    ? '#c0392b'
    : 'var(--text-primary)';

  return (
    <div
      className="inline-flex items-center gap-3 px-5 py-2.5"
      style={{
        borderRadius: '999px',
        border: '1px solid var(--border-default)',
        background: 'var(--surface-glass)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      data-testid="student-timer"
      aria-label={isExpired ? "Time's up" : `Time remaining: ${formatTime(remaining)}`}
    >
      {/* Circular arc */}
      <svg viewBox="0 0 52 52" width="40" height="40" style={{ flexShrink: 0 }}>
        {/* Track */}
        <circle
          cx="26" cy="26" r={radius}
          fill="none"
          stroke="var(--border-default)"
          strokeWidth="4"
        />
        {/* Arc */}
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

      {/* Time text */}
      <div className="flex flex-col items-start leading-tight">
        <span
          className="text-base font-bold font-mono tabular-nums"
          style={{ color: textColor }}
        >
          {isExpired ? "00:00" : formatTime(remaining)}
        </span>
        <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
          {isExpired ? "Time's up" : 'remaining'}
        </span>
      </div>
    </div>
  );
}
