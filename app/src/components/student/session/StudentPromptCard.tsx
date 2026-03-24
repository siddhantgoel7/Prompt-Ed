// Card that displays the active discussion prompt to a student.
// For MC questions, renders selectable answer option buttons.
// src/components/student/session/StudentPromptCard.tsx
'use client';

import type { Discussion } from '@/types/discussion';
import type { MCOptionSafe } from '@/types/ai';

// SECURITY: mc_options here never contains is_correct — stripped server-side.
// @see US 2.10
/** Displays the discussion prompt text and, for MC questions, clickable option buttons. */
export function StudentPromptCard({
  discussion,
  selectedOption,
  onSelectOption,
  submittedOption,
  showCorrectness,
  correctOption,
  disabled,
}: {
  discussion: Discussion;
  selectedOption?: string | null;
  onSelectOption?: (label: string) => void;
  /** The label (e.g. "A") the student already submitted; triggers submitted-state styling. */
  submittedOption?: string | null;
  /**
   * When true, reveals which option was correct after submission.
   * Only set once the discussion is closed or the instructor enables feedback.
   * Never set during an active discussion — students must not see the answer early.
   */
  showCorrectness?: boolean;
  /**
   * The label of the correct answer (e.g. "B"). Only passed when showCorrectness is true.
   * Populated from discussion.correct_option — this field is stripped from the broadcast
   * payload sent to students and is only available after submission or from instructor data.
   */
  correctOption?: string | null;
  /**
   * When true, disables all option buttons so the student cannot change their answer.
   * Set after submission or when the discussion is closed.
   */
  disabled?: boolean;
}) {
  const isMC =
    discussion.prompt_type === 'multiple_choice' &&
    !!discussion.mc_options &&
    discussion.mc_options.length > 0;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--surface-glass)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid var(--border-default)',
        boxShadow: '0 2px 16px var(--color-primary-alpha-06)',
      }}
    >
      {/* Prompt header */}
      <div
        className="px-5 py-4 border-b border-line-subtle"
        style={{
          borderLeft: '3px solid var(--color-primary-500)',
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-brand-500">
          Discussion Prompt
        </p>
        <p className="text-base leading-relaxed text-content-primary">
          {discussion.prompt_text}
        </p>

        {isMC && (
          <p className="text-xs mt-2 italic text-brand-400">
            Select one of the options below
          </p>
        )}
      </div>

      {/* MC options */}
      {isMC && discussion.mc_options ? (
        <div className="p-4 space-y-2.5">
          {discussion.mc_options.map((opt: MCOptionSafe) => (
            <MCOptionButton
              key={opt.label}
              opt={opt}
              selectedOption={selectedOption}
              submittedOption={submittedOption}
              showCorrectness={showCorrectness}
              correctOption={correctOption}
              disabled={disabled}
              onSelect={onSelectOption}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ─── Sub-components and Helpers ───────────────────────────────────────────────

function MCOptionButton({
  opt, selectedOption, submittedOption, showCorrectness, correctOption, disabled, onSelect
}: any) {
  const label = opt.label;
  const isThis = label === submittedOption;
  const isCorrectOpt = label === correctOption;
  const isSelected = selectedOption === label || isThis;

  const getStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      width: '100%', textAlign: 'left', padding: '12px 16px', borderRadius: '30px',
      fontSize: '0.875rem', transition: 'all 0.15s ease', cursor: 'default',
      display: 'flex', alignItems: 'center', gap: '10px',
    };

    if (submittedOption) {
      if (showCorrectness) {
        if (isThis && isCorrectOpt) return { ...base, background: 'var(--color-primary-alpha-18)', border: '2px solid var(--color-primary-500)', color: 'var(--color-primary-700)' };
        if (isThis && !isCorrectOpt) return { ...base, background: 'var(--color-error-alpha-12)', border: '2px solid var(--color-error-500)', color: 'var(--color-error-600)' };
        if (isCorrectOpt) return { ...base, background: 'var(--color-primary-alpha-10)', border: '2px solid var(--color-primary-400)', color: 'var(--color-primary-600)' };
        return { ...base, background: 'var(--surface-raised)', border: '1.5px solid var(--border-subtle)', color: 'var(--text-muted)', opacity: 0.6 };
      }
      if (isThis) return { ...base, background: 'var(--color-primary-alpha-10)', border: '2px solid var(--color-primary-300)', color: 'var(--text-secondary)' };
      return { ...base, background: 'var(--surface-raised)', border: '1.5px solid var(--border-subtle)', color: 'var(--text-muted)', opacity: 0.5 };
    }
    if (disabled) return { ...base, background: 'var(--surface-raised)', border: '1.5px solid var(--border-subtle)', color: 'var(--text-secondary)' };
    if (selectedOption === label) return { ...base, background: 'var(--color-primary-alpha-18)', border: '2px solid var(--color-primary-500)', color: 'var(--text-primary)', cursor: 'pointer' };
    return { ...base, background: 'var(--color-primary-alpha-05)', border: '1.5px solid var(--border-default)', color: 'var(--text-secondary)', cursor: 'pointer' };
  };

  const getRadioStyle = (): React.CSSProperties => {
    let bg = 'transparent';
    let border = '2px solid var(--border-default)';

    if (isSelected && !submittedOption) {
      bg = 'var(--color-primary-500)'; border = '2px solid var(--color-primary-500)';
    } else if (submittedOption) {
      if (isThis && showCorrectness && isCorrectOpt) { bg = 'var(--color-primary-500)'; border = '2px solid var(--color-primary-500)'; }
      else if (isThis && showCorrectness && !isCorrectOpt) { bg = 'var(--color-error-500)'; border = '2px solid var(--color-error-500)'; }
      else if (isThis) { bg = 'var(--color-primary-300)'; border = '2px solid var(--color-primary-300)'; }
      else if (isCorrectOpt && showCorrectness) { bg = 'var(--color-primary-400)'; border = '2px solid var(--color-primary-400)'; }
    }
    return { width: '18px', height: '18px', borderRadius: '50%', border, background: bg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease' };
  };

  const getState = (): string => {
    if (submittedOption) {
      if (showCorrectness) {
        if (isThis && isCorrectOpt) return 'correct-submitted';
        if (isThis && !isCorrectOpt) return 'wrong-submitted';
        if (isCorrectOpt) return 'correct-highlight';
        return 'other';
      }
      return isThis ? 'submitted' : 'other';
    }
    if (selectedOption === label) return 'selected';
    if (disabled) return 'disabled';
    return 'unselected';
  };

  return (
    <button
      data-testid={`mc-option-${label}`}
      data-state={getState()}
      onClick={() => { if (!submittedOption && !disabled) onSelect?.(label); }}
      style={getStyle()}
    >
      <div style={getRadioStyle()}>
        {(selectedOption === label && !submittedOption) && (
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />
        )}
      </div>
      <span>
        <span className="font-semibold mr-1.5" style={{ color: 'inherit' }}>{label}.</span>
        {opt.text}
      </span>
    </button>
  );
}
