// API route for uploading PDF/PPTX lecture files to a lesson.
// Validates file type by magic bytes, stores to Supabase storage, then parses and embeds
// chunks in the background (fire-and-forget) while immediately returning a processing status.
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseFile } from '@/lib/ai/parsers';
import { embedChunks } from '@/lib/ai/embedChunks';
import { OpenAIProvider } from '@/lib/ai/providers';
import type { ChunkMetadata } from '@/types/ai';

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_CHUNKS_PER_FILE = 500;

const MAGIC = {
  pdf: Buffer.from([0x25, 0x50, 0x44, 0x46]),
  pptx: Buffer.from([0x50, 0x4b, 0x03, 0x04]),
};

/**
 * Groups text into chunks that respect sentence boundaries.
 * Splits on sentence-ending punctuation and newlines, then packs sentences
 * into windows up to maxChars. Carries overlapSentences sentences forward
 * into the next chunk for retrieval context continuity.
 */
function splitBySentences(text: string, maxChars: number, overlapSentences = 1): string[] {
  const sentences = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (sentences.length === 0) return text.trim() ? [text.trim()] : [];

  const chunks: string[] = [];
  let window: string[] = [];
  let windowLen = 0;

  for (const sentence of sentences) {
    if (windowLen + sentence.length + 1 > maxChars && window.length > 0) {
      chunks.push(window.join(' ').trim());
      window = window.slice(-overlapSentences);
      windowLen = window.reduce((sum, s) => sum + s.length + 1, 0);
    }
    window.push(sentence);
    windowLen += sentence.length + 1;
  }

  if (window.length > 0) chunks.push(window.join(' ').trim());
  return chunks;
}

/**
 * Returns true if text is predominantly label soup (disconnected tokens, no prose).
 * Used to decide whether to suppress a page_text chunk when a visual_description
 * for the same page already exists. Threshold: avg words per sentence < 4.
 */
function isLabelSoup(text: string): boolean {
  const segments = text.split(/[\n.]+/).map(s => s.trim()).filter(s => s.length > 0);
  if (segments.length === 0) return true;
  const avgWords = segments.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / segments.length;
  return avgWords < 4;
}

/**
 * Computes Jaccard similarity between two tokenised word sets.
 * Used by the pre-insert deduplication pass to drop near-identical chunks
 * caused by multi-column PDF layout extracting the same paragraph twice.
 */
function jaccardSimilarity(a: string, b: string): number {
  const tokenize = (s: string) => new Set(s.toLowerCase().match(/[a-z0-9]+/g) ?? []);
  const A = tokenize(a);
  const B = tokenize(b);
  if (A.size === 0 && B.size === 0) return 1;
  let intersection = 0;
  for (const t of A) { if (B.has(t)) intersection++; }
  return intersection / (A.size + B.size - intersection);
}

/** Detects file type by inspecting the first 4 magic bytes of the buffer. */
function detectFileType(buffer: Buffer): 'pdf' | 'pptx' | null {
  if (buffer.subarray(0, 4).equals(MAGIC.pdf)) return 'pdf';
  if (buffer.subarray(0, 4).equals(MAGIC.pptx)) return 'pptx';
  return null;
}

