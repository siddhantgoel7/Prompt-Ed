// API route for generating general multiple-choice questions from all uploaded course materials.
// Unlike /generate (live RAG for discussions), this generates ~10 broad-coverage MC questions
// from the full set of lesson chunks and persists them to the general_questions table.
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { OpenAIProvider } from '@/lib/ai/providers';
import type { AIPromptPreferences, MCOption } from '@/types/ai';
import { buildGeneralSystemPrompt, buildGeneralUserPrompt, GENERAL_QUESTION_COUNT } from '@/lib/ai/prompts/generalQuestionPrompt';

/**
 * POST /api/lessons/[lessonId]/generate-general
 * Generates and persists general MC questions from all uploaded course materials.
 *
 * Returns: { questions: GeneralQuestion[], warning?: string }
 * @see US 1.51
 */
export async function POST(
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

    // Two-step ownership check
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

    // Fetch AI preferences
    let preferences: AIPromptPreferences | undefined;
    const { data: prefData } = await supabase
      .from('instructor_ai_preferences')
      .select('difficulty, style, length, focus_areas')
      .eq('user_id', user.id)
      .single();

    if (prefData) {
      preferences = {
        difficulty: prefData.difficulty as AIPromptPreferences['difficulty'],
        style: prefData.style as AIPromptPreferences['style'],
        length: prefData.length as AIPromptPreferences['length'],
        focusAreas: prefData.focus_areas,
      };
    }

    // Retrieve a broad sample of lesson chunks (up to 30 for comprehensive coverage)
    const { data: chunkRows, error: chunkError } = await supabase
      .from('lesson_chunks')
      .select('content')
      .eq('lesson_id', lessonId)
      .not('embedding', 'is', null)
      .order('created_at', { ascending: true })
      .limit(30);

    if (chunkError || !chunkRows || chunkRows.length === 0) {
      return NextResponse.json(
        { error: 'No uploaded materials found. Please upload course files first.' },
        { status: 400 }
      );
    }

    const chunks = (chunkRows as { content: string }[]).map(r => r.content);

    let warning: string | undefined;
    let candidates: { promptText: string; mcOptions: MCOption[] }[];

    if (process.env.MOCK_AI === 'true') {
      // Mock mode: return hardcoded general questions
      candidates = getMockGeneralQuestions();
      warning = 'Mock mode active (MOCK_AI=true). Set MOCK_AI=false to use real OpenAI generation.';
    } else {
      const aiProvider = new OpenAIProvider();
      const userPrompt = buildGeneralUserPrompt({ chunks, preferences });
      const { content: rawContent } = await aiProvider.generateChatCompletion([
        { role: 'system', content: buildGeneralSystemPrompt(preferences) },
        { role: 'user', content: userPrompt }
      ], { jsonMode: true, temperature: 0.7 });

      candidates = parseGeneralResponse(rawContent);
    }

    // Delete any existing general questions for this lesson before inserting new ones
    await supabase
      .from('general_questions')
      .delete()
      .eq('lesson_id', lessonId);

    // Persist to general_questions table
    const insertRows = candidates.map((c, i) => {
      const correctOpt = c.mcOptions.find(o => o.is_correct);
      return {
        lesson_id: lessonId,
        prompt_text: c.promptText,
        mc_options: c.mcOptions,
        correct_option: correctOpt?.label ?? 'A',
        display_order: i,
      };
    });

    const { data: inserted, error: insertError } = await supabase
      .from('general_questions')
      .insert(insertRows)
      .select();

    if (insertError) {
      console.error('Failed to insert general questions:', insertError);
      return NextResponse.json({ error: 'Failed to save generated questions' }, { status: 500 });
    }

    return NextResponse.json({ questions: inserted, warning });
  } catch (err) {
    const e = err as { code?: string; message?: string };
    console.error(`GENERATE_GENERAL_ERR [${e.code ?? 'unknown'}]: ${e.message ?? String(err)}`);
    return NextResponse.json({ error: 'Failed to generate general questions' }, { status: 500 });
  }
}

/** Parses the raw JSON from the LLM into general question candidates.
 *  Mirrors the updated discussion parser: prefers the "candidates" key,
 *  falls back to scanning for any array key, and rotates MC answer positions. */
function parseGeneralResponse(raw: string): { promptText: string; mcOptions: MCOption[] }[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return getFallbackQuestions();
  }

  let candidates: unknown[];
  if (Array.isArray(parsed)) {
    candidates = parsed;
  } else if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.candidates)) {
      candidates = obj.candidates as unknown[];
    } else {
      const arrayKey = Object.keys(obj).find((k) => Array.isArray(obj[k]));
      candidates = arrayKey ? (obj[arrayKey] as unknown[]) : [];
    }
  } else {
    return getFallbackQuestions();
  }

  const mapped = candidates.slice(0, GENERAL_QUESTION_COUNT).map((c) => {
    const candidate = c as {
      promptText?: string;
      mcOptions?: MCOption[];
    };

    return {
      promptText: candidate.promptText ?? 'General question — AI response could not be parsed.',
      mcOptions: Array.isArray(candidate.mcOptions) && candidate.mcOptions.length > 0
        ? candidate.mcOptions
        : [
            { label: 'A' as const, text: 'Option A', is_correct: true },
            { label: 'B' as const, text: 'Option B', is_correct: false },
            { label: 'C' as const, text: 'Option C', is_correct: false },
            { label: 'D' as const, text: 'Option D', is_correct: false },
          ],
    };
  });

  return assignMCPositions(mapped);
}

