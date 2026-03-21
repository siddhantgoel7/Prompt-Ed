// Response submission form used by students for both free-text and multiple-choice discussions.
'use client';

/** Renders (optionally) a textarea for free-text responses, a character counter, and a Submit button. */
export function StudentResponseForm({
  value,
  onChange,
  onSubmit,
  disabled,
  submitting,
  validationMessage,
  showTextarea = true,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  submitting: boolean;
  validationMessage?: string;
  /**
   * When true (default), renders the textarea for free-text input.
   * Set to false for MC questions — the Submit button and validation message are still
   * shown, but the textarea is hidden because MC answers are submitted via option
   * selection in StudentPromptCard rather than typed text.
   */
  showTextarea?: boolean;
}) {
  const chars = value.length;

  return (
    <div className="space-y-3">
      {showTextarea && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            border: '1px solid var(--border-default)',
            background: 'var(--surface-raised)',
          }}
        >
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type your response here…"
            rows={5}
            disabled={submitting}
            className="w-full px-4 py-3.5 text-sm resize-none bg-transparent outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
          <div
            className="px-4 py-2 flex items-center justify-between text-xs"
            style={{
              borderTop: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
            }}
          >
            <span>{chars} characters</span>
            <span className="hidden sm:inline">Be concise and specific</span>
          </div>
        </div>
      )}

      {validationMessage ? (
        <p role="alert" className="text-sm font-medium" style={{ color: 'oklch(0.577 0.245 27.325)' }}>
          {validationMessage}
        </p>
      ) : null}

      <button
        onClick={onSubmit}
        disabled={disabled || submitting}
        className="w-full py-3.5 rounded-[10px] text-sm font-semibold text-white transition-all duration-150 disabled:opacity-50 btn-primary-glow"
        style={{
          background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-400))',
        }}
      >
        {submitting ? 'Submitting…' : 'Submit Response'}
      </button>
    </div>
  );
}
