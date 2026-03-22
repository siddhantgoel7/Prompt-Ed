// Main RAG → generate pipeline for discussion prompt creation.
// Retrieves relevant lesson chunks, builds prompts, calls the LLM, and parses the response.
import type { AIProvider } from './providers';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PromptType } from '@/types/discussion';
import type { CandidateSet, GeneratedPrompt, MCOption, AIPromptPreferences } from '@/types/ai';
import { retrieveChunksBySimilarity, retrieveRecentChunks, blendEmbeddings, normalizeEmbedding, type RetrievedChunk } from './retrieveChunks';
import { buildSystemPrompt, buildUserPrompt, CANDIDATE_COUNT, TEMPERATURE_BY_TYPE } from './prompts/discussionPrompt';

/**
 * Orchestrates the full RAG → generate pipeline.
 *
 * Flow:
 *   if transcriptText: embed it → blend with focusAreas (70/30) → retrieveChunksBySimilarity
 *   if no transcriptText but focusAreas: embed focusAreas → retrieveChunksBySimilarity
 *   final fallback: retrieveRecentChunks + warning
 *   → buildUserPrompt → gpt-4o-mini → parse CANDIDATE_COUNT candidates
 *
 * @see US 1.18, 1.19
 */
export async function generatePrompts(
  lessonId: string,
  transcriptText: string,
  promptType: PromptType,
  supabase: SupabaseClient,
  aiProvider: AIProvider,
  preferences?: AIPromptPreferences
): Promise<CandidateSet> {
  let retrieved: RetrievedChunk[] = [];
  let warning: string | undefined;

  try {
    if (transcriptText.trim()) {
      // Semantic retrieval: embed transcript text, find similar chunks
      const embeddingResponse = await aiProvider.generateEmbedding(transcriptText.trim());
      let queryEmbedding = embeddingResponse[0];

      // Blend with focusAreas embedding to steer retrieval toward instructor's intent.
      // Handles synonyms ("side effects" / "adverse reactions") that substring matching cannot.
      if (preferences?.focusAreas?.trim()) {
        const focusResponse = await aiProvider.generateEmbedding(preferences.focusAreas.trim());
        const blended = blendEmbeddings(queryEmbedding, focusResponse[0], 0.7);
        queryEmbedding = normalizeEmbedding(blended);
      }

      retrieved = await retrieveChunksBySimilarity(lessonId, queryEmbedding, supabase);
    }

    // Fallback to recent chunks if no transcript or retrieval returned nothing
    if (retrieved.length === 0) {
      // When no transcript but focusAreas is set, use focusAreas as the query.
      // This makes preferences work for the file-upload-without-transcript workflow.
      if (preferences?.focusAreas?.trim()) {
        const focusResponse = await aiProvider.generateEmbedding(preferences.focusAreas.trim());
        retrieved = await retrieveChunksBySimilarity(lessonId, focusResponse[0], supabase);
      }
      // Final fallback: no transcript and no focusAreas (or focusAreas retrieval also empty)
      if (retrieved.length === 0) {
        retrieved = await retrieveRecentChunks(lessonId, supabase);
        warning = transcriptText.trim()
          ? 'Could not retrieve similar content. Using recent lesson content.'
          : 'No transcript provided. Generating from uploaded file content only.';
      }
    }

    // Build and call
    const chunks = retrieved.map((c) => c.content);
    const userPrompt = buildUserPrompt({ chunks, transcriptText, promptType, preferences });
    const { content: rawContent, tokenUsage, model } = await aiProvider.generateChatCompletion([
      { role: 'system', content: buildSystemPrompt(preferences, promptType) },
      { role: 'user', content: userPrompt }
    ], { jsonMode: true, temperature: TEMPERATURE_BY_TYPE[promptType] });

    const parsed = parseAIResponse(rawContent, promptType);

    return { candidates: parsed, warning, tokenUsage, model };
  } catch (err) {
    const e = err as { code?: string; message?: string };
    console.error(`GENERATE_ERR [${e.code ?? 'unknown'}]: ${e.message ?? String(err)}`);
    throw err;
  }
}

/**
 * Parses the raw JSON string from gpt-4o-mini into GeneratedPrompt array.
 * Handles both array responses and object-wrapped arrays.
 * Strips is_correct from mcOptions (safe for return to clients).
 */
