'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import * as React from 'react';
import type { GeneratedPrompt } from '@/types/ai';
import type { PromptType } from '@/types/discussion';

// US 1.18, 1.19 — AI candidate selection and context input
function CandidateCard({
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
        isSelected
          ? 'border-black bg-gray-50'
          : 'border-gray-200 hover:border-gray-400 bg-white',
      ].join(' ')}
    >
      <div className="flex items-center gap-2 mb-1">
        <Badge variant="secondary" className="text-xs capitalize">
          {candidate.promptType.replace('_', ' ')}
        </Badge>
        {isSelected && (
          <span className="text-xs text-green-600 font-medium">Selected</span>
        )}
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

export function ActiveCenter({
  promptInput,
  setPromptInput,
  isConnected,
  activeDiscussionId,
  onPublish,
  onClose,
  // US 1.18, 1.19 — AI generation props
  transcriptText,
  setTranscriptText,
  promptType,
  setPromptType,
  candidates,
  isGenerating,
  generationWarning,
  onGenerate,
  onSelectCandidate,
  onRegenerate,
}: {
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
}) {
  const [selectedCandidateIndex, setSelectedCandidateIndex] = React.useState<number | null>(null);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = React.useState(false);

  const handleSelectCandidate = (p: GeneratedPrompt, index: number) => {
    setSelectedCandidateIndex(index);
    onSelectCandidate(p);
  };

  const handleRegenerate = () => {
    // If user edited the prompt input, confirm before regenerating
    if (promptInput.trim() && selectedCandidateIndex !== null) {
      setShowRegenerateConfirm(true);
    } else {
      setSelectedCandidateIndex(null);
      onRegenerate();
    }
  };

  const confirmRegenerate = () => {
    setShowRegenerateConfirm(false);
    setSelectedCandidateIndex(null);
    onRegenerate();
  };

  return (
    <div className="flex-1 p-6 space-y-4 overflow-y-auto">
      {/* AI generation section — US 1.18, 1.19 */}
      <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">AI Prompt Generation</span>
          {/* STT placeholder — US 1.17 deferred to Sprint 4 */}
          <Button
            disabled
            title="Speech-to-text coming in a future update"
            className="text-xs px-3 py-1 h-7 opacity-50 cursor-not-allowed"
            variant="outline"
            size="sm"
          >
            Start Recording
          </Button>
        </div>

        <textarea
          value={transcriptText}
          onChange={(e) => setTranscriptText(e.target.value)}
          placeholder="Type a topic or phrase (optional — leave blank to generate from uploaded files)"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black resize-none"
          rows={2}
        />

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
            disabled={isGenerating}
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

        {candidates.length > 0 && (
          <div className="space-y-2">
            {candidates.map((c, i) => (
              <CandidateCard
                key={i}
                candidate={c}
                isSelected={selectedCandidateIndex === i}
                onSelect={() => handleSelectCandidate(c, i)}
              />
            ))}

            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleRegenerate}
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

        {showRegenerateConfirm && (
          <div className="text-xs bg-yellow-50 border border-yellow-200 rounded p-2 space-y-2">
            <p>You have edited the prompt. Regenerate and discard changes?</p>
            <div className="flex gap-2">
              <button
                onClick={confirmRegenerate}
                className="px-2 py-1 bg-black text-white rounded text-xs"
              >
                Regenerate
              </button>
              <button
                onClick={() => setShowRegenerateConfirm(false)}
                className="px-2 py-1 border rounded text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual prompt input */}
      <Input
        type="text"
        value={promptInput}
        onChange={(e) => setPromptInput(e.target.value)}
        placeholder="Space to type multiple prompts"
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
      />

      {/* Keep label "Start Discussion" for tests */}
      <Button
        onClick={onPublish}
        disabled={!promptInput.trim() || !isConnected}
        className="px-4 py-2 bg-black text-white rounded-full font-semibold hover:bg-gray-800 disabled:opacity-50"
      >
        Start Discussion
      </Button>

      {/* Keep label "Close Discussion" for tests */}
      <Button
        onClick={() => activeDiscussionId && onClose(activeDiscussionId)}
        disabled={!activeDiscussionId}
        className="ml-2 px-4 py-2 bg-black text-white rounded-full font-semibold hover:bg-gray-800 disabled:opacity-50"
      >
        Close Discussion
      </Button>
    </div>
  );
}
