// Central panel of the instructor session view: AI prompt generation, STT recording,
// candidate selection, and the Start/Close Discussion button.
'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


import * as React from 'react';
import type { GeneratedPrompt } from '@/types/ai';
import type { PromptType } from '@/types/discussion';
import { SessionContext } from './SessionContext';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { CandidateCard } from './CandidateCard';
import { MultipleChoiceEditor } from './MultipleChoiceEditor';
import { AIPreferencesDialog } from './AIPreferencesDialog';
import { transcribeAudioApi } from '@/lib/api/aiApi';
import { StartDiscussionDialog } from './StartDiscussionDialog';



/**
 * Central panel of the active session view.
 * Hosts AI prompt generation (with STT recording), candidate selection, and the
 * Start/Close Discussion toggle. Reads from SessionContext or explicit props.
 */
// ─── Main component ───────────────────────────────────────────────────────────
export function ActiveCenter(props: Partial<{
  lessonId: string;
  promptInput: string;
  setPromptInput: (v: string) => void;
  isConnected: boolean;
  activeDiscussionId: string | null;
  onPublish: () => void;
  onClose: (discussionId: string) => void;
  transcriptText: string;
  setTranscriptText: (v: string) => void;
  promptType: PromptType;
  setPromptType: (v: PromptType) => void;
  candidates: GeneratedPrompt[];
  isGenerating: boolean;
  generationWarning: string | null;
  onGenerate: (transcriptOverride?: string) => void | Promise<void>;
  onSelectCandidate: (p: GeneratedPrompt) => void;
  onRegenerate: () => void;
  onPublishAiCandidate?: (candidate: GeneratedPrompt, overrideCorrectOption?: string | null, feedbackEnabled?: boolean, timerSeconds?: number | null) => void;
}>) {
  const context = React.useContext(SessionContext);
  const promptInput = context ? context.promptInput : props.promptInput!;
  const setPromptInput = context ? context.setPromptInput : props.setPromptInput!;
  const isConnected = context ? context.isConnected : props.isConnected!;
  const onPublish = context ? (timerSeconds: number | null) => context.handlePublishDiscussion(timerSeconds) : (timerSeconds: number | null) => props.onPublish!();
  const transcriptText = context ? context.transcriptText : props.transcriptText!;
  const setTranscriptText = context ? context.setTranscriptText : props.setTranscriptText!;
  const promptType = context ? context.promptType : props.promptType!;
  const setPromptType = context ? context.setPromptType : props.setPromptType!;
  const candidates = context ? context.candidates : props.candidates!;
  const isGenerating = context ? context.isGenerating : props.isGenerating!;
  const generationWarning = context ? context.generationWarning : props.generationWarning!;
  const onGenerate = context ? context.generateCandidates : props.onGenerate!;
  const onSelectCandidate = context ? context.selectCandidate : props.onSelectCandidate!;
  const onRegenerate = context ? context.regenerateCandidates : props.onRegenerate!;
  const onPublishAiCandidate = context ? context.handlePublishAiCandidate : props.onPublishAiCandidate;
  const lessonId = context ? context.lesson.id : props.lessonId!;
  const activeDiscussionId = context ? (context.activeDiscussion?.id ?? null) : props.activeDiscussionId!;
  const recorder = useAudioRecorder();
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);
  const [sttStatus, setSttStatus] = React.useState<'idle' | 'transcribing' | 'error'>('idle');
  const [sttError, setSttError] = React.useState<string | null>(null);
  const [overrideCorrectOption, setOverrideCorrectOption] = React.useState<string | null>(null);
  const [feedbackEnabled, setFeedbackEnabled] = React.useState(false);
  const [editingOptions, setEditingOptions] = React.useState<Record<string, string>>({});
  const [manualOptions, setManualOptions] = React.useState<Record<string, string>>({
    A: '', B: '', C: '', D: ''
  });
  const [creationMode, setCreationMode] = React.useState<'ai' | 'manual'>('ai');
  const [showTimerDialog, setShowTimerDialog] = React.useState(false);
  const [pendingCandidate, setPendingCandidate] = React.useState<GeneratedPrompt | null>(null);
  const [publishError, setPublishError] = React.useState<string | null>(null);

  const transcriptRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.style.height = 'auto';
      transcriptRef.current.style.height = transcriptRef.current.scrollHeight + 'px';
    }
  }, [transcriptText]);

  // Reset selection when candidates change
  React.useEffect(() => {
    setSelectedIndex(null);
    setOverrideCorrectOption(null);
    setFeedbackEnabled(false);
    setEditingOptions({});
    setManualOptions({ A: '', B: '', C: '', D: '' });
    setPublishError(null);
  }, [candidates]);

  // Stop recording → Whisper → populate transcriptText → trigger generate
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
    setSelectedIndex(index);
    onSelectCandidate(p);

    setPromptInput(p.promptText);
    setTranscriptText(p.promptText);

    // Initialize correct option based on AI suggestion
    if (p.promptType === 'multiple_choice' && p.mcOptions) {
      const correctOpt = p.mcOptions.find(o => o.is_correct);
      setOverrideCorrectOption(correctOpt ? correctOpt.label : null);

      const initialOpts = p.mcOptions.reduce((acc, opt) => {
        acc[opt.label] = opt.text;
        return acc;
      }, {} as Record<string, string>);
      setEditingOptions(initialOpts);
    } else {
      setOverrideCorrectOption(null);
      setEditingOptions({});
    }
  };

  const handlePublishSelected = (p: GeneratedPrompt, timerSeconds: number | null = null) => {
    let publishedCandidate = p;
    if (p.promptType === 'multiple_choice' && p.mcOptions) {
      publishedCandidate = {
        ...p,
        promptText: promptInput,
        mcOptions: p.mcOptions.map(opt => ({
          ...opt,
          text: editingOptions[opt.label] ?? opt.text
        }))
      };
    } else {
      publishedCandidate = {
        ...p,
        promptText: promptInput
      };
    }

    if (onPublishAiCandidate) {
      onPublishAiCandidate(publishedCandidate, overrideCorrectOption, feedbackEnabled, timerSeconds);
      setSelectedIndex(null);
      setPublishError(null);
    }
  };

  // Called after instructor confirms timer dialog
  const handleTimerConfirm = (timerSeconds: number | null) => {
    setShowTimerDialog(false);

    // If triggered by "Publish This Question →" on an AI candidate, publish that candidate
    if (pendingCandidate) {
      const candidate = pendingCandidate;
      setPendingCandidate(null);
      handlePublishSelected(candidate, timerSeconds);
      return;
    }

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
      return;
    }
    // AI Mode
    if (selectedIndex !== null && candidates[selectedIndex]) {
      setPublishError(null);
      handlePublishSelected(candidates[selectedIndex], timerSeconds);
      return;
    }
    if (promptType === 'multiple_choice' && candidates.length > 0) {
      setPublishError('Please select a generated AI prompt to publish.');
      return;
    }
    if (promptType === 'multiple_choice') {
      setPublishError('Please generate AI prompts and select one to publish, or switch to Manual Creation mode.');
      return;
    }
    setPublishError(null);
    onPublish(timerSeconds);
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
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
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
              <p className="text-xs animate-pulse" style={{ color: 'var(--text-muted)' }}>
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
              className="w-full px-3 py-2.5 text-sm rounded-[10px] resize-none overflow-hidden min-h-[50px] transition-all duration-150"
              style={{
                background: 'var(--surface-raised)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
              rows={2}
            />

            {/* Prompt type + generate */}
            <div className="flex items-center gap-2">
              <select
                value={promptType}
                onChange={(e) => setPromptType(e.target.value as PromptType)}
                className="text-sm rounded-[8px] px-3 py-1.5 transition-all duration-150"
                style={{
                  background: 'var(--surface-raised)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="long_answer">Long Answer</option>
                <option value="short_answer">Short Answer</option>
                <option value="multiple_choice">Multiple Choice</option>
              </select>

              <AIPreferencesDialog />
              <Button
                onClick={() => onGenerate()}
                disabled={isGenerating || recorder.isRecording}
                size="sm"
                className="px-4 py-1.5 rounded-full font-semibold disabled:opacity-50 btn-primary-glow"
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-400))',
                  color: 'white',
                }}
              >
                {isGenerating ? 'Generating…' : 'Generate Prompts'}
              </Button>
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

            {/* Candidate cards */}
            {candidates.length > 0 && (
              <div className="space-y-2">
                {candidates.map((c: GeneratedPrompt, i: number) => (
                  <div key={i}>
                    {selectedIndex === i ? (
                      <div
                        className="p-3 rounded-xl text-sm"
                        style={{
                          background: 'rgba(45,158,45,0.06)',
                          border: '2px solid var(--color-primary-400)',
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full capitalize"
                            style={{ background: 'rgba(45,158,45,0.12)', color: 'var(--color-primary-600)' }}
                          >
                            {c.promptType.replace('_', ' ')}
                          </span>
                          <span className="text-xs font-medium" style={{ color: 'var(--color-primary-500)' }}>
                            Selected (Editing)
                          </span>
                        </div>
                        <textarea
                          value={promptInput}
                          onChange={(e) => {
                            setPromptInput(e.target.value);
                            setTranscriptText(e.target.value);
                          }}
                          className="w-full px-3 py-2.5 text-sm rounded-[10px] min-h-[80px] resize-y leading-snug transition-all duration-150"
                          style={{
                            background: 'var(--surface-raised)',
                            border: '1px solid var(--border-default)',
                            color: 'var(--text-primary)',
                          }}
                          placeholder="Edit this prompt..."
                        />
                      </div>
                    ) : (
                      <CandidateCard
                        candidate={c}
                        isSelected={false}
                        onSelect={() => handleSelectCandidate(c, i)}
                      />
                    )}

                    {selectedIndex === i && c.promptType === 'multiple_choice' && (
                      <MultipleChoiceEditor
                        nameGroup={`correct-option-${i}`}
                        options={c.mcOptions?.map((opt: { label: string; text: string; is_correct?: boolean }) => ({
                          label: opt.label,
                          text: editingOptions[opt.label] ?? opt.text
                        })) || []}
                        correctOption={overrideCorrectOption}
                        onCorrectOptionChange={setOverrideCorrectOption}
                        onOptionTextChange={(label, text) => setEditingOptions({ ...editingOptions, [label]: text })}
                        feedbackEnabled={feedbackEnabled}
                        onFeedbackChange={setFeedbackEnabled}
                      />
                    )}

                    {selectedIndex === i && (
                      <button
                        onClick={() => { setPendingCandidate(c); setShowTimerDialog(true); }}
                        disabled={!promptInput.trim() || !isConnected}
                        className="mt-2 w-full rounded-[10px] text-xs py-2 font-semibold text-white transition-all duration-150 disabled:opacity-50 btn-primary-glow"
                        style={{
                          background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-400))',
                        }}
                      >
                        Publish This Question →
                      </button>
                    )}
                  </div>
                ))}

                <div className="flex gap-2 pt-1">
                  <Button
                    onClick={onRegenerate}
                    disabled={isGenerating}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    {isGenerating ? 'Regenerating…' : 'Regenerate'}
                  </Button>
                </div>
              </div>
            )}

          </TabsContent>

          <TabsContent value="manual" className="space-y-3 mt-0">
            <div className="flex items-center gap-2 mb-2">
              <select
                value={promptType}
                onChange={(e) => setPromptType(e.target.value as PromptType)}
                className="text-sm rounded-[8px] px-3 py-1.5 transition-all duration-150"
                style={{
                  background: 'var(--surface-raised)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
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
              className="w-full px-3 py-2.5 text-sm rounded-[10px] resize-none overflow-hidden min-h-[80px] transition-all duration-150"
              style={{
                background: 'var(--surface-raised)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
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

        {/* Start Discussion button */}
        {!activeDiscussionId && (
          <div className="pt-3 flex justify-end" style={{ borderTop: '1px solid var(--border-subtle)' }}>
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

        <StartDiscussionDialog
          open={showTimerDialog}
          onConfirm={handleTimerConfirm}
          onCancel={() => { setShowTimerDialog(false); setPendingCandidate(null); }}
        />
      </div>
    </div>
  );
}
