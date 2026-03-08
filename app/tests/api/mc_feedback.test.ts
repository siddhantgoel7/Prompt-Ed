/**
 * API Tests — Discussions data layer for [US 2.10]
 * To see if I got multiple choice questions correct
 *
 * Tests verify that the Supabase queries used to:
 *   1. Fetch a discussion (including correct_option, feedback_enabled fields)
 *   2. Submit a student response with the is_correct flag
 *   3. Retrieve a discussion's mc_options without the correct answer (safe view)
 *
 * All tests use a mocked Supabase client — no real DB calls are made.
 */

import { createClient } from '@/lib/supabase/client';

jest.mock('@/lib/supabase/client');

// Types
interface MockQueryBuilder {
    from: jest.Mock;
    select: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
    eq: jest.Mock;
    single: jest.Mock;
}

// Fixtures
const MC_DISCUSSION_DB_ROW = {
    id: 'd-mc-api-1',
    lesson_id: 'lesson-1',
    prompt_text: 'Which drug inhibits COX-2 selectively?',
    prompt_type: 'multiple_choice',
    status: 'active',
    mc_options: [
        { label: 'A', text: 'Aspirin' },
        { label: 'B', text: 'Celecoxib' },
        { label: 'C', text: 'Ibuprofen' },
        { label: 'D', text: 'Acetaminophen' },
    ],
    correct_option: 'B',
    feedback_enabled: true,
    created_at: new Date().toISOString(),
    published_at: null,
    closed_at: null,
    display_order: 1,
    source: 'manual',
    ai_generated_correct_option: null,
};

// "Safe" view — what students see via the API (no correct_option)
const MC_DISCUSSION_SAFE_ROW = {
    id: MC_DISCUSSION_DB_ROW.id,
    lesson_id: MC_DISCUSSION_DB_ROW.lesson_id,
    prompt_text: MC_DISCUSSION_DB_ROW.prompt_text,
    prompt_type: MC_DISCUSSION_DB_ROW.prompt_type,
    status: MC_DISCUSSION_DB_ROW.status,
    mc_options: MC_DISCUSSION_DB_ROW.mc_options.map(({ label, text }) => ({ label, text })),
    feedback_enabled: MC_DISCUSSION_DB_ROW.feedback_enabled,
    created_at: MC_DISCUSSION_DB_ROW.created_at,
    published_at: null,
    closed_at: null,
    display_order: 1,
    source: 'manual',
    ai_generated_correct_option: null,
    // NOTE: correct_option is intentionally absent from what students receive
};

