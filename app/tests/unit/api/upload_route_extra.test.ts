/**
 * @jest-environment node
 *
 * Extra branch coverage for the upload API route.
 * Targets: 403 forbidden, 404 course not found, 400 file too large,
 * 500 storage error, 500 file-record insert error, PPTX upload,
 * 500 unexpected thrown error.
 */
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/lessons/[lessonId]/upload/route';
import { createClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));
jest.mock('@/lib/ai/parsers', () => ({ parseFile: jest.fn() }));
jest.mock('@/lib/ai/embedChunks', () => ({ embedChunks: jest.fn() }));
jest.mock('@/lib/ai/providers', () => ({
  OpenAIProvider: jest.fn().mockImplementation(() => ({})),
}));

// ── PDF and PPTX magic bytes ─────────────────────────────────────────────────
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);    // %PDF-1
const PPTX_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);   // PK zip

const lessonId = 'l1';
const userId = 'u1';
const params = { params: Promise.resolve({ lessonId }) };

function makeFormData(file: File) {
  const fd = new FormData();
  fd.append('file', file);
  return fd;
}

function makeReq(fd?: FormData) {
  return new NextRequest('http://localhost/', { method: 'POST', body: fd });
}

// ── Shared mock factory (mirrors the working beforeEach in upload_route_sync) ─

function makeMockSupabase() {
  const select = jest.fn().mockReturnThis();
  const eq = jest.fn().mockReturnThis();
  const single = jest.fn().mockReturnThis();
  const insert = jest.fn().mockReturnThis();
  const update = jest.fn().mockReturnThis();
  const auth = {
    getUser: jest.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }),
  };
  const storage = {
    from: jest.fn().mockReturnThis(),
    upload: jest.fn().mockResolvedValue({ error: null }),
  };
  const from = jest.fn().mockReturnValue({ select, eq, single, insert, update });

  const supabase = { auth, from, storage, select, eq, single, insert };

  // Default happy-path singles: lesson → course → fileRecord
  single
    .mockResolvedValueOnce({ data: { id: lessonId, course_id: 'c1' }, error: null }) // lesson
    .mockResolvedValueOnce({ data: { instructor_id: userId }, error: null })           // course
    .mockResolvedValueOnce({ data: { id: 'fr1', uploaded_at: 'now' }, error: null }); // fileRecord

  return supabase;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Upload route (extra branches)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 when course is not found', async () => {
    const supabase = makeMockSupabase();
    // Override: lesson OK, course NOT found
    supabase.single.mockReset()
      .mockResolvedValueOnce({ data: { id: lessonId, course_id: 'c1' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });
    (createClient as jest.Mock).mockResolvedValue(supabase);

    const res = await POST(makeReq(), params);
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('Course not found');
  });

  it('returns 403 when instructor_id does not match current user', async () => {
    const supabase = makeMockSupabase();
    supabase.single.mockReset()
      .mockResolvedValueOnce({ data: { id: lessonId, course_id: 'c1' }, error: null })
      .mockResolvedValueOnce({ data: { instructor_id: 'other-user' }, error: null }); // wrong instructor
    (createClient as jest.Mock).mockResolvedValue(supabase);

    const res = await POST(makeReq(), params);
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('Forbidden');
  });

  it('returns 400 when file exceeds 25 MB', async () => {
    const supabase = makeMockSupabase();
    (createClient as jest.Mock).mockResolvedValue(supabase);

    // 25 MB + 1 byte — exceeds MAX_FILE_SIZE
    const bigBuffer = new Uint8Array(25 * 1024 * 1024 + 1);
    const file = new File([bigBuffer], 'big.pdf', { type: 'application/pdf' });
    const res = await POST(makeReq(makeFormData(file)), params);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/too large/i);
  });

  it('returns 500 when Supabase storage upload fails', async () => {
    const supabase = makeMockSupabase();
    // Count check: 3rd eq call returns count=0
    let eqCount = 0;
    supabase.eq.mockImplementation(() => {
      eqCount++;
      if (eqCount === 3) return Promise.resolve({ count: 0, error: null });
      return supabase;
    });
    // Storage upload fails
    supabase.storage.upload.mockResolvedValue({ error: { message: 'S3 error' } });
    (createClient as jest.Mock).mockResolvedValue(supabase);

    const file = new File([PDF_MAGIC], 'ok.pdf', { type: 'application/pdf' });
    const res = await POST(makeReq(makeFormData(file)), params);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Failed to store file');
  });

  it('returns 500 when file record insert fails', async () => {
    const supabase = makeMockSupabase();
    let eqCount = 0;
    supabase.eq.mockImplementation(() => {
      eqCount++;
      if (eqCount === 3) return Promise.resolve({ count: 0, error: null });
      return supabase;
    });
    // Storage succeeds; file insert fails
    supabase.single.mockReset()
      .mockResolvedValueOnce({ data: { id: lessonId, course_id: 'c1' }, error: null })
      .mockResolvedValueOnce({ data: { instructor_id: userId }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'Insert failed' } });
    (createClient as jest.Mock).mockResolvedValue(supabase);

    const file = new File([PDF_MAGIC], 'ok.pdf', { type: 'application/pdf' });
    const res = await POST(makeReq(makeFormData(file)), params);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Failed to record file');
  });

  it('accepts a valid PPTX file (magic bytes detected as pptx)', async () => {
    const supabase = makeMockSupabase();
    let eqCount = 0;
    supabase.eq.mockImplementation(() => {
      eqCount++;
      if (eqCount === 3) return Promise.resolve({ count: 0, error: null });
      return supabase;
    });
    (createClient as jest.Mock).mockResolvedValue(supabase);

    const file = new File([PPTX_MAGIC], 'deck.pptx', { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
    const res = await POST(makeReq(makeFormData(file)), params);
    // PPTX file type is detected — upload proceeds and returns 200
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.fileType).toBe('pptx');
  });

  it('returns 500 on unexpected thrown error (createClient throws)', async () => {
    (createClient as jest.Mock).mockRejectedValue(new Error('Connection refused'));
    const res = await POST(makeReq(), params);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Internal server error');
  });
});
