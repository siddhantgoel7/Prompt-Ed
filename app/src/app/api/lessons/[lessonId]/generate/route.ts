import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import type { PromptType } from '@/types/discussion';
import type { CandidateSet } from '@/types/ai';

/**
 * POST /api/lessons/[lessonId]/generate
 * Generates AI discussion prompt candidates using RAG.
 *
 * Body: { promptType: PromptType, transcriptText?: string }
 * Returns: CandidateSet (is_correct STRIPPED from all mcOptions)
 *
 * SECURITY: is_correct is never sent to any client.
 * @see US 1.18, 1.19, 1.23
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

    const body = await req.json() as { promptType?: PromptType; transcriptText?: string };
    const promptType = body.promptType ?? 'long_answer';
    const transcriptText = body.transcriptText ?? '';

    const validPromptTypes: PromptType[] = ['short_answer', 'long_answer', 'multiple_choice'];
    if (!validPromptTypes.includes(promptType)) {
      return NextResponse.json({ error: 'Invalid promptType' }, { status: 400 });
    }

    let result: CandidateSet;

    if (process.env.MOCK_AI === 'true') {
      const { generatePrompts: mockGenerate } = await import('@/lib/ai/__mocks__/generatePrompts');
      result = await mockGenerate(lessonId, transcriptText, promptType);
    } else {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const { generatePrompts } = await import('@/lib/ai/generatePrompts');
      result = await generatePrompts(lessonId, transcriptText, promptType, supabase, openai);
    }

    // SECURITY: Strip is_correct from all mcOptions before returning
    const sanitized: CandidateSet = {
      ...result,
      candidates: result.candidates.map((c) => ({
        ...c,
        mcOptions: c.mcOptions?.map(({ label, text }) => ({ label, text })),
      })),
    };

    return NextResponse.json(sanitized);
  } catch (err) {
    const e = err as { code?: string; message?: string };
    console.error(`GENERATE_ERR [${e.code ?? 'unknown'}]: ${e.message ?? String(err)}`);
    return NextResponse.json({ error: 'Failed to generate prompts' }, { status: 500 });
  }
}