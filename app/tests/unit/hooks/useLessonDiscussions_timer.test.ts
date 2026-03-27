/**
 * Extra branch coverage for useLessonDiscussions hook.
 * Targets: the useEffect at lines 116-123 that sets timer state when
 * activeDiscussion has both time_limit_seconds and published_at.
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLessonDiscussions } from '@/hooks/useSessionPage/useLessonDiscussions';
import { fetchDiscussionsApi } from '@/lib/api/discussionsApi';

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

const mockChannel = {
  send: jest.fn().mockResolvedValue({}),
  on: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
};

describe('useLessonDiscussions (timer effect branches)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets timer state when active discussion has time_limit_seconds and published_at (lines 118-120)', async () => {
    const publishedAt = new Date().toISOString();
    (fetchDiscussionsApi as jest.Mock).mockResolvedValue([
      {
        id: 'd1',
        status: 'active',
        response_count: 0,
        time_limit_seconds: 60,
        published_at: publishedAt,
      },
    ]);

    const { result } = renderHook(() =>
      useLessonDiscussions('l1', mockChannel, jest.fn(), '', jest.fn(), 'short_answer')
    );

    await act(async () => {
      await result.current.fetchDiscussions();
    });

    // After fetchDiscussions, activeDiscussion has time_limit_seconds=60 and published_at set,
    // which triggers the useEffect (lines 117-121) setting timerEndTime and timerTotalSeconds.
    await waitFor(() => {
      expect(result.current.activeDiscussion?.id).toBe('d1');
    });

    // discussionTimerSeconds should be 60 (set by setTimerState inside the effect)
    expect(result.current.discussionTimerSeconds).toBe(60);
    expect(result.current.discussionTimerEndTime).not.toBeNull();
  });

  it('does NOT set timer when activeDiscussion has no time_limit_seconds', async () => {
    (fetchDiscussionsApi as jest.Mock).mockResolvedValue([
      { id: 'd1', status: 'active', response_count: 0, time_limit_seconds: null, published_at: null },
    ]);

    const { result } = renderHook(() =>
      useLessonDiscussions('l1', mockChannel, jest.fn(), '', jest.fn(), 'short_answer')
    );

    await act(async () => {
      await result.current.fetchDiscussions();
    });

    await waitFor(() => {
      expect(result.current.activeDiscussion?.id).toBe('d1');
    });

    expect(result.current.discussionTimerSeconds).toBeNull();
    expect(result.current.discussionTimerEndTime).toBeNull();
  });
});
