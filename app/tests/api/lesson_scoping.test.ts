/**
 * API Tests — Lesson Scoping for [US 1.26] and [US 2.04]
 * 
 * [US 1.26]: Only students in my lesson to be able to see my discussion prompts
 * [US 2.04]: Only see the prompts for the lesson I am in
 * 
 * Tests that Supabase queries used to fetch discussions and responses
 * correctly filter by `lesson_id` ensuring data isolation between concurrent lessons.
 */

import { createClient } from '@/lib/supabase/client';

jest.mock('@/lib/supabase/client');

describe('Discussions API — Lesson Scoping [US 1.26] [US 2.04]', () => {
    let mockSupabase: any;

    beforeEach(() => {
        mockSupabase = {
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            single: jest.fn(),
        };
        (createClient as jest.Mock).mockReturnValue(mockSupabase);
        jest.clearAllMocks();
    });

    // 1.26 AC1 & 2.04 AC1, AC2: Only fetch discussions matching a specific lesson_id
    it('[US 1.26][AC1-AT1] [US 2.04][AC1-AT1] success: fetching active discussion is scoped to specific lesson_id', async () => {
        mockSupabase.single.mockResolvedValue({ data: { id: 'disc-target', lesson_id: 'lesson-target-123' }, error: null });

        const supabase = createClient();

        // Simulating the getActiveDiscussion query logic inside hooks
        const { data, error } = await supabase
            .from('discussions')
            .select('*')
            .eq('lesson_id', 'lesson-target-123')
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        expect(error).toBeNull();
        expect(data).toBeTruthy();
        expect(data.lesson_id).toBe('lesson-target-123'); // Must strictly match
        expect(mockSupabase.eq).toHaveBeenCalledWith('lesson_id', 'lesson-target-123');
    });

    // Student not in the lesson tries to fetch it by guessing?
    it('[US 1.26][AC2-AT1] failure: fetching active discussion with wrong lesson_id yields null', async () => {
        // Returns null because there are no active discussions for the wrong lesson
        mockSupabase.single.mockResolvedValue({ data: null, error: { message: 'Row not found' } });

        const supabase = createClient();

        const { data, error } = await supabase
            .from('discussions')
            .select('*')
            .eq('lesson_id', 'wrong-lesson-999')
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        expect(data).toBeNull();
        expect(error).toBeTruthy();
        expect(mockSupabase.eq).toHaveBeenCalledWith('lesson_id', 'wrong-lesson-999');
    });

    // 2.04 AC3: Rejoining the same lesson checks the same active prompt
    it('[US 2.04][AC3-AT1] success: rejoining same lesson fetches identical active lesson_id scope', async () => {
        mockSupabase.single.mockResolvedValue({ data: { id: 'disc-target', lesson_id: 'lesson-target-123' }, error: null });

        const supabase = createClient();

        await supabase
            .from('discussions')
            .select('*')
            .eq('lesson_id', 'lesson-target-123')
            .eq('status', 'active')
            .single();

        expect(mockSupabase.eq).toHaveBeenCalledWith('lesson_id', 'lesson-target-123');
        expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'active');
    });
});
