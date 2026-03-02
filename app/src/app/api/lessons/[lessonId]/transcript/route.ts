import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

const MAX_AUDIO_SIZE = 25 * 1024 * 1024;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await params;
  const supabase = await createClient();

  // Auth
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify ownership (inline — no verifyLessonOwner helper needed)
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
  const audioFile = formData.get('audio') as File | null;

  if (!audioFile) {
    return NextResponse.json({ error: 'No audio provided' }, { status: 400 });
  }
  if (audioFile.size > MAX_AUDIO_SIZE) {
    return NextResponse.json({ error: 'Audio file too large (max 25MB)' }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Whisper transcription
  let transcript = '';
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en',
    });
    transcript = transcription.text ?? '';
  } catch (err) {
    console.error('[transcript] Whisper error:', err);
    return NextResponse.json(
      { error: 'Transcription failed. Please enter text manually.' },
      { status: 500 }
    );
  }

  if (!transcript.trim()) {
    return NextResponse.json({ error: 'No speech detected in recording' }, { status: 400 });
  }

  // Store chunk with embedding in background — don't block the response
  (async () => {
    try {
      const embeddingRes = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: transcript,
      });
      const embedding = embeddingRes.data[0].embedding;
      await supabase.from('lesson_chunks').insert({
        lesson_id: lessonId,
        lesson_file_id: null,
        content_type: 'transcript',
        content: transcript,
        embedding: JSON.stringify(embedding),
        metadata: { source: 'transcript', recordedAt: new Date().toISOString() },
      });
    } catch (err) {
      console.error('[transcript] Background embed/store error:', err);
    }
  })();

  return NextResponse.json({ transcript });
}