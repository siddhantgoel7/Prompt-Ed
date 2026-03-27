/**
 * @jest-environment node
 */
import { GET } from '@/app/api/lessons/[lessonId]/files/route';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url) => ({
    url,
    nextUrl: new URL(url),
  })),
  NextResponse: {
    json: jest.fn().mockImplementation((body, init) => ({
      status: init?.status ?? 200,
      json: async () => body,
    })),
  },
}));

describe('Lesson Files List API (/api/lessons/[lessonId]/files)', () => {
    let mockSupabase: any;
    const lessonId = 'l1';
    const params = Promise.resolve({ lessonId });

    beforeEach(() => {
        jest.clearAllMocks();
        mockSupabase = {
            auth: {
                getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
            },
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(),
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
        (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    });

    it('GET: success returns list of files if authorized', async () => {
        mockSupabase.single.mockResolvedValueOnce({ data: { id: 'l1', course_id: 'c1' }, error: null });
        mockSupabase.single.mockResolvedValueOnce({ data: { instructor_id: 'u1' }, error: null });
        mockSupabase.order.mockResolvedValueOnce({
            data: [
                { id: 'f1', lesson_id: 'l1', file_name: 'test.pdf', file_type: 'pdf', file_size_bytes: 1024, status: 'processed', uploaded_at: '2023-01-01' }
            ],
            error: null
        });

        const req = new NextRequest('http://host/api/lessons/l1/files');
        const res = await GET(req as any, { params });

        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body).toHaveLength(1);
        expect(body[0].fileName).toBe('test.pdf');
    });

    it('GET: failure returns 403 if not instructor of course', async () => {
        mockSupabase.single.mockResolvedValueOnce({ data: { id: 'l1', course_id: 'c1' }, error: null });
        mockSupabase.single.mockResolvedValueOnce({ data: { instructor_id: 'other_u' }, error: null });

        const req = new NextRequest('http://host/api/lessons/l1/files');
        const res = await GET(req as any, { params });

        expect(res.status).toBe(403);
    });
});
