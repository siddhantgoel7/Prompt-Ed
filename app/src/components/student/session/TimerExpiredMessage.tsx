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
        background: 'var(--color-error-alpha-08)',
        border: '1px solid var(--color-error-alpha-25)',
        borderLeft: '3px solid var(--color-error-500)',
      }}
    >
      <p className="font-semibold flex items-center gap-2 text-base mb-1" style={{ color: 'var(--recording-text, var(--color-error-600))' }}>
        Time&apos;s up!
      </p>
      <p className="text-sm" style={{ color: 'var(--recording-text, var(--color-error-500))' }}>No answer was submitted.</p>
      {isMC && feedbackEnabled && correctOption && (
        <p
          className="text-sm font-medium mt-2 pt-2"
          style={{ borderTop: '1px solid rgba(239,68,68,0.15)', color: 'var(--recording-text, var(--color-error-600))' }}
        >
          Correct Answer: <span className="font-bold">{correctOption}.</span>{' '}
          {correctOptionText ?? '(answer text unavailable)'}
        </p>
      )}
    </div>
  );
}
