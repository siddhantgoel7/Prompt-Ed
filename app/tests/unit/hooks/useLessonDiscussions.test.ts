import { renderHook, act } from '@testing-library/react';
import { useLessonDiscussions } from '@/hooks/useSessionPage/useLessonDiscussions';
import { 
  fetchDiscussionsApi, 
  insertDiscussionApi, 
  closeDiscussionApi, 
  fetchResponsesApi,
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

    it('success: handles manual response removal (flagging)', async () => {
        const activeDisc = { id: 'd1', status: 'active' };
        (fetchDiscussionsApi as jest.Mock).mockResolvedValue([activeDisc]);
        (fetchResponsesApi as jest.Mock).mockResolvedValue([
            { id: 'r1', content: 'hello' }
        ]);

        const { result } = renderHook(() => useLessonDiscussions(
            lessonId, mockChannel, clearAIState, '', setPromptInput, 'short_answer'
        ));

        await act(async () => {
            await result.current.fetchDiscussions();
            await result.current.fetchResponses();
        });

        expect(result.current.responses).toHaveLength(1);

        await act(async () => {
            await result.current.removeResponse('r1');
        });

        expect(result.current.responses).toHaveLength(0);
        expect(result.current.flaggedResponses).toHaveLength(1);
    });
});
