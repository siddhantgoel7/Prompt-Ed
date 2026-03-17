// [DEV-INSPECT] DEV-ONLY — delete this entire file when chunk inspection is no longer needed.
// To find all related code: grep [DEV-INSPECT] across the repo.
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// [DEV-INSPECT] ChunkRow shape returned to the inspector UI
interface ChunkRow {
  id: string;
  lesson_file_id: string | null;
  content_type: string;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * [DEV-INSPECT] GET /api/lessons/[lessonId]/chunks?fileId=<uuid>
 * Returns lesson_chunks rows for a lesson, optionally scoped to one file.
 * Same ownership-check pattern as files/route.ts.
 * DEV-ONLY — remove when chunk inspection is no longer needed.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  // [DEV-INSPECT] start
  const { lessonId } = await params;
  const fileId = req.nextUrl.searchParams.get('fileId') ?? null;

  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Two-step ownership check — same pattern as files/route.ts
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

    // Build query — optionally filter by lesson_file_id
    let query = supabase
      .from('lesson_chunks')
      .select('id, lesson_file_id, content_type, content, metadata, created_at')
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: true });

    if (fileId) {
      query = query.eq('lesson_file_id', fileId);
    }

    const { data: chunks, error: chunksError } = await query;

    if (chunksError) {
      return NextResponse.json({ error: 'Failed to fetch chunks' }, { status: 500 });
    }

    const rows: ChunkRow[] = (chunks ?? []).map((c: {
      id: string;
      lesson_file_id: string | null;
      content_type: string;
      content: string;
      metadata: Record<string, unknown>;
      created_at: string;
    }) => ({
      id: c.id,
      lesson_file_id: c.lesson_file_id,
      content_type: c.content_type,
      content: c.content,
      metadata: c.metadata ?? {},
      created_at: c.created_at,
    }));

    return NextResponse.json({
      lessonId,
      fileId,
      totalChunks: rows.length,
      chunks: rows,
    });
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
  // [DEV-INSPECT] end
}
