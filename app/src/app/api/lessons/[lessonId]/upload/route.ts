import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseFile } from '@/lib/ai/parsers/index';
import { embedChunks } from '@/lib/ai/embedChunks';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import OpenAI from 'openai';
import { randomUUID } from 'crypto';

// 20 MB in bytes
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_CHUNKS = 500;
const MAX_FILES_PER_LESSON = 5;

/**
 * POST /api/lessons/[lessonId]/upload
 * Validates, parses, chunks, and stores a PDF or PPTX file for AI context.
 *
 * @see US 1.16
 *
 * SECURITY: Magic byte validation rejects spoofed MIME types.
 * DoS limit: 500 chunks per file, 20MB max size.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await params;

  try {
    const supabase = await createClient();

    // 1. Auth: verify instructor owns lesson
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('id, courses!inner(instructor_id)')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    const lessonData = lesson as { id: string; courses: { instructor_id: string } };
    if (lessonData.courses.instructor_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Extract file from FormData
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await (file as File).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = (file as File).name;
    const mimeType = (file as File).type;

    // 3. Magic byte check
    const magic = buffer.subarray(0, 4);
    let fileType: 'pdf' | 'pptx';
    if (magic[0] === 0x25 && magic[1] === 0x50 && magic[2] === 0x44 && magic[3] === 0x46) {
      fileType = 'pdf';
    } else if (magic[0] === 0x50 && magic[1] === 0x4b && magic[2] === 0x03 && magic[3] === 0x04) {
      fileType = 'pptx';
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type. Only PDF and PPTX files are accepted.' },
        { status: 400 }
      );
    }

    // 4. MIME check (belt-and-suspenders)
    const validMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
    ];
    if (mimeType && !validMimes.includes(mimeType)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Only PDF and PPTX files are accepted.' },
        { status: 400 }
      );
    }

    // 5. Size check
    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File exceeds 20MB size limit.' },
        { status: 400 }
      );
    }

    // 6. File count check (max 5 per lesson)
    const { count, error: countError } = await supabase
      .from('lesson_files')
      .select('id', { count: 'exact', head: true })
      .eq('lesson_id', lessonId);

    if (countError) {
      return NextResponse.json({ error: 'Failed to check file count' }, { status: 500 });
    }
    if ((count ?? 0) >= MAX_FILES_PER_LESSON) {
      return NextResponse.json(
        { error: `Maximum of ${MAX_FILES_PER_LESSON} files per lesson.` },
        { status: 422 }
      );
    }

    // 7. Parse file text
    let rawText: string;
    try {
      rawText = await parseFile(buffer, fileType);
    } catch (parseErr) {
      const msg = parseErr instanceof Error ? parseErr.message : 'Failed to parse file';
      return NextResponse.json({ error: msg }, { status: 422 });
    }

    // 8. Check for empty text
    if (!rawText || !rawText.trim()) {
      return NextResponse.json(
        { error: 'No text could be extracted from this file. Please check the file content.' },
        { status: 422 }
      );
    }

    // 9. Chunk text
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1200,
      chunkOverlap: 200,
    });
    const chunks = await splitter.splitText(rawText);

    // 10. DoS limit: 500 chunks
    if (chunks.length > MAX_CHUNKS) {
      return NextResponse.json(
        { error: 'File is too large to process (exceeds 500 chunks limit).' },
        { status: 422 }
      );
    }

    // 11. Upload raw file to Supabase Storage
    const storageId = randomUUID();
    const storagePath = `${user.id}/${lessonId}/${storageId}-${fileName}`;
    const { error: storageError } = await supabase.storage
      .from('lesson-files')
      .upload(storagePath, buffer, {
        contentType: mimeType || (fileType === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.presentationml.presentation'),
        upsert: false,
      });

    if (storageError) {
      return NextResponse.json({ error: 'Failed to upload file to storage' }, { status: 500 });
    }

    // 12. Insert lesson_files row (status = 'processing')
    const { data: fileRow, error: fileInsertError } = await supabase
      .from('lesson_files')
      .insert({
        lesson_id: lessonId,
        file_name: fileName,
        file_type: fileType,
        file_size_bytes: buffer.length,
        storage_path: storagePath,
        status: 'processing',
      })
      .select('id')
      .single();

    if (fileInsertError || !fileRow) {
      return NextResponse.json({ error: 'Failed to save file record' }, { status: 500 });
    }

    const fileId = (fileRow as { id: string }).id;

    // 13. Insert lesson_chunks rows
    const chunkRows = chunks.map((content, index) => ({
      lesson_id: lessonId,
      lesson_file_id: fileId,
      content_type: 'slide' as const,
      content,
      embedding: null,
      metadata: {
        source: 'slide_body' as const,
        file_name: fileName,
        chunk_index: index,
      },
    }));

    const { data: insertedChunks, error: chunksError } = await supabase
      .from('lesson_chunks')
      .insert(chunkRows)
      .select('id');

    if (chunksError || !insertedChunks) {
      return NextResponse.json({ error: 'Failed to store file chunks' }, { status: 500 });
    }

    const chunkIds = (insertedChunks as { id: string }[]).map((c) => c.id);

    // 14. Embed chunks and update file status
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    try {
      await embedChunks(chunkIds, supabase, openai);
      await supabase
        .from('lesson_files')
        .update({ status: 'ready' })
        .eq('id', fileId);
    } catch (embedErr) {
      await supabase
        .from('lesson_files')
        .update({ status: 'failed' })
        .eq('id', fileId);
      // Don't fail the whole upload — file is stored, just not embedded
      console.error('Embedding failed:', embedErr instanceof Error ? embedErr.message : String(embedErr));
    }

    return NextResponse.json({ fileId, fileName, chunkCount: chunks.length });
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
