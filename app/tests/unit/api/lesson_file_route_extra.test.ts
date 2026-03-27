/**
 * @jest-environment node
 *
 * Extra branch coverage for /api/lessons/[lessonId]/files/[fileId] route.
 * DELETE targets: 401 unauthorized, 404 lesson/course/file not found, 500 catch.
 * GET targets: 401 unauthorized, 404 lesson not found, 403 forbidden, 500 signed URL error.
 */
import { DELETE, GET } from '@/app/api/lessons/[lessonId]/files/[fileId]/route';
import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));

const lessonId = 'l1';
const fileId = 'f1';
const params = { params: Promise.resolve({ lessonId, fileId }) };
const req = new NextRequest('http://localhost/api/lessons/l1/files/f1');

function makeMock() {
  const single = jest.fn();
  const mock: any = {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single,
    delete: jest.fn().mockReturnThis(),
    storage: {
      from: jest.fn().mockReturnThis(),
      remove: jest.fn().mockResolvedValue({ data: [], error: null }),
      createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl: 'https://signed' }, error: null }),
    },
  };
  (createClient as jest.Mock).mockResolvedValue(mock);
  return mock;
}

describe('Lesson File API (extra branches)', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── DELETE extra paths ───────────────────────────────────────────────────

  it('DELETE returns 401 when user is not authenticated', async () => {
    const mock = makeMock();
    mock.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await DELETE(req, params);
    expect(res.status).toBe(401);
  });

  it('DELETE returns 404 when lesson is not found', async () => {
    const mock = makeMock();
    mock.single.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });
    const res = await DELETE(req, params);
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('Lesson not found');
  });

  it('DELETE returns 404 when course is not found', async () => {
    const mock = makeMock();
    mock.single
      .mockResolvedValueOnce({ data: { id: 'l1', course_id: 'c1' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });
    const res = await DELETE(req, params);
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('Course not found');
  });

  it('DELETE returns 404 when file record is not found', async () => {
    const mock = makeMock();
    mock.single
      .mockResolvedValueOnce({ data: { id: 'l1', course_id: 'c1' }, error: null })
      .mockResolvedValueOnce({ data: { instructor_id: 'u1' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });
    const res = await DELETE(req, params);
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('File not found');
  });

  it('DELETE returns 500 on unexpected error (createClient throws)', async () => {
    (createClient as jest.Mock).mockRejectedValue(new Error('DB down'));
    const res = await DELETE(req, params);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Internal server error');
  });

  // ── GET extra paths ──────────────────────────────────────────────────────

  it('GET returns 401 when user is not authenticated', async () => {
    const mock = makeMock();
    mock.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await GET(req, params);
    expect(res.status).toBe(401);
  });

  it('GET returns 404 when lesson is not found', async () => {
    const mock = makeMock();
    mock.single.mockResolvedValueOnce({ data: null, error: null });
    const res = await GET(req, params);
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('Lesson not found');
  });

  it('GET returns 403 when user is not instructor of the course', async () => {
    const mock = makeMock();
    mock.single
      .mockResolvedValueOnce({ data: { id: 'l1', course_id: 'c1' }, error: null })
      .mockResolvedValueOnce({ data: { instructor_id: 'other-user' }, error: null });
    const res = await GET(req, params);
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('Forbidden');
  });

  it('GET returns 500 when createSignedUrl fails', async () => {
    const mock = makeMock();
    mock.single
      .mockResolvedValueOnce({ data: { id: 'l1', course_id: 'c1' }, error: null })
      .mockResolvedValueOnce({ data: { instructor_id: 'u1' }, error: null })
      .mockResolvedValueOnce({ data: { storage_path: 'path/to/file', file_name: 'test.pdf' }, error: null });
    mock.storage.createSignedUrl.mockResolvedValue({ data: null, error: { message: 'S3 error' } });
    const res = await GET(req, params);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Failed to create file URL');
  });
});
