// Tab content panel for viewing and publishing pre-generated general questions.
'use client';

import * as React from 'react';
const GENERATING_CHARS = 'Generating...'.split('');
import { ScrollArea } from '@/components/ui/scroll-area';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { GeneralQuestion, GeneratedPrompt, MCOption } from '@/types/ai';
import { SessionContext } from './SessionContext';
import { StartDiscussionDialog } from './StartDiscussionDialog';

/** Renders the list of pre-generated general questions with publish buttons. */
export function GeneralQuestionsTab() {
    const context = React.useContext(SessionContext);
    const [showTimerDialog, setShowTimerDialog] = React.useState(false);
    const [pendingQuestion, setPendingQuestion] = React.useState<GeneralQuestion | null>(null);
    const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);
    const [feedbackEnabled, setFeedbackEnabled] = React.useState(false);

    const generalQuestions = context?.generalQuestions ?? [];

    // Reset selection when questions are regenerated (must be before early return)
    const prevLengthRef = React.useRef(generalQuestions.length);
    if (generalQuestions.length !== prevLengthRef.current) {
        prevLengthRef.current = generalQuestions.length;
        setSelectedIndex(null);
        setFeedbackEnabled(false);
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

    const handleSelect = (index: number) => {
        if (selectedIndex === index) {
            setSelectedIndex(null);
            setFeedbackEnabled(false);
        } else {
            setSelectedIndex(index);
            setFeedbackEnabled(false);
        }
    };

    const handlePublish = (question: GeneralQuestion, timerSeconds: number | null) => {
        const candidate: GeneratedPrompt = {
            promptText: question.prompt_text,
            promptType: 'multiple_choice',
            mcOptions: question.mc_options,
        };
        handlePublishAiCandidate(candidate, question.correct_option, feedbackEnabled, timerSeconds);
    };

    const handleTimerConfirm = (timerSeconds: number | null) => {
        setShowTimerDialog(false);
        if (pendingQuestion) {
            handlePublish(pendingQuestion, timerSeconds);
            setPendingQuestion(null);
        }
    };

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
                                {GENERATING_CHARS.map((ch, i) => (
                                    <span
                                        key={i}
                                        className={ch === '.' ? 'generating-char' : 'generating-shimmer'}
                                        style={{ animationDelay: `${i * 0.07}s` }}
                                    >
                                        {ch}
                                    </span>
                                ))}
                            </span>
                        ) : generalQuestions.length > 0 ? 'Regenerate General Questions' : 'Generate General Questions'}
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
                            <div key={q.id}>
                                {selectedIndex === i ? (
                                    /* Selected: expanded card matching AI generation selected style */
                                    <div
                                        className="p-3 rounded-xl text-sm"
                                        style={{
                                            background: 'rgba(45,158,45,0.06)',
                                            border: '2px solid var(--color-primary-400)',
                                        }}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <span
                                                className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize text-brand-600"
                                                style={{ background: 'var(--color-primary-alpha-12)' }}
                                            >
                                                Multiple Choice
                                            </span>
                                            <span className="text-xs font-medium text-brand-500">
                                                Selected
                                            </span>
                                        </div>

                                        <p className="leading-snug text-sm text-content-primary mb-2">
                                            {q.prompt_text}
                                        </p>

                                        <ul className="space-y-1 mb-3">
                                            {q.mc_options.map((opt: MCOption) => (
                                                <li key={opt.label} className="text-xs flex items-start gap-1">
                                                    <span
                                                        className={`font-semibold mr-0.5 ${opt.label === q.correct_option ? 'text-brand-500' : 'text-content-secondary'}`}
                                                    >
                                                        {opt.label}.
                                                    </span>
                                                    <span className={opt.label === q.correct_option ? 'text-brand-500 font-medium' : 'text-content-muted'}>
                                                        {opt.text}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>

                                        {/* Feedback toggle */}
                                        <div className="mb-2 pt-2 border-t border-line-subtle">
                                            <div className="flex items-center gap-1.5">
                                                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-content-secondary">
                                                    <input
                                                        type="checkbox"
                                                        checked={feedbackEnabled}
                                                        onChange={(e) => setFeedbackEnabled(e.target.checked)}
                                                        className="accent-[var(--color-primary-500)]"
                                                    />
                                                    Show correctness feedback
                                                </label>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-label="About correctness feedback" />
                                                    </TooltipTrigger>
                                                    <TooltipContent>When enabled, students see correct or incorrect feedback immediately after submitting.</TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => { setPendingQuestion(q); setShowTimerDialog(true); }}
                                            disabled={!isConnected}
                                            className="mt-1 w-full rounded-[10px] text-xs py-2 font-semibold text-white transition-all duration-150 disabled:opacity-50 btn-primary-glow"
                                            style={{
                                                background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-400))',
                                            }}
                                        >
                                            Publish This Question →
                                        </button>
                                    </div>
                                ) : (
                                    /* Not selected: compact clickable card matching CandidateCard style */
                                    <button
                                        onClick={() => handleSelect(i)}
                                        className="w-full text-left p-3 rounded-xl text-sm transition-all duration-150"
                                        style={{
                                            background: 'var(--surface-raised)',
                                            border: '1px solid var(--border-default)',
                                            color: 'var(--text-primary)',
                                        }}
                                        onMouseEnter={(e) => {
                                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-primary-300)';
                                        }}
                                        onMouseLeave={(e) => {
                                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)';
                                        }}
                                    >
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span
                                                className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize text-brand-600"
                                                style={{ background: 'var(--color-primary-alpha-12)' }}
                                            >
                                                Multiple Choice
                                            </span>
                                        </div>
                                        <p className="leading-snug text-sm text-content-primary">
                                            {q.prompt_text}
                                        </p>
                                        <ul className="mt-2 space-y-1">
                                            {q.mc_options.map((opt: MCOption) => (
                                                <li key={opt.label} className="text-xs text-content-muted">
                                                    <span className="font-semibold mr-1 text-content-secondary">
                                                        {opt.label}.
                                                    </span>
                                                    {opt.text}
                                                </li>
                                            ))}
                                        </ul>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            )}

            <StartDiscussionDialog
                open={showTimerDialog}
                onConfirm={handleTimerConfirm}
                onCancel={() => { setShowTimerDialog(false); setPendingQuestion(null); }}
            />
        </div>
    );
}
