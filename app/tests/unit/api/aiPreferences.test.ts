/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET, PUT } from '@/app/api/user/ai-preferences/route';
import { createClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(),
}));

describe('AI Preferences API', () => {
    let mockSupabase: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockSupabase = {
            auth: { getUser: jest.fn() },
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockReturnThis(),
            upsert: jest.fn().mockReturnThis(),
        };
        (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    });

    describe('GET', () => {
        it('failure: 401 Unauthorized when no user', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
            const res = await GET();
            const json = await res.json();
            expect(res.status).toBe(401);
            expect(json.error).toBe('Unauthorized');
        });

        it('success: returns defaults if no preferences exist', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
            mockSupabase.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
            
            const res = await GET();
            const json = await res.json();
            expect(res.status).toBe(200);
            expect(json.difficulty).toBe('intermediate');
        });

        it('success: returns existing preferences', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
            mockSupabase.single.mockResolvedValue({ 
                data: { difficulty: 'easy', style: 'direct', length: 'brief', focus_areas: 'test' }, 
                error: null 
            });
            
            const res = await GET();
            const json = await res.json();
            expect(res.status).toBe(200);
            expect(json.difficulty).toBe('easy');
            expect(json.focusAreas).toBe('test');
        });

        it('failure: returns 500 on database error', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
            mockSupabase.single.mockResolvedValue({ data: null, error: { message: 'DB fail' } });
            
            const res = await GET();
            expect(res.status).toBe(500);
        });
    });

    describe('PUT', () => {
        it('success: updates preferences via upsert', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
            mockSupabase.upsert.mockResolvedValue({ error: null });

            const body = { difficulty: 'hard', style: 'socratic', length: 'standard', focusAreas: 'AI stuff' };
            const req = new NextRequest('http://l', { method: 'PUT', body: JSON.stringify(body) });

            const res = await PUT(req);
            const json = await res.json();
            expect(res.status).toBe(200);
            expect(json.success).toBe(true);
            expect(mockSupabase.from).toHaveBeenCalledWith('instructor_ai_preferences');
            expect(mockSupabase.upsert).toHaveBeenCalledWith(expect.objectContaining({
                user_id: 'u1',
                difficulty: 'hard'
            }));
        });

        it('failure: returns 500 if upsert fails', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
            mockSupabase.upsert.mockResolvedValue({ error: { message: 'fail' } });

            const req = new NextRequest('http://l', { method: 'PUT', body: JSON.stringify({}) });
            const res = await PUT(req);
            expect(res.status).toBe(500);
        });
    });
});
