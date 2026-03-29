// Card that displays the active discussion prompt to a student.
// For MC questions, renders selectable answer option buttons.
// src/components/student/session/StudentPromptCard.tsx
'use client';

import type { Discussion } from '@/types/discussion';
import type { MCOptionSafe } from '@/types/ai';
import * as React from 'react';

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
}: Readonly<{
  discussion: Discussion;
  selectedOption?: string | null;
  onSelectOption?: (label: string) => void;
  /** The label (e.g. "A") the student already submitted; triggers submitted-state styling. */
  submittedOption?: string | null;
  showCorrectness?: boolean;
  correctOption?: string | null;
  disabled?: boolean;
}>) {
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
        <div className="p-4 space-y-2.5" role="radiogroup" aria-label="Answer options">
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
}: Readonly<{
  opt: MCOptionSafe;
  selectedOption?: string | null;
  submittedOption?: string | null;
  showCorrectness?: boolean;
  correctOption?: string | null;
  disabled?: boolean;
  onSelect?: (label: string) => void;
}>) {
  const label = opt.label;
  const isThis = label === submittedOption;
  const isCorrectOpt = label === correctOption;

  const getOptionState = () => {
    if (!submittedOption) {
      if (disabled) return 'disabled';
      return selectedOption === label ? 'selected' : 'unselected';
    }
    if (!showCorrectness) return isThis ? 'submitted' : 'other';
    if (isThis && isCorrectOpt) return 'correct-submitted';
    if (isThis && !isCorrectOpt) return 'wrong-submitted';
    return isCorrectOpt ? 'correct-highlight' : 'other';
  };

  const state = getOptionState();

  const STYLE_MAP: Record<string, React.CSSProperties> = {
    'correct-submitted': { background: 'var(--color-primary-alpha-18)', border: '2px solid var(--color-primary-500)', color: 'var(--color-primary-700)' },
    'wrong-submitted': { background: 'var(--color-error-alpha-12)', border: '2px solid var(--color-error-500)', color: 'var(--color-error-600)' },
    'correct-highlight': { background: 'var(--color-primary-alpha-10)', border: '2px solid var(--color-primary-400)', color: 'var(--color-primary-600)' },
    'submitted': { background: 'var(--color-primary-alpha-10)', border: '2px solid var(--color-primary-300)', color: 'var(--text-secondary)' },
    'selected': { background: 'var(--color-primary-alpha-18)', border: '2px solid var(--color-primary-500)', color: 'var(--text-primary)', cursor: 'pointer' },
    'disabled': { background: 'var(--surface-raised)', border: '1.5px solid var(--border-subtle)', color: 'var(--text-secondary)' },
    'unselected': { background: 'var(--color-primary-alpha-05)', border: '1.5px solid var(--border-default)', color: 'var(--text-secondary)', cursor: 'pointer' },
    'other': { background: 'var(--surface-raised)', border: '1.5px solid var(--border-subtle)', color: 'var(--text-muted)', opacity: 0.6 },
  };

  const RADIO_MAP: Record<string, string> = {
    'correct-submitted': 'var(--color-primary-500)',
    'wrong-submitted': 'var(--color-error-500)',
    'correct-highlight': 'var(--color-primary-400)',
    'submitted': 'var(--color-primary-300)',
    'selected': 'var(--color-primary-500)',
  };

  const baseStyle: React.CSSProperties = {
    width: '100%', textAlign: 'left', padding: '12px 16px', borderRadius: '30px',
    fontSize: '0.875rem', transition: 'all 0.15s ease', cursor: 'default',
    display: 'flex', alignItems: 'center', gap: '10px',
    ...STYLE_MAP[state]
  };

  const radioBg = RADIO_MAP[state] || 'transparent';
  const radioBorder = radioBg === 'transparent' ? '2px solid var(--border-default)' : `2px solid ${radioBg}`;

  return (
    <button
      data-testid={`mc-option-${label}`}
      data-state={state}
      role="radio"
      aria-checked={selectedOption === label}
      onClick={() => { if (!submittedOption && !disabled) onSelect?.(label); }}
      style={baseStyle}
    >
      <div
        style={{
          width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease',
          background: radioBg, border: radioBorder
        }}
      >
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
