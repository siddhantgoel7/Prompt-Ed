// Shown when the discussion timer expires and the student has not submitted a response.
'use client';

interface TimerExpiredMessageProps {
  feedbackEnabled?: boolean;
  correctOption?: string | null;
  isMC?: boolean;
}

/** Displayed when time is up and the student did not submit. */
export function TimerExpiredMessage({ feedbackEnabled, correctOption, isMC }: TimerExpiredMessageProps) {
  return (
    <div
      className="p-4 rounded-lg border border-destructive bg-red-50 text-red-800 space-y-2"
      data-testid="timer-expired-message"
      role="alert"
    >
      <p className="font-semibold flex items-center gap-2 text-base">
        ⏰ Time&apos;s up!
      </p>
      <p className="text-sm">No answer was submitted.</p>
      {isMC && feedbackEnabled && correctOption && (
        <p className="text-sm font-medium mt-1">
          Correct Answer: Option {correctOption}
        </p>
      )}
    </div>
  );
}