/**
 * Distributes correct-answer positions across all MC questions.
 * Mirrors the logic in generatePrompts.ts to avoid position bias.
 */
function assignMCPositions(questions: { promptText: string; mcOptions: MCOption[] }[]): { promptText: string; mcOptions: MCOption[] }[] {
  const labels: MCOption['label'][] = ['A', 'B', 'C', 'D'];
  // Build a shuffled list of target positions, cycling through A-D
  const slots: MCOption['label'][] = [];
  for (let i = 0; i < questions.length; i++) {
    slots.push(labels[i % 4]);
  }
  slots.sort(() => Math.random() - 0.5); // NOSONAR — non-security shuffle for answer position diversity

  return questions.map((q, i) => {
    if (!q.mcOptions || q.mcOptions.length === 0) return q;

    const correctOpt = q.mcOptions.find(o => o.is_correct);
    const incorrectOpts = q.mcOptions.filter(o => !o.is_correct).sort(() => Math.random() - 0.5); // NOSONAR — non-security shuffle
    if (!correctOpt) return q;

    const targetIdx = labels.indexOf(slots[i]);
    const result: MCOption[] = new Array(4);
    result[targetIdx] = { ...correctOpt, label: labels[targetIdx] };

    let incorrectIdx = 0;
    for (let j = 0; j < 4; j++) {
      if (!result[j]) {
        result[j] = { ...incorrectOpts[incorrectIdx], label: labels[j] };
        incorrectIdx++;
      }
    }

    return { ...q, mcOptions: result };
  });
}

function getFallbackQuestions(): { promptText: string; mcOptions: MCOption[] }[] {
  return Array.from({ length: GENERAL_QUESTION_COUNT }, (_, i) => ({
    promptText: `General question ${i + 1} — AI response could not be parsed. Please regenerate.`,
    mcOptions: [
      { label: 'A' as const, text: 'Option A', is_correct: true },
      { label: 'B' as const, text: 'Option B', is_correct: false },
      { label: 'C' as const, text: 'Option C', is_correct: false },
      { label: 'D' as const, text: 'Option D', is_correct: false },
    ],
  }));
}

function getMockGeneralQuestions(): { promptText: string; mcOptions: MCOption[] }[] {
  return [
    {
      promptText: 'Which of the following best describes the mechanism of action of beta-blockers?',
      mcOptions: [
        { label: 'A', text: 'Block calcium channels in cardiac muscle', is_correct: false },
        { label: 'B', text: 'Competitively antagonize catecholamines at beta-adrenergic receptors', is_correct: true },
        { label: 'C', text: 'Activate alpha-1 receptors to increase heart rate', is_correct: false },
        { label: 'D', text: 'Inhibit ACE to reduce angiotensin II production', is_correct: false },
      ],
    },
    {
      promptText: 'What is the primary pharmacological target of statins?',
      mcOptions: [
        { label: 'A', text: 'Cholesterol absorption in the gut', is_correct: false },
        { label: 'B', text: 'HMG-CoA reductase enzyme', is_correct: true },
        { label: 'C', text: 'LDL receptor degradation', is_correct: false },
        { label: 'D', text: 'PCSK9 protein', is_correct: false },
      ],
    },
    {
      promptText: 'Which drug class is first-line therapy for heart failure with reduced ejection fraction?',
      mcOptions: [
        { label: 'A', text: 'Calcium channel blockers', is_correct: false },
        { label: 'B', text: 'Nitrates', is_correct: false },
        { label: 'C', text: 'ACE inhibitors', is_correct: true },
        { label: 'D', text: 'Alpha-blockers', is_correct: false },
      ],
    },
    {
      promptText: 'What is the therapeutic index?',
      mcOptions: [
        { label: 'A', text: 'The ratio of toxic dose to effective dose', is_correct: true },
        { label: 'B', text: 'The maximum plasma concentration of a drug', is_correct: false },
        { label: 'C', text: 'The time to reach steady state', is_correct: false },
        { label: 'D', text: 'The volume of distribution', is_correct: false },
      ],
    },
    {
      promptText: 'Which phase of drug metabolism primarily involves cytochrome P450 enzymes?',
      mcOptions: [
        { label: 'A', text: 'Phase I (functionalization)', is_correct: true },
        { label: 'B', text: 'Phase II (conjugation)', is_correct: false },
        { label: 'C', text: 'Phase III (transport)', is_correct: false },
        { label: 'D', text: 'Phase 0 (absorption)', is_correct: false },
      ],
    },
  ];
}
