/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/lessons/[lessonId]/generate/route';
import { createClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(),
}));

jest.mock('@/lib/ai/providers', () => ({
    OpenAIProvider: jest.fn().mockImplementation(() => ({
        generateEmbedding: jest.fn(),
        generateChatCompletion: jest.fn(),
    })),
}));

// Mock both the real and mock generatePrompts to avoid side effects
jest.mock('@/lib/ai/__mocks__/generatePrompts', () => ({
    generatePrompts: jest.fn().mockResolvedValue({ candidates: [], model: 'mock' }),
}));
jest.mock('@/lib/ai/generatePrompts', () => ({
    generatePrompts: jest.fn().mockResolvedValue({ candidates: [], model: 'gpt-4o' }),
}));

describe('Generate API Route', () => {
    let mockSupabase: any;
    const lessonId = 'l1';

    beforeEach(() => {
        jest.clearAllMocks();
        mockSupabase = {
            auth: { getUser: jest.fn() },
            from: jest.fn().mockImplementation((table: string) => {
                if (table === 'lessons') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { course_id: 'c1' }, error: null }) }) }) };
                if (table === 'courses') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { instructor_id: 'u1' }, error: null }) }) }) };
                if (table === 'instructor_ai_preferences') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: { code: 'PGRST116' } }) }) }) };
                return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
            }),
        };
        (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    });

    it('failure: 401 Unauthorized when no user', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
        const req = new NextRequest('http://l', { method: 'POST', body: JSON.stringify({}) });
        const res = await POST(req, { params: Promise.resolve({ lessonId }) });
        expect(res.status).toBe(401);
    });

    it('failure: 404 when lesson not found', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'lessons') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'Not found' } }) }) }) };
            return mockSupabase;
        });

        const req = new NextRequest('http://l', { method: 'POST', body: JSON.stringify({}) });
        const res = await POST(req, { params: Promise.resolve({ lessonId }) });
        expect(res.status).toBe(404);
    });

    it('failure: 403 Forbidden for wrong instructor', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'lessons') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { course_id: 'c1' }, error: null }) }) }) };
            if (table === 'courses') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { instructor_id: 'other' }, error: null }) }) }) };
            return mockSupabase;
        });

        const req = new NextRequest('http://l', { method: 'POST', body: JSON.stringify({}) });
        const res = await POST(req, { params: Promise.resolve({ lessonId }) });
        expect(res.status).toBe(403);
    });

    it('success: generates prompts using real provider', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
        process.env.MOCK_AI = 'false';

        const body = { promptType: 'multiple_choice', transcriptText: 'hello world' };
        const req = new NextRequest('http://l', { method: 'POST', body: JSON.stringify(body) });

        const res = await POST(req, { params: Promise.resolve({ lessonId }) });
        const json = await res.json();
        expect(res.status).toBe(200);
        expect(json.model).toBe('gpt-4o');
    });

    it('success: generates prompts using mock provider', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
        process.env.MOCK_AI = 'true';

        const body = { promptType: 'long_answer' };
        const req = new NextRequest('http://l', { method: 'POST', body: JSON.stringify(body) });

        const res = await POST(req, { params: Promise.resolve({ lessonId }) });
        const json = await res.json();
        expect(res.status).toBe(200);
        expect(json.model).toBe('mock');
    });

    it('failure: 400 for invalid prompt type', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
        const body = { promptType: 'invalid' };
        const req = new NextRequest('http://l', { method: 'POST', body: JSON.stringify(body) });

        const res = await POST(req, { params: Promise.resolve({ lessonId }) });
        expect(res.status).toBe(400);
    });

    it('failure: 500 on internal error', async () => {
        mockSupabase.auth.getUser.mockRejectedValue(new Error('Boom'));
        const req = new NextRequest('http://l', { method: 'POST', body: JSON.stringify({}) });
        const res = await POST(req, { params: Promise.resolve({ lessonId }) });
        expect(res.status).toBe(500);
    });
});
