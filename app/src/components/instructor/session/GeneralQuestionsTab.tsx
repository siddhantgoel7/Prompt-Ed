// Tab content panel for viewing and publishing pre-generated general questions.
'use client';

import * as React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { GeneralQuestion, GeneratedPrompt } from '@/types/ai';
import { SessionContext } from './SessionContext';
import { StartDiscussionDialog } from './StartDiscussionDialog';

/** Renders the list of pre-generated general questions with publish buttons. */
export function GeneralQuestionsTab() {
    const context = React.useContext(SessionContext);
    const [showTimerDialog, setShowTimerDialog] = React.useState(false);
    const [pendingQuestion, setPendingQuestion] = React.useState<GeneralQuestion | null>(null);
    const [pendingFeedbackEnabled, setPendingFeedbackEnabled] = React.useState(false);

    if (!context) return null;

    const {
        generalQuestions,
        isGeneratingGeneral,
        generalWarning,
        generateGeneralQuestions,
        handlePublishAiCandidate,
        isConnected,
        files,
    } = context;

    const hasReadyFiles = files.some(f => f.status === 'ready');

    const handlePublish = (question: GeneralQuestion, feedbackEnabled: boolean, timerSeconds: number | null) => {
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
            handlePublish(pendingQuestion, pendingFeedbackEnabled, timerSeconds);
            setPendingQuestion(null);
            setPendingFeedbackEnabled(false);
        }
    };

    return (
        <div className="space-y-3">
            {/* Generate button */}
            <button
                onClick={generateGeneralQuestions}
                disabled={isGeneratingGeneral || !hasReadyFiles}
                className="w-full px-3 py-2 text-sm font-semibold text-white rounded-[10px] disabled:opacity-50 disabled:cursor-not-allowed btn-primary-glow transition-all duration-150"
                style={{ background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-400))' }}
            >
                {isGeneratingGeneral ? 'Generating Questions...' : generalQuestions.length > 0 ? 'Regenerate Questions' : 'Generate General Questions'}
            </button>

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
                <ScrollArea className="h-[calc(100vh-220px)] pr-1">
                    <div className="space-y-2">
                        {generalQuestions.map((q, i) => (
                            <GeneralQuestionCard
                                key={q.id}
                                question={q}
                                index={i}
                                isConnected={isConnected}
                                onPublish={(feedbackEnabled) => {
                                    setPendingQuestion(q);
                                    setPendingFeedbackEnabled(feedbackEnabled);
                                    setShowTimerDialog(true);
                                }}
                            />
                        ))}
                    </div>
                </ScrollArea>
            )}

            <StartDiscussionDialog
                open={showTimerDialog}
                onConfirm={handleTimerConfirm}
                onCancel={() => { setShowTimerDialog(false); setPendingQuestion(null); setPendingFeedbackEnabled(false); }}
            />
        </div>
    );
}

function GeneralQuestionCard({
    question,
    index,
    isConnected,
    onPublish,
}: {
    question: GeneralQuestion;
    index: number;
    isConnected: boolean;
    onPublish: (feedbackEnabled: boolean) => void;
}) {
    const [feedbackEnabled, setFeedbackEnabled] = React.useState(false);

    return (
        <div
            className="p-3 rounded-xl text-sm"
            style={{
                background: 'var(--surface-raised)',
                border: '1px solid var(--border-default)',
            }}
        >
            <div className="flex items-center gap-2 mb-1.5">
                <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-brand-600"
                    style={{ background: 'var(--color-primary-alpha-12)' }}
                >
                    Q{index + 1}
                </span>
                <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full capitalize text-content-muted"
                    style={{ background: 'rgba(0,0,0,0.04)' }}
                >
                    Multiple Choice
                </span>
            </div>

            <p className="leading-snug text-sm text-content-primary mb-2">
                {question.prompt_text}
            </p>

            <ul className="space-y-1 mb-2">
                {question.mc_options.map((opt) => (
                    <li key={opt.label} className="text-xs text-content-muted flex items-start gap-1">
                        <span className={`font-semibold mr-0.5 ${opt.label === question.correct_option ? 'text-brand-500' : 'text-content-secondary'}`}>
                            {opt.label}.
                        </span>
                        <span className={opt.label === question.correct_option ? 'text-brand-500 font-medium' : ''}>
                            {opt.text}
                        </span>
                    </li>
                ))}
            </ul>

            {/* Feedback toggle — matches MultipleChoiceEditor pattern */}
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
                onClick={() => onPublish(feedbackEnabled)}
                disabled={!isConnected}
                className="w-full rounded-[8px] text-xs py-1.5 font-semibold text-white transition-all duration-150 disabled:opacity-50"
                style={{
                    background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-400))',
                }}
            >
                Publish to Students
            </button>
        </div>
    );
}
