// Central panel of the instructor session view: AI prompt generation, STT recording,
// candidate selection, and the Start/Close Discussion button.
'use client';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import * as React from 'react';
import type { GeneratedPrompt, TokenUsage } from '@/types/ai';
import type { PromptType } from '@/types/discussion';
import { SessionContext } from './SessionContext';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { CandidateCard } from './CandidateCard';
import { MultipleChoiceEditor } from './MultipleChoiceEditor';
import { AIPreferencesDialog } from './AIPreferencesDialog';
import { AITipsButton } from './AITipsButton';
import { transcribeAudioApi } from '@/lib/api/aiApi';
import { StartDiscussionDialog, type MultipleResponseSettings } from './StartDiscussionDialog';
import { GeneralQuestionsTab } from './GeneralQuestionsTab';
import { DEBUG_TOOLS } from '@/lib/debug';
import { useDebugSweep } from '@/hooks/useDebugSweep';

/**
 * Central panel of the active session view.
 * Hosts AI prompt generation (with STT recording), candidate selection, and the
 * Start/Close Discussion toggle. Reads from SessionContext or explicit props.
 */
const GENERATING_CHARS = 'Generating...'.split('');

// ─── Main component ───────────────────────────────────────────────────────────

interface ActiveCenterProps {
  lessonId: string; promptInput: string; setPromptInput: (v: string) => void; isConnected: boolean;
  activeDiscussionId: string | null; onPublish: (timerSeconds: number | null, multipleResponseSettings?: MultipleResponseSettings) => void;
  onClose: (discussionId: string) => void; transcriptText: string; setTranscriptText: (v: string) => void;
  promptType: PromptType; setPromptType: (v: PromptType) => void; candidates: GeneratedPrompt[];
  isGenerating: boolean; generationWarning: string | null; generationTimeMs: number | null;
  lastTokenUsage: TokenUsage | null; lastModel: string | null;
  onGenerate: (transcriptOverride?: string) => void | Promise<void>; onSelectCandidate: (p: GeneratedPrompt) => void;
  onRegenerate: () => void; onPublishAiCandidate?: (candidate: GeneratedPrompt, overrideCorrectOption?: string | null, feedbackEnabled?: boolean, timerSeconds?: number | null, multipleResponseSettings?: MultipleResponseSettings) => void;
}

type SttStatus = 'idle' | 'transcribing' | 'error';
type CreationMode = 'ai' | 'manual' | 'general';

