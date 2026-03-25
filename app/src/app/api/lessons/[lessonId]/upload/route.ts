// API route for uploading PDF/PPTX lecture files to a lesson.
// Validates file type by magic bytes, stores to Supabase storage, then parses and embeds
// chunks in the background (fire-and-forget) while immediately returning a processing status.
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseFile } from '@/lib/ai/parsers';
import { embedChunks } from '@/lib/ai/embedChunks';
import { OpenAIProvider } from '@/lib/ai/providers';
import type { ChunkMetadata, ParsedSection } from '@/types/ai';
import type { SupabaseClient, User } from '@supabase/supabase-js';

interface LessonFileRecord {
  id: string;
  lesson_id: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  storage_path: string;
  status: string;
  uploaded_at: string;
}

interface ChunkRow {
  lesson_id: string;
  lesson_file_id: string;
  content_type: string;
  content: string;
  metadata: ChunkMetadata;
}

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
async function validateLessonOwnership(supabase: SupabaseClient, user: User, lessonId: string) {
  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select('id, course_id')
    .eq('id', lessonId)
    .single();

  if (lessonError || !lesson) return { error: 'Lesson not found', status: 404 };

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('instructor_id')
    .eq('id', (lesson as { id: string; course_id: string }).course_id)
    .single();

  if (courseError || !course) return { error: 'Course not found', status: 404 };

  if ((course as { instructor_id: string }).instructor_id !== user.id) {
    return { error: 'Forbidden', status: 403 };
  }
  return { success: true };
}

async function uploadStorageAndRecord(supabase: SupabaseClient, lessonId: string, file: File, buffer: Buffer, detectedType: string) {
  // Max 5 files per lesson
  const { count } = await supabase
    .from('lesson_files')
    .select('id', { count: 'exact', head: true })
    .eq('lesson_id', lessonId);
  if ((count ?? 0) >= 5) return { error: 'Maximum 5 files per lesson', status: 400 };

  const storagePath = `${lessonId}/${crypto.randomUUID()}-${file.name}`;
  const { error: storageError } = await supabase.storage
    .from('lesson-files')
    .upload(storagePath, buffer, { contentType: file.type });
  if (storageError) return { error: 'Failed to store file', status: 500 };

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

  if (fileInsertError || !fileRecord) return { error: 'Failed to record file', status: 500 };
  return { fileRecord };
}

function chunkSections(sections: ParsedSection[], fileName: string, lessonId: string, fileRecordId: string, pagesWithVision: Set<number>) {
  const chunkRows: ChunkRow[] = [];
  let chunkIndex = 0;

  for (const section of sections) {
    if (chunkRows.length >= MAX_CHUNKS_PER_FILE) break;
    const sectionChunks = createChunksForSection(section, fileName, lessonId, fileRecordId, pagesWithVision, chunkIndex);
    chunkIndex += sectionChunks.length;
    chunkRows.push(...sectionChunks);
  }
  return chunkRows.slice(0, MAX_CHUNKS_PER_FILE);
}

function createChunksForSection(section: ParsedSection, fileName: string, lessonId: string, fileRecordId: string, pagesWithVision: Set<number>, startIndex: number): ChunkRow[] {
  // Suppress label soup if visual_description exists
  if (section.contentOrigin === 'page_text' && section.pageNumber != null && pagesWithVision.has(section.pageNumber)) {
    if (isLabelSoup(section.content)) return [];
  }

  let chunkSize = 1024;
  if (section.contentOrigin === 'slide_body') chunkSize = 512;
  else if (section.contentOrigin === 'slide_notes') chunkSize = 768;
  const subChunks = (section.contentOrigin === 'visual_description' ? [section.content] : splitBySentences(section.content, chunkSize, 1)).filter(c => c.trim().length > 50);

  return subChunks.map((content, i) => ({
    lesson_id: lessonId,
    lesson_file_id: fileRecordId,
    content_type: section.contentOrigin,
    content,
    metadata: {
      contentOrigin: section.contentOrigin,
      chunkType: 'text',
      fileName,
      pageNumber: section.pageNumber,
      slideNumber: section.slideNumber,
      chunkIndex: startIndex + i,
    } satisfies ChunkMetadata,
  }));
}

async function runBackgroundProcessing(
  buffer: Buffer,
  detectedType: 'pdf' | 'pptx',
  fileRecord: LessonFileRecord,
  lessonId: string,
  fileName: string,
  aiProvider: OpenAIProvider
) {
  const supabase = await createClient();
  try {
    const sections = await parseFile(buffer, detectedType, aiProvider);
    const pagesWithVision = new Set(sections.filter(s => s.contentOrigin === 'visual_description' && s.pageNumber != null).map(s => s.pageNumber!));

    const chunkRows = chunkSections(sections, fileName, lessonId, fileRecord.id, pagesWithVision);
    const finalRows = chunkRows.filter((row: ChunkRow, i) => {
      for (let j = 0; j < i; j++) { if (jaccardSimilarity(row.content, chunkRows[j].content) > 0.7) return false; }
      return true;
    });

    if (finalRows.length === 0) {
      await supabase.from('lesson_files').update({ status: 'failed' }).eq('id', fileRecord.id);
      return;
    }

    const { data: insertedChunks, error: chunksError } = await supabase.from('lesson_chunks').insert(finalRows).select('id');
    if (chunksError || !insertedChunks) throw new Error(chunksError?.message ?? 'Failed to insert chunks');

    await embedChunks((insertedChunks as { id: string }[]).map((c, i) => ({ id: c.id, content: finalRows[i].content })), supabase, aiProvider);
    await supabase.from('lesson_files').update({ status: 'ready' }).eq('id', fileRecord.id);

  } catch (err) {
    console.error(`[upload] [${fileName}] processing failed:`, err);
    await supabase.from('lesson_files').update({ status: 'failed' }).eq('id', fileRecord.id);
  }
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
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ownership = await validateLessonOwnership(supabase, user, lessonId);
    if (ownership.error) return NextResponse.json({ error: ownership.error }, { status: ownership.status });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'File too large (max 25MB)' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const detectedType = detectFileType(buffer);
    if (!detectedType) return NextResponse.json({ error: 'Only PDF and PPTX files are supported' }, { status: 400 });

    const uploadRes = await uploadStorageAndRecord(supabase, lessonId, file, buffer, detectedType);
    if (uploadRes.error) return NextResponse.json({ error: uploadRes.error }, { status: uploadRes.status });

    const { fileRecord } = uploadRes;
    const aiProvider = new OpenAIProvider();

    // Fire and forget
    runBackgroundProcessing(buffer, detectedType, fileRecord, lessonId, file.name, aiProvider);

    return NextResponse.json({
      id: fileRecord.id,
      lessonId,
      fileName: file.name,
      fileType: detectedType,
      fileSizeBytes: file.size,
      status: 'processing',
      uploadedAt: (fileRecord as LessonFileRecord).uploaded_at,
    });

  } catch (err) {
    console.error('[upload] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
