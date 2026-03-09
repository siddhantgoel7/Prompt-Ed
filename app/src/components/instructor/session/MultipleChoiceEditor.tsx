import * as React from 'react';

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
        <div className="mt-2 p-4 border rounded-lg bg-white border-gray-200">
            <h3 className="text-sm font-semibold mb-3">Options & Correct Answer</h3>
            <div className="space-y-2">
                {options.map((opt) => (
                    <div key={opt.label} className="flex items-center gap-2 text-xs">
                        <input
                            type="radio"
                            name={nameGroup}
                            value={opt.label}
                            checked={correctOption === opt.label}
                            onChange={() => onCorrectOptionChange(opt.label)}
                            className="cursor-pointer"
                        />
                        <span className="font-semibold text-gray-700 w-4">{opt.label}.</span>
                        <input
                            type="text"
                            value={opt.text}
                            onChange={(e) => onOptionTextChange(opt.label, e.target.value)}
                            className={`flex-1 px-2 py-1.5 border rounded focus:outline-none focus:border-black ${correctOption === opt.label
                                    ? 'border-black font-medium bg-gray-50'
                                    : 'border-gray-300'
                                }`}
                            placeholder={`Option ${opt.label}`}
                        />
                    </div>
                ))}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input
                        type="checkbox"
                        checked={feedbackEnabled}
                        onChange={(e) => onFeedbackChange(e.target.checked)}
                    />
                    Show correctness feedback to students
                </label>
            </div>
        </div>
    );
}
