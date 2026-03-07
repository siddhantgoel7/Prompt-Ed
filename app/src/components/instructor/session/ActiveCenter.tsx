'use client';

import { Button } from '@/components/ui/button';

import { Badge } from '@/components/ui/badge';
import * as React from 'react';
import type { GeneratedPrompt } from '@/types/ai';
import type { PromptType } from '@/types/discussion';
import { SessionContext } from './SessionContext';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { CandidateCard } from './CandidateCard';



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
  onGenerate: () => void;
  onSelectCandidate: (p: GeneratedPrompt) => void;
  onRegenerate: () => void;
  onPublishAiCandidate?: (candidate: GeneratedPrompt, overrideCorrectOption?: string | null, feedbackEnabled?: boolean) => void;
}>) {
  const context = React.useContext(SessionContext);
  const promptInput = context ? context.promptInput : props.promptInput!;
  const setPromptInput = context ? context.setPromptInput : props.setPromptInput!;
  const isConnected = context ? context.isConnected : props.isConnected!;
  const onPublish = context ? context.handlePublishDiscussion : props.onPublish!;
  const onClose = context ? context.handleCloseDiscussion : props.onClose!;
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
      const form = new FormData();
      form.append('audio', audioBlob, 'recording.webm');
      const res = await fetch(`/api/lessons/${lessonId}/transcript`, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) {
        const e = await res.json() as { error?: string };
        throw new Error(e.error ?? 'Transcription failed');
      }
      const data = await res.json() as { transcript: string };
      setTranscriptText(data.transcript ?? '');
      setPromptInput(data.transcript ?? '');
      setSttStatus('idle');
      // Auto-trigger generation after successful transcription
      // Small delay so setTranscriptText flushes before onGenerate reads it
      setTimeout(() => onGenerate(), 50);
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
    } else {
      setOverrideCorrectOption(null);
    }
  };

  const handlePublishSelected = (p: GeneratedPrompt) => {
    if (onPublishAiCandidate) {
      onPublishAiCandidate(p, overrideCorrectOption, feedbackEnabled);
      setSelectedIndex(null);
    }
  };

  return (
    <div className="flex-1 p-6 space-y-4 overflow-y-auto">

      {/* ── AI generation section ── */}
      <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">AI Prompt Generation</span>

          {/* STT recording button (US 1.17) */}
          <div className="flex items-center gap-2">
            {recorder.isRecording && (
              <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
                {recorder.fmt(recorder.elapsed)}
              </span>
            )}
            {!recorder.isRecording ? (
              <Button
                onClick={recorder.start}
                disabled={isGenerating || sttStatus === 'transcribing'}
                size="sm"
                variant="outline"
                className="text-xs h-7 px-3 border-red-300 text-red-700 hover:bg-red-50"
              >
                🎙 Start Recording
              </Button>
            ) : (
              <Button
                onClick={handleStopAndTranscribe}
                size="sm"
                className="text-xs h-7 px-3 bg-gray-900 text-white hover:bg-gray-800"
              >
                ⏹ Stop &amp; Transcribe
              </Button>
            )}
          </div>
        </div>

        {sttStatus === 'transcribing' && (
          <p className="text-xs text-gray-500 animate-pulse">Transcribing audio…</p>
        )}
        {sttStatus === 'error' && sttError && (
          <p className="text-xs text-red-600">{sttError}</p>
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
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black resize-none overflow-hidden min-h-[50px]"
          rows={2}
        />

        {/* Prompt type + generate */}
        <div className="flex items-center gap-2">
          <select
            value={promptType}
            onChange={(e) => setPromptType(e.target.value as PromptType)}
            className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="long_answer">Long Answer</option>
            <option value="short_answer">Short Answer</option>
            <option value="multiple_choice">Multiple Choice</option>
          </select>

          <Button
            onClick={onGenerate}
            disabled={isGenerating || recorder.isRecording}
            size="sm"
            className="px-4 py-1.5 bg-black text-white rounded-full font-semibold hover:bg-gray-800 disabled:opacity-50"
          >
            {isGenerating ? 'Generating…' : 'Generate Prompts'}
          </Button>
        </div>

        {generationWarning && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
            {generationWarning}
          </p>
        )}

        {/* Candidate cards */}
        {candidates.length > 0 && (
          <div className="space-y-2">
            {candidates.map((c: GeneratedPrompt, i: number) => (
              <div key={i}>
                <CandidateCard
                  candidate={c}
                  isSelected={selectedIndex === i}
                  onSelect={() => handleSelectCandidate(c, i)}
                />

                {selectedIndex === i && c.promptType === 'multiple_choice' && (
                  <div className="mt-2 p-3 bg-white rounded-lg border border-gray-200">
                    <p className="text-xs font-semibold mb-2">Correct Answer</p>
                    <div className="space-y-1">
                      {c.mcOptions?.map((opt: { label: string; text: string; is_correct?: boolean }) => (
                        <label key={opt.label} className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="radio"
                            name={`correct-option-${i}`}
                            value={opt.label}
                            checked={overrideCorrectOption === opt.label}
                            onChange={() => setOverrideCorrectOption(opt.label)}
                          />
                          <span className={overrideCorrectOption === opt.label ? 'font-medium' : ''}>
                            Option {opt.label}
                          </span>
                        </label>
                      ))}
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={feedbackEnabled}
                          onChange={(e) => setFeedbackEnabled(e.target.checked)}
                        />
                        Show correctness feedback to students
                      </label>
                    </div>
                  </div>
                )}

                {selectedIndex === i && (
                  <Button
                    size="sm"
                    onClick={() => handlePublishSelected(c)}
                    className="mt-2 w-full bg-black text-white rounded-lg text-xs py-1.5 hover:bg-gray-800"
                  >
                    Publish This Question →
                  </Button>
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

        {/* Start / Close Discussion Toggle */}
        <div className="pt-2">
          {activeDiscussionId ? (
            <Button
              onClick={() => onClose(activeDiscussionId)}
              className="w-full px-4 py-2 bg-black text-white rounded-full font-semibold hover:bg-gray-800"
            >
              Close Discussion
            </Button>
          ) : (
            <Button
              onClick={() => {
                if (promptType === 'multiple_choice') {
                  if (selectedIndex !== null && candidates[selectedIndex]) {
                    if (onPublishAiCandidate) {
                      onPublishAiCandidate(
                        { ...candidates[selectedIndex], promptText: promptInput },
                        overrideCorrectOption,
                        feedbackEnabled
                      );
                      setSelectedIndex(null);
                    }
                    return;
                  }
                  alert('Manual creation of multiple-choice questions is not supported. Please generate AI prompts and select one to publish, or change the type to Short/Long Answer.');
                  return;
                }
                onPublish();
              }}
              disabled={!promptInput.trim() || !isConnected}
              className="w-full px-4 py-2 bg-black text-white rounded-full font-semibold hover:bg-gray-800 disabled:opacity-50"
            >
              Start Discussion
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}