// Card that displays the active discussion prompt to a student.
// For MC questions, renders selectable answer option buttons.
// src/components/student/session/StudentPromptCard.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  const isMC = discussion.prompt_type === 'multiple_choice' && discussion.mc_options && discussion.mc_options.length > 0;

  function getOptionClass(label: string): string {
    const base = 'w-full text-left px-4 py-3 rounded-lg border-2 text-sm transition-colors';

    if (submittedOption) {
      const isThis = label === submittedOption;
      const isCorrectOpt = label === correctOption;

      if (showCorrectness) {
        if (isThis && isCorrectOpt) return `${base} cursor-default border-green-500 bg-green-100 text-green-800`;
        if (isThis && !isCorrectOpt) return `${base} cursor-default border-red-500 bg-red-100 text-red-800`;
        if (isCorrectOpt) return `${base} cursor-default border-green-500 bg-green-100 text-green-800`;
        return `${base} cursor-default border-gray-200 bg-gray-50 text-gray-400`;
      }

      // Gray for submitted option, dimmed for others
      if (isThis) return `${base} cursor-default border-gray-400 bg-gray-200 text-gray-700`;
      return `${base} cursor-default border-gray-200 bg-gray-50 text-gray-400`;
    }

    if (disabled) return `${base} cursor-default border-gray-200 bg-white`;
    if (selectedOption === label) return `${base} border-black bg-black text-white`;
    return `${base} border-gray-200 hover:border-gray-400 bg-white`;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Discussion prompt</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-base leading-relaxed mb-4">{discussion.prompt_text}</p>

        {isMC && discussion.mc_options ? (
          <div className="space-y-2">
            {discussion.mc_options.map((opt: MCOptionSafe) => (
              <button
                key={opt.label}
                onClick={() => {
                  if (!submittedOption && !disabled) {
                    onSelectOption?.(opt.label);
                  }
                }}
                className={getOptionClass(opt.label)}
              >
                <span className="font-semibold mr-2">{opt.label}.</span>
                {opt.text}
              </button>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
