import { renderHook, act, waitFor } from '@testing-library/react';
import { useStudentSession } from '@/hooks/useStudentSession';
import { useRouter } from 'next/navigation';
import { useRealtime } from '@/lib/realtime/useRealtime';
import { fetchLessonByIdApi } from '@/lib/api/lessonApi';
import { fetchStudentActiveDiscussionApi } from '@/lib/api/discussionsApi';

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

describe('useStudentSession', () => {
    const lessonId = 'l1';
    let mockRouter: any;
    let mockChannel: any;

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
    });

    it('success: boots and fetches lesson and active discussion', async () => {
        (fetchLessonByIdApi as jest.Mock).mockResolvedValue({ data: { id: 'l1', status: 'active' }, error: null });
        (fetchStudentActiveDiscussionApi as jest.Mock).mockResolvedValue({ data: { id: 'd1', status: 'active' }, error: null });

        const { result } = renderHook(() => useStudentSession(lessonId));

        await waitFor(() => {
            expect(result.current.view).toBe('active');
        });

        expect(result.current.lesson?.id).toBe('l1');
        expect(result.current.activeDiscussion?.id).toBe('d1');
    });

    it('failure: redirects if lesson not found or not active', async () => {
        (fetchLessonByIdApi as jest.Mock).mockResolvedValue({ data: null, error: { message: 'Not found' } });

        renderHook(() => useStudentSession(lessonId));

        await waitFor(() => {
            expect(mockRouter.push).toHaveBeenCalledWith('/');
        });
    });

    it('success: handles lesson:ended broadcast', async () => {
        (fetchLessonByIdApi as jest.Mock).mockResolvedValue({ data: { id: 'l1', status: 'active' }, error: null });
        (fetchStudentActiveDiscussionApi as jest.Mock).mockResolvedValue({ data: null, error: null });

        let lessonEndedCb: any;
        mockChannel.on.mockImplementation((type: string, filter: any, cb: any) => {
            if (filter.event === 'lesson:ended') lessonEndedCb = cb;
            return { unsubscribe: jest.fn() };
        });

        const { result } = renderHook(() => useStudentSession(lessonId));

        await waitFor(() => expect(result.current.view).toBe('waiting'));

        await act(async () => {
            lessonEndedCb({ payload: { message: 'Bye bye' } });
        });

        expect(result.current.view).toBe('ended');
        expect(result.current.endedMessage).toBe('Bye bye');
    });

    it('success: handles discussion:published broadcast', async () => {
        (fetchLessonByIdApi as jest.Mock).mockResolvedValue({ data: { id: 'l1', status: 'active' }, error: null });
        (fetchStudentActiveDiscussionApi as jest.Mock).mockResolvedValue({ data: null, error: null });

        let publishedCb: any;
        mockChannel.on.mockImplementation((type: string, filter: any, cb: any) => {
            if (filter.event === 'discussion:published') publishedCb = cb;
            return { unsubscribe: jest.fn() };
        });

        const { result } = renderHook(() => useStudentSession(lessonId));
        await waitFor(() => expect(result.current.view).toBe('waiting'));

        const newDisc = { 
            id: 'd2', 
            status: 'active', 
            time_limit_seconds: 60, 
            published_at: new Date().toISOString() 
        };

        await act(async () => {
            publishedCb({ payload: { discussion: newDisc } });
        });

        expect(result.current.view).toBe('active');
        expect(result.current.activeDiscussion?.id).toBe('d2');
        expect(result.current.timerTotalSeconds).toBe(60);
    });

    it('success: handles discussion:closed broadcast and auto-waits', async () => {
        jest.useFakeTimers();
        (fetchLessonByIdApi as jest.Mock).mockResolvedValue({ data: { id: 'l1', status: 'active' }, error: null });
        (fetchStudentActiveDiscussionApi as jest.Mock).mockResolvedValue({ data: { id: 'd1', status: 'active' }, error: null });

        let closedCb: any;
        mockChannel.on.mockImplementation((type: string, filter: any, cb: any) => {
            if (filter.event === 'discussion:closed') closedCb = cb;
            return { unsubscribe: jest.fn() };
        });

        const { result } = renderHook(() => useStudentSession(lessonId));
        await waitFor(() => expect(result.current.view).toBe('active'));

        await act(async () => {
            closedCb({ payload: { discussionId: 'd1' } });
        });

        // If not expired, should immediately go to waiting
        expect(result.current.view).toBe('waiting');
        expect(result.current.activeDiscussion?.status).toBe('closed');
        jest.useRealTimers();
    });
});
