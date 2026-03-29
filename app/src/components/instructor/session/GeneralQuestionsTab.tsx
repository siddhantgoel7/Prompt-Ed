// Tab content panel for viewing and publishing pre-generated general questions.
'use client';

import * as React from 'react';
const GENERATING_CHARS = 'Generating...'.split('').map((ch, i) => ({ id: `gc-${i}`, ch }));
import { ScrollArea } from '@/components/ui/scroll-area';
import type { GeneralQuestion, GeneratedPrompt } from '@/types/ai';
import { SessionContext } from './SessionContext';
import { StartDiscussionDialog } from './StartDiscussionDialog';
import { CandidateCard } from './CandidateCard';

function toGeneratedPrompt(q: GeneralQuestion): GeneratedPrompt {
    return {
        promptText: q.prompt_text,
        promptType: 'multiple_choice',
        mcOptions: q.mc_options.map(opt => ({
            ...opt,
            is_correct: opt.label === q.correct_option,
        })),
    };
}

/** Renders the list of pre-generated general questions with publish buttons. */
export function GeneralQuestionsTab() {
    const context = React.useContext(SessionContext);
    const [showTimerDialog, setShowTimerDialog] = React.useState(false);
    const [pendingPublish, setPendingPublish] = React.useState<{
        candidate: GeneratedPrompt;
        correctOption: string | null;
        feedbackEnabled: boolean;
    } | null>(null);
    const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);

    const generalQuestions = context?.generalQuestions ?? [];

    // Reset selection when questions are regenerated (must be before early return)
    const prevLengthRef = React.useRef(generalQuestions.length);
    if (generalQuestions.length !== prevLengthRef.current) {
        prevLengthRef.current = generalQuestions.length;
        setSelectedIndex(null);
    }

    if (!context) return null;

    const {
        isGeneratingGeneral,
        generalWarning,
        generateGeneralQuestions,
        handlePublishAiCandidate,
        isConnected,
        files,
    } = context;

    const hasReadyFiles = files.some(f => f.status === 'ready');

    const handleRequestPublish = (candidate: GeneratedPrompt, correctOption: string | null, feedbackEnabled: boolean) => {
        setPendingPublish({ candidate, correctOption, feedbackEnabled });
        setShowTimerDialog(true);
    };

    const handleTimerConfirm = (timerSeconds: number | null) => {
        setShowTimerDialog(false);
        if (pendingPublish) {
            handlePublishAiCandidate(pendingPublish.candidate, pendingPublish.correctOption, pendingPublish.feedbackEnabled, timerSeconds);
            setPendingPublish(null);
        }
    };

    const generateButtonLabel = generalQuestions.length > 0 ? 'Regenerate General Questions' : 'Generate General Questions';

    return (
        <div className="space-y-3">
            {/* Generate button — matches Generate Prompts style */}
            <div className="flex justify-center">
                <div className={`rotating-glow-wrap${isGeneratingGeneral ? ' generating' : ''}`}>
                    <button
                        onClick={generateGeneralQuestions}
                        disabled={isGeneratingGeneral || !hasReadyFiles}
                        className="px-6 py-2 text-sm font-semibold text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
                        style={{
                            background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-400))',
                            opacity: 1,
                        }}
                    >
                        {isGeneratingGeneral ? (
                            <span aria-label="Generating…" style={{ display: 'inline-flex' }}>
                                {GENERATING_CHARS.map(({ id, ch }, i) => (
                                    <span
                                        key={id}
                                        className={ch === '.' ? 'generating-char' : 'generating-shimmer'}
                                        style={{ animationDelay: `${i * 0.07}s` }}
                                    >
                                        {ch}
                                    </span>
                                ))}
                            </span>
                        ) : generateButtonLabel}
                    </button>
                </div>
            </div>

            {!hasReadyFiles && generalQuestions.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                    Upload and process course files first to generate general questions.
                </p>
            )}

            {generalWarning && (
                <p
                    className="text-xs rounded-lg px-3 py-2"
                    style={{
                        background: 'rgba(245,158,11,0.10)',
                        border: '1px solid rgba(245,158,11,0.25)',
                        color: '#b45309',
                    }}
                >
                    {generalWarning}
                </p>
            )}

            {isGeneratingGeneral && (
                <p className="text-xs text-center py-4 animate-pulse text-content-muted">
                    Generating questions from course materials...
                </p>
            )}

            {/* Question list */}
            {generalQuestions.length > 0 && (
                <ScrollArea className="h-[calc(100vh-280px)] pr-1">
                    <div className="space-y-2">
                        {generalQuestions.map((q, i) => (
                            <CandidateCard
                                key={q.id}
                                candidate={toGeneratedPrompt(q)}
                                index={i}
                                isSelected={selectedIndex === i}
                                onSelect={() => setSelectedIndex(selectedIndex === i ? null : i)}
                                isConnected={isConnected}
                                onRequestPublish={handleRequestPublish}
                            />
                        ))}
                    </div>
                </ScrollArea>
            )}

            <StartDiscussionDialog
                open={showTimerDialog}
                onConfirm={handleTimerConfirm}
                onCancel={() => { setShowTimerDialog(false); setPendingPublish(null); }}
            />
        </div>
    );
}
