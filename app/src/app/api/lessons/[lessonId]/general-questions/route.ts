// API route for fetching persisted general questions for a lesson.
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/lessons/[lessonId]/general-questions
 * Returns all general questions for the lesson, ordered by display_order.
 * @see US 1.51
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await params;
  void req;

  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ownership check
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

    const { data: questions, error: fetchError } = await supabase
      .from('general_questions')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('display_order', { ascending: true });

    if (fetchError) {
      console.error('Failed to fetch general questions:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
    }

    return NextResponse.json({ questions: questions ?? [] });
  } catch (err) {
    const e = err as { code?: string; message?: string };
    console.error(`GENERAL_QUESTIONS_ERR [${e.code ?? 'unknown'}]: ${e.message ?? String(err)}`);
    return NextResponse.json({ error: 'Failed to fetch general questions' }, { status: 500 });
  }
}
