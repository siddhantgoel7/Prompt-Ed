/**
 * Unit Tests — useStudentSession (Multiple Responses)
 * User Story [US 1.30]: Allow multiple responses from students
 *
 * Tests the hook logic for the three acceptance criteria:
 *
 * AC1: GIVEN an instructor WHEN they configure response limit
 *      THEN students are limited to that number of submissions
 * AC2: GIVEN an instructor WHEN they allow multiple responses
 *      THEN students can submit more than once
 * AC3: GIVEN an instructor WHEN they allow single response
 *      THEN students can only submit once
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useStudentSession } from '@/hooks/useStudentSession';
import { useRouter } from 'next/navigation';
import { useRealtime } from '@/lib/realtime/useRealtime';
import { fetchLessonByIdApi } from '@/lib/api/lessonApi';
import { fetchStudentActiveDiscussionApi, submitStudentResponseApi } from '@/lib/api/discussionsApi';

jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));

jest.mock('@/lib/realtime/useRealtime', () => ({
    useRealtime: jest.fn(),
}));

jest.mock('@/lib/api/lessonApi', () => ({
    fetchLessonByIdApi: jest.fn(),
}));

jest.mock('@/lib/api/discussionsApi', () => ({
    fetchStudentActiveDiscussionApi: jest.fn(),
    submitStudentResponseApi: jest.fn(),
}));

const LESSON_ID = 'l-multi';

const makeDiscussion = (overrides: Record<string, unknown> = {}) => ({
    id: 'd-multi-1',
    lesson_id: LESSON_ID,
    prompt_text: 'Explain aspirin.',
    prompt_type: 'short_answer',
    status: 'active',
    created_at: new Date().toISOString(),
    published_at: new Date().toISOString(),
    closed_at: null,
    display_order: 0,
    source: 'manual',
    mc_options: null,
    correct_option: null,
    feedback_enabled: false,
    ai_generated_correct_option: null,
    participant_snapshot: 25,
    time_limit_seconds: null,
    allow_multiple_responses: false,
    response_limit: 1,
    ...overrides,
});

describe('useStudentSession Multiple Responses [US 1.30]', () => {
    let mockRouter: { push: jest.Mock };
    let mockChannel: { on: jest.Mock; send: jest.Mock };

    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        mockRouter = { push: jest.fn() };
        (useRouter as jest.Mock).mockReturnValue(mockRouter);

        mockChannel = {
            on: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
            send: jest.fn().mockResolvedValue({}),
        };
        (useRealtime as jest.Mock).mockReturnValue({ channel: mockChannel, isConnected: true });
        (fetchLessonByIdApi as jest.Mock).mockResolvedValue({ data: { id: LESSON_ID, status: 'active' }, error: null });
    });

    // ── AC3: Single response (default) ──────────────────────────────────

    describe('AC3: Single response — students can only submit once', () => {

        // 73.1
        it('[US 1.30][UNIT1] success: canSubmitAnother is false for single-response discussion', async () => {
            (fetchStudentActiveDiscussionApi as jest.Mock).mockResolvedValue({
                data: makeDiscussion({ allow_multiple_responses: false, response_limit: 1 }),
                error: null,
            });

            const { result } = renderHook(() => useStudentSession(LESSON_ID));
            await waitFor(() => expect(result.current.view).toBe('active'));

            expect(result.current.canSubmitAnother).toBe(false);
        });

        // 73.2
        it('[US 1.30][UNIT2] success: responseCount starts at 0', async () => {
            (fetchStudentActiveDiscussionApi as jest.Mock).mockResolvedValue({
                data: makeDiscussion(),
                error: null,
            });

            const { result } = renderHook(() => useStudentSession(LESSON_ID));
            await waitFor(() => expect(result.current.view).toBe('active'));

            expect(result.current.responseCount).toBe(0);
        });

        // 73.3
        it('[US 1.30][UNIT3] success: submitAnotherResponse does nothing when allow_multiple_responses is false', async () => {
            (fetchStudentActiveDiscussionApi as jest.Mock).mockResolvedValue({
                data: makeDiscussion({ allow_multiple_responses: false }),
                error: null,
            });
            (submitStudentResponseApi as jest.Mock).mockResolvedValue({
                data: { id: 'r1', discussion_id: 'd-multi-1', response_text: 'test', created_at: new Date().toISOString(), selected_option: null, is_correct: null, flagged_at: null },
                error: null,
            });

            const { result } = renderHook(() => useStudentSession(LESSON_ID));
            await waitFor(() => expect(result.current.view).toBe('active'));

            // Submit first response
            await act(async () => {
                result.current.setResponseText('My answer');
            });
            await act(async () => {
                await result.current.submitResponse('My answer');
            });

            await waitFor(() => expect(result.current.view).toBe('submitted'));

            // Try submitAnotherResponse — should stay in submitted
            act(() => {
                result.current.submitAnotherResponse();
            });

            expect(result.current.view).toBe('submitted');
        });
    });

    // ── AC2: Multiple responses allowed ─────────────────────────────────

    describe('AC2: Multiple responses — students can submit more than once', () => {

        // 73.4
        it('[US 1.30][UNIT4] success: canSubmitAnother is true after submission with allow_multiple_responses', async () => {
            (fetchStudentActiveDiscussionApi as jest.Mock).mockResolvedValue({
                data: makeDiscussion({ allow_multiple_responses: true, response_limit: null }),
                error: null,
            });
            (submitStudentResponseApi as jest.Mock).mockResolvedValue({
                data: { id: 'r1', discussion_id: 'd-multi-1', response_text: 'test', created_at: new Date().toISOString(), selected_option: null, is_correct: null, flagged_at: null },
                error: null,
            });

            const { result } = renderHook(() => useStudentSession(LESSON_ID));
            await waitFor(() => expect(result.current.view).toBe('active'));

            await act(async () => {
                await result.current.submitResponse('First answer');
            });

            await waitFor(() => expect(result.current.view).toBe('submitted'));
            expect(result.current.canSubmitAnother).toBe(true);
        });

        // 73.5
        it('[US 1.30][UNIT5] success: submitAnotherResponse resets view to active', async () => {
            (fetchStudentActiveDiscussionApi as jest.Mock).mockResolvedValue({
                data: makeDiscussion({ allow_multiple_responses: true, response_limit: null }),
                error: null,
            });
            (submitStudentResponseApi as jest.Mock).mockResolvedValue({
                data: { id: 'r1', discussion_id: 'd-multi-1', response_text: 'test', created_at: new Date().toISOString(), selected_option: null, is_correct: null, flagged_at: null },
                error: null,
            });

            const { result } = renderHook(() => useStudentSession(LESSON_ID));
            await waitFor(() => expect(result.current.view).toBe('active'));

            await act(async () => {
                await result.current.submitResponse('First answer');
            });
            await waitFor(() => expect(result.current.view).toBe('submitted'));

            act(() => {
                result.current.submitAnotherResponse();
            });

            expect(result.current.view).toBe('active');
            expect(result.current.responseText).toBe('');
        });

        // 73.6
        it('[US 1.30][UNIT6] success: responseCount increments after each submission', async () => {
            (fetchStudentActiveDiscussionApi as jest.Mock).mockResolvedValue({
                data: makeDiscussion({ allow_multiple_responses: true, response_limit: null }),
                error: null,
            });
            (submitStudentResponseApi as jest.Mock).mockResolvedValue({
                data: { id: 'r1', discussion_id: 'd-multi-1', response_text: 'test', created_at: new Date().toISOString(), selected_option: null, is_correct: null, flagged_at: null },
                error: null,
            });

            const { result } = renderHook(() => useStudentSession(LESSON_ID));
            await waitFor(() => expect(result.current.view).toBe('active'));

            await act(async () => {
                await result.current.submitResponse('First answer');
            });
            await waitFor(() => expect(result.current.responseCount).toBe(1));

            act(() => { result.current.submitAnotherResponse(); });

            await act(async () => {
                await result.current.submitResponse('Second answer');
            });
            await waitFor(() => expect(result.current.responseCount).toBe(2));
        });

        // 73.7
        it('[US 1.30][UNIT7] success: canSubmitAnother is false for MC questions even with allow_multiple_responses', async () => {
            (fetchStudentActiveDiscussionApi as jest.Mock).mockResolvedValue({
                data: makeDiscussion({
                    allow_multiple_responses: true,
                    response_limit: null,
                    prompt_type: 'multiple_choice',
                    mc_options: [{ label: 'A', text: 'Opt A' }, { label: 'B', text: 'Opt B' }],
                    correct_option: 'A',
                }),
                error: null,
            });

            const { result } = renderHook(() => useStudentSession(LESSON_ID));
            await waitFor(() => expect(result.current.view).toBe('active'));

            expect(result.current.canSubmitAnother).toBe(false);
        });

        // 73.8
        it('[US 1.30][UNIT8] success: responseCount resets to 0 when new discussion is published', async () => {
            (fetchStudentActiveDiscussionApi as jest.Mock).mockResolvedValue({
                data: makeDiscussion({ allow_multiple_responses: true, response_limit: null }),
                error: null,
            });
            (submitStudentResponseApi as jest.Mock).mockResolvedValue({
                data: { id: 'r1', discussion_id: 'd-multi-1', response_text: 'test', created_at: new Date().toISOString(), selected_option: null, is_correct: null, flagged_at: null },
                error: null,
            });

            let publishedCb: (payload: unknown) => void = () => {};
            mockChannel.on.mockImplementation((_type: string, filter: { event: string }, cb: (payload: unknown) => void) => {
                if (filter.event === 'discussion:published') publishedCb = cb;
                return { unsubscribe: jest.fn() };
            });

            const { result } = renderHook(() => useStudentSession(LESSON_ID));
            await waitFor(() => expect(result.current.view).toBe('active'));

            // Submit a response
            await act(async () => {
                await result.current.submitResponse('An answer');
            });
            await waitFor(() => expect(result.current.responseCount).toBe(1));

            // New discussion published
            await act(async () => {
                publishedCb({
                    payload: {
                        discussion: makeDiscussion({ id: 'd-multi-2', allow_multiple_responses: true, response_limit: null }),
                    },
                });
            });

            expect(result.current.responseCount).toBe(0);
        });
    });

    // ── AC1: Response limit enforcement ─────────────────────────────────

    describe('AC1: Response limit — students are limited to configured number of submissions', () => {

        // 73.9
        it('[US 1.30][UNIT9] success: canSubmitAnother is true when responseCount < response_limit', async () => {
            (fetchStudentActiveDiscussionApi as jest.Mock).mockResolvedValue({
                data: makeDiscussion({ allow_multiple_responses: true, response_limit: 3 }),
                error: null,
            });
            (submitStudentResponseApi as jest.Mock).mockResolvedValue({
                data: { id: 'r1', discussion_id: 'd-multi-1', response_text: 'test', created_at: new Date().toISOString(), selected_option: null, is_correct: null, flagged_at: null },
                error: null,
            });

            const { result } = renderHook(() => useStudentSession(LESSON_ID));
            await waitFor(() => expect(result.current.view).toBe('active'));

            // Submit first response (1/3)
            await act(async () => {
                await result.current.submitResponse('First answer');
            });
            await waitFor(() => expect(result.current.view).toBe('submitted'));

            expect(result.current.responseCount).toBe(1);
            expect(result.current.canSubmitAnother).toBe(true);
        });

        // 73.10
        it('[US 1.30][UNIT10] success: canSubmitAnother becomes false when responseCount reaches response_limit', async () => {
            (fetchStudentActiveDiscussionApi as jest.Mock).mockResolvedValue({
                data: makeDiscussion({ allow_multiple_responses: true, response_limit: 2 }),
                error: null,
            });
            (submitStudentResponseApi as jest.Mock).mockResolvedValue({
                data: { id: 'r1', discussion_id: 'd-multi-1', response_text: 'test', created_at: new Date().toISOString(), selected_option: null, is_correct: null, flagged_at: null },
                error: null,
            });

            const { result } = renderHook(() => useStudentSession(LESSON_ID));
            await waitFor(() => expect(result.current.view).toBe('active'));

            // Submit response 1/2
            await act(async () => {
                await result.current.submitResponse('First');
            });
            await waitFor(() => expect(result.current.responseCount).toBe(1));
            expect(result.current.canSubmitAnother).toBe(true);

            // Go back to active
            act(() => { result.current.submitAnotherResponse(); });
            expect(result.current.view).toBe('active');

            // Submit response 2/2
            await act(async () => {
                await result.current.submitResponse('Second');
            });
            await waitFor(() => expect(result.current.responseCount).toBe(2));

            // Limit reached
            expect(result.current.canSubmitAnother).toBe(false);
        });

        // 73.11
        it('[US 1.30][UNIT11] success: submitAnotherResponse does nothing when limit is reached', async () => {
            (fetchStudentActiveDiscussionApi as jest.Mock).mockResolvedValue({
                data: makeDiscussion({ allow_multiple_responses: true, response_limit: 1 }),
                error: null,
            });
            (submitStudentResponseApi as jest.Mock).mockResolvedValue({
                data: { id: 'r1', discussion_id: 'd-multi-1', response_text: 'test', created_at: new Date().toISOString(), selected_option: null, is_correct: null, flagged_at: null },
                error: null,
            });

            const { result } = renderHook(() => useStudentSession(LESSON_ID));
            await waitFor(() => expect(result.current.view).toBe('active'));

            await act(async () => {
                await result.current.submitResponse('Only answer');
            });
            await waitFor(() => expect(result.current.view).toBe('submitted'));
            expect(result.current.responseCount).toBe(1);
            expect(result.current.canSubmitAnother).toBe(false);

            // Try to go back — should stay submitted
            act(() => { result.current.submitAnotherResponse(); });
            expect(result.current.view).toBe('submitted');
        });
    });
});
