/**
 * @jest-environment node
 *
 * Extra branch coverage for /api/lessons/[lessonId]/transcript POST route.
 * Targets: 401 unauthorized, 404 lesson not found, 404 course not found,
 * 400 audio too large.
 */
import { POST } from '@/app/api/lessons/[lessonId]/transcript/route';
import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));
jest.mock('openai', () =>
  jest.fn().mockImplementation(() => ({
    audio: { transcriptions: { create: jest.fn().mockResolvedValue({ text: 'ok' }) } },
    embeddings: { create: jest.fn().mockResolvedValue({ data: [{ embedding: [0.1] }] }) },
  }))
);
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url, init) => ({
    url,
    nextUrl: new URL(url),
    formData: async () => init?.body,
  })),
  NextResponse: {
    json: jest.fn().mockImplementation((body, init) => ({
      status: init?.status ?? 200,
      json: async () => body,
    })),
  },
}));

const lessonId = 'l1';
const params = { params: Promise.resolve({ lessonId }) };

function makeReq(formData?: Map<string, unknown>) {
  return new NextRequest('http://localhost/api/lessons/l1/transcript', {
    method: 'POST',
    body: (formData ?? new Map()) as any,
  });
}

function makeMock() {
  const single = jest.fn();
  const mock: any = {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single,
    insert: jest.fn().mockResolvedValue({ data: [], error: null }),
  };
  (createClient as jest.Mock).mockResolvedValue(mock);
  return mock;
}

describe('Transcript API (extra branches)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when user is not authenticated', async () => {
    const mock = makeMock();
    mock.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await POST(makeReq() as any, params);
    expect(res.status).toBe(401);
  });

  it('returns 404 when lesson is not found', async () => {
    const mock = makeMock();
    mock.single.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

    const res = await POST(makeReq() as any, params);
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('Lesson not found');
  });

  it('returns 404 when course is not found', async () => {
    const mock = makeMock();
    mock.single
      .mockResolvedValueOnce({ data: { id: 'l1', course_id: 'c1' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

    const res = await POST(makeReq() as any, params);
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('Course not found');
  });

  it('returns 400 when audio file exceeds 25 MB', async () => {
    const mock = makeMock();
    mock.single
      .mockResolvedValueOnce({ data: { id: 'l1', course_id: 'c1' }, error: null })
      .mockResolvedValueOnce({ data: { instructor_id: 'u1' }, error: null });

    const bigAudio = { size: 25 * 1024 * 1024 + 1 }; // 25 MB + 1 byte
    const formData = new Map([['audio', bigAudio]]);

    const res = await POST(makeReq(formData) as any, params);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/too large/i);
  });
});
