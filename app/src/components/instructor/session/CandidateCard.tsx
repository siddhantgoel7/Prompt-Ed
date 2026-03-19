// Selectable card for a single AI-generated discussion prompt candidate in the generation panel.
'use client';

import * as React from 'react';
import type { GeneratedPrompt } from '@/types/ai';

/** Renders a clickable card for an AI-generated prompt candidate, showing the question and MC options. */
export function CandidateCard({
    candidate,
    isSelected,
    onSelect,
}: {
    candidate: GeneratedPrompt;
    isSelected: boolean;
    onSelect: () => void;
}) {
    return (
        <button
            onClick={onSelect}
            className="w-full text-left p-3 rounded-xl text-sm transition-all duration-150"
            style={{
                background: isSelected ? 'rgba(45,158,45,0.06)' : 'var(--surface-raised)',
                border: isSelected
                    ? '2px solid var(--color-primary-400)'
                    : '1px solid var(--border-default)',
                color: 'var(--text-primary)',
            }}
            onMouseEnter={(e) => {
                if (!isSelected) {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-primary-300)';
                }
            }}
            onMouseLeave={(e) => {
                if (!isSelected) {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)';
                }
            }}
        >
            <div className="flex items-start justify-between mb-1.5">
                <div className="flex items-center gap-2">
                    <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
                        style={{ background: 'rgba(45,158,45,0.12)', color: 'var(--color-primary-600)' }}
                    >
                        {candidate.promptType.replace('_', ' ')}
                    </span>
                    {isSelected && (
                        <span className="text-xs font-medium" style={{ color: 'var(--color-primary-500)' }}>
                            Selected
                        </span>
                    )}
                </div>
            </div>

            <p className="leading-snug text-sm" style={{ color: 'var(--text-primary)' }}>
                {candidate.promptText}
            </p>

            {candidate.mcOptions && candidate.mcOptions.length > 0 && (
                <ul className="mt-2 space-y-1">
                    {candidate.mcOptions.map((opt) => (
                        <li key={opt.label} className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            <span className="font-semibold mr-1" style={{ color: 'var(--text-secondary)' }}>
                                {opt.label}.
                            </span>
                            {opt.text}
                        </li>
                    ))}
                </ul>
            )}
        </button>
    );
}
