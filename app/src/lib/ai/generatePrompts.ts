import OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PromptType } from '@/types/discussion';
import type { CandidateSet, GeneratedPrompt, MCOption, MCOptionSafe } from '@/types/ai';
import { retrieveChunksBySimilarity, retrieveRecentChunks } from './retrieveChunks';
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
  openai: OpenAI
): Promise<CandidateSet> {
  let chunks: string[] = [];
  let warning: string | undefined;

  try {
    if (transcriptText.trim()) {
      // Semantic retrieval: embed transcript text, find similar chunks
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: transcriptText.trim(),
      });
      const queryEmbedding = embeddingResponse.data[0].embedding;
      chunks = await retrieveChunksBySimilarity(lessonId, queryEmbedding, supabase);
    }

    // Fallback to recent chunks if no transcript or retrieval returned nothing
    if (chunks.length === 0) {
      chunks = await retrieveRecentChunks(lessonId, supabase);
      if (!transcriptText.trim()) {
        warning = 'No transcript provided. Generating from uploaded file content only.';
      } else {
        warning = 'Could not retrieve similar content. Using recent lesson content.';
      }
    }

    // Build and call gpt-4o-mini
    const userPrompt = buildUserPrompt({ chunks, transcriptText, promptType });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const rawContent = completion.choices[0]?.message?.content ?? '[]';
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
      // Strip is_correct — safe for client
      result.mcOptions = candidate.mcOptions.map((opt: MCOption): MCOptionSafe => ({
        label: opt.label,
        text: opt.text,
      }));
    }

    return result;
  });
}

function getFallbackCandidates(promptType: PromptType): GeneratedPrompt[] {
  return Array.from({ length: CANDIDATE_COUNT }, (_, i) => ({
    promptText: `Discussion question ${i + 1} — AI response could not be parsed. Please regenerate.`,
    promptType,
  }));
}
