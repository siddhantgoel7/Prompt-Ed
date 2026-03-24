/**
 * @jest-environment node
 */
import { DELETE, GET } from '@/app/api/lessons/[lessonId]/files/[fileId]/route';
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

describe('Lesson File API (/api/lessons/[lessonId]/files/[fileId])', () => {
    let mockSupabase: any;
    const lessonId = 'l1';
    const fileId = 'f1';
    const params = Promise.resolve({ lessonId, fileId });

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
            delete: jest.fn().mockReturnThis(),
            storage: {
                from: jest.fn().mockReturnThis(),
                remove: jest.fn().mockResolvedValue({ data: [], error: null }),
                createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl: 'http://signed-url' }, error: null }),
            },
        };
        (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    });

    it('DELETE: success deletes file and chunks', async () => {
        // 1. getUser (done in beforeEach)
        // 2. lessons
        mockSupabase.single.mockResolvedValueOnce({ data: { id: 'l1', course_id: 'c1' }, error: null });
        // 3. courses
        mockSupabase.single.mockResolvedValueOnce({ data: { instructor_id: 'u1' }, error: null });
        // 4. file record
        mockSupabase.single.mockResolvedValueOnce({ data: { storage_path: 'path/to/file' }, error: null });

        const req = new NextRequest('http://host/api/lessons/l1/files/f1');
        const res = await DELETE(req as any, { params });

        expect(res.status).toBe(200);
        expect(mockSupabase.storage.from).toHaveBeenCalledWith('lesson-files');
        expect(mockSupabase.storage.remove).toHaveBeenCalledWith(['path/to/file']);
    });

    it('DELETE: failure returned 403 if not owner', async () => {
        mockSupabase.single.mockResolvedValueOnce({ data: { id: 'l1', course_id: 'c1' }, error: null });
        mockSupabase.single.mockResolvedValueOnce({ data: { instructor_id: 'other_u' }, error: null });

        const req = new NextRequest('http://host/api/lessons/l1/files/f1');
        const res = await DELETE(req as any, { params });

        expect(res.status).toBe(403);
    });

    it('GET: success returns signed URL', async () => {
        mockSupabase.single.mockResolvedValueOnce({ data: { id: 'l1', course_id: 'c1' }, error: null });
        mockSupabase.single.mockResolvedValueOnce({ data: { instructor_id: 'u1' }, error: null });
        mockSupabase.single.mockResolvedValueOnce({ data: { storage_path: 'path/to/file', file_name: 'test.pdf' }, error: null });

        const req = new NextRequest('http://host/api/lessons/l1/files/f1');
        const res = await GET(req as any, { params });

        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.url).toBe('http://signed-url');
        expect(body.fileName).toBe('test.pdf');
    });

    it('GET: failure returns 404 if file not found', async () => {
        mockSupabase.single.mockResolvedValueOnce({ data: { id: 'l1', course_id: 'c1' }, error: null });
        mockSupabase.single.mockResolvedValueOnce({ data: { instructor_id: 'u1' }, error: null });
        mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Not Found' } });

        const req = new NextRequest('http://host/api/lessons/l1/files/f1');
        const res = await GET(req as any, { params });

        expect(res.status).toBe(404);
    });
});
