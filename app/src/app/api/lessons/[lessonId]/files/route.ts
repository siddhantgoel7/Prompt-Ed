import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { LessonFile } from '@/types/ai';

/**
 * GET /api/lessons/[lessonId]/files
 * Returns list of uploaded files for a lesson.
 * @see US 1.16
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await params;

  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
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

    const { data: files, error: filesError } = await supabase
      .from('lesson_files')
      .select('id, lesson_id, file_name, file_type, file_size_bytes, status, uploaded_at')
      .eq('lesson_id', lessonId)
      .order('uploaded_at', { ascending: false });

    if (filesError) {
      return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
    }

    const lessonFiles: LessonFile[] = (files ?? []).map((f: {
      id: string;
      lesson_id: string;
      file_name: string;
      file_type: string;
      file_size_bytes: number;
      status: string;
      uploaded_at: string;
    }) => ({
      id: f.id,
      lessonId: f.lesson_id,
      fileName: f.file_name,
      fileType: f.file_type as 'pdf' | 'pptx',
      fileSizeBytes: f.file_size_bytes,
      status: f.status as LessonFile['status'],
      uploadedAt: f.uploaded_at,
    }));

    return NextResponse.json(lessonFiles);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
