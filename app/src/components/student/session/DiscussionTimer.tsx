// Circular countdown timer shown to students in the top-left of the discussion container.
// Depletes clockwise; turns red in the last 10 seconds; shows "Time's Up" at zero.
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

/** Circular SVG countdown timer for the student discussion view. */
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

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const progress = timerTotalSeconds > 0 ? Math.max(0, remaining / timerTotalSeconds) : 0;
  const strokeDashoffset = circumference * (1 - progress);
  const isExpired = remaining <= 0;
  const isWarning = remaining <= 10 && !isExpired;

  const strokeColor = isExpired || isWarning ? 'var(--destructive)' : 'var(--primary)';
  const textColor = isExpired || isWarning ? 'var(--destructive)' : 'var(--foreground)';

  return (
    <div
      className="flex flex-col items-center"
      data-testid="student-timer"
      aria-label={isExpired ? "Time's up" : `Time remaining: ${formatTime(remaining)}`}
    >
      <svg viewBox="0 0 80 80" width="64" height="64">
        {/* Track ring */}
        <circle
          cx="40" cy="40" r={radius}
          stroke="var(--border)"
          strokeWidth="6"
          fill="none"
        />
        {/* Countdown arc */}
        <circle
          cx="40" cy="40" r={radius}
          stroke={strokeColor}
          strokeWidth="6"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
          style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s ease' }}
        />
        {/* Time label */}
        <text
          x="40" y="40"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={isExpired ? '9' : '12'}
          fontFamily="monospace"
          fontWeight="700"
          fill={textColor}
        >
          {isExpired ? "00:00" : formatTime(remaining)}
        </text>
      </svg>
      <span className="text-[10px] font-medium mt-0.5" style={{ color: textColor }}>
        {isExpired ? "Time's up" : 'left'}
      </span>
    </div>
  );
}
