// Central panel of the instructor session view: AI prompt generation, STT recording,
// candidate selection, and the Start/Close Discussion button.
'use client';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import * as React from 'react';
import type { GeneratedPrompt } from '@/types/ai';
import type { PromptType } from '@/types/discussion';
import { SessionContext } from './SessionContext';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { CandidateCard, CANDIDATE_COLLAPSE_MS } from './CandidateCard';
import { MultipleChoiceEditor } from './MultipleChoiceEditor';
import { AIPreferencesDialog } from './AIPreferencesDialog';
import { AITipsButton } from './AITipsButton';
import { transcribeAudioApi } from '@/lib/api/aiApi';
import { StartDiscussionDialog } from './StartDiscussionDialog';
import type { TokenUsage } from '@/types/ai';
import { DEBUG_TOOLS } from '@/lib/debug';
import { useDebugSweep } from '@/hooks/useDebugSweep';

/**
 * Central panel of the active session view.
 * Hosts AI prompt generation (with STT recording), candidate selection, and the
 * Start/Close Discussion toggle. Reads from SessionContext or explicit props.
 */
const GENERATING_CHARS = 'Generating...'.split('');

// ─── Main component ───────────────────────────────────────────────────────────
export function ActiveCenter(props: Partial<{
  lessonId: string;
  promptInput: string;
  setPromptInput: (v: string) => void;
  isConnected: boolean;
  activeDiscussionId: string | null;
  onPublish: () => void;
  transcriptText: string;
  setTranscriptText: (v: string) => void;
  promptType: PromptType;
  setPromptType: (v: PromptType) => void;
  candidates: GeneratedPrompt[];
  isGenerating: boolean;
  generationWarning: string | null;
  generationTimeMs: number | null;
  lastTokenUsage: TokenUsage | null;
  lastModel: string | null;
  onGenerate: (transcriptOverride?: string) => void | Promise<void>;
  onSelectCandidate: (p: GeneratedPrompt) => void;
  onRegenerate: () => void;
  onPublishAiCandidate?: (candidate: GeneratedPrompt, overrideCorrectOption?: string | null, feedbackEnabled?: boolean, timerSeconds?: number | null) => void;
}>) {
  const context = React.useContext(SessionContext);
  const promptInput = context ? context.promptInput : props.promptInput!;
  const setPromptInput = context ? context.setPromptInput : props.setPromptInput!;
  const isConnected = context ? context.isConnected : props.isConnected!;
  const onPublish = context ? (timerSeconds: number | null) => context.handlePublishDiscussion(timerSeconds) : (_timerSeconds: number | null) => props.onPublish!();
  const transcriptText = context ? context.transcriptText : props.transcriptText!;
  const setTranscriptText = context ? context.setTranscriptText : props.setTranscriptText!;
  const promptType = context ? context.promptType : props.promptType!;
  const setPromptType = context ? context.setPromptType : props.setPromptType!;
  const candidates = context ? context.candidates : props.candidates!;
  const isGenerating = context ? context.isGenerating : props.isGenerating!;
  const generationWarning = context ? context.generationWarning : props.generationWarning!;
  const generationTimeMs = context ? context.generationTimeMs : props.generationTimeMs ?? null;
  const lastTokenUsage = context ? context.lastTokenUsage : props.lastTokenUsage ?? null;
  const lastModel = context ? context.lastModel : props.lastModel ?? null;
  const onGenerate = context ? context.generateCandidates : props.onGenerate!;
  const onSelectCandidate = context ? context.selectCandidate : props.onSelectCandidate!;
  const onRegenerate = context ? context.regenerateCandidates : props.onRegenerate!;
  const onPublishAiCandidate = context ? context.handlePublishAiCandidate : props.onPublishAiCandidate;
  const lessonId = context ? context.lesson.id : props.lessonId!;
  const activeDiscussionId = context ? (context.activeDiscussion?.id ?? null) : props.activeDiscussionId!;
  const recorder = useAudioRecorder();
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);
  const [exitingIndex, setExitingIndex] = React.useState<number | null>(null);
  const exitingTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sttStatus, setSttStatus] = React.useState<'idle' | 'transcribing' | 'error'>('idle');
  const [sttError, setSttError] = React.useState<string | null>(null);
  // Used by manual mode MC only — AI candidate editing state lives in CandidateCard.
  const [overrideCorrectOption, setOverrideCorrectOption] = React.useState<string | null>(null);
  const [feedbackEnabled, setFeedbackEnabled] = React.useState(false);
  const [manualOptions, setManualOptions] = React.useState<Record<string, string>>({
    A: '', B: '', C: '', D: ''
  });
  const [creationMode, setCreationMode] = React.useState<'ai' | 'manual'>('ai');
  const [showTimerDialog, setShowTimerDialog] = React.useState(false);
  const { copiedReport, sweepProgress, handleCopyReport, handleRunAllCombinations } = useDebugSweep({
    lessonId, transcriptText, candidates, isGenerating,
    generationWarning, generationTimeMs, lastTokenUsage, lastModel, promptType,
  });
  // Holds the fully-built candidate + MC state while the timer dialog is open.
  const [pendingPublishArgs, setPendingPublishArgs] = React.useState<{
    candidate: GeneratedPrompt;
    correctOption: string | null;
    feedbackEnabled: boolean;
  } | null>(null);
  const [publishError, setPublishError] = React.useState<string | null>(null);

  const transcriptRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.style.height = 'auto';
      transcriptRef.current.style.height = transcriptRef.current.scrollHeight + 'px';
    }
  }, [transcriptText]);

  // Reset all selection and manual-mode state when a new set of candidates arrives.
  React.useEffect(() => {
    setSelectedIndex(null);
    setExitingIndex(null);
    if (exitingTimerRef.current) clearTimeout(exitingTimerRef.current);
    setPendingPublishArgs(null);
    setOverrideCorrectOption(null);
    setFeedbackEnabled(false);
    setManualOptions({ A: '', B: '', C: '', D: '' });
    setPublishError(null);
  }, [candidates]);

  // Stop recording → gpt-4o-transcribe → populate transcriptText → trigger generate
  const handleStopAndTranscribe = React.useCallback(async () => {
    setSttError(null);
    setSttStatus('transcribing');

    const audioBlob = await recorder.stop();

    if (!audioBlob.size) {
      setSttError('No audio captured. Try again.');
      setSttStatus('error');
      return;
    }

    try {
      const transcript = await transcribeAudioApi(lessonId, audioBlob);
      setTranscriptText(transcript ?? '');
      setPromptInput(transcript ?? '');
      setSttStatus('idle');
      // Pass fresh transcript directly to avoid stale state closure.
      await onGenerate(transcript ?? '');
    } catch (err) {
      setSttError(err instanceof Error ? err.message : 'Transcription failed — type manually.');
      setSttStatus('error');
    }
  }, [lessonId, recorder, setTranscriptText, setPromptInput, onGenerate]);

  const handleSelectCandidate = (p: GeneratedPrompt, index: number) => {
    // Mark the outgoing card as exiting so it can finish its collapse animation.
    if (selectedIndex !== null && selectedIndex !== index) {
      if (exitingTimerRef.current) clearTimeout(exitingTimerRef.current);
      setExitingIndex(selectedIndex);
      exitingTimerRef.current = setTimeout(() => setExitingIndex(null), CANDIDATE_COLLAPSE_MS);
    }
    setSelectedIndex(index);
    onSelectCandidate(p);
    setPromptInput(p.promptText);
    setTranscriptText(p.promptText);
  };

  // Called after instructor confirms timer dialog.
  // Two entry points: AI candidate publish (via CandidateCard) and manual mode publish.
  const handleTimerConfirm = (timerSeconds: number | null) => {
    setShowTimerDialog(false);

    // AI candidate path — CandidateCard sets pendingPublishArgs before opening the dialog.
    if (pendingPublishArgs) {
      const { candidate, correctOption, feedbackEnabled: fe } = pendingPublishArgs;
      setPendingPublishArgs(null);
      if (onPublishAiCandidate) {
        onPublishAiCandidate(candidate, correctOption, fe, timerSeconds);
        setSelectedIndex(null);
        setPublishError(null);
      }
      return;
    }

    // Manual creation path.
    if (creationMode === 'manual') {
      if (promptType === 'multiple_choice') {
        if (!overrideCorrectOption) {
          setPublishError('Please select a correct answer for your multiple-choice question.');
          return;
        }
        setPublishError(null);
        if (onPublishAiCandidate) {
          const mcOptions = (['A', 'B', 'C', 'D'] as const).map(label => ({
            label,
            text: manualOptions[label] || `Option ${label}`
          }));
          onPublishAiCandidate(
            { promptText: promptInput, promptType: 'multiple_choice', mcOptions },
            overrideCorrectOption,
            feedbackEnabled,
            timerSeconds
          );
          setManualOptions({ A: '', B: '', C: '', D: '' });
          setOverrideCorrectOption(null);
          setFeedbackEnabled(false);
          setPromptInput('');
        }
        return;
      }
      onPublish(timerSeconds);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-6 space-y-4">

      <div
        className="space-y-3 rounded-2xl p-4"
        style={{
          background: 'var(--surface-glass)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid var(--border-default)',
        }}
      >
        <Tabs value={creationMode} onValueChange={(v) => setCreationMode(v as 'ai' | 'manual')} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="ai">AI Generation</TabsTrigger>
            <TabsTrigger value="manual">Manual Creation</TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="space-y-3 mt-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-content-primary">
                Generate with AI
              </span>

              {/* STT recording button */}
              <div className="flex items-center gap-2">
                {recorder.isRecording && (
                  <span
                    className="flex items-center gap-1 text-xs font-medium"
                    style={{ color: 'var(--recording-text, oklch(0.55 0.22 27))' }}
                  >
                    <span
                      className="w-2 h-2 rounded-full animate-pulse inline-block"
                      style={{ background: 'currentColor' }}
                    />
                    {recorder.fmt(recorder.elapsed)}
                  </span>
                )}
                {!recorder.isRecording ? (
                  <button
                    onClick={recorder.start}
                    disabled={isGenerating || sttStatus === 'transcribing'}
                    className="text-xs h-7 px-3 rounded-[8px] font-medium transition-all duration-150 disabled:opacity-50 flex items-center gap-1.5"
                    style={{
                      background: 'rgba(239,68,68,0.10)',
                      border: '1px solid rgba(239,68,68,0.30)',
                      color: 'var(--recording-text, oklch(0.55 0.22 27))',
                    }}
                  >
                    {/* Mic icon */}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" x2="12" y1="19" y2="22" />
                    </svg>
                    Record
                  </button>
                ) : (
                  <button
                    onClick={handleStopAndTranscribe}
                    className="text-xs h-7 px-3 rounded-[8px] font-medium text-white transition-all duration-150 flex items-center gap-1.5"
                    style={{ background: 'var(--color-primary-600)' }}
                  >
                    {/* Stop icon */}
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                    </svg>
                    Stop &amp; Transcribe
                  </button>
                )}
              </div>
            </div>

            {sttStatus === 'transcribing' && (
              <p className="text-xs animate-pulse text-content-muted">
                Transcribing audio…
              </p>
            )}
            {sttStatus === 'error' && sttError && (
              <p className="text-xs" style={{ color: 'var(--recording-text, oklch(0.55 0.22 27))' }}>{sttError}</p>
            )}

            {/* Prompt / context input */}
            <textarea
              ref={transcriptRef}
              value={promptInput}
              onChange={(e) => {
                setPromptInput(e.target.value);
                setTranscriptText(e.target.value); // Keep in sync for STT context
              }}
              placeholder="Spoken content will appear here after recording, or type a topic manually"
              className="w-full px-3 py-2.5 text-sm rounded-[10px] resize-none overflow-hidden min-h-[50px] transition-all duration-150 bg-surface-raised text-content-primary"
              style={{
                border: '1px solid var(--border-default)',
              }}
              rows={2}
            />

            {/* Prompt type + generate */}
            <div className="flex items-center gap-2">
              {/* (i) best-practices button — leftmost, highlighted once per browser session */}
              <AITipsButton lessonId={lessonId} />
              <select
                value={promptType}
                onChange={(e) => setPromptType(e.target.value as PromptType)}
                className="text-sm rounded-[8px] px-3 py-1.5 transition-all duration-150 bg-surface-raised text-content-primary"
                style={{
                  border: '1px solid var(--border-default)',
                }}
              >
                <option value="long_answer">Long Answer</option>
                <option value="short_answer">Short Answer</option>
                <option value="multiple_choice">Multiple Choice</option>
              </select>

              <AIPreferencesDialog />
              <div className={`rotating-glow-wrap${isGenerating ? ' generating' : ''}`}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => onGenerate()}
                      disabled={isGenerating || recorder.isRecording}
                      size="sm"
                      className="px-4 py-1.5 rounded-full font-semibold"
                      style={{
                        background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-400))',
                        color: 'white',
                        opacity: 1,
                      }}
                    >
                      {isGenerating ? (
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
                      ) : 'Generate Prompts'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Use AI to generate 5 discussion prompt candidates from your transcript and uploaded files. Takes 5 to 15 seconds.</TooltipContent>
                </Tooltip>
              </div>
              {DEBUG_TOOLS && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleRunAllCombinations}
                      disabled={isGenerating || !!sweepProgress || recorder.isRecording}
                      variant="outline"
                      size="sm"
                      className="text-xs font-semibold"
                      style={{ borderColor: 'rgba(239,68,68,0.4)', color: 'oklch(0.55 0.22 27)' }}
                    >
                      {sweepProgress ? `${sweepProgress.current}/${sweepProgress.total}…` : 'Run All Combinations'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Generate all 81 type/difficulty/style/length combinations sequentially. Downloads sweep_report.txt and sweep_report.csv when done. ~15–20 min.</TooltipContent>
                </Tooltip>
              )}
            </div>

            {generationWarning && (
              <p
                className="text-xs rounded-lg px-3 py-2"
                style={{
                  background: 'rgba(245,158,11,0.10)',
                  border: '1px solid rgba(245,158,11,0.25)',
                  color: '#b45309',
                }}
              >
                {generationWarning}
              </p>
            )}

            {DEBUG_TOOLS && sweepProgress && (
              <p className="text-xs rounded-lg px-3 py-2 animate-pulse"
                style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', color: '#6366f1' }}>
                Generating {sweepProgress.current} / {sweepProgress.total} — {sweepProgress.label}
              </p>
            )}

            {/* Candidate cards */}
            {candidates.length > 0 && (
              <div className="space-y-2">
                {candidates.map((c: GeneratedPrompt, i: number) => (
                  <CandidateCard
                    key={i}
                    candidate={c}
                    index={i}
                    isSelected={selectedIndex === i}
                    onSelect={() => handleSelectCandidate(c, i)}
                    promptInput={selectedIndex === i ? promptInput : c.promptText}
                    onPromptInputChange={(v) => { setPromptInput(v); setTranscriptText(v); }}
                    isConnected={isConnected}
                    onRequestPublish={(candidate, correctOption, fe) => {
                      setPendingPublishArgs({ candidate, correctOption, feedbackEnabled: fe });
                      setShowTimerDialog(true);
                    }}
                  />
                ))}

                <div className="flex gap-2 pt-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={onRegenerate}
                        disabled={isGenerating}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                      >
                        {isGenerating ? 'Regenerating…' : 'Regenerate'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Run AI generation again without changing the transcript or files. Use this if the previous candidates were not satisfactory.</TooltipContent>
                  </Tooltip>
                  {DEBUG_TOOLS && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={handleCopyReport}
                          disabled={isGenerating || candidates.length === 0}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                        >
                          {copiedReport ? 'Copied!' : 'Copy Report'}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy generation details and all candidates to clipboard.</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            )}

          </TabsContent>

          <TabsContent value="manual" className="space-y-3 mt-0">
            <div className="flex items-center gap-2 mb-2">
              <select
                value={promptType}
                onChange={(e) => setPromptType(e.target.value as PromptType)}
                className="text-sm rounded-[8px] px-3 py-1.5 transition-all duration-150 bg-surface-raised text-content-primary"
                style={{
                  border: '1px solid var(--border-default)',
                }}
              >
                <option value="long_answer">Long Answer</option>
                <option value="short_answer">Short Answer</option>
                <option value="multiple_choice">Multiple Choice</option>
              </select>
            </div>

            <textarea
              value={promptInput}
              onChange={(e) => {
                setPromptInput(e.target.value);
                setTranscriptText(e.target.value);
              }}
              placeholder="Type your question here manually..."
              className="w-full px-3 py-2.5 text-sm rounded-[10px] resize-none overflow-hidden min-h-[80px] transition-all duration-150 bg-surface-raised text-content-primary"
              style={{
                border: '1px solid var(--border-default)',
              }}
              rows={3}
            />

            {promptType === 'multiple_choice' && (
              <MultipleChoiceEditor
                nameGroup="manual-correct-option"
                options={['A', 'B', 'C', 'D'].map((label) => ({
                  label,
                  text: manualOptions[label] || ''
                }))}
                correctOption={overrideCorrectOption}
                onCorrectOptionChange={setOverrideCorrectOption}
                onOptionTextChange={(label, text) => setManualOptions({ ...manualOptions, [label]: text })}
                feedbackEnabled={feedbackEnabled}
                onFeedbackChange={setFeedbackEnabled}
              />
            )}

            {/* Start Discussion — manual tab only */}
            {!activeDiscussionId && (
              <div className="pt-3 flex justify-end border-t border-line-subtle">
                <button
                  onClick={() => setShowTimerDialog(true)}
                  disabled={!promptInput.trim() || !isConnected}
                  data-testid="start-discussion-button"
                  className="px-4 py-1.5 rounded-full text-xs font-semibold text-white transition-all duration-150 disabled:opacity-50 btn-primary-glow"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-400))',
                  }}
                >
                  Start Discussion
                </button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {publishError && (
          <p
            className="text-xs rounded-lg px-3 py-2"
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: '#dc2626',
            }}
          >
            {publishError}
          </p>
        )}

        <StartDiscussionDialog
          open={showTimerDialog}
          onConfirm={handleTimerConfirm}
          onCancel={() => { setShowTimerDialog(false); setPendingPublishArgs(null); }}
        />
      </div>
    </div>
  );
}
