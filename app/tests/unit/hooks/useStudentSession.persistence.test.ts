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

describe('useStudentSession Persistence Refactor', () => {
    const lessonId = 'l1';
    let mockRouter: any;

    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        mockRouter = { push: jest.fn() };
        (useRouter as jest.Mock).mockReturnValue(mockRouter);
        (useRealtime as jest.Mock).mockReturnValue({ channel: null, isConnected: true });
    });

    it('successfully hydrates responseText from localStorage draft', async () => {
        (fetchLessonByIdApi as jest.Mock).mockResolvedValue({ data: { id: 'l1', status: 'active' }, error: null });
        (fetchStudentActiveDiscussionApi as jest.Mock).mockResolvedValue({ data: { id: 'd1', status: 'active' }, error: null });

        const storageKey = `student:${lessonId}:submitted-discussions`;
        // Set up the draft in localStorage
        localStorage.setItem(`${storageKey}:d1:draft`, JSON.stringify({ responseText: 'Recovered draft content' }));

        const { result } = renderHook(() => useStudentSession(lessonId));

        await waitFor(() => {
            expect(result.current.view).toBe('active');
        });

        expect(result.current.responseText).toBe('Recovered draft content');
    });

    it('successfully hydrates selectedOption from localStorage draft', async () => {
        (fetchLessonByIdApi as jest.Mock).mockResolvedValue({ data: { id: 'l1', status: 'active' }, error: null });
        (fetchStudentActiveDiscussionApi as jest.Mock).mockResolvedValue({ data: { id: 'd1', status: 'active', prompt_type: 'multiple_choice' }, error: null });

        const storageKey = `student:${lessonId}:submitted-discussions`;
        localStorage.setItem(`${storageKey}:d1:draft`, JSON.stringify({ selectedOption: 'B' }));

        const { result } = renderHook(() => useStudentSession(lessonId));

        await waitFor(() => {
            expect(result.current.view).toBe('active');
        });

        expect(result.current.selectedOption).toBe('B');
    });

    it('prefers submitted answer over draft if already submitted', async () => {
        (fetchLessonByIdApi as jest.Mock).mockResolvedValue({ data: { id: 'l1', status: 'active' }, error: null });
        (fetchStudentActiveDiscussionApi as jest.Mock).mockResolvedValue({ data: { id: 'd1', status: 'active' }, error: null });

        const storageKey = `student:${lessonId}:submitted-discussions`;
        // Mark as submitted
        localStorage.setItem(storageKey, JSON.stringify(['d1']));
        // Save the submitted response
        localStorage.setItem(`${storageKey}:d1:response`, JSON.stringify({ responseText: 'Final Answer' }));
        // Also have a draft (which should be ignored/cleared)
        localStorage.setItem(`${storageKey}:d1:draft`, JSON.stringify({ responseText: 'Stale draft' }));

        const { result } = renderHook(() => useStudentSession(lessonId));

        await waitFor(() => {
            expect(result.current.view).toBe('submitted');
        });

        expect(result.current.submittedAnswerText).toBe('Final Answer');
        expect(result.current.responseText).toBe(''); // Should be reset
    });
});
