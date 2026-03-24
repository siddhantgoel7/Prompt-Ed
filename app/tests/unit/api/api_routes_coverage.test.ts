/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET as getAI } from '@/app/api/user/ai-preferences/route';
import { GET as getFiles } from '@/app/api/lessons/[lessonId]/files/route';
import { POST as postTranscript } from '@/app/api/lessons/[lessonId]/transcript/route';
import { DELETE as deleteFile } from '@/app/api/lessons/[lessonId]/files/[fileId]/route';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(),
}));

jest.mock('openai', () => {
    return jest.fn().mockImplementation(() => ({
        audio: {
            transcriptions: {
                create: jest.fn().mockResolvedValue({ text: 'test transcript' }),
            },
        },
        embeddings: {
            create: jest.fn().mockResolvedValue({ data: [{ embedding: [0.1, 0.2] }] }),
        },
    }));
});

describe('API Routes Coverage', () => {
    let mockSupabase: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockSupabase = {
            auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { id: 'l1', instructor_id: 'u1', course_id: 'c1', storage_path: 'p1' } }),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            storage: {
                from: jest.fn().mockReturnThis(),
                remove: jest.fn().mockResolvedValue({ data: [], error: null }),
            },
        };
        (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    });

    it('hits ai-preferences route', async () => {
        const res = await getAI();
        expect(res.status).toBe(200);
    });

    it('hits files list route', async () => {
        mockSupabase.order.mockResolvedValueOnce({ data: [] });
        const req = new NextRequest('http://l');
        const res = await getFiles(req, { params: Promise.resolve({ lessonId: 'l1' }) });
        expect(res.status).toBe(200);
    });

    it('hits transcript route', async () => {
        const formData = new FormData();
        const file = new File(['test'], 'audio.webm', { type: 'audio/webm' });
        formData.append('audio', file);
        const req = new NextRequest('http://l', { method: 'POST', body: formData });
        const res = await postTranscript(req, { params: Promise.resolve({ lessonId: 'l1' }) });
        expect(res.status).toBe(200);
    });

    it('hits delete file route', async () => {
        const req = new NextRequest('http://l', { method: 'DELETE' });
        const res = await deleteFile(req, { params: Promise.resolve({ lessonId: 'l1', fileId: 'f1' }) });
        expect(res.status).toBe(200);
    });
});
