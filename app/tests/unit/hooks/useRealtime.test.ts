/**
 * Tests for useRealtime hook.
 * Covers: initial state, SUBSCRIBED/CLOSED status handling, presence-based
 * student count, reconnect(), offline/online window events, and cleanup.
 */
import { renderHook, act } from '@testing-library/react';
import { useRealtime } from '@/lib/realtime/useRealtime';

// ── Mock Supabase channel ────────────────────────────────────────────────────

const mockPresenceState = jest.fn();
const mockTrack = jest.fn();
const mockUnsubscribe = jest.fn();

// Capture callbacks passed to channel.on / channel.subscribe for manual invocation
let capturedPresenceSync: (() => void) | null = null;
let capturedSubscribeCb: ((status: string) => Promise<void>) | null = null;

const mockChannel = {
  on: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: mockUnsubscribe,
  track: mockTrack,
  presenceState: mockPresenceState,
};

const mockSupabase = { channel: jest.fn() };

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => mockSupabase),
}));

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  capturedPresenceSync = null;
  capturedSubscribeCb = null;

  mockPresenceState.mockReturnValue({});
  mockTrack.mockResolvedValue(undefined);
  mockUnsubscribe.mockReset();

  // channel.on captures the presence-sync callback and chains (returns mockChannel)
  mockChannel.on.mockImplementation((type: string, event: Record<string, string>, cb: () => void) => {
    if (type === 'presence' && event.event === 'sync') capturedPresenceSync = cb;
    return mockChannel;
  });

  // channel.subscribe captures the status callback
  mockChannel.subscribe.mockImplementation((cb: (status: string) => Promise<void>) => {
    capturedSubscribeCb = cb;
  });

  mockSupabase.channel.mockReturnValue(mockChannel);
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useRealtime', () => {
  it('initialises with isConnected=false, channel=null, studentCount=0', () => {
    const { result } = renderHook(() => useRealtime('l1', 'instructor'));
    expect(result.current.isConnected).toBe(false);
    expect(result.current.channel).toBeNull();
    expect(result.current.studentCount).toBe(0);
  });

  it('sets isConnected=true and channel when SUBSCRIBED', async () => {
    const { result } = renderHook(() => useRealtime('l1', 'instructor'));
    await act(async () => { await capturedSubscribeCb?.('SUBSCRIBED'); });
    expect(result.current.isConnected).toBe(true);
    expect(result.current.channel).not.toBeNull();
  });

  it('sets isConnected=false and clears channel when CLOSED', async () => {
    const { result } = renderHook(() => useRealtime('l1', 'instructor'));
    await act(async () => { await capturedSubscribeCb?.('SUBSCRIBED'); });
    await act(async () => { await capturedSubscribeCb?.('CLOSED'); });
    expect(result.current.isConnected).toBe(false);
    expect(result.current.channel).toBeNull();
  });

  it('ignores unknown status strings without crashing', async () => {
    const { result } = renderHook(() => useRealtime('l1', 'instructor'));
    await act(async () => { await capturedSubscribeCb?.('CHANNEL_ERROR'); });
    expect(result.current.isConnected).toBe(false);
  });

  it('counts only students from presence state', async () => {
    // Two students and one instructor present
    mockPresenceState.mockReturnValue({
      u1: [{ role: 'student', joined_at: '' }],
      u2: [{ role: 'instructor', joined_at: '' }],
      u3: [{ role: 'student', joined_at: '' }],
    });
    const { result } = renderHook(() => useRealtime('l1', 'instructor'));
    await act(async () => { capturedPresenceSync?.(); });
    expect(result.current.studentCount).toBe(2);
  });

  it('reconnect() forces a re-subscribe by bumping the attempt counter', async () => {
    const { result } = renderHook(() => useRealtime('l1', 'instructor'));
    const callsBefore = (mockChannel.subscribe as jest.Mock).mock.calls.length;
    await act(async () => { result.current.reconnect(); });
    expect((mockChannel.subscribe as jest.Mock).mock.calls.length).toBeGreaterThan(callsBefore);
    expect(result.current.isConnected).toBe(false);
  });

  it('sets isConnected=false when the browser goes offline', () => {
    const { result } = renderHook(() => useRealtime('l1', 'instructor'));
    act(() => { window.dispatchEvent(new Event('offline')); });
    expect(result.current.isConnected).toBe(false);
  });

  it('triggers reconnect when the browser comes back online', async () => {
    const { result } = renderHook(() => useRealtime('l1', 'instructor'));
    const callsBefore = (mockChannel.subscribe as jest.Mock).mock.calls.length;
    await act(async () => { window.dispatchEvent(new Event('online')); });
    // Coming online bumps connectAttempt, which triggers a new subscribe
    expect((mockChannel.subscribe as jest.Mock).mock.calls.length).toBeGreaterThan(callsBefore);
    expect(result.current.isConnected).toBe(false); // not yet subscribed
  });

  it('unsubscribes and removes window listeners on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useRealtime('l1', 'instructor'));
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });
});