/**
 * POST /api/lessons/[lessonId]/upload
 * Uploads a lecture file, then parses and embeds it in the background.
 * Returns immediately with status 'processing' while background work continues.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await params;

  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership — two-step to avoid the Supabase array/object join ambiguity
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('id, course_id')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('instructor_id')
      .eq('id', (lesson as { id: string; course_id: string }).course_id)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    if ((course as { instructor_id: string }).instructor_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'File too large (max 25MB)' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const detectedType = detectFileType(buffer);
    if (!detectedType) {
      return NextResponse.json({ error: 'Only PDF and PPTX files are supported' }, { status: 400 });
    }

    // Max 5 files per lesson
    const { count } = await supabase
      .from('lesson_files')
      .select('id', { count: 'exact', head: true })
      .eq('lesson_id', lessonId);
    if ((count ?? 0) >= 5) {
      return NextResponse.json({ error: 'Maximum 5 files per lesson' }, { status: 400 });
    }

    // Upload to storage
    const storagePath = `${lessonId}/${crypto.randomUUID()}-${file.name}`;
    const { error: storageError } = await supabase.storage
      .from('lesson-files')
      .upload(storagePath, buffer, { contentType: file.type });
    if (storageError) {
      return NextResponse.json({ error: 'Failed to store file' }, { status: 500 });
    }

    // Insert DB record as 'processing'
    const { data: fileRecord, error: fileInsertError } = await supabase
      .from('lesson_files')
      .insert({
        lesson_id: lessonId,
        file_name: file.name,
        file_type: detectedType,
        file_size_bytes: file.size,
        storage_path: storagePath,
        status: 'processing',
      })
      .select()
      .single();

    if (fileInsertError || !fileRecord) {
      return NextResponse.json({ error: 'Failed to record file' }, { status: 500 });
    }

    const aiProvider = new OpenAIProvider();

    // --- BACKGROUND PROCESSING ---
    const processFile = async () => {
      try {
        // Parse into structured sections
        const sections = await parseFile(buffer, detectedType, aiProvider);

        // Build a set of page numbers that have a visual_description so we can suppress
        // the corresponding page_text chunk when it is label soup (figures/tables with no prose).
        const pagesWithVision = new Set(
          sections
            .filter(s => s.contentOrigin === 'visual_description' && s.pageNumber != null)
            .map(s => s.pageNumber!)
        );

        // Chunk each section independently so boundaries never cross page/slide/content-type lines.
        // Each resulting chunk inherits its section's page/slide number and content origin.
        const chunkRows: Array<{
          lesson_id: string;
          lesson_file_id: string;
          content_type: string;
          content: string;
          metadata: ChunkMetadata;
        }> = [];
        let chunkIndex = 0;

        for (const section of sections) {
          if (chunkRows.length >= MAX_CHUNKS_PER_FILE) break;

          // Suppress page_text for pages where visual_description exists AND the text is
          // label soup — disconnected tokens from figure/table layouts with no prose value.
          if (section.contentOrigin === 'page_text' && section.pageNumber != null && pagesWithVision.has(section.pageNumber)) {
            if (isLabelSoup(section.content)) {
              continue;
            }
          }

          const chunkSize =
            section.contentOrigin === 'slide_body'  ? 512  :
            section.contentOrigin === 'slide_notes' ? 768  : 1024;
          const subChunks = (
            section.contentOrigin === 'visual_description'
              ? [section.content]                                        // never split — vision output is pre-structured
              : splitBySentences(section.content, chunkSize, 1)         // sentence-aware, size tuned per content type
          ).filter(c => c.trim().length > 50);                          // drop heading-only noise
          for (const content of subChunks) {
            if (chunkRows.length >= MAX_CHUNKS_PER_FILE) break;
            const metadata: ChunkMetadata = {
              contentOrigin: section.contentOrigin,
              chunkType: 'text',
              fileName: file.name,
              pageNumber: section.pageNumber,
              slideNumber: section.slideNumber,
              chunkIndex: chunkIndex++,
            };
            chunkRows.push({ lesson_id: lessonId, lesson_file_id: fileRecord.id, content_type: section.contentOrigin, content, metadata });
          }
        }

        // Deduplicate near-identical chunks before DB insert.
        // Multi-column PDF layout and repeated slide pages both produce chunks that are
        // textually identical or near-identical. Keeping both wastes retrieval slots.
        // Strategy: for each chunk, check all earlier chunks — drop if Jaccard > 0.70.
        const finalRows = chunkRows.filter((row, i) => {
          for (let j = 0; j < i; j++) {
            if (jaccardSimilarity(row.content, chunkRows[j].content) > 0.70) return false;
          }
          return true;
        });

        if (finalRows.length === 0) {
          await supabase.from('lesson_files').update({ status: 'failed' }).eq('id', fileRecord.id);
          return;
        }

        const { data: insertedChunks, error: chunksError } = await supabase
          .from('lesson_chunks')
          .insert(finalRows)
          .select('id');

        if (chunksError || !insertedChunks) {
          await supabase.from('lesson_files').update({ status: 'failed' }).eq('id', fileRecord.id);
          return;
        }

        // Pass chunks directly to avoid a redundant DB fetch — content is already in memory
        const chunksToEmbed = (insertedChunks as { id: string }[]).map((c, i) => ({
          id: c.id,
          content: finalRows[i].content,
        }));
        await embedChunks(chunksToEmbed, supabase, aiProvider);

        // Mark as ready
        await supabase.from('lesson_files').update({ status: 'ready' }).eq('id', fileRecord.id);

      } catch (err) {
        console.error(`[upload] [${file.name}] processing failed:`, err);
        await supabase.from('lesson_files').update({ status: 'failed' }).eq('id', fileRecord.id);
      }
    };

    // Fire and forget
    processFile();

    return NextResponse.json({
      id: fileRecord.id,
      lessonId,
      fileName: file.name,
      fileType: detectedType,
      fileSizeBytes: file.size,
      status: 'processing', // Returning processing immediately
      uploadedAt: (fileRecord as { uploaded_at: string }).uploaded_at,
    });

  } catch (err) {
    console.error('[upload] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
