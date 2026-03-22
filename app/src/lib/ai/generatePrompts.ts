// Main RAG → generate pipeline for discussion prompt creation.
// Retrieves relevant lesson chunks, builds prompts, calls the LLM, and parses the response.
import type { AIProvider } from './providers';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PromptType } from '@/types/discussion';
import type { CandidateSet, GeneratedPrompt, MCOption, AIPromptPreferences } from '@/types/ai';
import { retrieveChunksBySimilarity, retrieveRecentChunks, blendEmbeddings, normalizeEmbedding, type RetrievedChunk } from './retrieveChunks';
import { buildSystemPrompt, buildUserPrompt, CANDIDATE_COUNT } from './prompts/discussionPrompt';

/**
 * Orchestrates the full RAG → generate pipeline.
 *
 * Flow:
 *   if transcriptText: embed it → blend with focusAreas (70/30) → retrieveChunksBySimilarity → filterExcludedChunks
 *   if no transcriptText but focusAreas: embed focusAreas → retrieveChunksBySimilarity → filterExcludedChunks
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
    const rawContent = await aiProvider.generateChatCompletion([
      { role: 'system', content: buildSystemPrompt(preferences, promptType) },
      { role: 'user', content: userPrompt }
    ], { jsonMode: true, temperature: 0.7 });

    const parsed = parseAIResponse(rawContent, promptType);

    return { candidates: parsed, warning };
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
    // gpt-4o-mini with json_object sometimes wraps in an object
    const obj = parsed as Record<string, unknown>;
    const arrayKey = Object.keys(obj).find((k) => Array.isArray(obj[k]));
    candidates = arrayKey ? (obj[arrayKey] as unknown[]) : [];
  } else {
    return getFallbackCandidates(promptType);
  }

  return candidates.slice(0, CANDIDATE_COUNT).map((c) => {
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

    if (promptType === 'multiple_choice' && Array.isArray(candidate.mcOptions)) {
      result.mcOptions = candidate.mcOptions;
    }

    return result;
  });
}

/** Returns placeholder candidates when the AI response cannot be parsed. */
function getFallbackCandidates(promptType: PromptType): GeneratedPrompt[] {
  return Array.from({ length: CANDIDATE_COUNT }, (_, i) => ({
    promptText: `Discussion question ${i + 1} — AI response could not be parsed. Please regenerate.`,
    promptType,
  }));
}
