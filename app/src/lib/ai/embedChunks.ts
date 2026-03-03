import type { AIProvider } from './providers';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Generates and stores OpenAI embeddings for lesson_chunks rows.
 * Called after file upload (slide chunks) and after STT transcription (transcript chunks).
 * Batched at 100 to stay within OpenAI Embeddings API input limits.
 *
 * NOTE: On failure, file status is set to 'failed' by the caller,
 * but chunks remain in DB. Re-embedding triggered by re-uploading the file.
 *
 * @see US 1.18
 */
export async function embedChunks(
  chunkIds: string[],
  supabase: SupabaseClient,
  aiProvider: AIProvider
): Promise<void> {
  if (chunkIds.length === 0) return;

  // Fetch chunk content for the given IDs
  const { data: chunks, error } = await supabase
    .from('lesson_chunks')
    .select('id, content')
    .in('id', chunkIds);

  if (error || !chunks || chunks.length === 0) {
    throw new Error('Failed to fetch chunks for embedding');
  }

  // Process in batches of 100
  const BATCH_SIZE = 100;
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const inputs = batch.map((c: { id: string; content: string }) => c.content);

    let embeddings: number[][];
    try {
      embeddings = await aiProvider.generateEmbedding(inputs);
    } catch (err) {
      const e = err as { code?: string; message?: string };
      console.error(`EMBED_ERR [${e.code ?? 'unknown'}]: ${e.message ?? String(err)}`);
      throw err;
    }

    // Update each chunk with its embedding
    for (let j = 0; j < batch.length; j++) {
      const chunk = batch[j] as { id: string; content: string };
      const embedding = embeddings[j];
      await supabase
        .from('lesson_chunks')
        .update({ embedding: JSON.stringify(embedding) })
        .eq('id', chunk.id);
    }
  }
}
