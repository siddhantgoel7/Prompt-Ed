import * as React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export interface MCOptionData {
    label: string;
    text: string;
}

export interface MultipleChoiceEditorProps {
    options: MCOptionData[];
    correctOption: string | null;
    onCorrectOptionChange: (label: string) => void;
    onOptionTextChange: (label: string, text: string) => void;
    feedbackEnabled: boolean;
    onFeedbackChange: (enabled: boolean) => void;
    nameGroup: string;
}

export function MultipleChoiceEditor({
    options,
    correctOption,
    onCorrectOptionChange,
    onOptionTextChange,
    feedbackEnabled,
    onFeedbackChange,
    nameGroup,
}: MultipleChoiceEditorProps) {
    return (
        <div
            className="mt-2 p-4 rounded-xl bg-surface-raised"
            style={{
                border: '1px solid var(--border-default)',
            }}
        >
            <Tooltip>
                <TooltipTrigger asChild>
                    <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 text-content-muted cursor-default">
                        Options &amp; Correct Answer
                    </h3>
                </TooltipTrigger>
                <TooltipContent>
                    Select the radio button next to the correct answer. This is used to calculate response accuracy but is never shown to students.
                </TooltipContent>
            </Tooltip>

            <div className="space-y-2">
                {options.map((opt) => {
                    const isCorrect = correctOption === opt.label;
                    return (
                        <div key={opt.label} className="flex items-center gap-2 text-xs">
                            <input
                                type="radio"
                                name={nameGroup}
                                value={opt.label}
                                checked={isCorrect}
                                onChange={() => onCorrectOptionChange(opt.label)}
                                className="cursor-pointer accent-[var(--color-primary-500)]"
                            />
                            <span
                                className="font-bold w-4 flex-shrink-0"
                                style={{ color: isCorrect ? 'var(--color-primary-600)' : 'var(--text-secondary)' }}
                            >
                                {opt.label}.
                            </span>
                            <input
                                type="text"
                                value={opt.text}
                                onChange={(e) => onOptionTextChange(opt.label, e.target.value)}
                                className="flex-1 px-2.5 py-1.5 rounded-[8px] text-xs transition-all duration-150"
                                style={{
                                    background: isCorrect ? 'var(--color-primary-alpha-06)' : 'var(--surface-base)',
                                    border: isCorrect
                                        ? '1.5px solid var(--color-primary-400)'
                                        : '1px solid var(--border-default)',
                                    color: 'var(--text-primary)',
                                    fontWeight: isCorrect ? 500 : 400,
                                }}
                                placeholder={`Option ${opt.label}`}
                            />
                        </div>
                    );
                })}
            </div>

            <div
                className="mt-3 pt-3 border-t border-line-subtle"
            >
                <Tooltip>
                    <TooltipTrigger asChild>
                        <label
                            className="flex items-center gap-2 text-xs font-medium cursor-pointer text-content-secondary"
                        >
                            <input
                                type="checkbox"
                                checked={feedbackEnabled}
                                onChange={(e) => onFeedbackChange(e.target.checked)}
                                className="accent-[var(--color-primary-500)]"
                            />
                            Show correctness feedback to students
                        </label>
                    </TooltipTrigger>
                    <TooltipContent>
                        When enabled, students see correct or incorrect feedback immediately after submitting.
                    </TooltipContent>
                </Tooltip>
            </div>
        </div>
    );
}
