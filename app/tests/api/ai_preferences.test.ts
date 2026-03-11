/**
 * API Tests — Data layer interactions for [US 1.22]
 * Set preferences for how AI generates prompts
 *
 * Tests verify the Supabase queries used to:
 *   1. Fetch an instructor's AI preferences.
 *   2. Update (upsert) an instructor's AI preferences.
 *
 * All tests use a mocked Supabase client.
 */

import { createClient } from '@/lib/supabase/client';

jest.mock('@/lib/supabase/client');

interface MockQueryBuilder {
    from: jest.Mock;
    select: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
    upsert: jest.Mock;
    eq: jest.Mock;
    single: jest.Mock;
}

const MOCK_PREFS_ROW = {
    user_id: 'inst-123',
    difficulty: 'advanced',
    style: 'factual',
    length: 'brief',
    focus_areas: 'pharmacokinetics',
    updated_at: new Date().toISOString(),
};

describe('API — AI Preferences Data Layer [US 1.22]', () => {
    let mockSupabase: MockQueryBuilder;

    beforeEach(() => {
        mockSupabase = {
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            upsert: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(),
        };
        (createClient as jest.Mock).mockReturnValue(mockSupabase);
        jest.clearAllMocks();
    });

    describe('Fetch Preferences', () => {
        it('[US 1.22][API1] success: fetches existing preferences for a user', async () => {
            mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: MOCK_PREFS_ROW,
                            error: null,
                        }),
                    }),
                }),
            });

            const supabase = createClient();
            const { data, error } = await supabase
                .from('instructor_ai_preferences')
                .select('difficulty, style, length, focus_areas')
                .eq('user_id', 'inst-123')
                .single();

            expect(error).toBeNull();
            expect(data?.difficulty).toBe('advanced');
            expect(data?.style).toBe('factual');
            expect(data?.length).toBe('brief');
            expect(data?.focus_areas).toBe('pharmacokinetics');
        });

        it('[US 1.22][API2] failure: handles PGRST116 (Not Found) gracefully', async () => {
            mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: null,
                            error: { code: 'PGRST116', message: 'The result contains 0 rows' },
                        }),
                    }),
                }),
            });

            const supabase = createClient();
            const { data, error } = await supabase
                .from('instructor_ai_preferences')
                .select('difficulty, style, length, focus_areas')
                .eq('user_id', 'new-inst')
                .single();

            expect(data).toBeNull();
            expect(error?.code).toBe('PGRST116');
        });
    });

    describe('Upsert Preferences', () => {
        it('[US 1.22][API3] success: upserts new preferences for an instructor', async () => {
            mockSupabase.from.mockReturnValue({
                upsert: jest.fn().mockResolvedValue({
                    error: null,
                }),
            });

            const payload = {
                user_id: 'inst-123',
                difficulty: 'intermediate',
                style: 'socratic',
                length: 'standard',
                focus_areas: null,
                updated_at: new Date().toISOString(),
            };

            const supabase = createClient();
            const { error } = await supabase
                .from('instructor_ai_preferences')
                .upsert(payload);

            expect(error).toBeNull();
            expect(mockSupabase.from).toHaveBeenCalledWith('instructor_ai_preferences');
            expect(mockSupabase.from().upsert).toHaveBeenCalledWith(payload);
        });

        it('[US 1.22][API4] failure: fails to save preferences with missing requirement', async () => {
            mockSupabase.from.mockReturnValue({
                upsert: jest.fn().mockResolvedValue({
                    error: { message: 'null value in column "difficulty" violates not-null constraint' },
                }),
            });

            const payload = {
                user_id: 'inst-123',
                style: 'socratic',
                length: 'standard',
                updated_at: new Date().toISOString(),
            }; // Missing difficulty

            const supabase = createClient();
            const { error } = await supabase
                .from('instructor_ai_preferences')
                .upsert(payload);

            expect(error).toBeTruthy();
            expect(error?.message).toMatch(/violates not-null constraint/);
        });
    });
});
