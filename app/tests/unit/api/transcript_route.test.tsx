/**
 * @jest-environment node
 */
import { POST } from '@/app/api/lessons/[lessonId]/transcript/route';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('openai', () => {
    return jest.fn().mockImplementation(() => ({
        audio: {
            transcriptions: {
                create: jest.fn().mockResolvedValue({ text: 'Whisper results' }),
            },
        },
        embeddings: {
            create: jest.fn().mockResolvedValue({ data: [{ embedding: [0.1, 0.2] }] }),
        },
    }));
});

jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url, init) => ({
    url,
    nextUrl: new URL(url),
    formData: async () => init?.body,
  })),
  NextResponse: {
    json: jest.fn().mockImplementation((body, init) => ({
      status: init?.status ?? 200,
      json: async () => body,
    })),
  },
}));

describe('Transcript API (/api/lessons/[lessonId]/transcript)', () => {
    let mockSupabase: any;
    let mockOpenAI: any;
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
            insert: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
        (createClient as jest.Mock).mockResolvedValue(mockSupabase);
        mockOpenAI = new (OpenAI as any)();
    });

    it('POST: success transcribes audio and returns text', async () => {
        mockSupabase.single.mockResolvedValueOnce({ data: { id: 'l1', course_id: 'c1' }, error: null });
        mockSupabase.single.mockResolvedValueOnce({ data: { instructor_id: 'u1' }, error: null });

        const mockAudioData = new Map();
        mockAudioData.set('audio', { size: 1024 });

        const req = new NextRequest('http://host/api/lessons/l1/transcript', {
            method: 'POST',
            body: mockAudioData as any,
        });

        const res = await POST(req as any, { params });

        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.transcript).toBe('Whisper results');
    });

    it('POST: failure returns 400 if no audio provided', async () => {
        mockSupabase.single.mockResolvedValueOnce({ data: { id: 'l1', course_id: 'c1' }, error: null });
        mockSupabase.single.mockResolvedValueOnce({ data: { instructor_id: 'u1' }, error: null });

        const mockFormData = new Map();

        const req = new NextRequest('http://host/api/lessons/l1/transcript', {
            method: 'POST',
            body: mockFormData as any,
        });

        const res = await POST(req as any, { params });

        expect(res.status).toBe(400);
    });

    it('POST: failure returns 403 if not owner', async () => {
        mockSupabase.single.mockResolvedValueOnce({ data: { id: 'l1', course_id: 'c1' }, error: null });
        mockSupabase.single.mockResolvedValueOnce({ data: { instructor_id: 'other_u' }, error: null });

        const req = new NextRequest('http://host/api/lessons/l1/transcript', {
            method: 'POST',
            body: new Map() as any,
        });

        const res = await POST(req as any, { params });

        expect(res.status).toBe(403);
    });
});
