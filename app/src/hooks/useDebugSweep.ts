'use client';
import * as React from 'react';
import { useAIPreferences } from '@/hooks/useAIPreferences';
import { generateCandidatesApi } from '@/lib/api/aiApi';
import { TEMPERATURE_BY_TYPE } from '@/lib/ai/prompts/discussionPrompt';
import { escapeCsv } from '@/lib/utils/csv';
import type { AIPromptPreferences, GeneratedPrompt, TokenUsage } from '@/types/ai';
import type { PromptType } from '@/types/discussion';

interface UseDebugSweepOptions {
  lessonId: string;
  transcriptText: string;
  candidates: GeneratedPrompt[];
  isGenerating: boolean;
  generationWarning: string | null;
  generationTimeMs: number | null;
  lastTokenUsage: TokenUsage | null;
  lastModel: string | null;
  promptType: PromptType;
}

export function useDebugSweep({
  lessonId,
  transcriptText,
  candidates,
  isGenerating,
  generationWarning,
  generationTimeMs,
  lastTokenUsage,
  lastModel,
  promptType,
}: UseDebugSweepOptions) {
  const { preferences } = useAIPreferences();
  const [copiedReport, setCopiedReport] = React.useState(false);
  const [sweepProgress, setSweepProgress] = React.useState<{
    current: number;
    total: number;
    label: string;
  } | null>(null);

  const handleCopyReport = React.useCallback(async () => {
    const typeLabel: Record<string, string> = {
      long_answer: 'Long Answer',
      short_answer: 'Short Answer',
      multiple_choice: 'Multiple Choice',
    };
    const timeSec = generationTimeMs != null ? `${Math.round(generationTimeMs / 1000)}s` : '—';
    const contextLabel = generationWarning ? 'No context (fallback)' : 'Files + Transcript';

    const lines: string[] = [
      `${typeLabel[promptType] ?? promptType} — ${preferences.difficulty.charAt(0).toUpperCase() + preferences.difficulty.slice(1)}, ${preferences.style.charAt(0).toUpperCase() + preferences.style.slice(1).replaceAll('_', ' ')}, ${preferences.length.charAt(0).toUpperCase() + preferences.length.slice(1)} — ${timeSec}`,
      `Context: ${contextLabel}`,
    ];
    if (generationWarning) lines.push(`Warning: ${generationWarning}`);
    if (preferences.focusAreas?.trim()) lines.push(`Focus Areas: ${preferences.focusAreas.trim()}`);
    if (lastModel) lines.push(`Model: ${lastModel}`);
    if (lastTokenUsage) lines.push(`Tokens: ${lastTokenUsage.promptTokens} prompt + ${lastTokenUsage.completionTokens} completion = ${lastTokenUsage.totalTokens} total`);
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
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replaceAll('_', ' ');

    type SweepResult = {
      combo: { promptType: PromptType; difficulty: string; style: string; length: string };
      timeMs: number;
      candidates: GeneratedPrompt[];
      warning?: string;
      error?: string;
      tokenUsage?: TokenUsage;
      model?: string;
    };

    const combos: {
      promptType: PromptType;
      difficulty: AIPromptPreferences['difficulty'];
      style: AIPromptPreferences['style'];
      length: AIPromptPreferences['length'];
    }[] = [];
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

    const textReport = generateTextReport(results, TYPE_LABEL, cap, wordCount, BLOOMS_ENCODE, stdDev);
    const csvReport = generateCsvReport(results, BLOOMS_ENCODE, stdDev, wordCount);

    downloadFile(textReport, 'sweep_report.txt', 'text/plain;charset=utf-8');
    downloadFile(csvReport, 'sweep_report.csv', 'text/csv;charset=utf-8');
  }, [lessonId, transcriptText, preferences]);

  return {
    copiedReport,
    sweepProgress,
    handleCopyReport,
    handleRunAllCombinations,
    isGenerating,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BLOOMS_ENCODE: Record<string, number> = {
  remember: 1, understand: 2, apply: 3, analyze: 4, evaluate: 5, create: 6,
};
const stdDev = (vals: number[]): number => {
  if (vals.length < 2) return 0;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.sqrt(vals.map(v => (v - mean) ** 2).reduce((a, b) => a + b, 0) / vals.length);
};
const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;

function generateTextReport(results: any[], TYPE_LABEL: any, cap: any, wordCount: any, BLOOMS_ENCODE: any, stdDev: any) {
  const txtLines: string[] = [];
  results.forEach((r, i) => {
    const timeSec = Math.round(r.timeMs / 1000);
    const label = `${TYPE_LABEL[r.combo.promptType]} — ${cap(r.combo.difficulty)}, ${cap(r.combo.style)}, ${cap(r.combo.length)} — ${timeSec}s`;
    txtLines.push(`=== ${i + 1}. ${label} ===`);
    if (r.error) { txtLines.push(`ERROR: ${r.error}`, ''); return; }
    if (r.model) txtLines.push(`Model: ${r.model} | Temperature: ${TEMPERATURE_BY_TYPE[r.combo.promptType as PromptType]}`);
    if (r.tokenUsage) {
      const costUsd = (r.tokenUsage.promptTokens * 0.15 / 1_000_000) + (r.tokenUsage.completionTokens * 0.60 / 1_000_000);
      txtLines.push(`Tokens: ${r.tokenUsage.promptTokens} prompt + ${r.tokenUsage.completionTokens} completion = ${r.tokenUsage.totalTokens} total | Cost: $${costUsd.toFixed(6)}`);
    }
    if (r.warning) txtLines.push(`Warning: ${r.warning} | Fallback: true`);
    const wcs = r.candidates.map((c: any) => wordCount(c.promptText));
    const meanWC = (wcs.reduce((a: number, b: number) => a + b, 0) / wcs.length).toFixed(1);
    const uniqueTopics = new Set(r.candidates.map((c: any) => c.topicArea).filter(Boolean)).size;
    const bloomsVals = r.candidates.map((c: any) => c.bloomsLevel ? (BLOOMS_ENCODE[c.bloomsLevel] ?? 0) : 0).filter((v: number) => v > 0);
    const bSpread = stdDev(bloomsVals).toFixed(2);
    txtLines.push(`Topic diversity: ${uniqueTopics}/5 | Bloom's spread: ${bSpread} | Mean words: ${meanWC}`);
    if (r.combo.promptType === 'multiple_choice') {
      const bias: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
      r.candidates.forEach((c: any) => { const lbl = c.mcOptions?.find((o: any) => o.is_correct)?.label; if (lbl) bias[lbl] = (bias[lbl] || 0) + 1; });
      txtLines.push(`MC position bias: ${Object.entries(bias).map(([k, v]) => `${k}:${v}`).join(' ')}`);
    }
    txtLines.push('');
    r.candidates.forEach((c: any, ci: number) => {
      txtLines.push(`${ci + 1}. ${c.promptText}`);
      if (c.mcOptions && c.mcOptions.length > 0) {
        c.mcOptions.forEach((opt: any) => { txtLines.push(`   ${opt.label}. ${opt.text}${opt.is_correct ? ' [CORRECT]' : ''}`); });
      }
      if (c.bloomsLevel) txtLines.push(`   Bloom's: ${c.bloomsLevel}`);
      if (c.topicArea)   txtLines.push(`   Topic: ${c.topicArea}`);
      if (c.rationale)   txtLines.push(`   Rationale: ${c.rationale}`);
      if (ci < r.candidates.length - 1) txtLines.push('');
    });
    txtLines.push('');
  });
  return txtLines.join('\n');
}

function generateCsvReport(results: any[], BLOOMS_ENCODE: any, stdDev: any, wordCount: any) {
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

  results.forEach((r, i) => {
    const timeSec = Math.round(r.timeMs / 1000);
    const mdl = r.model ?? '';
    const ptok = r.tokenUsage?.promptTokens ?? '';
    const ctok = r.tokenUsage?.completionTokens ?? '';
    const ttok = r.tokenUsage?.totalTokens ?? '';
    const fallbackUsed = r.warning ? 'true' : 'false';
    const costUsd = r.tokenUsage ? (r.tokenUsage.promptTokens * 0.15 / 1_000_000) + (r.tokenUsage.completionTokens * 0.60 / 1_000_000) : 0;
    const higherOrderCount = r.candidates.filter((c: any) => (BLOOMS_ENCODE[c.bloomsLevel ?? ''] ?? 0) >= 4).length;
    const costPerHOQ = higherOrderCount > 0 ? (costUsd / higherOrderCount).toFixed(6) : 'N/A';
    const uniqueTopics = new Set(r.candidates.map((c: any) => c.topicArea).filter(Boolean)).size;
    const bloomsVals = r.candidates.map((c: any) => BLOOMS_ENCODE[c.bloomsLevel ?? ''] ?? 0).filter((v: number) => v > 0);
    const bSpread = stdDev(bloomsVals).toFixed(2);
    const wcs = r.candidates.map((c: any) => wordCount(c.promptText));
    const meanWC = wcs.length ? (wcs.reduce((a: number, b: number) => a + b, 0) / wcs.length).toFixed(1) : '';
    const lenVar = stdDev(wcs).toFixed(2);
    const mcBias = r.combo.promptType === 'multiple_choice' ? (() => {
      const bias: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
      r.candidates.forEach((c: any) => { const lbl = c.mcOptions?.find((o: any) => o.is_correct)?.label; if (lbl) bias[lbl] = (bias[lbl] || 0) + 1; });
      return Object.entries(bias).map(([k, v]) => `${k}:${v}`).join(' ');
    })() : '';

    if (r.error || r.candidates.length === 0) {
      csvLines.push([i + 1, r.combo.promptType, r.combo.difficulty, r.combo.style, r.combo.length, TEMPERATURE_BY_TYPE[r.combo.promptType as PromptType], timeSec, mdl, ptok, ctok, ttok, fallbackUsed, r.error ?? r.warning ?? '', costUsd ? costUsd.toFixed(6) : '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''].map(escapeCsv).join(','));
      return;
    }
    r.candidates.forEach((c: any, ci: number) => {
      const pwc = wordCount(c.promptText);
      const isQ = c.promptText.trim().endsWith('?') ? 'true' : 'false';
      const missing = (['bloomsLevel', 'topicArea', 'rationale'] as const).filter(f => !c[f]).join(',') || 'none';
      const mcA = c.mcOptions?.find((o: any) => o.label === 'A')?.text ?? '';
      const mcB = c.mcOptions?.find((o: any) => o.label === 'B')?.text ?? '';
      const mcC = c.mcOptions?.find((o: any) => o.label === 'C')?.text ?? '';
      const mcD = c.mcOptions?.find((o: any) => o.label === 'D')?.text ?? '';
      const correct = c.mcOptions?.find((o: any) => o.is_correct)?.label ?? '';
      csvLines.push([i + 1, r.combo.promptType, r.combo.difficulty, r.combo.style, r.combo.length, TEMPERATURE_BY_TYPE[r.combo.promptType as PromptType], timeSec, mdl, ptok, ctok, ttok, fallbackUsed, r.warning ?? '', costUsd.toFixed(6), costPerHOQ, uniqueTopics, bSpread, meanWC, lenVar, mcBias, ci + 1, c.promptText, pwc, isQ, missing, c.bloomsLevel ?? '', c.topicArea ?? '', c.rationale ?? '', mcA, mcB, mcC, mcD, correct, mcA.length, mcB.length, mcC.length, mcD.length].map(escapeCsv).join(','));
    });
  });
  return csvLines.join('\n');
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
