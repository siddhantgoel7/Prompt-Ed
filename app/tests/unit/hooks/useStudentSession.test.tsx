import { renderHook, act } from '@testing-library/react';
import { useStudentSession } from '@/hooks/useStudentSession';
import { useRouter } from 'next/navigation';
import { useRealtime } from '@/lib/realtime/useRealtime';
import { 
  fetchLessonByIdApi, 
  fetchStudentActiveDiscussionApi, 
  submitStudentResponseApi 
} from '@/lib/api/lessonApi';
import { fetchStudentActiveDiscussionApi as fetchDiscApi, submitStudentResponseApi as submitApi } from '@/lib/api/discussionsApi';

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
    let mockRouter: any;
    let mockChannel: any;
    const lessonId = 'l1';

    beforeEach(() => {
        jest.clearAllMocks();
        mockRouter = { push: jest.fn() };
        (useRouter as jest.Mock).mockReturnValue(mockRouter);
        
        mockChannel = {
            on: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
            send: jest.fn().mockResolvedValue({}),
        };
        (useRealtime as jest.Mock).mockReturnValue({ channel: mockChannel, isConnected: true });

        // Mock localStorage
        Storage.prototype.getItem = jest.fn();
        Storage.prototype.setItem = jest.fn();
    });

    it('success: boots and enters waiting state when no active discussion', async () => {
        (fetchLessonByIdApi as jest.Mock).mockResolvedValue({ data: { id: 'l1', status: 'active' }, error: null });
        (fetchDiscApi as jest.Mock).mockResolvedValue({ data: null, error: null });

        const { result } = renderHook(() => useStudentSession(lessonId));

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        expect(result.current.view).toBe('waiting');
        expect(result.current.lesson?.id).toBe('l1');
    });

    it('success: boots and enters active state when discussion exists', async () => {
        (fetchLessonByIdApi as jest.Mock).mockResolvedValue({ data: { id: 'l1', status: 'active' }, error: null });
        (fetchDiscApi as jest.Mock).mockResolvedValue({ data: { id: 'd1', status: 'active', prompt_text: 'Q' }, error: null });

        const { result } = renderHook(() => useStudentSession(lessonId));

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        expect(result.current.view).toBe('active');
        expect(result.current.activeDiscussion?.id).toBe('d1');
    });

    it('success: handles discussion:published broadcast', async () => {
        (fetchLessonByIdApi as jest.Mock).mockResolvedValue({ data: { id: 'l1', status: 'active' }, error: null });
        (fetchDiscApi as jest.Mock).mockResolvedValue({ data: null, error: null });

        const { result } = renderHook(() => useStudentSession(lessonId));
        await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });

        // Simulate broadcast
        const callback = mockChannel.on.mock.calls.find((call: any) => call[1].event === 'discussion:published')[2];
        
        act(() => {
            callback({ payload: { discussion: { id: 'd2', status: 'active', time_limit_seconds: 60, published_at: new Date().toISOString() } } });
        });

        expect(result.current.view).toBe('active');
        expect(result.current.activeDiscussion?.id).toBe('d2');
        expect(result.current.timerTotalSeconds).toBe(60);
    });

    it('success: handles response submission and redirects instructor via broadcast', async () => {
        (fetchLessonByIdApi as jest.Mock).mockResolvedValue({ data: { id: 'l1', status: 'active' }, error: null });
        (fetchDiscApi as jest.Mock).mockResolvedValue({ data: { id: 'd1', status: 'active' }, error: null });
        (submitApi as jest.Mock).mockResolvedValue({ data: { id: 'r1', content: 'ans' }, error: null });

        const { result } = renderHook(() => useStudentSession(lessonId));
        await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });

        act(() => { result.current.setResponseText('ans'); });

        await act(async () => {
            await result.current.submitResponse();
        });

        expect(submitApi).toHaveBeenCalled();
        expect(mockChannel.send).toHaveBeenCalledWith(expect.objectContaining({ event: 'response:new' }));
        expect(result.current.view).toBe('submitted');
    });

    it('success: handles lesson:ended broadcast', async () => {
        (fetchLessonByIdApi as jest.Mock).mockResolvedValue({ data: { id: 'l1', status: 'active' }, error: null });
        (fetchDiscApi as jest.Mock).mockResolvedValue({ data: null, error: null });

        const { result } = renderHook(() => useStudentSession(lessonId));
        await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });

        const callback = mockChannel.on.mock.calls.find((call: any) => call[1].event === 'lesson:ended')[2];
        
        act(() => {
            callback({ payload: { message: 'Goodbye' } });
        });

        expect(result.current.view).toBe('ended');
        expect(result.current.endedMessage).toBe('Goodbye');
    });
});
