import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * DELETE /api/lessons/[lessonId]/files/[fileId]
 * Deletes a lesson file: removes chunks, DB record, and storage object.
 * @see US 1.16
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ lessonId: string; fileId: string }> }
) {
  const { lessonId, fileId } = await params;

  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Two-step ownership check — avoids !inner array/object type ambiguity
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

    // Get file record to retrieve storage path
    const { data: fileRecord, error: fileError } = await supabase
      .from('lesson_files')
      .select('id, storage_path')
      .eq('id', fileId)
      .eq('lesson_id', lessonId)
      .single();

    if (fileError || !fileRecord) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const { storage_path: storagePath } = fileRecord as { storage_path: string };

    // Delete chunks first
    await supabase.from('lesson_chunks').delete().eq('lesson_file_id', fileId);

    // Delete file DB record
    await supabase.from('lesson_files').delete().eq('id', fileId);

    // Delete from storage
    await supabase.storage.from('lesson-files').remove([storagePath]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}