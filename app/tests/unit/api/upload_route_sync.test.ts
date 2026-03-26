/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from 'next/server';
import { POST } from '@/app/api/lessons/[lessonId]/upload/route';
import { createClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(),
}));

jest.mock('@/lib/ai/parsers', () => ({
    parseFile: jest.fn(),
}));

jest.mock('@/lib/ai/embedChunks', () => ({
    embedChunks: jest.fn(),
}));

jest.mock('@/lib/ai/providers', () => ({
    OpenAIProvider: jest.fn().mockImplementation(() => ({})),
}));

describe('Upload API Route (Sync Validation)', () => {
    let mockSupabase: any;
    const lessonId = 'l1';

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Define common mocks at top level so tests can override if needed
        const select = jest.fn().mockReturnThis();
        const eq = jest.fn().mockReturnThis();
        const single = jest.fn().mockReturnThis();
        const insert = jest.fn().mockReturnThis();
        const update = jest.fn().mockReturnThis(); // Added update mock
        const auth = { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) };
        const storage = {
            from: jest.fn().mockReturnThis(),
            upload: jest.fn().mockResolvedValue({ error: null }),
        };

        const from = jest.fn().mockImplementation((table: string) => {
            // Default behaviors per table
            if (table === 'lessons') {
                single.mockResolvedValueOnce({ data: { id: 'l1', course_id: 'c1' }, error: null });
            } else if (table === 'courses') {
                single.mockResolvedValueOnce({ data: { instructor_id: 'u1' }, error: null });
            } else if (table === 'lesson_files') {
                // For count query: await eq() resolves. For others, eq() returns this.
                // We'll handle this in the test or by checking call counts if necessary.
                // By default, let's keep it chaining.
                single.mockResolvedValueOnce({ data: { id: 'fr1', uploaded_at: 'now' }, error: null });
            }
            return { select, eq, single, insert, update };
        });

        mockSupabase = {
            auth,
            from,
            storage,
            // Expose mocks for individual expectation/overrides
            select,
            eq,
            single,
            insert,
        };
        (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    });

    it('failure: 401 Unauthorized when no user', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
        const req = new NextRequest('http://l', { method: 'POST' });
        const res = await POST(req, { params: Promise.resolve({ lessonId }) });
        expect(res.status).toBe(401);
    });

    it('failure: 400 when no file provided', async () => {
        const formData = new FormData();
        const req = new NextRequest('http://l', { method: 'POST', body: formData });
        const res = await POST(req, { params: Promise.resolve({ lessonId }) });
        expect(res.status).toBe(400);
    });

    it('failure: 404 if lesson not found', async () => {
        // Reset single to return null for the first call (lesson fetch)
        mockSupabase.single.mockReset().mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });
        const req = new NextRequest('http://l', { method: 'POST' });
        const res = await POST(req, { params: Promise.resolve({ lessonId }) });
        expect(res.status).toBe(404);
    });

    it('failure: 400 for unsupported file type', async () => {
        const file = new File(['text'], 'test.txt', { type: 'text/plain' });
        const formData = new FormData();
        formData.append('file', file);

        const req = new NextRequest('http://l', { method: 'POST', body: formData });
        const res = await POST(req, { params: Promise.resolve({ lessonId }) });
        expect(res.status).toBe(400);
        expect(await res.json()).toEqual({ error: 'Only PDF and PPTX files are supported' });
    });

    it('failure: 400 if limit reached (5 files)', async () => {
        // Sequentially: 
        // 1. single() resolves with lesson (handled by beforeEach default)
        // 2. single() resolves with course (handled by beforeEach default)
        // 3. eq() resolves with count (this is the 3rd eq call)
        let eqCallCount = 0;
        mockSupabase.eq.mockImplementation(() => {
            eqCallCount++;
            if (eqCallCount === 3) return Promise.resolve({ count: 5, error: null });
            return mockSupabase;
        });

        const pdfContent = Buffer.from('%PDF-1.4');
        const file = new File([pdfContent], 'overlimit.pdf', { type: 'application/pdf' });
        const formData = new FormData();
        formData.append('file', file);

        const req = new NextRequest('http://l', { method: 'POST', body: formData });
        const res = await POST(req, { params: Promise.resolve({ lessonId }) });
        expect(res.status).toBe(400);
    });

    it('success: initiates upload for valid PDF', async () => {
        let eqCallCount = 0;
        mockSupabase.eq.mockImplementation(() => {
            eqCallCount++;
            if (eqCallCount === 3) return Promise.resolve({ count: 0, error: null });
            return mockSupabase;
        });

        const pdfContent = Buffer.from('%PDF-1.4');
        const file = new File([pdfContent], 'lecture.pdf', { type: 'application/pdf' });
        const formData = new FormData();
        formData.append('file', file);

        const req = new NextRequest('http://l', { method: 'POST', body: formData });
        const res = await POST(req, { params: Promise.resolve({ lessonId }) });
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.status).toBe('processing');
        expect(mockSupabase.storage.upload).toHaveBeenCalled();
    });
});