export function ActiveCenter(props: Readonly<Partial<ActiveCenterProps>>) {
  const state = useActiveCenterStateMapping(props);
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);
  const [sttStatus, setSttStatus] = React.useState<SttStatus>('idle');
  const [sttError, setSttError] = React.useState<string | null>(null);
  const [overrideCorrectOption, setOverrideCorrectOption] = React.useState<string | null>(null);
  const [manualOptions, setManualOptions] = React.useState<Record<string, string>>({ A: '', B: '', C: '', D: '' });
  const [creationMode, setCreationMode] = React.useState<'ai' | 'manual' | 'general'>('ai');
  const [showTimerDialog, setShowTimerDialog] = React.useState(false);
  const [pendingCandidate, setPendingCandidate] = React.useState<GeneratedPrompt | null>(null);
  const [publishError, setPublishError] = React.useState<string | null>(null);

  const { copiedReport, sweepProgress, handleCopyReport, handleRunAllCombinations } = useDebugSweep({
    ...state, candidates: state.candidates,
  });

  const transcriptRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.style.height = 'auto';
      transcriptRef.current.style.height = transcriptRef.current.scrollHeight + 'px';
    }
  }, [state.transcriptText]);

  React.useEffect(() => {
    setSelectedIndex(null); setOverrideCorrectOption(null);
    setManualOptions({ A: '', B: '', C: '', D: '' }); setPublishError(null);
  }, [state.candidates]);

  const handlers = useActiveCenterHandlers({
    ...state,
    selectedIndex, setSelectedIndex,
    sttStatus, setSttStatus,
    setSttError,
    overrideCorrectOption, setOverrideCorrectOption,
    manualOptions, setManualOptions,
    creationMode, setCreationMode,
    showTimerDialog, setShowTimerDialog,
    pendingCandidate, setPendingCandidate,
    setPublishError,
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
      <div
        className="space-y-3 rounded-2xl p-4"
        style={{
          background: 'var(--surface-glass)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid var(--border-default)',
        }}
      >
        <Tabs value={creationMode} onValueChange={(v) => setCreationMode(v as 'ai' | 'manual' | 'general')} className="w-full">
          <TabsList className="flex w-full overflow-x-auto scrollbar-hide mb-4 h-auto p-1 bg-muted/40 rounded-xl">
            <TabsTrigger value="ai" className="flex-shrink-0 whitespace-nowrap px-4 py-2">AI Generation</TabsTrigger>
            <TabsTrigger value="manual" className="flex-shrink-0 whitespace-nowrap px-4 py-2">Manual Creation</TabsTrigger>
            <TabsTrigger value="general" className="flex-shrink-0 whitespace-nowrap px-4 py-2">General Questions</TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="space-y-3 mt-0">
            <AIGenerationPanel
              {...state}
              {...handlers}
              handleStopAndTranscribe={handlers.handleStopAndTranscribe}
              handleSelectCandidate={handlers.handleSelectCandidate}
              handleRunAllCombinations={handleRunAllCombinations}
              sweepProgress={sweepProgress}
              selectedIndex={selectedIndex}
              overrideCorrectOption={overrideCorrectOption}
              setOverrideCorrectOption={setOverrideCorrectOption}
              setPendingCandidate={setPendingCandidate}
              setShowTimerDialog={setShowTimerDialog}
              sttStatus={sttStatus}
              sttError={sttError}
              handleCopyReport={handleCopyReport}
              copiedReport={copiedReport}
              transcriptRef={transcriptRef}
            />
          </TabsContent>

          <TabsContent value="general" className="mt-0">
            <GeneralQuestionsTab />
          </TabsContent>

          <TabsContent value="manual" className="space-y-3 mt-0">
            <ManualCreationPanel
              promptType={state.promptType} setPromptType={state.setPromptType}
              promptInput={state.promptInput} setPromptInput={state.setPromptInput}
              setTranscriptText={state.setTranscriptText}
              overrideCorrectOption={overrideCorrectOption} setOverrideCorrectOption={setOverrideCorrectOption}
              manualOptions={manualOptions} setManualOptions={setManualOptions}
            />
            {!state.activeDiscussionId && (
              <div className="pt-3 flex justify-center sm:justify-end border-t border-line-subtle">
                <button
                  onClick={() => setShowTimerDialog(true)}
                  disabled={!state.promptInput.trim() || !state.isConnected}
                  data-testid="start-discussion-button"
                  className="w-full sm:w-auto px-6 py-2.5 sm:px-4 sm:py-1.5 rounded-full text-sm sm:text-xs font-semibold text-white transition-all duration-150 disabled:opacity-50 btn-primary-glow"
                  style={{ background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-400))' }}
                >
                  Start Discussion
                </button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {publishError && (
          <p className="text-xs rounded-lg px-3 py-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#dc2626' }}>
            {publishError}
          </p>
        )}

        <StartDiscussionDialog
          open={showTimerDialog}
          onConfirm={handlers.handleTimerConfirm}
          onCancel={() => { setShowTimerDialog(false); setPendingCandidate(null); }}
          isMultipleChoice={
            pendingCandidate?.promptType === 'multiple_choice' ||
            (!pendingCandidate && creationMode === 'manual' && state.promptType === 'multiple_choice') ||
            (!pendingCandidate && creationMode === 'ai' && state.promptType === 'multiple_choice')
          }
        />
      </div>
    </div>
  );
}

// ─── Internal Hooks ──────────────────────────────────────────────────────────

function useActiveCenterStateMapping(props: Partial<ActiveCenterProps>) {
  const context = React.useContext(SessionContext);
  const recorder = useAudioRecorder();

  if (!context) {
    return {
      lessonId: props.lessonId!,
      recorder,
      promptInput: props.promptInput!,
      setPromptInput: props.setPromptInput!,
      isConnected: props.isConnected!,
      onPublish: (timerSeconds: number | null, mrs?: MultipleResponseSettings) => props.onPublish!(timerSeconds, mrs),
      transcriptText: props.transcriptText!,
      setTranscriptText: props.setTranscriptText!,
      promptType: props.promptType!,
      setPromptType: props.setPromptType!,
      candidates: props.candidates!,
      isGenerating: props.isGenerating!,
      generationWarning: props.generationWarning!,
      generationTimeMs: props.generationTimeMs ?? null,
      lastTokenUsage: props.lastTokenUsage ?? null,
      lastModel: props.lastModel ?? null,
      onGenerate: props.onGenerate!,
      onSelectCandidate: props.onSelectCandidate!,
      onRegenerate: props.onRegenerate!,
      onPublishAiCandidate: props.onPublishAiCandidate,
      onClose: props.onClose!,
      activeDiscussionId: props.activeDiscussionId!,
    };
  }

  return {
    lessonId: context.lesson.id,
    recorder,
    promptInput: context.promptInput,
    setPromptInput: context.setPromptInput,
    isConnected: context.isConnected,
    onPublish: (timerSeconds: number | null, mrs?: MultipleResponseSettings) => context.handlePublishDiscussion(timerSeconds, mrs),
    transcriptText: context.transcriptText,
    setTranscriptText: context.setTranscriptText,
    promptType: context.promptType,
    setPromptType: context.setPromptType,
    candidates: context.candidates,
    isGenerating: context.isGenerating,
    generationWarning: context.generationWarning,
    generationTimeMs: context.generationTimeMs,
    lastTokenUsage: context.lastTokenUsage,
    lastModel: context.lastModel,
    onGenerate: context.generateCandidates,
    onSelectCandidate: context.selectCandidate,
    onRegenerate: context.regenerateCandidates,
    onPublishAiCandidate: context.handlePublishAiCandidate,
    onClose: context.handleCloseDiscussion,
    activeDiscussionId: context.activeDiscussion?.id ?? null,
  };
}

function useActiveCenterHandlers(allProps: Readonly<ActiveCenterProps & {
  recorder: ReturnType<typeof useAudioRecorder>;
  selectedIndex: number | null;
  setSelectedIndex: (v: number | null) => void;
  sttStatus: SttStatus;
  setSttStatus: (v: SttStatus) => void;
  setSttError: (v: string | null) => void;
  overrideCorrectOption: string | null;
  setOverrideCorrectOption: (v: string | null) => void;
  manualOptions: Record<string, string>;
  setManualOptions: (v: Record<string, string>) => void;
  creationMode: CreationMode;
  setCreationMode: (v: CreationMode) => void;
  showTimerDialog: boolean;
  setShowTimerDialog: (v: boolean) => void;
  pendingCandidate: GeneratedPrompt | null;
  setPendingCandidate: (v: GeneratedPrompt | null) => void;
  setPublishError: (v: string | null) => void;
}>) {
  const {
    lessonId, recorder, onGenerate, setTranscriptText, setPromptInput,
    onSelectCandidate, setSelectedIndex,
    onPublishAiCandidate, overrideCorrectOption, setOverrideCorrectOption,
    setPublishError, setShowTimerDialog, pendingCandidate, setPendingCandidate,
    creationMode, promptType, promptInput, manualOptions, onPublish, candidates, selectedIndex,
    setManualOptions, setSttError, setSttStatus
  } = allProps;

  const handleStopAndTranscribe = React.useCallback(async () => {
    setSttError(null); setSttStatus('transcribing');
    const audioBlob = await recorder.stop();
    if (!audioBlob.size) { setSttError('No audio captured. Try again.'); setSttStatus('error'); return; }
    try {
      const transcript = await transcribeAudioApi(lessonId, audioBlob);
      setTranscriptText(transcript ?? ''); setPromptInput(transcript ?? ''); setSttStatus('idle');
      await onGenerate(transcript ?? '');
    } catch (err) {
      setSttError(err instanceof Error ? err.message : 'Transcription failed — type manually.'); setSttStatus('error');
    }
  }, [lessonId, recorder, setTranscriptText, setPromptInput, onGenerate, setSttError, setSttStatus]);

  const handleSelectCandidate = (p: GeneratedPrompt, index: number) => {
    setSelectedIndex(index); onSelectCandidate(p);
  };

  const handlePublishSelected = (p: GeneratedPrompt, timerSeconds: number | null = null, feedbackEnabled = false, mrs?: MultipleResponseSettings) => {
    if (onPublishAiCandidate) {
      onPublishAiCandidate(p, overrideCorrectOption, feedbackEnabled, timerSeconds, mrs);
      setSelectedIndex(null); setPublishError(null);
    }
  };

  const handleTimerConfirm = (timerSeconds: number | null, feedbackEnabled: boolean, mrs?: MultipleResponseSettings) => {
    setShowTimerDialog(false);
    if (pendingCandidate) {
      const candidate = pendingCandidate; setPendingCandidate(null);
      handlePublishSelected(candidate, timerSeconds, feedbackEnabled, mrs); return;
    }
    if (creationMode === 'manual') {
      if (promptType === 'multiple_choice') {
        if (!overrideCorrectOption) { setPublishError('Please select a correct answer for your multiple-choice question.'); return; }
        setPublishError(null);
        if (onPublishAiCandidate) {
          const mcOptions = (['A', 'B', 'C', 'D'] as const).map(label => ({ label, text: manualOptions[label] || `Option ${label}` }));
          onPublishAiCandidate({ promptText: promptInput, promptType: 'multiple_choice', mcOptions }, overrideCorrectOption, feedbackEnabled, timerSeconds, mrs);
          setManualOptions({ A: '', B: '', C: '', D: '' }); setOverrideCorrectOption(null); setPromptInput('');
        }
        return;
      }
      onPublish(timerSeconds, mrs); return;
    }
    if (selectedIndex !== null && candidates[selectedIndex]) {
      setPublishError(null); handlePublishSelected(candidates[selectedIndex], timerSeconds, feedbackEnabled, mrs); return;
    }
    if (promptType === 'multiple_choice') { setPublishError(candidates.length > 0 ? 'Please select a generated AI prompt to publish.' : 'Please generate AI prompts and select one to publish, or switch to Manual Creation mode.'); return; }
    setPublishError(null); onPublish(timerSeconds, mrs);
  };

  return { handleStopAndTranscribe, handleSelectCandidate, handlePublishSelected, handleTimerConfirm };
}

// ─── Sub-components and Helper Views ───────────────────────────────────────────

function AIGenerationPanel({
  lessonId, recorder, isGenerating, sttStatus, sttError, handleStopAndTranscribe,
  transcriptText, promptInput, setPromptInput, setTranscriptText, transcriptRef,
  promptType, setPromptType, onGenerate, handleRunAllCombinations, sweepProgress,
  generationWarning, candidates, selectedIndex, handleSelectCandidate,
  overrideCorrectOption, setOverrideCorrectOption,
  setPendingCandidate, setShowTimerDialog,
  isConnected, onRegenerate, handleCopyReport, copiedReport
}: Readonly<ActiveCenterProps & {
  recorder: ReturnType<typeof useAudioRecorder>;
  sttStatus: SttStatus;
  sttError: string | null;
  handleStopAndTranscribe: () => void;
  handleRunAllCombinations: () => void;
  sweepProgress: { current: number; total: number; label: string } | null;
  selectedIndex: number | null;
  handleSelectCandidate: (p: GeneratedPrompt, i: number) => void;
  overrideCorrectOption: string | null;
  setOverrideCorrectOption: (v: string | null) => void;
  setPendingCandidate: (v: GeneratedPrompt | null) => void;
  setShowTimerDialog: (v: boolean) => void;
  copiedReport: boolean;
  handleCopyReport: () => void;
  transcriptRef: React.RefObject<HTMLTextAreaElement | null>;
}>) {
  return (
    <>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-content-primary">Generate with AI</span>
        <div className="flex items-center gap-2">
          {recorder.isRecording && (
            <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--recording-text, oklch(0.55 0.22 27))' }}>
              <span className="w-2 h-2 rounded-full animate-pulse inline-block" style={{ background: 'currentColor' }} />
              {recorder.fmt(recorder.elapsed)}
            </span>
          )}
          {recorder.isRecording ? (
            <button onClick={handleStopAndTranscribe} className="text-xs h-7 px-3 rounded-[8px] font-medium text-white transition-all duration-150 flex items-center gap-1.5" style={{ background: 'var(--color-primary-600)' }}>
              <StopIcon /> Stop & Transcribe
            </button>
          ) : (
            <button onClick={recorder.start} disabled={isGenerating || sttStatus === 'transcribing'} className="text-xs h-7 px-3 rounded-[8px] font-medium transition-all duration-150 disabled:opacity-50 flex items-center gap-1.5" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)', color: 'var(--recording-text, oklch(0.55 0.22 27))' }}>
              <MicIcon /> Record
            </button>
          )}
        </div>
      </div>
      {sttStatus === 'transcribing' && <p className="text-xs animate-pulse text-content-muted">Transcribing audio…</p>}
      {sttStatus === 'error' && sttError && <p className="text-xs" style={{ color: 'var(--recording-text, oklch(0.55 0.22 27))' }}>{sttError}</p>}
      <textarea ref={transcriptRef} value={transcriptText} onChange={(e) => setTranscriptText(e.target.value)} placeholder="Spoken content will appear here after recording, or type a topic manually" className="w-full px-3 py-2.5 text-sm rounded-[10px] resize-none overflow-hidden leading-snug min-h-[50px] transition-all duration-150 bg-surface-raised text-content-primary" style={{ border: '1px solid var(--border-default)' }} rows={2} />
      <div className="flex flex-wrap items-center gap-2 w-full">
        <AITipsButton lessonId={lessonId} />
        <PromptTypeSelect value={promptType} onChange={(v) => setPromptType(v as PromptType)} />
        <AIPreferencesDialog />
        <div className={`rotating-glow-wrap w-full sm:w-auto mt-1 sm:mt-0 flex-shrink-0 ${isGenerating ? ' generating' : ''}`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={() => onGenerate()} disabled={isGenerating || recorder.isRecording} size="sm" className="w-full px-4 py-1.5 rounded-full font-semibold" style={{ background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-400))', color: 'white', opacity: 1 }}>
                {isGenerating ? <GeneratingIndicator /> : <span>Generate Prompts</span>}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Use AI to generate 5 discussion prompt candidates from your transcript and uploaded files. Takes 5 to 15 seconds.</TooltipContent>
          </Tooltip>
        </div>
        {DEBUG_TOOLS && <SweepButton onRun={handleRunAllCombinations} disabled={isGenerating || !!sweepProgress || recorder.isRecording} progress={sweepProgress} />}
      </div>
      {generationWarning && <WarningMessage message={generationWarning} />}
      {DEBUG_TOOLS && sweepProgress && <SweepProgressMessage progress={sweepProgress} />}
      {candidates.length > 0 && (
        <div className="flex flex-col gap-3">
          {candidates.map((c: GeneratedPrompt, i: number) => (
            <CandidateCard
              key={`candidate-${c.promptType}-${i}`}
              candidate={c}
              index={i}
              isSelected={selectedIndex === i}
              onSelect={() => handleSelectCandidate(c, i)}
              onPromptTextChange={(text) => setPromptInput(text)}
              isConnected={isConnected}
              onRequestPublish={(editedCandidate, correctOption) => {
                setOverrideCorrectOption(correctOption);
                setPendingCandidate(editedCandidate);
                setShowTimerDialog(true);
              }}
            />
          ))}
          <div className="mt-2">
            <CandidateActions onRegenerate={onRegenerate} onCopyReport={handleCopyReport} isGenerating={isGenerating} hasCandidates={candidates.length > 0} copiedReport={copiedReport} />
          </div>
        </div>
      )}
    </>
  );
}

function ManualCreationPanel({
  promptType, setPromptType, promptInput, setPromptInput, setTranscriptText,
  manualOptions, setManualOptions, overrideCorrectOption, setOverrideCorrectOption,
}: Readonly<{
  promptType: PromptType;
  setPromptType: (v: PromptType) => void;
  promptInput: string;
  setPromptInput: (v: string) => void;
  setTranscriptText: (v: string) => void;
  manualOptions: Record<string, string>;
  setManualOptions: (v: Record<string, string>) => void;
  overrideCorrectOption: string | null;
  setOverrideCorrectOption: (v: string | null) => void;
}>) {
  return (
    <>
      <div className="flex items-center gap-2 mb-2"><PromptTypeSelect value={promptType} onChange={(v) => setPromptType(v as PromptType)} /></div>
      <textarea value={promptInput} onChange={(e) => { setPromptInput(e.target.value); setTranscriptText(e.target.value); }} placeholder="Type your question here manually..." className="w-full px-3 py-2.5 text-sm rounded-[10px] resize-none overflow-hidden leading-snug min-h-[80px] transition-all duration-150 bg-surface-raised text-content-primary" style={{ border: '1px solid var(--border-default)' }} rows={3} />
      {promptType === 'multiple_choice' && (
        <MultipleChoiceEditor
          nameGroup="manual-correct-option" options={['A', 'B', 'C', 'D'].map((label) => ({ label, text: manualOptions[label] || '' }))}
          correctOption={overrideCorrectOption} onCorrectOptionChange={setOverrideCorrectOption}
          onOptionTextChange={(label, text) => setManualOptions({ ...manualOptions, [label]: text })}
        />
      )}
    </>
  );
}

// ─── Minimal Atomic Sub-components ───

const MicIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /></svg>;
const StopIcon = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>;

function PromptTypeSelect({ value, onChange }: Readonly<{ value: string, onChange: (v: string) => void }>) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="text-sm rounded-[8px] px-3 py-1.5 transition-all duration-150 bg-surface-raised text-content-primary" style={{ border: '1px solid var(--border-default)' }}>
      <option value="long_answer">Long Answer</option><option value="short_answer">Short Answer</option><option value="multiple_choice">Multiple Choice</option>
    </select>
  );
}

