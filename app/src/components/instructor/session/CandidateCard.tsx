// Selectable card for a single AI-generated discussion prompt candidate in the generation panel.
'use client';

import * as React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
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
                background: isSelected ? 'var(--color-primary-alpha-06)' : 'var(--surface-raised)',
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
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize text-brand-600"
                        style={{ background: 'var(--color-primary-alpha-12)' }}
                    >
                        {candidate.promptType.replaceAll('_', ' ')}
                    </span>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Info className="w-3 h-3 text-muted-foreground shrink-0" aria-label="About this question type" />
                        </TooltipTrigger>
                        <TooltipContent align="start">
                            {candidate.bloomsLevel && <p><span className="font-semibold">Bloom&apos;s:</span> {candidate.bloomsLevel}</p>}
                            {candidate.topicArea && <p><span className="font-semibold">Topic:</span> {candidate.topicArea}</p>}
                            {candidate.rationale && <p><span className="font-semibold">Rationale:</span> {candidate.rationale}</p>}
                            {!candidate.bloomsLevel && !candidate.topicArea && !candidate.rationale && <p>No metadata</p>}
                        </TooltipContent>
                    </Tooltip>
                    {isSelected && (
                        <span className="text-xs font-medium text-brand-500">
                            Selected
                        </span>
                    )}
                </div>
            </div>

            <p className="leading-snug text-sm text-content-primary">
                {candidate.promptText}
            </p>

            {candidate.mcOptions && candidate.mcOptions.length > 0 && (
                <ul className="mt-2 space-y-1">
                    {candidate.mcOptions.map((opt) => (
                        <li key={opt.label} className="text-xs text-content-muted">
                            <span className="font-semibold mr-1 text-content-secondary">
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
