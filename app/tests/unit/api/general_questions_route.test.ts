/**
 * @jest-environment node
 *
 * Tests for GET /api/lessons/[lessonId]/general-questions
 */
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/lessons/[lessonId]/general-questions/route';
import { createClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));

describe('GET /api/lessons/[lessonId]/general-questions', () => {
  let mockSupabase: any;
  const lessonId = 'lesson-1';
  const userId = 'user-1';

  const makeRequest = () => new NextRequest(`http://localhost/api/lessons/${lessonId}/general-questions`);
  const makeParams = () => ({ params: Promise.resolve({ lessonId }) });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }) },
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'lessons') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { id: lessonId, course_id: 'course-1' }, error: null }) }) }) };
        if (table === 'courses') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { instructor_id: userId }, error: null }) }) }) };
        if (table === 'general_questions') return { select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [{ id: 'q1', prompt_text: 'Q1' }], error: null }) }) }) };
        return {};
      }),
    };
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  it('returns 401 when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: 'Unauthorized' });
  });

  it('returns 404 when lesson not found', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'lessons') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'not found' } }) }) }) };
      return {};
    });
    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: 'Lesson not found' });
  });

  it('returns 404 when course not found', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'lessons') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { id: lessonId, course_id: 'c1' }, error: null }) }) }) };
      if (table === 'courses') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'not found' } }) }) }) };
      return {};
    });
    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: 'Course not found' });
  });

  it('returns 403 when user is not the instructor', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'lessons') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { id: lessonId, course_id: 'c1' }, error: null }) }) }) };
      if (table === 'courses') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { instructor_id: 'other-user' }, error: null }) }) }) };
      return {};
    });
    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: 'Forbidden' });
  });

  it('returns 500 when fetching questions fails', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'lessons') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { id: lessonId, course_id: 'c1' }, error: null }) }) }) };
      if (table === 'courses') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { instructor_id: userId }, error: null }) }) }) };
      if (table === 'general_questions') return { select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: null, error: { message: 'db error' } }) }) }) };
      return {};
    });
    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(500);
  });

  it('returns 200 with questions on success', async () => {
    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.questions).toHaveLength(1);
    expect(body.questions[0].id).toBe('q1');
  });

  it('returns empty array when no questions exist', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'lessons') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { id: lessonId, course_id: 'c1' }, error: null }) }) }) };
      if (table === 'courses') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { instructor_id: userId }, error: null }) }) }) };
      if (table === 'general_questions') return { select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: null, error: null }) }) }) };
      return {};
    });
    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(200);
    expect((await res.json()).questions).toEqual([]);
  });

  it('returns 500 on unexpected thrown error', async () => {
    (createClient as jest.Mock).mockRejectedValue(new Error('Unexpected'));
    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(500);
  });
});