function GeneratingIndicator() {
  return (
    <span aria-label="Generating…" style={{ display: 'inline-flex' }}>
      {GENERATING_CHARS.map((ch: string, i: number) => (
        <span key={`char-${i}-${ch}`} className={ch === '.' ? 'generating-char' : 'generating-shimmer'} style={{ animationDelay: `${i * 0.07}s` }}>{ch}</span>
      ))}
    </span>
  );
}

function SweepButton({ onRun, disabled, progress }: Readonly<{ onRun: () => void; disabled: boolean; progress: { current: number; total: number } | null }>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button onClick={onRun} disabled={disabled} variant="outline" size="sm" className="text-xs font-semibold" style={{ borderColor: 'rgba(239,68,68,0.4)', color: 'oklch(0.55 0.22 27)' }}>
          {progress ? `${progress.current}/${progress.total}…` : 'Run All Combinations'}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Generate all 81 combinations sequentially.</TooltipContent>
    </Tooltip>
  );
}

const WarningMessage = ({ message }: { message: string }) => <p className="text-xs rounded-lg px-3 py-2" style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.25)', color: '#b45309' }}>{message}</p>;
const SweepProgressMessage = ({ progress }: Readonly<{ progress: { current: number; total: number; label: string } }>) => <p className="text-xs rounded-lg px-3 py-2 animate-pulse" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', color: '#6366f1' }}>Generating {progress.current} / {progress.total} — {progress.label}</p>;



function CandidateActions({ onRegenerate, onCopyReport, isGenerating, hasCandidates, copiedReport }: Readonly<{ onRegenerate: () => void; onCopyReport: () => void; isGenerating: boolean; hasCandidates: boolean; copiedReport: boolean }>) {
  return (
    <div className="flex gap-2 pt-1">
      <Button onClick={onRegenerate} disabled={isGenerating} variant="outline" size="sm" className="text-xs">{isGenerating ? 'Regenerating…' : 'Regenerate'}</Button>
      {DEBUG_TOOLS && hasCandidates && <Button onClick={onCopyReport} disabled={isGenerating} variant="outline" size="sm" className="text-xs">{copiedReport ? 'Copied!' : 'Copy Report'}</Button>}
    </div>
  );
}
