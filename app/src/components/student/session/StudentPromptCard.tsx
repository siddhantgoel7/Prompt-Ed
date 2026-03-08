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
}: {
  discussion: Discussion;
  selectedOption?: string | null;
  onSelectOption?: (label: string) => void;
}) {
  const isMC = discussion.prompt_type === 'multiple_choice' && discussion.mc_options && discussion.mc_options.length > 0;

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
                onClick={() => onSelectOption?.(opt.label)}
                className={[
                  'w-full text-left px-4 py-3 rounded-lg border-2 text-sm transition-colors',
                  selectedOption === opt.label
                    ? 'border-black bg-black text-white'
                    : 'border-gray-200 hover:border-gray-400 bg-white',
                ].join(' ')}
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
