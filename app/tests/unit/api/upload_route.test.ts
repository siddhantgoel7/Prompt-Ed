/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from 'next/server';
import { POST } from '@/app/api/lessons/[lessonId]/upload/route';
import { createClient } from '@/lib/supabase/server';

// Mock Next.js globals
if (typeof Request === 'undefined') {
  global.Request = jest.fn() as any;
  global.Response = jest.fn() as any;
  global.Headers = jest.fn() as any;
  global.FormData = jest.fn() as any;
}

// Mock crypto
global.crypto = {
    randomUUID: () => 'test-uuid',
} as any;

jest.mock('next/server', () => {
    return {
        NextRequest: jest.fn().mockImplementation((url, init) => ({
            url,
            method: init?.method ?? 'GET',
            formData: async () => init?.body,
            nextUrl: new URL(url),
        })),
        NextResponse: {
            json: (data: any, init?: any) => ({
                status: init?.status ?? 200,
                json: async () => data,
            }),
            redirect: (dest: string) => ({
                status: 302,
                headers: new Map([['location', dest]]),
                destination: dest,
            }),
        },
    };
});

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/ai/providers', () => ({
  OpenAIProvider: jest.fn().mockImplementation(() => ({
    generateEmbedding: jest.fn().mockResolvedValue([[0.1]]),
    generateChatCompletion: jest.fn().mockResolvedValue({ content: '[]' }),
  })),
}));

jest.mock('@/lib/ai/parsers', () => ({
  parseFile: jest.fn(),
}));

jest.mock('@/lib/ai/embedChunks', () => ({
  embedChunks: jest.fn(),
}));

describe('Upload API Logic Helpers', () => {
    // We can't directly export private helpers from the route file easily without changing the code,
    // but the coverage scanner will attribute hits to those lines when we call POST.
    // However, I can test them by calling POST with controlled inputs.
});

describe('POST /api/lessons/[lessonId]/upload', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {
      auth: { getUser: jest.fn() },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      storage: {
        from: jest.fn().mockReturnThis(),
        upload: jest.fn().mockResolvedValue({ error: null }),
      },
    };
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  it('failure: 401 Unauthorized when no user', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const req = new NextRequest('http://l/api/lessons/l1/upload', { method: 'POST' });
    const params = Promise.resolve({ lessonId: 'l1' });
    
    const res = await POST(req, { params });
    expect(res.status).toBe(401);
  });

  it('failure: 404 when lesson not found', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'lessons') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'Not found' } }) }) }) };
      return mockSupabase;
    });

    const req = new NextRequest('http://l/api/lessons/l1/upload', { method: 'POST' });
    const params = Promise.resolve({ lessonId: 'l1' });
    
    const res = await POST(req, { params });
    expect(res.status).toBe(404);
  });

  it('success: initiates processing for valid PDF', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    
    // Mock sequential Supabase calls for ownership and count
    mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'lessons') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { course_id: 'c1' }, error: null }) }) }) };
        if (table === 'courses') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { instructor_id: 'u1' }, error: null }) }) }) };
        if (table === 'lesson_files') {
            return {
                select: () => ({ eq: () => Promise.resolve({ count: 0, error: null }) }),
                insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 'f1', uploaded_at: 'now' }, error: null }) }) }),
                update: () => ({ eq: () => Promise.resolve({ error: null }) })
            };
        }
        return mockSupabase;
    });

    // Valid PDF Magic Bytes: %PDF
    const pdfContent = Buffer.from('%PDF-1.4\n...');
    const formData = new FormData();
    const file = new File([pdfContent], 'test.pdf', { type: 'application/pdf' });
    formData.append('file', file);

    const req = new NextRequest('http://l/api/lessons/l1/upload', {
      method: 'POST',
      body: formData,
    });
    const params = Promise.resolve({ lessonId: 'l1' });

    const res = await POST(req, { params });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('processing');
    expect(mockSupabase.storage.from).toHaveBeenCalledWith('lesson-files');
  });

  it('failure: 400 when file type is invalid (magic bytes mismatch)', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'lessons') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { course_id: 'c1' }, error: null }) }) }) };
        if (table === 'courses') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { instructor_id: 'u1' }, error: null }) }) }) };
        return mockSupabase;
    });

    const invalidContent = Buffer.from('this is not a pdf');
    const formData = new FormData();
    formData.append('file', new File([invalidContent], 'test.txt'));

    const req = new NextRequest('http://l/api/lessons/l1/upload', { method: 'POST', body: formData });
    const params = Promise.resolve({ lessonId: 'l1' });

    const res = await POST(req, { params });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Only PDF and PPTX files are supported' });
  });
});
