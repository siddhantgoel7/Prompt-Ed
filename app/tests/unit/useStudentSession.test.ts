import { renderHook, waitFor } from '@testing-library/react';
import { useStudentSession } from '@/hooks/useStudentSession';
import { useRealtime } from '@/lib/realtime/useRealtime';
import { fetchLessonByIdApi } from '@/lib/api/lessonApi';
import {
  fetchStudentActiveDiscussionApi,
  submitStudentResponseApi,
} from '@/lib/api/discussionsApi';

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

const useRealtimeMock = useRealtime as jest.MockedFunction<typeof useRealtime>;
const fetchLessonByIdApiMock = fetchLessonByIdApi as jest.MockedFunction<typeof fetchLessonByIdApi>;
const fetchStudentActiveDiscussionApiMock = fetchStudentActiveDiscussionApi as jest.MockedFunction<typeof fetchStudentActiveDiscussionApi>;
const submitStudentResponseApiMock = submitStudentResponseApi as jest.MockedFunction<typeof submitStudentResponseApi>;

const LESSON_ID = 'lesson-1';
const STORAGE_KEY = `student:${LESSON_ID}:submitted-discussions`;

const activeLesson = {
  id: LESSON_ID,
  title: 'Lesson',
  course_id: 'course-1',
  status: 'active',
  pin_code: '123456',
  created_at: '2026-03-01T10:00:00Z',
} as any;

const activeDiscussion = {
  id: 'discussion-1',
  lesson_id: LESSON_ID,
  prompt_text: 'What is 2 + 2?',
  prompt_type: 'short_answer',
  status: 'active',
  created_at: '2026-03-01T10:05:00Z',
  published_at: '2026-03-01T10:05:00Z',
  closed_at: null,
  display_order: 1,
  source: null,
  mc_options: null,
  correct_option: null,
  feedback_enabled: false,
  ai_generated_correct_option: null,
  participant_snapshot: null,
} as any;

describe('useStudentSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    useRealtimeMock.mockReturnValue({
      channel: null,
      isConnected: true,
      reconnect: jest.fn(),
      studentCount: 0,
    } as any);

    fetchLessonByIdApiMock.mockResolvedValue({
      data: activeLesson,
      error: null,
    } as any);

    fetchStudentActiveDiscussionApiMock.mockResolvedValue({
      data: activeDiscussion,
      error: null,
    } as any);
  });

  it('restores submitted view on boot when this discussion was already submitted in browser storage', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([activeDiscussion.id]));

    const { result } = renderHook(() => useStudentSession(LESSON_ID));

    await waitFor(() => {
      expect(result.current.view).toBe('submitted');
    });
  });

  it('keeps active view when storage has a different discussion id', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['different-discussion-id']));

    const { result } = renderHook(() => useStudentSession(LESSON_ID));

    await waitFor(() => {
      expect(result.current.view).toBe('active');
    });
  });

  it('persists submission and stays submitted after remount (refresh simulation)', async () => {
    submitStudentResponseApiMock.mockResolvedValue({
      data: {
        id: 'response-1',
        discussion_id: activeDiscussion.id,
        response_text: '4',
        selected_option: null,
        is_correct: null,
        created_at: '2026-03-01T10:06:00Z',
      },
      error: null,
    } as any);

    const firstMount = renderHook(() => useStudentSession(LESSON_ID));

    await waitFor(() => {
      expect(firstMount.result.current.view).toBe('active');
    });

    void firstMount.result.current.submitResponse('4');

    await waitFor(() => {
      expect(submitStudentResponseApiMock).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(firstMount.result.current.view).toBe('submitted');
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as string[];
    expect(stored).toContain(activeDiscussion.id);

    firstMount.unmount();

    const secondMount = renderHook(() => useStudentSession(LESSON_ID));

    await waitFor(() => {
      expect(secondMount.result.current.view).toBe('submitted');
    });
  });
});
