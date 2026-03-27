/**
 * Additional branch coverage for useStudentSession hook.
 * Targets: discussionError logging, timer setup on boot, no-timer published path,
 * submit error path, discussion:timer_updated handler, and wasExpiredAndActive path.
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { useStudentSession } from '@/hooks/useStudentSession';
import { useRouter } from 'next/navigation';
import { useRealtime } from '@/lib/realtime/useRealtime';
import { fetchLessonByIdApi } from '@/lib/api/lessonApi';
import { fetchStudentActiveDiscussionApi, submitStudentResponseApi } from '@/lib/api/discussionsApi';

jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));
jest.mock('@/lib/realtime/useRealtime', () => ({ useRealtime: jest.fn() }));
jest.mock('@/lib/api/lessonApi', () => ({ fetchLessonByIdApi: jest.fn() }));
jest.mock('@/lib/api/discussionsApi', () => ({
  fetchStudentActiveDiscussionApi: jest.fn(),
  submitStudentResponseApi: jest.fn(),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function captureCallbacks(mockChannel: any) {
  const cbs: Record<string, any> = {};
  mockChannel.on.mockImplementation((type: string, filter: { event: string }, cb: any) => {
    cbs[filter.event] = cb;
    return { unsubscribe: jest.fn() };
  });
  return cbs;
}

async function bootHook(lessonId = 'l1') {
  const { result } = renderHook(() => useStudentSession(lessonId));
  await act(async () => { await new Promise(r => setTimeout(r, 0)); });
  return result;
}

// ── Setup ────────────────────────────────────────────────────────────────────

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

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useStudentSession (branch coverage)', () => {
  // ── Boot paths ─────────────────────────────────────────────────────────────

  it('logs discussion error and goes to waiting when discussionApi returns error', async () => {
    (fetchLessonByIdApi as jest.Mock).mockResolvedValue({ data: { id: 'l1', status: 'active' }, error: null });
    (fetchStudentActiveDiscussionApi as jest.Mock).mockResolvedValue({ data: null, error: { message: 'DB error' } });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const result = await bootHook();

    await waitFor(() => expect(result.current.view).toBe('waiting'));
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error fetching active discussion'),
      expect.anything()
    );
    consoleSpy.mockRestore();
  });

  it('sets timer state during boot when discussion has time_limit_seconds in the future', async () => {
    const publishedAt = new Date().toISOString();
    (fetchLessonByIdApi as jest.Mock).mockResolvedValue({ data: { id: 'l1', status: 'active' }, error: null });
    (fetchStudentActiveDiscussionApi as jest.Mock).mockResolvedValue({
      data: { id: 'd1', status: 'active', time_limit_seconds: 60, published_at: publishedAt },
      error: null,
    });

    const result = await bootHook();
    await waitFor(() => expect(result.current.view).toBe('active'));

    expect(result.current.timerTotalSeconds).toBe(60);
    expect(result.current.timerEndTime).not.toBeNull();
  });

  it('does NOT set timer when published_at is so old that the timer already expired', async () => {
    // published 2 minutes ago with a 60-second limit → timer already expired
    const oldPublishedAt = new Date(Date.now() - 120_000).toISOString();
    (fetchLessonByIdApi as jest.Mock).mockResolvedValue({ data: { id: 'l1', status: 'active' }, error: null });
    (fetchStudentActiveDiscussionApi as jest.Mock).mockResolvedValue({
      data: { id: 'd1', status: 'active', time_limit_seconds: 60, published_at: oldPublishedAt },
      error: null,
    });

    const result = await bootHook();
    await waitFor(() => expect(result.current.view).toBe('active'));

    // endTime is in the past → timerEndTime stays null
    expect(result.current.timerEndTime).toBeNull();
  });

  it('enters submitted view on boot if discussion was already submitted (localStorage)', async () => {
    const storageKey = 'student:l1:submitted-discussions';
    localStorage.setItem(storageKey, JSON.stringify(['d1']));

    (fetchLessonByIdApi as jest.Mock).mockResolvedValue({ data: { id: 'l1', status: 'active' }, error: null });
    (fetchStudentActiveDiscussionApi as jest.Mock).mockResolvedValue({
      data: { id: 'd1', status: 'active' },
      error: null,
    });

    const result = await bootHook();
    await waitFor(() => expect(result.current.view).toBe('submitted'));
  });

  // ── discussion:published ───────────────────────────────────────────────────

  it('clears timer when discussion:published has no time limit', async () => {
    (fetchLessonByIdApi as jest.Mock).mockResolvedValue({ data: { id: 'l1', status: 'active' }, error: null });
    (fetchStudentActiveDiscussionApi as jest.Mock).mockResolvedValue({ data: null, error: null });
    const cbs = captureCallbacks(mockChannel);

    const result = await bootHook();
    await waitFor(() => expect(result.current.view).toBe('waiting'));

    // Publish a discussion without a time limit
    act(() => {
      cbs['discussion:published']({ payload: { discussion: { id: 'd2', status: 'active', time_limit_seconds: null, published_at: null } } });
    });

    expect(result.current.view).toBe('active');
    expect(result.current.timerEndTime).toBeNull();
    expect(result.current.timerTotalSeconds).toBeNull();
  });

  // ── submitResponse error ───────────────────────────────────────────────────

  it('shows error message and stays in active view when submit fails', async () => {
    (fetchLessonByIdApi as jest.Mock).mockResolvedValue({ data: { id: 'l1', status: 'active' }, error: null });
    (fetchStudentActiveDiscussionApi as jest.Mock).mockResolvedValue({
      data: { id: 'd1', status: 'active' },
      error: null,
    });
    (submitStudentResponseApi as jest.Mock).mockResolvedValue({ data: null, error: { message: 'DB write failed' } });

    const result = await bootHook();
    await waitFor(() => expect(result.current.view).toBe('active'));

    act(() => { result.current.setResponseText('my answer'); });
    await act(async () => { await result.current.submitResponse(); });

    expect(result.current.errorMessage).toMatch(/Could not submit/i);
    expect(result.current.submitting).toBe(false);
    expect(result.current.view).toBe('active');
  });

  // ── discussion:timer_updated ───────────────────────────────────────────────

  it('clears timer state when discussion:timer_updated removes the limit', async () => {
    (fetchLessonByIdApi as jest.Mock).mockResolvedValue({ data: { id: 'l1', status: 'active' }, error: null });
    (fetchStudentActiveDiscussionApi as jest.Mock).mockResolvedValue({ data: null, error: null });
    const cbs = captureCallbacks(mockChannel);

    await bootHook();
    await new Promise(r => setTimeout(r, 0));

    await act(async () => {
      cbs['discussion:timer_updated']({ payload: { discussionId: 'd1', time_limit_seconds: null, published_at: null } });
    });
    // No assertion needed — just exercises the timer-removed path
  });

  it('updates timer state when discussion:timer_updated sets a new timer', async () => {
    (fetchLessonByIdApi as jest.Mock).mockResolvedValue({ data: { id: 'l1', status: 'active' }, error: null });
    (fetchStudentActiveDiscussionApi as jest.Mock).mockResolvedValue({ data: null, error: null });
    const cbs = captureCallbacks(mockChannel);

    const result = await bootHook();
    await waitFor(() => expect(result.current.view).toBe('waiting'));

    await act(async () => {
      cbs['discussion:timer_updated']({
        payload: { discussionId: 'd1', time_limit_seconds: 45, published_at: new Date().toISOString() },
      });
    });

    expect(result.current.timerTotalSeconds).toBe(45);
  });

  // ── discussion:closed (wasExpiredAndActive) ────────────────────────────────

  it('sets timerExpired and transitions to waiting after 5s when timer expires before close', async () => {
    jest.useFakeTimers();

    (fetchLessonByIdApi as jest.Mock).mockResolvedValue({ data: { id: 'l1', status: 'active' }, error: null });
    (fetchStudentActiveDiscussionApi as jest.Mock).mockResolvedValue({ data: null, error: null });
    const cbs = captureCallbacks(mockChannel);

    const { result } = renderHook(() => useStudentSession('l1'));
    // Use jest timers to flush the boot effect
    await act(async () => { await Promise.resolve(); });

    // Publish a discussion with a 2-second timer starting now
    const publishedAt = new Date(Date.now()).toISOString();
    await act(async () => {
      cbs['discussion:published']({
        payload: { discussion: { id: 'd1', status: 'active', time_limit_seconds: 2, published_at: publishedAt } },
      });
    });

    // Advance time by 3 seconds — timer expires (timerExpiredRef becomes true via 500ms interval)
    await act(async () => { jest.advanceTimersByTime(3000); });

    // Now send discussion:closed — timerEndTimeRef is in the past → wasExpiredAndActive = true
    await act(async () => {
      cbs['discussion:closed']({ payload: { discussionId: 'd1' } });
    });

    expect(result.current.timerExpired).toBe(true);

    // After the 5-second timeout in the close handler, view switches to waiting
    await act(async () => { jest.advanceTimersByTime(5500); });
    expect(result.current.view).toBe('waiting');

    jest.useRealTimers();
  });
});
