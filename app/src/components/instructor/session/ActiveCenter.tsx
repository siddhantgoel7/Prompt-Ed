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
  const [editingOptions, setEditingOptions] = React.useState<Record<string, string>>({});
  const [manualOptions, setManualOptions] = React.useState<Record<string, string>>({
    A: '', B: '', C: '', D: ''
  });
  const [creationMode, setCreationMode] = React.useState<'ai' | 'manual'>('ai');

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

  const handlePublishSelected = (p: GeneratedPrompt) => {
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
      onPublishAiCandidate(publishedCandidate, overrideCorrectOption, feedbackEnabled);
      setSelectedIndex(null);
    }
  };

  return (
    <div className="flex-1 p-6 space-y-4 overflow-y-auto">

      <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
        <Tabs value={creationMode} onValueChange={(v) => setCreationMode(v as 'ai' | 'manual')} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="ai">AI Generation</TabsTrigger>
            <TabsTrigger value="manual">Manual Creation</TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="space-y-3 mt-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Generate with AI</span>

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

              <AIPreferencesDialog />
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
                    {selectedIndex === i ? (
                      <div className="p-3 bg-gray-50 border-2 border-black rounded-lg text-sm transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="text-xs capitalize">
                            {c.promptType.replace('_', ' ')}
                          </Badge>
                          <span className="text-xs text-green-600 font-medium">Selected (Editing)</span>
                        </div>
                        <textarea
                          value={promptInput}
                          onChange={(e) => {
                            setPromptInput(e.target.value);
                            setTranscriptText(e.target.value);
                          }}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-black min-h-[80px] resize-y leading-snug bg-white"
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
                      <Button
                        size="sm"
                        onClick={() => handlePublishSelected(c)}
                        disabled={!promptInput.trim() || !isConnected}
                        className="mt-2 w-full bg-black text-white rounded-lg text-xs py-1.5 hover:bg-gray-800 disabled:opacity-50"
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

          </TabsContent>

          <TabsContent value="manual" className="space-y-3 mt-0">
            <div className="flex items-center gap-2 mb-2">
              <select
                value={promptType}
                onChange={(e) => setPromptType(e.target.value as PromptType)}
                className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-black"
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
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black resize-none overflow-hidden min-h-[80px]"
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

        {/* Start / Close Discussion Toggle */}
        <div className="pt-4 border-t border-gray-200">
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
                if (creationMode === 'manual') {
                  if (promptType === 'multiple_choice') {
                    if (!overrideCorrectOption) {
                      alert('Please select a correct answer for your multiple-choice question.');
                      return;
                    }
                    if (onPublishAiCandidate) {
                      const mcOptions = (['A', 'B', 'C', 'D'] as const).map(label => ({
                        label,
                        text: manualOptions[label] || `Option ${label}`
                      }));

                      onPublishAiCandidate(
                        {
                          promptText: promptInput,
                          promptType: 'multiple_choice',
                          mcOptions
                        },
                        overrideCorrectOption,
                        feedbackEnabled
                      );

                      setManualOptions({ A: '', B: '', C: '', D: '' });
                      setOverrideCorrectOption(null);
                      setFeedbackEnabled(false);
                      setPromptInput('');
                    }
                    return;
                  }

                  // For long/short answer in manual mode
                  onPublish();
                  return;
                }

                // AI Mode
                if (selectedIndex !== null && candidates[selectedIndex]) {
                  handlePublishSelected(candidates[selectedIndex]);
                  return;
                }

                if (promptType === 'multiple_choice' && candidates.length > 0) {
                  alert('Please select a generated AI prompt to publish.');
                  return;
                }

                if (promptType === 'multiple_choice') {
                  alert('Please generate AI prompts and select one to publish, or switch to Manual Creation mode.');
                  return;
                }

                // fallback for short/long answer when no candidate selected 
                // publishes the STT input as the prompt
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