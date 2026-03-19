// Shown when the discussion timer expires and the student has not submitted a response.
'use client';

interface TimerExpiredMessageProps {
  feedbackEnabled?: boolean;
  correctOption?: string | null;
  correctOptionText?: string | null;
  isMC?: boolean;
}

/** Displayed when time is up and the student did not submit. */
export function TimerExpiredMessage({
  feedbackEnabled,
  correctOption,
  correctOptionText,
  isMC,
}: TimerExpiredMessageProps) {
  return (
    <div
      data-testid="timer-expired-message"
      role="alert"
      className="rounded-2xl p-5 enter"
      style={{
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.25)',
        borderLeft: '3px solid #ef4444',
      }}
    >
      <p className="font-semibold flex items-center gap-2 text-base mb-1" style={{ color: 'var(--recording-text, #dc2626)' }}>
        Time&apos;s up!
      </p>
      <p className="text-sm" style={{ color: 'var(--recording-text, #ef4444)' }}>No answer was submitted.</p>
      {isMC && feedbackEnabled && correctOption && (
        <p
          className="text-sm font-medium mt-2 pt-2"
          style={{ borderTop: '1px solid rgba(239,68,68,0.15)', color: 'var(--recording-text, #dc2626)' }}
        >
          Correct Answer: <span className="font-bold">{correctOption}.</span>{' '}
          {correctOptionText ?? '(answer text unavailable)'}
        </p>
      )}
    </div>
  );
}
