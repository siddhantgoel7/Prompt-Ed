import { renderHook, act, waitFor } from '@testing-library/react';
import { useLessonDiscussions } from '@/hooks/useSessionPage/useLessonDiscussions';
import { 
  fetchDiscussionsApi, 
  insertDiscussionApi, 
  closeDiscussionApi, 
  fetchResponsesApi,
  fetchFlaggedResponsesApi,
  updateParticipantSnapshotApi
} from '@/lib/api/discussionsApi';

jest.mock('@/lib/api/discussionsApi', () => ({
  fetchDiscussionsApi: jest.fn(),
  insertDiscussionApi: jest.fn(),
  closeDiscussionApi: jest.fn(),
  fetchResponsesApi: jest.fn(),
  fetchFlaggedResponsesApi: jest.fn().mockResolvedValue([]),
  updateParticipantSnapshotApi: jest.fn(),
  updateDiscussionTimerApi: jest.fn(),
  flagResponseApi: jest.fn(),
  unflagResponseApi: jest.fn(),
}));

describe('useLessonDiscussions', () => {
    let mockChannel: any;
    const lessonId = 'l1';
    const clearAIState = jest.fn();
    const setPromptInput = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        mockChannel = {
            send: jest.fn().mockResolvedValue({}),
            on: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
        };
    });

    it('success: fetches discussions and sets active one', async () => {
        const mockData = [
            { id: 'd1', status: 'active', response_count: 5 },
            { id: 'd2', status: 'closed', response_count: 10 }
        ];
        (fetchDiscussionsApi as jest.Mock).mockResolvedValue(mockData);

        const { result } = renderHook(() => useLessonDiscussions(
            lessonId, mockChannel, clearAIState, '', setPromptInput, 'short_answer'
        ));

        await act(async () => {
            await result.current.fetchDiscussions();
        });

        expect(result.current.discussions).toHaveLength(2);
        expect(result.current.activeDiscussion?.id).toBe('d1');
    });

    it('success: publishes a new discussion and closes the active one', async () => {
        const activeDisc = { id: 'd1', status: 'active' };
        (fetchDiscussionsApi as jest.Mock).mockResolvedValue([activeDisc]);
        (insertDiscussionApi as jest.Mock).mockResolvedValue({ id: 'd2', status: 'active', published_at: new Date().toISOString() });

        const { result } = renderHook(() => useLessonDiscussions(
            lessonId, mockChannel, clearAIState, 'New Prompt', setPromptInput, 'short_answer'
        ));

        // Initial fetch to set activeDiscussion
        await act(async () => {
            await result.current.fetchDiscussions();
        });

        await act(async () => {
            await result.current.handlePublishDiscussion();
        });

        expect(closeDiscussionApi).toHaveBeenCalledWith('d1');
        expect(insertDiscussionApi).toHaveBeenCalled();
        expect(mockChannel.send).toHaveBeenCalledWith(expect.objectContaining({ event: 'discussion:published' }));
    });

    it('success: tracks peak student count and saves on close', async () => {
        const { result, rerender } = renderHook(({ studentCount }) => useLessonDiscussions(
            lessonId, mockChannel, clearAIState, '', setPromptInput, 'short_answer', studentCount
        ), {
            initialProps: { studentCount: 10 }
        });

        const activeDisc = { id: 'd1', status: 'active' };
        (fetchDiscussionsApi as jest.Mock).mockResolvedValue([activeDisc]);
        await act(async () => { await result.current.fetchDiscussions(); });

        // Simulate student count growing
        rerender({ studentCount: 25 });
        
        // Wait for queueMicrotask to update peakStudentCount state
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        expect(result.current.peakStudentCount).toBe(25);

        await act(async () => {
            await result.current.handleCloseDiscussion('d1');
        });

        expect(updateParticipantSnapshotApi).toHaveBeenCalledWith('d1', 25);
    });

    it('success: handles manual response removal and restoration', async () => {
        (fetchDiscussionsApi as jest.Mock).mockResolvedValue([{ id: 'd1', status: 'active' }]);
        (fetchResponsesApi as jest.Mock).mockResolvedValue([{ id: 'r1', content: 'hello', discussion_id: 'd1' }]);
        (fetchFlaggedResponsesApi as jest.Mock).mockResolvedValue([]);

        const { result } = renderHook(() => useLessonDiscussions(
            lessonId, mockChannel, clearAIState, '', setPromptInput, 'short_answer'
        ));

        await act(async () => {
            await result.current.fetchDiscussions();
        });

        expect(result.current.responses).toHaveLength(1);

        await act(async () => {
            await result.current.removeResponse('r1');
        });

        expect(result.current.responses).toHaveLength(0);
        expect(result.current.flaggedResponses).toHaveLength(1);

        await act(async () => {
            await result.current.restoreResponse('r1');
        });

        expect(result.current.responses).toHaveLength(1);
        expect(result.current.flaggedResponses).toHaveLength(0);
    });

    it('success: handles realtime broadasts for new responses', async () => {
        let broadcastCallback: any;
        mockChannel.on.mockImplementation((type: string, filter: any, cb: any) => {
            if (filter.event === 'response:new') broadcastCallback = cb;
            return { unsubscribe: jest.fn() };
        });

        const { result } = renderHook(() => useLessonDiscussions(
            lessonId, mockChannel, clearAIState, '', setPromptInput, 'short_answer'
        ));

        // Ensure the effect has run and registered the listener
        await waitFor(() => {
            if (!broadcastCallback) throw new Error('not yet');
        });

        await act(async () => {
            broadcastCallback({ payload: { response: { id: 'r_new', content: 'realtime!', discussion_id: 'd1' } } });
        });

        await waitFor(() => {
            expect(result.current.responses).toHaveLength(1);
        }, { timeout: 1000 });
        expect(result.current.responses[0].id).toBe('r_new');
    });

    it('success: publishes AI candidate with timer and MC options', async () => {
        const candidate = {
            promptText: 'AI Q',
            promptType: 'multiple_choice' as const,
            mcOptions: [
                { label: 'A' as const, text: 'Opt A', is_correct: true },
                { label: 'B' as const, text: 'Opt B', is_correct: false }
            ]
        };
        (insertDiscussionApi as jest.Mock).mockResolvedValue({ 
            id: 'd_ai', 
            status: 'active', 
            published_at: new Date().toISOString(),
            prompt_text: 'AI Q',
            prompt_type: 'multiple_choice'
        });

        const { result } = renderHook(() => useLessonDiscussions(
            lessonId, mockChannel, clearAIState, '', setPromptInput, 'multiple_choice'
        ));

        await act(async () => {
            await result.current.handlePublishAiCandidate(candidate, 'B', true, 60);
        });

        expect(insertDiscussionApi).toHaveBeenCalledWith(expect.objectContaining({
            prompt_text: 'AI Q',
            correct_option: 'B',
            time_limit_seconds: 60
        }));
        expect(result.current.activeDiscussion?.id).toBe('d_ai');
        expect(result.current.discussionTimerSeconds).toBe(60);
    });

    it('success: handles timer extension and editing', async () => {
        const published_at = new Date().toISOString();
        const activeDisc = { id: 'd1', status: 'active', published_at };
        (fetchDiscussionsApi as jest.Mock).mockResolvedValue([activeDisc]);

        const { result } = renderHook(() => useLessonDiscussions(
            lessonId, mockChannel, clearAIState, '', setPromptInput, 'short_answer'
        ));

        await act(async () => {
            await result.current.fetchDiscussions();
        });

        // Set initial timer via publish simulate (or just call extend directly)
        await act(async () => {
            await result.current.handleExtendTimer(30);
        });
        expect(result.current.discussionTimerSeconds).toBe(30);

        await act(async () => {
            await result.current.handleEditTimer(120);
        });
        expect(result.current.discussionTimerSeconds).toBe(120);

        await act(async () => {
            await result.current.handleEditTimer(null);
        });
        expect(result.current.discussionTimerSeconds).toBeNull();
    });

    it('success: auto-closes discussion when timer expires', async () => {
        jest.useFakeTimers();
        const published_at = new Date().toISOString();
        const activeDisc = { id: 'd1', status: 'active', published_at };
        (fetchDiscussionsApi as jest.Mock).mockResolvedValue([activeDisc]);
        (insertDiscussionApi as jest.Mock).mockResolvedValue(activeDisc);

        const { result } = renderHook(() => useLessonDiscussions(
            lessonId, mockChannel, clearAIState, 'Prompt', setPromptInput, 'short_answer'
        ));

        await act(async () => {
            await result.current.handlePublishDiscussion(10);
        });

        expect(result.current.discussionTimerEndTime).toBeGreaterThan(0);

        // Fast-forward 11 seconds
        await act(async () => {
            jest.advanceTimersByTime(11000);
        });

        expect(closeDiscussionApi).toHaveBeenCalledWith('d1');
        jest.useRealTimers();
    });
});
