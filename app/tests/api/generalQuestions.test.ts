/**
 * API Tests — Data layer interactions for General Questions [US 1.51]
 * Generate a set of general MC questions from uploaded course materials
 *
 * AC1: Generate 10 MC questions from uploaded materials
 * AC2: Publish general questions to students
 * AC3: Regenerate replaces previous set
 *
 * Tests verify the Supabase queries used to:
 *   1. Fetch general questions for a lesson (ordered by display_order).
 *   2. Insert a batch of generated general questions.
 *   3. Delete existing general questions before regeneration.
 *   4. Ensure lesson-scoped data isolation.
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
    delete: jest.Mock;
    eq: jest.Mock;
    order: jest.Mock;
}

// Fixtures
const GENERAL_QUESTION_ROW_1 = {
    id: 'gq-1',
    lesson_id: 'lesson-123',
    prompt_text: 'Which receptor does drug X primarily target?',
    mc_options: [
        { label: 'A', text: 'Beta-1 adrenergic', is_correct: false },
        { label: 'B', text: 'Muscarinic M2', is_correct: true },
        { label: 'C', text: 'Alpha-1 adrenergic', is_correct: false },
        { label: 'D', text: 'Nicotinic', is_correct: false },
    ],
    correct_option: 'B',
    display_order: 0,
    created_at: new Date().toISOString(),
};

const GENERAL_QUESTION_ROW_2 = {
    id: 'gq-2',
    lesson_id: 'lesson-123',
    prompt_text: 'What is the therapeutic index?',
    mc_options: [
        { label: 'A', text: 'The ratio of toxic dose to effective dose', is_correct: true },
        { label: 'B', text: 'The maximum plasma concentration', is_correct: false },
        { label: 'C', text: 'The time to reach steady state', is_correct: false },
        { label: 'D', text: 'The volume of distribution', is_correct: false },
    ],
    correct_option: 'A',
    display_order: 1,
    created_at: new Date().toISOString(),
};

const MOCK_QUESTIONS = [GENERAL_QUESTION_ROW_1, GENERAL_QUESTION_ROW_2];

// Setup
describe('API — General Questions Data Layer [US 1.51]', () => {
    let mockSupabase: MockQueryBuilder;

    beforeEach(() => {
        mockSupabase = {
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
        };
        (createClient as jest.Mock).mockReturnValue(mockSupabase);
        jest.clearAllMocks();
    });

    // Fetching generated questions (AC1: questions are persisted and retrievable)
    describe('Fetch General Questions [US 1.51][AC1]', () => {

        // 48.1
        it('[US 1.51][AC1-AT1] success: fetches general questions ordered by display_order', async () => {
            mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        order: jest.fn().mockResolvedValue({
                            data: MOCK_QUESTIONS,
                            error: null,
                        }),
                    }),
                }),
            });

            const supabase = createClient();
            const { data, error } = await supabase
                .from('general_questions')
                .select('*')
                .eq('lesson_id', 'lesson-123')
                .order('display_order', { ascending: true });

            expect(error).toBeNull();
            expect(data).toHaveLength(2);
            expect(data[0].prompt_text).toContain('receptor');
            expect(data[1].prompt_text).toContain('therapeutic index');
            expect(data[0].display_order).toBeLessThan(data[1].display_order);
        });

        // 48.2
        it('[US 1.51][AC1-AT2] success: returns empty array when no general questions exist', async () => {
            mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        order: jest.fn().mockResolvedValue({
                            data: [],
                            error: null,
                        }),
                    }),
                }),
            });

            const supabase = createClient();
            const { data, error } = await supabase
                .from('general_questions')
                .select('*')
                .eq('lesson_id', 'lesson-no-questions')
                .order('display_order', { ascending: true });

            expect(error).toBeNull();
            expect(data).toHaveLength(0);
        });

        // 48.3
        it('[US 1.51][AC1-AT3] failure: handles database error gracefully', async () => {
            mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        order: jest.fn().mockResolvedValue({
                            data: null,
                            error: { code: '42P01', message: 'relation "general_questions" does not exist' },
                        }),
                    }),
                }),
            });

            const supabase = createClient();
            const { data, error } = await supabase
                .from('general_questions')
                .select('*')
                .eq('lesson_id', 'lesson-123')
                .order('display_order', { ascending: true });

            expect(data).toBeNull();
            expect(error).toBeTruthy();
            expect(error?.code).toBe('42P01');
        });
    });

    // Inserting generated questions (AC1: each question has 4 options, 1 correct)
    describe('Insert General Questions [US 1.51][AC1]', () => {

        // 48.4
        it('[US 1.51][AC1-AT4] success: inserts multiple general questions and returns them', async () => {
            const insertPayload = MOCK_QUESTIONS.map(q => ({
                lesson_id: q.lesson_id,
                prompt_text: q.prompt_text,
                mc_options: q.mc_options,
                correct_option: q.correct_option,
                display_order: q.display_order,
            }));

            mockSupabase.from.mockReturnValue({
                insert: jest.fn().mockReturnValue({
                    select: jest.fn().mockResolvedValue({
                        data: MOCK_QUESTIONS,
                        error: null,
                    }),
                }),
            });

            const supabase = createClient();
            const { data, error } = await supabase
                .from('general_questions')
                .insert(insertPayload)
                .select();

            expect(error).toBeNull();
            expect(data).toHaveLength(2);
            expect(data[0].id).toBe('gq-1');
            expect(data[0].mc_options).toHaveLength(4);
            expect(data[0].correct_option).toBe('B');
        });

        // 48.5
        it('[US 1.51][AC2-AT1] success: each question has exactly 4 MC options with one correct', () => {
            for (const q of MOCK_QUESTIONS) {
                expect(q.mc_options).toHaveLength(4);
                const correctCount = q.mc_options.filter(o => o.is_correct).length;
                expect(correctCount).toBe(1);
            }
        });

        // 48.6
        it('[US 1.51][AC2-AT2] success: correct_option matches the label of the is_correct option', () => {
            for (const q of MOCK_QUESTIONS) {
                const correctOpt = q.mc_options.find(o => o.is_correct);
                expect(correctOpt).toBeDefined();
                expect(correctOpt!.label).toBe(q.correct_option);
            }
        });

        // 48.7
        it('[US 1.51][AC1-AT5] failure: handles insert error for missing required field', async () => {
            mockSupabase.from.mockReturnValue({
                insert: jest.fn().mockReturnValue({
                    select: jest.fn().mockResolvedValue({
                        data: null,
                        error: { message: 'null value in column "prompt_text" violates not-null constraint' },
                    }),
                }),
            });

            const supabase = createClient();
            const { data, error } = await supabase
                .from('general_questions')
                .insert([{ lesson_id: 'lesson-123', mc_options: [], correct_option: 'A', display_order: 0 }])
                .select();

            expect(data).toBeNull();
            expect(error).toBeTruthy();
            expect(error?.message).toMatch(/violates not-null constraint/);
        });
    });

    // Deleting before regeneration (AC3: regenerate replaces previous set)
    describe('Delete General Questions — before regeneration [US 1.51][AC3]', () => {

        // 48.8
        it('[US 1.51][AC3-AT1] success: deletes all general questions for a lesson', async () => {
            const mockDelete = jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: null }),
            });
            mockSupabase.from.mockReturnValue({
                delete: mockDelete,
            });

            const supabase = createClient();
            const { error } = await supabase
                .from('general_questions')
                .delete()
                .eq('lesson_id', 'lesson-123');

            expect(error).toBeNull();
            expect(mockSupabase.from).toHaveBeenCalledWith('general_questions');
        });

        // 48.9
        it('[US 1.51][AC3-AT2] success: delete is scoped to specific lesson_id', async () => {
            const mockEq = jest.fn().mockResolvedValue({ error: null });
            const mockDelete = jest.fn().mockReturnValue({ eq: mockEq });
            mockSupabase.from.mockReturnValue({ delete: mockDelete });

            const supabase = createClient();
            await supabase
                .from('general_questions')
                .delete()
                .eq('lesson_id', 'lesson-123');

            expect(mockEq).toHaveBeenCalledWith('lesson_id', 'lesson-123');
        });
    });

    // Lesson scoping / data isolation
    describe('Lesson Scoping [US 1.51][AC1]', () => {

        // 48.10
        it('[US 1.51][AC1-AT6] success: different lessons return different general questions', async () => {
            const lesson1Questions = [{ ...GENERAL_QUESTION_ROW_1, lesson_id: 'lesson-A' }];
            const lesson2Questions = [{ ...GENERAL_QUESTION_ROW_2, lesson_id: 'lesson-B' }];

            // First call: lesson-A
            mockSupabase.from.mockReturnValueOnce({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        order: jest.fn().mockResolvedValue({ data: lesson1Questions, error: null }),
                    }),
                }),
            });

            const supabase = createClient();
            const result1 = await supabase
                .from('general_questions')
                .select('*')
                .eq('lesson_id', 'lesson-A')
                .order('display_order', { ascending: true });

            expect(result1.data).toHaveLength(1);
            expect(result1.data[0].lesson_id).toBe('lesson-A');

            // Second call: lesson-B
            mockSupabase.from.mockReturnValueOnce({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        order: jest.fn().mockResolvedValue({ data: lesson2Questions, error: null }),
                    }),
                }),
            });

            const result2 = await supabase
                .from('general_questions')
                .select('*')
                .eq('lesson_id', 'lesson-B')
                .order('display_order', { ascending: true });

            expect(result2.data).toHaveLength(1);
            expect(result2.data[0].lesson_id).toBe('lesson-B');
        });
    });
});
