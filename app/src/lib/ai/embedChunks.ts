// Generates and stores vector embeddings for lesson_chunks rows after file upload or transcription.
import type { AIProvider } from './providers';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Generates and stores OpenAI embeddings for lesson_chunks rows.
 * Called after file upload (slide chunks) and after STT transcription (transcript chunks).
 * Accepts chunks directly (id + content) to avoid a redundant DB fetch — callers already
 * have the content in memory after inserting chunks.
 * Batched at 500 to stay within OpenAI Embeddings API input limits.
 *
 * NOTE: On failure, file status is set to 'failed' by the caller,
 * but chunks remain in DB. Re-embedding triggered by re-uploading the file.
 *
 * @see US 1.18
 */
export async function embedChunks(
  chunks: { id: string; content: string }[],
  supabase: SupabaseClient,
  aiProvider: AIProvider
): Promise<void> {
  if (chunks.length === 0) return;

  // Process in batches of 500
  const BATCH_SIZE = 500;
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const inputs = batch.map((c) => c.content);

    let embeddings: number[][];
    try {
      embeddings = await aiProvider.generateEmbedding(inputs);
    } catch (err) {
      const e = err as { code?: string; message?: string };
      console.error(`EMBED_ERR [${e.code ?? 'unknown'}]: ${e.message ?? String(err)}`);
      throw err;
    }

    // Parallel updates — upsert is avoided because its INSERT path triggers
    // RLS INSERT policies that fail when only {id, embedding} are provided.
    const results = await Promise.all(
      batch.map((chunk, j) =>
        supabase
          .from('lesson_chunks')
          .update({ embedding: JSON.stringify(embeddings[j]) })
          .eq('id', chunk.id)
      )
    );

    const failed = results.find(({ error }) => error);
    if (failed?.error) {
      const msg = String(failed.error.message ?? '').slice(0, 200);
      console.error(`EMBED_UPDATE_ERR [${failed.error.code ?? 'unknown'}]: ${msg}`);
      throw new Error(`Failed to store embeddings: ${msg}`);
    }
  }
}