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
  /** The option label the student submitted (shows highlight without feedback). */
  submittedOption?: string | null;
  /** When true, highlights submitted option green/red and reveals correct answer in green. */
  showCorrectness?: boolean;
  /** The correct option label (required when showCorrectness is true). */
  correctOption?: string | null;
  /** Prevents option selection clicks. */
  disabled?: boolean;
}) {
  const isMC =
    discussion.prompt_type === 'multiple_choice' &&
    discussion.mc_options &&
    discussion.mc_options.length > 0;

  function getOptionStyle(label: string): React.CSSProperties {
    const base: React.CSSProperties = {
      width: '100%',
      textAlign: 'left',
      padding: '12px 16px',
      borderRadius: '30px',
      fontSize: '0.875rem',
      transition: 'all 0.15s ease',
      cursor: 'default',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    };

    if (submittedOption) {
      const isThis = label === submittedOption;
      const isCorrectOpt = label === correctOption;

      if (showCorrectness) {
        if (isThis && isCorrectOpt)
          return { ...base, background: 'rgba(45,158,45,0.18)', border: '2px solid var(--color-primary-500)', color: 'var(--color-primary-700)' };
        if (isThis && !isCorrectOpt)
          return { ...base, background: 'rgba(239,68,68,0.12)', border: '2px solid #ef4444', color: '#dc2626' };
        if (isCorrectOpt)
          return { ...base, background: 'rgba(45,158,45,0.10)', border: '2px solid var(--color-primary-400)', color: 'var(--color-primary-600)' };
        return { ...base, background: 'var(--surface-raised)', border: '1.5px solid var(--border-subtle)', color: 'var(--text-muted)', opacity: 0.6 };
      }

      if (isThis)
        return { ...base, background: 'rgba(45,158,45,0.10)', border: '2px solid var(--color-primary-300)', color: 'var(--text-secondary)' };
      return { ...base, background: 'var(--surface-raised)', border: '1.5px solid var(--border-subtle)', color: 'var(--text-muted)', opacity: 0.5 };
    }

    if (disabled)
      return { ...base, background: 'var(--surface-raised)', border: '1.5px solid var(--border-subtle)', color: 'var(--text-secondary)' };

    if (selectedOption === label)
      return { ...base, background: 'rgba(45,158,45,0.18)', border: '2px solid var(--color-primary-500)', color: 'var(--text-primary)', cursor: 'pointer' };

    return {
      ...base,
      background: 'rgba(45,158,45,0.05)',
      border: '1.5px solid var(--border-default)',
      color: 'var(--text-secondary)',
      cursor: 'pointer',
    };
  }

  function getRadioStyle(label: string): React.CSSProperties {
    const isSelected = selectedOption === label || submittedOption === label;
    const isCorrectOpt = label === correctOption;
    const isThisSubmitted = submittedOption === label;

    let bg = 'transparent';
    let border = '2px solid var(--border-default)';

    if (isSelected && !submittedOption) {
      bg = 'var(--color-primary-500)';
      border = '2px solid var(--color-primary-500)';
    } else if (submittedOption) {
      if (isThisSubmitted && showCorrectness && isCorrectOpt) {
        bg = 'var(--color-primary-500)';
        border = '2px solid var(--color-primary-500)';
      } else if (isThisSubmitted && showCorrectness && !isCorrectOpt) {
        bg = '#ef4444';
        border = '2px solid #ef4444';
      } else if (isThisSubmitted) {
        bg = 'var(--color-primary-300)';
        border = '2px solid var(--color-primary-300)';
      } else if (isCorrectOpt && showCorrectness) {
        bg = 'var(--color-primary-400)';
        border = '2px solid var(--color-primary-400)';
      }
    }

    return {
      width: '18px',
      height: '18px',
      borderRadius: '50%',
      border,
      background: bg,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.15s ease',
    };
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--surface-glass)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid var(--border-default)',
        boxShadow: '0 2px 16px rgba(45,158,45,0.06)',
      }}
    >
      {/* Prompt header */}
      <div
        className="px-5 py-4"
        style={{
          borderLeft: '3px solid var(--color-primary-500)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-primary-500)' }}>
          Discussion Prompt
        </p>
        <p className="text-base leading-relaxed" style={{ color: 'var(--text-primary)' }}>
          {discussion.prompt_text}
        </p>

        {isMC && (
          <p className="text-xs mt-2 italic" style={{ color: 'var(--color-primary-400)' }}>
            Select one of the options below
          </p>
        )}
      </div>

      {/* MC options */}
      {isMC && discussion.mc_options ? (
        <div className="p-4 space-y-2.5">
          {discussion.mc_options.map((opt: MCOptionSafe) => (
            <button
              key={opt.label}
              onClick={() => {
                if (!submittedOption && !disabled) {
                  onSelectOption?.(opt.label);
                }
              }}
              style={getOptionStyle(opt.label)}
            >
              {/* Radio indicator */}
              <div style={getRadioStyle(opt.label)}>
                {(selectedOption === opt.label && !submittedOption) && (
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />
                )}
              </div>
              <span>
                <span className="font-semibold mr-1.5" style={{ color: 'inherit' }}>
                  {opt.label}.
                </span>
                {opt.text}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
