// Main RAG → generate pipeline for discussion prompt creation.
// Retrieves relevant lesson chunks, builds prompts, calls the LLM, and parses the response.
import type { AIProvider } from './providers';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PromptType } from '@/types/discussion';
import type { CandidateSet, GeneratedPrompt, MCOption, AIPromptPreferences } from '@/types/ai';
import { retrieveChunksBySimilarity, retrieveRecentChunks, type RetrievedChunk } from './retrieveChunks';
import { buildSystemPrompt, buildUserPrompt, CANDIDATE_COUNT } from './prompts/discussionPrompt';

/**
 * Orchestrates the full RAG → generate pipeline.
 *
 * Flow:
 *   if transcriptText: embed it → retrieveChunksBySimilarity
 *   if no transcriptText OR retrieval empty: retrieveRecentChunks + add warning
 *   → buildUserPrompt → gpt-4o-mini → parse CANDIDATE_COUNT candidates
 *
 * FUTURE: when Sprint 4 weighted retrieval is implemented, replace the
 * retrieval calls here with the blended 40/40/20 retriever.
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
      const queryEmbedding = embeddingResponse[0];
      console.log(`[generatePrompts] lessonId=${lessonId} queryEmbedding dims=${queryEmbedding?.length ?? 'undefined'}`);
      retrieved = await retrieveChunksBySimilarity(lessonId, queryEmbedding, supabase);
      console.log(`[generatePrompts] similarity retrieval returned ${retrieved.length} chunk(s)`);
    }

    // Fallback to recent chunks if no transcript or retrieval returned nothing
    if (retrieved.length === 0) {
      retrieved = await retrieveRecentChunks(lessonId, supabase);
      console.log(`[generatePrompts] recent fallback returned ${retrieved.length} chunk(s)`);
      if (!transcriptText.trim()) {
        warning = 'No transcript provided. Generating from uploaded file content only.';
      } else {
        warning = 'Could not retrieve similar content. Using recent lesson content.';
      }
    }

    // Build and call
    const chunks = retrieved.map((c) => c.content);
    const userPrompt = buildUserPrompt({ chunks, transcriptText, promptType, preferences });
    const rawContent = await aiProvider.generateChatCompletion([
      { role: 'system', content: buildSystemPrompt(preferences) },
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
    };

    const result: GeneratedPrompt = {
      promptText: candidate.promptText ?? 'Discussion question',
      promptType: promptType,
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
