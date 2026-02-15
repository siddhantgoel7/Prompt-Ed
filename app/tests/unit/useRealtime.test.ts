import { renderHook, waitFor, act } from '@testing-library/react';
import { useRealtime } from '@/lib/realtime/useRealtime';
import { createMockRealtimeChannel } from '../../jest.setup';

// Mock the Supabase client
const mockChannel = createMockRealtimeChannel();
const mockChannelFn = jest.fn(() => mockChannel);
const mockCreateClient = jest.fn(() => ({
  channel: mockChannelFn
}));

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockCreateClient()
}));

describe('useRealtime Hook [US 1.34][US 2.06]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 26.1
  it('should create channel with correct lesson ID', () => {
    const lessonId = 'lesson-123';
    renderHook(() => useRealtime(lessonId, 'instructor'));

    expect(mockChannelFn).toHaveBeenCalledWith(
      `lesson:${lessonId}`,
      {
        config: {
          broadcast: { ack: true }
        }
      }
    );
  });

  // 26.2
  it('should subscribe to channel and set isConnected to true', async () => {
    const lessonId = 'lesson-123';
    const { result } = renderHook(() => useRealtime(lessonId, 'instructor'));

    // Initially not connected
    expect(result.current.isConnected).toBe(false);

    // Wait for subscription to complete
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  // 26.3
  it('should return channel reference after subscription', async () => {
    const lessonId = 'lesson-123';
    const { result } = renderHook(() => useRealtime(lessonId, 'instructor'));

    // Initially channel might be null
    await waitFor(() => {
      expect(result.current.channel).not.toBeNull();
    });

    expect(result.current.channel).toBe(mockChannel);
  });

  // 26.4
  it('should unsubscribe on unmount', () => {
    const lessonId = 'lesson-123';
    const { unmount } = renderHook(() => useRealtime(lessonId, 'instructor'));

    unmount();

    expect(mockChannel.unsubscribe).toHaveBeenCalled();
  });

  // 26.5
  it('should handle connection status change to CLOSED', async () => {
    const lessonId = 'lesson-123';
    const { result } = renderHook(() => useRealtime(lessonId, 'instructor'));

    // Wait for initial subscription
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Simulate closing the channel wrapped in act
    await act(async () => {
      mockChannel.unsubscribe();
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
    });
  });

  // 26.6
  it('should create new channel when lessonId changes', () => {
    const { rerender } = renderHook(
      ({ id }) => useRealtime(id, 'instructor'),
      { initialProps: { id: 'lesson-123' } }
    );

    expect(mockChannelFn).toHaveBeenCalledWith('lesson:lesson-123', expect.any(Object));

    // Change lesson ID
    rerender({ id: 'lesson-456' });

    expect(mockChannelFn).toHaveBeenCalledWith('lesson:lesson-456', expect.any(Object));

    // Should unsubscribe from old channel
    expect(mockChannel.unsubscribe).toHaveBeenCalled();
  });

  // 26.7
  it('should not create channel if lessonId is empty', () => {
    const { result } = renderHook(() => useRealtime('', 'instructor'));

    expect(result.current.channel).toBeNull();
    expect(result.current.isConnected).toBe(false);
    expect(mockChannel.subscribe).not.toHaveBeenCalled();
  });

  // 26.8
  it('should work for both instructor and student roles', async () => {
    const lessonId = 'lesson-123';

    // Test instructor role
    const { result: instructorResult } = renderHook(() =>
      useRealtime(lessonId, 'instructor')
    );

    await waitFor(() => {
      expect(instructorResult.current.isConnected).toBe(true);
    });

    // Test student role
    const { result: studentResult } = renderHook(() =>
      useRealtime(lessonId, 'student')
    );

    await waitFor(() => {
      expect(studentResult.current.isConnected).toBe(true);
    });

    // Both should connect to the same channel
    expect(mockChannelFn).toHaveBeenCalledWith(`lesson:${lessonId}`, expect.any(Object));
  });
});