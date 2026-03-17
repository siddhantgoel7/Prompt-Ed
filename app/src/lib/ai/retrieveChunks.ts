// Retrieval functions for the RAG pipeline — fetches relevant lesson content chunks
// from the database, either by semantic similarity or by recency.
import type { SupabaseClient } from '@supabase/supabase-js';

/** A chunk returned from the database with its content and stored metadata. */
export interface RetrievedChunk {
  content: string;
  /** JSONB metadata as stored — may be the legacy { file_name, chunk_index } shape
   *  for rows created before the enriched ChunkMetadata schema was introduced. */
  metadata: Record<string, unknown>;
  similarity?: number;
}

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
): Promise<RetrievedChunk[]> {
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

    return (data ?? []).map((row: { content: string; metadata: Record<string, unknown>; similarity: number }) => ({
      content: row.content,
      metadata: row.metadata ?? {},
      similarity: row.similarity,
    }));
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
): Promise<RetrievedChunk[]> {
  try {
    const { data, error } = await supabase
      .from('lesson_chunks')
      .select('content, metadata')
      .eq('lesson_id', lessonId)
      .not('embedding', 'is', null)
      .order('created_at', { ascending: false })
      .limit(8);

    if (error) {
      console.error(`RETRIEVE_RECENT_ERR [${error.code}]: ${error.message}`);
      return [];
    }

    return (data ?? []).map((row: { content: string; metadata: Record<string, unknown> }) => ({
      content: row.content,
      metadata: row.metadata ?? {},
    }));
  } catch (err) {
    const e = err as { code?: string; message?: string };
    console.error(`RETRIEVE_RECENT_ERR [${e.code ?? 'unknown'}]: ${e.message ?? String(err)}`);
    return [];
  }
}