function parseAIResponse(raw: string, promptType: PromptType): GeneratedPrompt[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return getFallbackCandidates(promptType);
  }

  // Handle both array and object-wrapped responses
  let candidates: unknown[];
  if (Array.isArray(parsed)) {
    candidates = parsed;
  } else if (parsed && typeof parsed === 'object') {
    // gpt-4o-mini with json_object wraps candidates in an object.
    // Prefer the "candidates" key (matches our output schema); fall back to scanning
    // for any array key in case the model uses a different name.
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.candidates)) {
      candidates = obj.candidates as unknown[];
    } else {
      const arrayKey = Object.keys(obj).find((k) => Array.isArray(obj[k]));
      candidates = arrayKey ? (obj[arrayKey] as unknown[]) : [];
    }
  } else {
    return getFallbackCandidates(promptType);
  }

  const mappedCandidates = candidates.slice(0, CANDIDATE_COUNT).map((c) => {
    const candidate = c as {
      promptText?: string;
      promptType?: string;
      mcOptions?: MCOption[];
      bloomsLevel?: GeneratedPrompt['bloomsLevel'];
      topicArea?: string;
      rationale?: string;
    };

    const result: GeneratedPrompt = {
      promptText: candidate.promptText ?? 'Discussion question',
      promptType: promptType,
      ...(candidate.bloomsLevel && { bloomsLevel: candidate.bloomsLevel }),
      ...(candidate.topicArea && { topicArea: candidate.topicArea }),
      ...(candidate.rationale && { rationale: candidate.rationale }),
    };

    if (promptType === 'multiple_choice') {
      if (Array.isArray(candidate.mcOptions) && candidate.mcOptions.length > 0) {
        result.mcOptions = candidate.mcOptions; // position assignment handled in batch below
      } else {
        result.promptText = 'Multiple choice options could not be generated for this question. Please regenerate.';
        result.mcOptions = [];
      }
    }

    return result;
  });

  return promptType === 'multiple_choice' ? assignMCPositions(mappedCandidates) : mappedCandidates;
}

/**
 * Assigns correct-answer positions across all MC candidates as a batch.
 * Guarantees all four labels (A, B, C, D) appear at least once across 5 candidates;
 * the 5th slot is a random repeat. Slot order is shuffled so the repeat isn't always
 * at the same candidate index.
 */
function assignMCPositions(candidates: GeneratedPrompt[]): GeneratedPrompt[] {
  const labels: MCOption['label'][] = ['A', 'B', 'C', 'D'];
  const extra = labels[Math.floor(Math.random() * labels.length)];
  const slots = ([...labels, extra] as MCOption['label'][]).sort(() => Math.random() - 0.5);

  return candidates.map((candidate, i) => {
    if (!candidate.mcOptions || candidate.mcOptions.length === 0) return candidate;
    return { ...candidate, mcOptions: rotateMCToPosition(candidate.mcOptions, slots[i]) };
  });
}

/**
 * Places the correct option at targetLabel; fills remaining positions with
 * incorrect options in randomised order. Re-labels all four options A–D.
 */
function rotateMCToPosition(options: MCOption[], targetLabel: MCOption['label']): MCOption[] {
  const labels: MCOption['label'][] = ['A', 'B', 'C', 'D'];
  const correctOpt = options.find(o => o.is_correct);
  const incorrectOpts = options.filter(o => !o.is_correct).sort(() => Math.random() - 0.5);

  if (!correctOpt) return options;

  const targetIdx = labels.indexOf(targetLabel);
  const result: MCOption[] = new Array(4);
  result[targetIdx] = { ...correctOpt, label: labels[targetIdx] };

  let incorrectIdx = 0;
  for (let i = 0; i < 4; i++) {
    if (!result[i]) {
      result[i] = { ...incorrectOpts[incorrectIdx], label: labels[i] };
      incorrectIdx++;
    }
  }

  return result;
}

/** Returns placeholder candidates when the AI response cannot be parsed. */
function getFallbackCandidates(promptType: PromptType): GeneratedPrompt[] {
  return Array.from({ length: CANDIDATE_COUNT }, (_, i) => ({
    promptText: `Discussion question ${i + 1} — AI response could not be parsed. Please regenerate.`,
    promptType,
  }));
}
