/**
 * @jest-environment node
 *
 * Tests for POST /api/lessons/[lessonId]/generate-general
 */
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/lessons/[lessonId]/generate-general/route';
import { createClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));

jest.mock('@/lib/ai/providers', () => ({
  OpenAIProvider: jest.fn().mockImplementation(() => ({
    generateChatCompletion: jest.fn().mockResolvedValue({
      content: JSON.stringify({
        candidates: [
          {
            promptText: 'What is pharmacokinetics?',
            mcOptions: [
              { label: 'A', text: 'Option A', is_correct: true },
              { label: 'B', text: 'Option B', is_correct: false },
              { label: 'C', text: 'Option C', is_correct: false },
              { label: 'D', text: 'Option D', is_correct: false },
            ],
          },
        ],
      }),
    }),
  })),
}));

jest.mock('@/lib/ai/prompts/generalQuestionPrompt', () => ({
  buildGeneralSystemPrompt: jest.fn().mockReturnValue('system prompt'),
  buildGeneralUserPrompt: jest.fn().mockReturnValue('user prompt'),
  GENERAL_QUESTION_COUNT: 5,
}));

describe('POST /api/lessons/[lessonId]/generate-general', () => {
  let mockSupabase: any;
  const lessonId = 'lesson-1';
  const userId = 'user-1';

  const makeRequest = () => new NextRequest(`http://localhost/api/lessons/${lessonId}/generate-general`, { method: 'POST' });
  const makeParams = () => ({ params: Promise.resolve({ lessonId }) });

  const mockChunks = [{ content: 'Chunk 1 content' }, { content: 'Chunk 2 content' }];
  const mockInserted = [{ id: 'q1', prompt_text: 'What is pharmacokinetics?', lesson_id: lessonId }];

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.MOCK_AI;

    mockSupabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }) },
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'lessons') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { id: lessonId, course_id: 'c1' }, error: null }) }) }) };
        if (table === 'courses') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { instructor_id: userId }, error: null }) }) }) };
        if (table === 'instructor_ai_preferences') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
        if (table === 'lesson_chunks') return { select: () => ({ eq: () => ({ not: () => ({ order: () => ({ limit: () => Promise.resolve({ data: mockChunks, error: null }) }) }) }) }) };
        if (table === 'general_questions') return {
          delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
          insert: () => ({ select: () => Promise.resolve({ data: mockInserted, error: null }) }),
        };
        return {};
      }),
    };
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  it('returns 401 when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(401);
  });

  it('returns 404 when lesson not found', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'lessons') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'not found' } }) }) }) };
      return {};
    });
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(404);
  });

  it('returns 404 when course not found', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'lessons') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { id: lessonId, course_id: 'c1' }, error: null }) }) }) };
      if (table === 'courses') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'not found' } }) }) }) };
      return {};
    });
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(404);
  });

  it('returns 403 when user is not the instructor', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'lessons') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { id: lessonId, course_id: 'c1' }, error: null }) }) }) };
      if (table === 'courses') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { instructor_id: 'other' }, error: null }) }) }) };
      return {};
    });
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(403);
  });

  it('returns 400 when no lesson chunks found', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'lessons') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { id: lessonId, course_id: 'c1' }, error: null }) }) }) };
      if (table === 'courses') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { instructor_id: userId }, error: null }) }) }) };
      if (table === 'instructor_ai_preferences') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
      if (table === 'lesson_chunks') return { select: () => ({ eq: () => ({ not: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }) }) }) };
      return {};
    });
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(400);
  });

  it('returns 200 with questions on success (AI path)', async () => {
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.questions).toBeDefined();
  });

  it('returns 200 with mock questions when MOCK_AI=true', async () => {
    process.env.MOCK_AI = 'true';
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.questions).toBeDefined();
    expect(body.warning).toContain('Mock mode');
  });

  it('returns 500 when insert fails', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'lessons') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { id: lessonId, course_id: 'c1' }, error: null }) }) }) };
      if (table === 'courses') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { instructor_id: userId }, error: null }) }) }) };
      if (table === 'instructor_ai_preferences') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
      if (table === 'lesson_chunks') return { select: () => ({ eq: () => ({ not: () => ({ order: () => ({ limit: () => Promise.resolve({ data: mockChunks, error: null }) }) }) }) }) };
      if (table === 'general_questions') return {
        delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
        insert: () => ({ select: () => Promise.resolve({ data: null, error: { message: 'insert error' } }) }),
      };
      return {};
    });
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(500);
  });

  it('returns 500 on unexpected thrown error', async () => {
    (createClient as jest.Mock).mockRejectedValue(new Error('Crash'));
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(500);
  });

  it('uses AI preferences when available', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'lessons') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { id: lessonId, course_id: 'c1' }, error: null }) }) }) };
      if (table === 'courses') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { instructor_id: userId }, error: null }) }) }) };
      if (table === 'instructor_ai_preferences') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { difficulty: 'hard', style: 'conceptual', length: 'long', focus_areas: ['pharmacology'] }, error: null }) }) }) };
      if (table === 'lesson_chunks') return { select: () => ({ eq: () => ({ not: () => ({ order: () => ({ limit: () => Promise.resolve({ data: mockChunks, error: null }) }) }) }) }) };
      if (table === 'general_questions') return {
        delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
        insert: () => ({ select: () => Promise.resolve({ data: mockInserted, error: null }) }),
      };
      return {};
    });
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(200);
  });
});
