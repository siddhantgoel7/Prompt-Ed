/**
 * @jest-environment node
 *
 * Extra branch coverage for /api/lessons/[lessonId]/files GET route.
 * Targets: 401 unauthorized, 404 lesson not found, 404 course not found,
 * 500 files fetch error, 500 unexpected catch.
 */
import { GET } from '@/app/api/lessons/[lessonId]/files/route';
import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));

const params = { params: Promise.resolve({ lessonId: 'l1' }) };
const req = new NextRequest('http://localhost/api/lessons/l1/files');

function makeMock() {
  const single = jest.fn();
  const mock: any = {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data: [], error: null }),
    single,
  };
  single
    .mockResolvedValueOnce({ data: { id: 'l1', course_id: 'c1' }, error: null }) // lesson
    .mockResolvedValueOnce({ data: { instructor_id: 'u1' }, error: null });       // course
  (createClient as jest.Mock).mockResolvedValue(mock);
  return mock;
}

describe('Lesson Files List API (extra branches)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when user is not authenticated', async () => {
    const mock = makeMock();
    mock.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await GET(req, params);
    expect(res.status).toBe(401);
  });

  it('returns 404 when lesson is not found', async () => {
    const mock = makeMock();
    mock.single.mockReset()
      .mockResolvedValueOnce({ data: null, error: { message: 'Not found' } }); // lesson

    const res = await GET(req, params);
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('Lesson not found');
  });

  it('returns 404 when course is not found', async () => {
    const mock = makeMock();
    mock.single.mockReset()
      .mockResolvedValueOnce({ data: { id: 'l1', course_id: 'c1' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'Not found' } }); // course

    const res = await GET(req, params);
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('Course not found');
  });

  it('returns 500 when files query fails', async () => {
    const mock = makeMock();
    mock.order.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    const res = await GET(req, params);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Failed to fetch files');
  });

  it('returns 500 on unexpected error (createClient throws)', async () => {
    (createClient as jest.Mock).mockRejectedValue(new Error('Connection error'));

    const res = await GET(req, params);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Internal server error');
  });
});