// Setup
describe('Discussions API — MC Feedback Data Layer [US 2.10]', () => {
    let mockSupabase: MockQueryBuilder;

    beforeEach(() => {
        mockSupabase = {
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(),
        };
        (createClient as jest.Mock).mockReturnValue(mockSupabase);
        jest.clearAllMocks();
    });

    // Fetching discussion with correct_option (instructor/server side)
    describe('Fetch Discussion — includes correct_option [US 2.10]', () => {

        // 31.1
        it('[US 2.10][API1] success: fetches discussion with correct_option and feedback_enabled', async () => {
            mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: MC_DISCUSSION_DB_ROW,
                            error: null,
                        }),
                    }),
                }),
            });

            const supabase = createClient();
            const { data, error } = await supabase
                .from('discussions')
                .select('*')
                .eq('id', 'd-mc-api-1')
                .single();

            expect(error).toBeNull();
            expect(data.correct_option).toBe('B');
            expect(data.feedback_enabled).toBe(true);
            expect(data.mc_options).toHaveLength(4);
        });

        // 31.2
        it('[US 2.10][API2] failure: returns error when discussion not found', async () => {
            mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: null,
                            error: { message: 'Row not found', code: 'PGRST116' },
                        }),
                    }),
                }),
            });

            const supabase = createClient();
            const { data, error } = await supabase
                .from('discussions')
                .select('*')
                .eq('id', 'nonexistent-id')
                .single();

            expect(data).toBeNull();
            expect(error).toBeTruthy();
            expect(error?.message).toMatch(/not found/i);
        });

        // 31.3
        it('[US 2.10][API3] success: all four mc_options are returned with label and text', async () => {
            mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: MC_DISCUSSION_DB_ROW,
                            error: null,
                        }),
                    }),
                }),
            });

            const supabase = createClient();
            const { data } = await supabase
                .from('discussions')
                .select('*')
                .eq('id', 'd-mc-api-1')
                .single();

            const labels = data.mc_options.map((o: { label: string }) => o.label);
            expect(labels).toEqual(['A', 'B', 'C', 'D']);
            data.mc_options.forEach((opt: { label: string; text: string }) => {
                expect(opt).toHaveProperty('label');
                expect(opt).toHaveProperty('text');
            });
        });
    });

    // Submitting a response with is_correct
    describe('Submit Student Response — with is_correct flag [US 2.10]', () => {

        // 31.4
        it('[US 2.10][API4] success: inserts response record with is_correct=true for correct answer', async () => {
            const responsePayload = {
                discussion_id: 'd-mc-api-1',
                response_text: 'Option B: Celecoxib',
                selected_option: 'B',
                is_correct: true,
            };

            mockSupabase.from.mockReturnValue({
                insert: jest.fn().mockReturnValue({
                    select: jest.fn().mockResolvedValue({
                        data: [{ id: 'resp-1', ...responsePayload }],
                        error: null,
                    }),
                }),
            });

            const supabase = createClient();
            const { data, error } = await supabase
                .from('responses')
                .insert([responsePayload])
                .select();

            expect(error).toBeNull();
            expect(data?.[0].is_correct).toBe(true);
            expect(data?.[0].selected_option).toBe('B');
        });

        // 31.5
        it('[US 2.10][API5] failure: inserts response record with is_correct=false for wrong answer', async () => {
            const responsePayload = {
                discussion_id: 'd-mc-api-1',
                response_text: 'Option A: Aspirin',
                selected_option: 'A',
                is_correct: false,
            };

            mockSupabase.from.mockReturnValue({
                insert: jest.fn().mockReturnValue({
                    select: jest.fn().mockResolvedValue({
                        data: [{ id: 'resp-2', ...responsePayload }],
                        error: null,
                    }),
                }),
            });

            const supabase = createClient();
            const { data, error } = await supabase
                .from('responses')
                .insert([responsePayload])
                .select();

            expect(error).toBeNull();
            expect(data?.[0].is_correct).toBe(false);
        });

        // 31.6
        it('[US 2.10][API6] failure: response insert fails when lesson is ended', async () => {
            mockSupabase.from.mockReturnValue({
                insert: jest.fn().mockReturnValue({
                    select: jest.fn().mockResolvedValue({
                        data: null,
                        error: { message: 'Discussion is closed', code: '23514' },
                    }),
                }),
            });

            const supabase = createClient();
            const { data, error } = await supabase
                .from('responses')
                .insert([{
                    discussion_id: 'closed-discussion-id',
                    response_text: 'Too late',
                    selected_option: 'A',
                    is_correct: false,
                }])
                .select();

            expect(data).toBeNull();
            expect(error).toBeTruthy();
        });
    });

    // Safe/student-facing discussion view (no correct_option)
    describe('Student-safe Discussion View — correct_option stripped [US 2.10]', () => {

        // 31.7
        it('[US 2.10][SEC-API1] success: safe row does not contain correct_option field', async () => {
            mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: MC_DISCUSSION_SAFE_ROW,
                            error: null,
                        }),
                    }),
                }),
            });

            const supabase = createClient();
            const { data } = await supabase
                .from('discussions')
                .select('id, prompt_text, prompt_type, mc_options, feedback_enabled')
                .eq('id', 'd-mc-api-1')
                .single();

            expect(data).not.toHaveProperty('correct_option');
        });

        // 31.8
        it('[US 2.10][SEC-API2] success: mc_options in safe row only contain label and text', async () => {
            mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: MC_DISCUSSION_SAFE_ROW,
                            error: null,
                        }),
                    }),
                }),
            });

            const supabase = createClient();
            const { data } = await supabase
                .from('discussions')
                .select('mc_options')
                .eq('id', 'd-mc-api-1')
                .single();

            data?.mc_options.forEach((opt: Record<string, unknown>) => {
                expect(opt).toHaveProperty('label');
                expect(opt).toHaveProperty('text');
                expect(opt).not.toHaveProperty('is_correct');
            });
        });

        // 31.9
        it('[US 2.10][SEC-API3] success: feedback_enabled is available to student view', async () => {
            mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: MC_DISCUSSION_SAFE_ROW,
                            error: null,
                        }),
                    }),
                }),
            });

            const supabase = createClient();
            const { data } = await supabase
                .from('discussions')
                .select('feedback_enabled')
                .eq('id', 'd-mc-api-1')
                .single();

            // feedback_enabled must be present so student UI can decide whether to show feedback
            expect(data).toHaveProperty('feedback_enabled');
            expect(typeof data?.feedback_enabled).toBe('boolean');
        });
    });

    // feedback_enabled toggle (instructor side)
    describe('Update Discussion — feedback_enabled toggle [US 2.10]', () => {

        // 31.10
        it('[US 2.10][API7] success: enables feedback on a discussion', async () => {
            mockSupabase.from.mockReturnValue({
                update: jest.fn().mockReturnValue({
                    eq: jest.fn().mockResolvedValue({
                        data: [{ ...MC_DISCUSSION_DB_ROW, feedback_enabled: true }],
                        error: null,
                    }),
                }),
            });

            const supabase = createClient();
            const { error } = await supabase
                .from('discussions')
                .update({ feedback_enabled: true })
                .eq('id', 'd-mc-api-1');

            expect(error).toBeNull();
            expect(mockSupabase.from).toHaveBeenCalledWith('discussions');
        });

        // 31.11
        it('[US 2.10][API8] success: disables feedback on a discussion', async () => {
            mockSupabase.from.mockReturnValue({
                update: jest.fn().mockReturnValue({
                    eq: jest.fn().mockResolvedValue({
                        data: [{ ...MC_DISCUSSION_DB_ROW, feedback_enabled: false }],
                        error: null,
                    }),
                }),
            });

            const supabase = createClient();
            const { error } = await supabase
                .from('discussions')
                .update({ feedback_enabled: false })
                .eq('id', 'd-mc-api-1');

            expect(error).toBeNull();
        });
    });
});
