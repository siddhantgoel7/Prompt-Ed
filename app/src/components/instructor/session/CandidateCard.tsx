// Selectable card for a single AI-generated discussion prompt candidate in the generation panel.
'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'; // DEBUG
import type { GeneratedPrompt } from '@/types/ai';

// ─── Candidate card (teammate's design) ──────────────────────────────────────

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
            className={[
                'w-full text-left p-3 rounded-lg border-2 text-sm transition-colors',
                isSelected ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-400 bg-white',
            ].join(' ')}
        >
            <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                    {/* DEBUG */}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Badge variant="secondary" className="text-xs capitalize cursor-default">
                                    {candidate.promptType.replace('_', ' ')}
                                </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                                {candidate.bloomsLevel && <p><span className="font-semibold">Bloom&apos;s:</span> {candidate.bloomsLevel}</p>}
                                {candidate.topicArea && <p><span className="font-semibold">Topic:</span> {candidate.topicArea}</p>}
                                {candidate.rationale && <p><span className="font-semibold">Rationale:</span> {candidate.rationale}</p>}
                                {!candidate.bloomsLevel && !candidate.topicArea && !candidate.rationale && <p>No metadata</p>}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    {/* END DEBUG */}
                    {isSelected && <span className="text-xs text-green-600 font-medium">Selected</span>}
                </div>
            </div>
            <p className="leading-snug">{candidate.promptText}</p>
            {candidate.mcOptions && candidate.mcOptions.length > 0 && (
                <ul className="mt-2 space-y-1">
                    {candidate.mcOptions.map((opt) => (
                        <li key={opt.label} className="text-xs text-muted-foreground">
                            <span className="font-semibold">{opt.label}.</span> {opt.text}
                        </li>
                    ))}
                </ul>
            )}
        </button>
    );
}
