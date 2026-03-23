// Editor component for configuring multiple choice options and selecting the correct answer.
import * as React from 'react';
import { Info } from 'lucide-react';
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
            <div className="flex items-center gap-1.5 mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                    Options &amp; Correct Answer
                </h3>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-label="About correct answer selection" />
                    </TooltipTrigger>
                    <TooltipContent>Select the radio button next to the correct answer. This is used to calculate response accuracy but is never shown to students.</TooltipContent>
                </Tooltip>
            </div>

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
                <div className="flex items-center gap-1.5">
                    <label
                        className="flex items-center gap-2 text-xs font-medium cursor-pointer text-content-secondary"
                    >
                        <input
                            type="checkbox"
                            checked={feedbackEnabled}
                            onChange={(e) => onFeedbackChange(e.target.checked)}
                            className="accent-[var(--color-primary-500)]"
                        />
                        {' '}Show correctness feedback to students
                    </label>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-label="About correctness feedback" />
                        </TooltipTrigger>
                        <TooltipContent>When enabled, students see correct or incorrect feedback immediately after submitting.</TooltipContent>
                    </Tooltip>
                </div>
            </div>
        </div>
    );
}
