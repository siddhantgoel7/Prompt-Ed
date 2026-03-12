// API route for uploading PDF/PPTX lecture files to a lesson.
// Validates file type by magic bytes, stores to Supabase storage, then parses and embeds
// chunks in the background (fire-and-forget) while immediately returning a processing status.
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseFile } from '@/lib/ai/parsers';
import { embedChunks } from '@/lib/ai/embedChunks';
import { OpenAIProvider } from '@/lib/ai/providers';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_CHUNKS_PER_FILE = 500;

const MAGIC = {
  pdf: Buffer.from([0x25, 0x50, 0x44, 0x46]),
  pptx: Buffer.from([0x50, 0x4b, 0x03, 0x04]),
};

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
        // Parse text
        const rawText = await parseFile(buffer, detectedType, aiProvider);

        // Chunk
        const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1024, chunkOverlap: 128 });
        const chunks = (await splitter.splitText(rawText)).filter((c) => c.trim()).slice(0, MAX_CHUNKS_PER_FILE);

        if (chunks.length === 0) {
          await supabase.from('lesson_files').update({ status: 'failed' }).eq('id', fileRecord.id);
          return;
        }

        // Insert chunks without embeddings
        const chunkRows = chunks.map((content, i) => ({
          lesson_id: lessonId,
          lesson_file_id: fileRecord.id,
          content_type: 'slide',
          content,
          metadata: { file_name: file.name, chunk_index: i },
        }));

        const { data: insertedChunks, error: chunksError } = await supabase
          .from('lesson_chunks')
          .insert(chunkRows)
          .select('id');

        if (chunksError || !insertedChunks) {
          await supabase.from('lesson_files').update({ status: 'failed' }).eq('id', fileRecord.id);
          return;
        }

        // Embed using our new adapter layer
        const chunkIds = (insertedChunks as { id: string }[]).map((c) => c.id);
        await embedChunks(chunkIds, supabase, aiProvider);

        // Mark as ready
        await supabase.from('lesson_files').update({ status: 'ready' }).eq('id', fileRecord.id);

      } catch (err) {
        console.error('[upload] Background parse/embed error:', err);
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