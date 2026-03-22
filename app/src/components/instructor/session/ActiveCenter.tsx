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
import { CandidateCard } from './CandidateCard';
import { MultipleChoiceEditor } from './MultipleChoiceEditor';
import { AIPreferencesDialog } from './AIPreferencesDialog';
import { transcribeAudioApi } from '@/lib/api/aiApi';
import { StartDiscussionDialog } from './StartDiscussionDialog';
// [DEBUG] imports for copy report and sweep mode
import { useAIPreferences } from '@/hooks/useAIPreferences';
import { generateCandidatesApi } from '@/lib/api/aiApi';
import { TEMPERATURE_BY_TYPE } from '@/lib/ai/prompts/discussionPrompt';
import { escapeCsv } from '@/lib/utils/csv';
import type { AIPromptPreferences, GeneratedPrompt as GP, TokenUsage } from '@/types/ai';
// [END DEBUG]



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
  // [DEBUG] wall-clock ms, token usage, and model for copy report
  generationTimeMs: number | null;
  lastTokenUsage: TokenUsage | null;
  lastModel: string | null;
  // [END DEBUG]
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
  // [DEBUG] read timing, token usage, and model from context for copy report
  const generationTimeMs = context ? context.generationTimeMs : props.generationTimeMs ?? null;
  const lastTokenUsage = context ? context.lastTokenUsage : props.lastTokenUsage ?? null;
  const lastModel = context ? context.lastModel : props.lastModel ?? null;
  // [END DEBUG]
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
  // [DEBUG] copy report and sweep state
  const [copiedReport, setCopiedReport] = React.useState(false);
  const { preferences } = useAIPreferences();
  const [sweepProgress, setSweepProgress] = React.useState<{ current: number; total: number; label: string } | null>(null);
  // [END DEBUG]
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

  // [DEBUG] build plain-text report for clipboard copy
  const handleCopyReport = React.useCallback(async () => {
    const typeLabel: Record<string, string> = {
      long_answer: 'Long Answer',
      short_answer: 'Short Answer',
      multiple_choice: 'Multiple Choice',
    };
    const timeSec = generationTimeMs != null ? `${Math.round(generationTimeMs / 1000)}s` : '—';
    const contextLabel = (() => {
      if (generationWarning) return 'No context (fallback)';
      return 'Files + Transcript';
    })();

    const lines: string[] = [
      `${typeLabel[promptType] ?? promptType} — ${preferences.difficulty.charAt(0).toUpperCase() + preferences.difficulty.slice(1)}, ${preferences.style.charAt(0).toUpperCase() + preferences.style.slice(1).replace('_', ' ')}, ${preferences.length.charAt(0).toUpperCase() + preferences.length.slice(1)} — ${timeSec}`,
      `Context: ${contextLabel}`,
    ];
    if (generationWarning) lines.push(`Warning: ${generationWarning}`);
    if (preferences.focusAreas?.trim()) lines.push(`Focus Areas: ${preferences.focusAreas.trim()}`);
    // [DEBUG] model and token usage in copy report
    if (lastModel) lines.push(`Model: ${lastModel}`);
    if (lastTokenUsage) lines.push(`Tokens: ${lastTokenUsage.promptTokens} prompt + ${lastTokenUsage.completionTokens} completion = ${lastTokenUsage.totalTokens} total`);
    // [END DEBUG]
    lines.push('');

    candidates.forEach((c, i) => {
      lines.push(`${i + 1}. ${c.promptText}`);
      if (c.mcOptions && c.mcOptions.length > 0) {
        c.mcOptions.forEach(opt => {
          lines.push(`   ${opt.label}. ${opt.text}${opt.is_correct ? ' [CORRECT]' : ''}`);
        });
      }
      if (c.bloomsLevel) lines.push(`   Bloom's: ${c.bloomsLevel}`);
      if (c.topicArea)   lines.push(`   Topic: ${c.topicArea}`);
      if (c.rationale)   lines.push(`   Rationale: ${c.rationale}`);
      if (i < candidates.length - 1) lines.push('');
    });

    await navigator.clipboard.writeText(lines.join('\n'));
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  }, [candidates, generationTimeMs, generationWarning, lastModel, lastTokenUsage, preferences, promptType]);
  // [END DEBUG]

  // [DEBUG] sweep all 81 combinations and download TXT + CSV
  const handleRunAllCombinations = React.useCallback(async () => {
    const PROMPT_TYPES: PromptType[] = ['long_answer', 'short_answer', 'multiple_choice'];
    const DIFFICULTIES: AIPromptPreferences['difficulty'][] = ['basic', 'intermediate', 'advanced'];
    const STYLES: AIPromptPreferences['style'][] = ['socratic', 'factual', 'clinical_scenario'];
    const LENGTHS: AIPromptPreferences['length'][] = ['brief', 'standard', 'detailed'];

    const TYPE_LABEL: Record<string, string> = {
      long_answer: 'Long Answer',
      short_answer: 'Short Answer',
      multiple_choice: 'Multiple Choice',
    };
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ');

    type SweepResult = {
      combo: { promptType: PromptType; difficulty: string; style: string; length: string };
      timeMs: number;
      candidates: GP[];
      warning?: string;
      error?: string;
      // [DEBUG] token usage and model per combination
      tokenUsage?: TokenUsage;
      model?: string;
      // [END DEBUG]
    };

    const combos: { promptType: PromptType; difficulty: AIPromptPreferences['difficulty']; style: AIPromptPreferences['style']; length: AIPromptPreferences['length'] }[] = [];
    for (const pt of PROMPT_TYPES)
      for (const d of DIFFICULTIES)
        for (const s of STYLES)
          for (const l of LENGTHS)
            combos.push({ promptType: pt, difficulty: d, style: s, length: l });

    // Fire at most CONCURRENCY requests at a time to avoid OpenAI rate-limit queuing.
    // JS is single-threaded so nextIdx++ is race-free — each worker grabs the next slot.
    const CONCURRENCY = 9;
    let completedCount = 0;
    let nextIdx = 0;
    setSweepProgress({ current: 0, total: combos.length, label: 'Starting…' });

    const results: SweepResult[] = new Array(combos.length);

    const runWorker = async () => {
      while (true) {
        const i = nextIdx++;
        if (i >= combos.length) break;
        const combo = combos[i];
        const startMs = Date.now();
        try {
          const data = await generateCandidatesApi(lessonId, combo.promptType, transcriptText, {
            difficulty: combo.difficulty,
            style: combo.style,
            length: combo.length,
            focusAreas: preferences.focusAreas,
          });
          results[i] = { combo, timeMs: Date.now() - startMs, candidates: data.candidates, warning: data.warning, tokenUsage: data.tokenUsage, model: data.model };
        } catch (err) {
          results[i] = { combo, timeMs: Date.now() - startMs, candidates: [], error: err instanceof Error ? err.message : 'Failed' };
        }
        completedCount++;
        setSweepProgress({ current: completedCount, total: combos.length, label: `${completedCount} of ${combos.length} completed` });
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, runWorker));

    setSweepProgress(null);

    // [DEBUG] helpers for batch metrics
    const BLOOMS_ENCODE: Record<string, number> = {
      remember: 1, understand: 2, apply: 3, analyze: 4, evaluate: 5, create: 6,
    };
    const stdDev = (vals: number[]): number => {
      if (vals.length < 2) return 0;
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      return Math.sqrt(vals.map(v => (v - mean) ** 2).reduce((a, b) => a + b, 0) / vals.length);
    };
    const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;
    // [END DEBUG]

    // Build TXT
    const txtLines: string[] = [];
    results.forEach((r, i) => {
      const timeSec = Math.round(r.timeMs / 1000);
      const label = `${TYPE_LABEL[r.combo.promptType]} — ${cap(r.combo.difficulty)}, ${cap(r.combo.style)}, ${cap(r.combo.length)} — ${timeSec}s`;
      txtLines.push(`=== ${i + 1}. ${label} ===`);
      if (r.error) { txtLines.push(`ERROR: ${r.error}`, ''); return; }
      if (r.model) txtLines.push(`Model: ${r.model} | Temperature: ${TEMPERATURE_BY_TYPE[r.combo.promptType]}`);
      if (r.tokenUsage) {
        // [DEBUG] cost in TXT
        const costUsd = (r.tokenUsage.promptTokens * 0.15 / 1_000_000) + (r.tokenUsage.completionTokens * 0.60 / 1_000_000);
        txtLines.push(`Tokens: ${r.tokenUsage.promptTokens} prompt + ${r.tokenUsage.completionTokens} completion = ${r.tokenUsage.totalTokens} total | Cost: $${costUsd.toFixed(6)}`);
        // [END DEBUG]
      }
      if (r.warning) txtLines.push(`Warning: ${r.warning} | Fallback: true`);
      // [DEBUG] batch metrics in TXT
      const wcs = r.candidates.map(c => wordCount(c.promptText));
      const meanWC = (wcs.reduce((a, b) => a + b, 0) / wcs.length).toFixed(1);
      const uniqueTopics = new Set(r.candidates.map(c => c.topicArea).filter(Boolean)).size;
      const bloomsVals = r.candidates.map(c => c.bloomsLevel ? (BLOOMS_ENCODE[c.bloomsLevel] ?? 0) : 0).filter(v => v > 0);
      const bSpread = stdDev(bloomsVals).toFixed(2);
      txtLines.push(`Topic diversity: ${uniqueTopics}/5 | Bloom's spread: ${bSpread} | Mean words: ${meanWC}`);
      if (r.combo.promptType === 'multiple_choice') {
        const bias: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
        r.candidates.forEach(c => { const lbl = c.mcOptions?.find(o => o.is_correct)?.label; if (lbl) bias[lbl] = (bias[lbl] || 0) + 1; });
        txtLines.push(`MC position bias: ${Object.entries(bias).map(([k, v]) => `${k}:${v}`).join(' ')}`);
      }
      // [END DEBUG]
      txtLines.push('');
      r.candidates.forEach((c, ci) => {
        txtLines.push(`${ci + 1}. ${c.promptText}`);
        if (c.mcOptions && c.mcOptions.length > 0) {
          c.mcOptions.forEach(opt => {
            txtLines.push(`   ${opt.label}. ${opt.text}${opt.is_correct ? ' [CORRECT]' : ''}`);
          });
        }
        if (c.bloomsLevel) txtLines.push(`   Bloom's: ${c.bloomsLevel}`);
        if (c.topicArea)   txtLines.push(`   Topic: ${c.topicArea}`);
        if (c.rationale)   txtLines.push(`   Rationale: ${c.rationale}`);
        if (ci < r.candidates.length - 1) txtLines.push('');
      });
      txtLines.push('');
    });

    // Build CSV
    // [DEBUG] full column set including quality and batch metrics
    const csvLines: string[] = [[
      'combo_number', 'prompt_type', 'difficulty', 'style', 'length', 'temperature',
      'time_s', 'model', 'prompt_tokens', 'completion_tokens', 'total_tokens',
      'fallback_used', 'warning', 'cost_usd', 'cost_per_higher_order_question',
      'topic_diversity', 'blooms_spread', 'mean_word_count', 'length_variance', 'mc_position_bias',
      'prompt_number', 'prompt_text', 'prompt_word_count', 'is_question', 'fields_missing',
      'blooms_level', 'topic_area', 'rationale',
      'mc_option_a', 'mc_option_b', 'mc_option_c', 'mc_option_d', 'correct_option',
      'mc_option_a_length', 'mc_option_b_length', 'mc_option_c_length', 'mc_option_d_length',
    ].map(escapeCsv).join(',')];
    // [END DEBUG]

    results.forEach((r, i) => {
      const timeSec = Math.round(r.timeMs / 1000);
      const mdl = r.model ?? '';
      const ptok = r.tokenUsage?.promptTokens ?? '';
      const ctok = r.tokenUsage?.completionTokens ?? '';
      const ttok = r.tokenUsage?.totalTokens ?? '';
      const fallbackUsed = r.warning ? 'true' : 'false';

      // [DEBUG] batch-level computed metrics
      const costUsd = r.tokenUsage
        ? (r.tokenUsage.promptTokens * 0.15 / 1_000_000) + (r.tokenUsage.completionTokens * 0.60 / 1_000_000)
        : 0;
      const higherOrderCount = r.candidates.filter(c => (BLOOMS_ENCODE[c.bloomsLevel ?? ''] ?? 0) >= 4).length;
      const costPerHOQ = higherOrderCount > 0 ? (costUsd / higherOrderCount).toFixed(6) : 'N/A';
      const uniqueTopics = new Set(r.candidates.map(c => c.topicArea).filter(Boolean)).size;
      const bloomsVals = r.candidates.map(c => BLOOMS_ENCODE[c.bloomsLevel ?? ''] ?? 0).filter(v => v > 0);
      const bSpread = stdDev(bloomsVals).toFixed(2);
      const wcs = r.candidates.map(c => wordCount(c.promptText));
      const meanWC = wcs.length ? (wcs.reduce((a, b) => a + b, 0) / wcs.length).toFixed(1) : '';
      const lenVar = stdDev(wcs).toFixed(2);
      const mcBias = r.combo.promptType === 'multiple_choice'
        ? (() => {
            const bias: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
            r.candidates.forEach(c => { const lbl = c.mcOptions?.find(o => o.is_correct)?.label; if (lbl) bias[lbl] = (bias[lbl] || 0) + 1; });
            return Object.entries(bias).map(([k, v]) => `${k}:${v}`).join(' ');
          })()
        : '';
      // [END DEBUG]

      if (r.error || r.candidates.length === 0) {
        csvLines.push([
          i + 1, r.combo.promptType, r.combo.difficulty, r.combo.style, r.combo.length, TEMPERATURE_BY_TYPE[r.combo.promptType],
          timeSec, mdl, ptok, ctok, ttok,
          fallbackUsed, r.error ?? r.warning ?? '', costUsd ? costUsd.toFixed(6) : '', '',
          '', '', '', '', '',
          '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
        ].map(escapeCsv).join(','));
        return;
      }

      r.candidates.forEach((c, ci) => {
        // [DEBUG] per-prompt metrics
        const pwc = wordCount(c.promptText);
        const isQ = c.promptText.trim().endsWith('?') ? 'true' : 'false';
        const missing = (['bloomsLevel', 'topicArea', 'rationale'] as const).filter(f => !c[f]).join(',') || 'none';
        const mcA = c.mcOptions?.find(o => o.label === 'A')?.text ?? '';
        const mcB = c.mcOptions?.find(o => o.label === 'B')?.text ?? '';
        const mcC = c.mcOptions?.find(o => o.label === 'C')?.text ?? '';
        const mcD = c.mcOptions?.find(o => o.label === 'D')?.text ?? '';
        const correct = c.mcOptions?.find(o => o.is_correct)?.label ?? '';
        const mcALen = mcA ? mcA.length : '';
        const mcBLen = mcB ? mcB.length : '';
        const mcCLen = mcC ? mcC.length : '';
        const mcDLen = mcD ? mcD.length : '';
        // [END DEBUG]
        csvLines.push([
          i + 1, r.combo.promptType, r.combo.difficulty, r.combo.style, r.combo.length, TEMPERATURE_BY_TYPE[r.combo.promptType],
          timeSec, mdl, ptok, ctok, ttok,
          fallbackUsed, r.warning ?? '', costUsd.toFixed(6), costPerHOQ,
          uniqueTopics, bSpread, meanWC, lenVar, mcBias,
          ci + 1, c.promptText, pwc, isQ, missing,
          c.bloomsLevel ?? '', c.topicArea ?? '', c.rationale ?? '',
          mcA, mcB, mcC, mcD, correct,
          mcALen, mcBLen, mcCLen, mcDLen,
        ].map(escapeCsv).join(','));
      });
    });

    const download = (content: string, filename: string, mime: string) => {
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    };

    download(txtLines.join('\n'), 'sweep_report.txt', 'text/plain;charset=utf-8');
    download(csvLines.join('\n'), 'sweep_report.csv', 'text/csv;charset=utf-8');
  }, [lessonId, transcriptText, preferences]);
  // [END DEBUG]

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
              <div className="rotating-glow-wrap">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => onGenerate()}
                      disabled={isGenerating || recorder.isRecording}
                      size="sm"
                      className="px-4 py-1.5 rounded-full font-semibold disabled:opacity-50"
                      style={{
                        background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-400))',
                        color: 'white',
                      }}
                    >
                      {isGenerating ? 'Generating…' : 'Generate Prompts'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Use AI to generate 5 discussion prompt candidates from your transcript and uploaded files. Takes 5 to 15 seconds.</TooltipContent>
                </Tooltip>
              </div>
              {/* [DEBUG] run all combinations button */}
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
                    {sweepProgress ? `${sweepProgress.current}/${sweepProgress.total}…` : 'Run All Combinations'}&nbsp;<span className="opacity-60">[DEBUG ONLY]</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Generate all 81 type/difficulty/style/length combinations sequentially. Downloads sweep_report.txt and sweep_report.csv when done. ~15–20 min.</TooltipContent>
              </Tooltip>
              {/* [END DEBUG] */}
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

            {/* [DEBUG] sweep progress indicator */}
            {sweepProgress && (
              <p className="text-xs rounded-lg px-3 py-2 animate-pulse"
                style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', color: '#6366f1' }}>
                Generating {sweepProgress.current} / {sweepProgress.total} — {sweepProgress.label}
              </p>
            )}
            {/* [END DEBUG] */}

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
                          <span className="text-xs font-medium text-brand-500">
                            Selected (Editing)
                          </span>
                        </div>
                        <textarea
                          value={promptInput}
                          onChange={(e) => {
                            setPromptInput(e.target.value);
                            setTranscriptText(e.target.value);
                          }}
                          className="w-full px-3 py-2.5 text-sm rounded-[10px] min-h-[80px] resize-y leading-snug transition-all duration-150 bg-surface-raised text-content-primary"
                          style={{
                            border: '1px solid var(--border-default)',
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
                  {/* [DEBUG] copy report button */}
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
                  {/* [END DEBUG] */}
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

        <StartDiscussionDialog
          open={showTimerDialog}
          onConfirm={handleTimerConfirm}
          onCancel={() => { setShowTimerDialog(false); setPendingCandidate(null); }}
        />
      </div>
    </div>
  );
}
