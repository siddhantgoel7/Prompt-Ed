import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Retrieves relevant lesson chunks for AI generation.
 *
 * Two retrieval modes:
 * 1. Semantic: embed transcriptText → cosine similarity → top-8 chunks
 * 2. Recent: no query → SELECT content ORDER BY created_at DESC LIMIT 8
 *    (used when transcriptText is empty — NotebookLM-style fallback)
 *
 * FUTURE (Sprint 4): Replace with weighted retrieval:
 *   40% file chunks (semantic), 40% current transcript chunks, 20% prior transcript chunks
 *   @see docs/sprint3-ai-pipeline-proposal.md "Future RAG Weighting Design"
 *
 * SECURITY: lesson_id filter is mandatory in match_lesson_chunks.
 * Without it, pgvector searches ALL instructors' lesson chunks.
 * This is a required code review gate.
 *
 * @see US 1.18
 */
export async function retrieveChunksBySimilarity(
  lessonId: string,
  queryEmbedding: number[],
  supabase: SupabaseClient
): Promise<string[]> {
  try {
    const { data, error } = await supabase.rpc('match_lesson_chunks', {
      p_lesson_id: lessonId,
      p_embedding: queryEmbedding,
      p_match_count: 8,
    });

    if (error) {
      console.error(`RETRIEVE_ERR [${error.code}]: ${error.message}`);
      return [];
    }

    return (data ?? []).map((row: { content: string }) => row.content);
  } catch (err) {
    const e = err as { code?: string; message?: string };
    console.error(`RETRIEVE_ERR [${e.code ?? 'unknown'}]: ${e.message ?? String(err)}`);
    return [];
  }
}

/**
 * Retrieves most recent lesson chunks (fallback when no transcript text provided).
 * @see US 1.18
 */
export async function retrieveRecentChunks(
  lessonId: string,
  supabase: SupabaseClient
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('lesson_chunks')
      .select('content')
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: false })
      .limit(8);

    if (error) {
      console.error(`RETRIEVE_RECENT_ERR [${error.code}]: ${error.message}`);
      return [];
    }

    return (data ?? []).map((row: { content: string }) => row.content);
  } catch (err) {
    const e = err as { code?: string; message?: string };
    console.error(`RETRIEVE_RECENT_ERR [${e.code ?? 'unknown'}]: ${e.message ?? String(err)}`);
    return [];
  }
}
