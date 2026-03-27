/**
 * Tests for useAudioRecorder hook.
 * Covers: initial state, start recording (opus mimeType path, webm fallback path,
 * no mimeType path), getUserMedia error (catch block), stop recording,
 * stop when inactive, elapsed timer.
 */
import { renderHook, act } from '@testing-library/react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

// ── Mock MediaRecorder ────────────────────────────────────────────────────────

class MockMediaRecorder {
  state = 'inactive';
  mimeType = '';
  ondataavailable: ((e: { data: { size: number } }) => void) | null = null;
  onstop: (() => void) | null = null;
  stream: { getTracks: () => { stop: () => void }[] };

  constructor(stream: any, opts?: { mimeType?: string }) {
    this.stream = stream;
    this.mimeType = opts?.mimeType ?? '';
  }

  start() { this.state = 'recording'; }
  stop() {
    this.state = 'inactive';
    this.onstop?.();
  }
}

const mockGetUserMedia = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();

  const mockStream = {
    getTracks: () => [{ stop: jest.fn() }],
  };
  mockGetUserMedia.mockResolvedValue(mockStream);

  Object.defineProperty(global.navigator, 'mediaDevices', {
    value: { getUserMedia: mockGetUserMedia },
    writable: true,
    configurable: true,
  });

  global.MediaRecorder = MockMediaRecorder as any;
});

afterEach(() => {
  jest.useRealTimers();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useAudioRecorder', () => {
  it('initialises with isRecording=false and elapsed=0', () => {
    const { result } = renderHook(() => useAudioRecorder());
    expect(result.current.isRecording).toBe(false);
    expect(result.current.elapsed).toBe(0);
  });

  it('starts recording with opus mimeType when supported', async () => {
    (MockMediaRecorder as any).isTypeSupported = jest.fn((type: string) => type === 'audio/webm;codecs=opus');
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => { await result.current.start(); });

    expect(result.current.isRecording).toBe(true);
  });

  it('starts recording with webm fallback when opus is not supported', async () => {
    (MockMediaRecorder as any).isTypeSupported = jest.fn((type: string) => type === 'audio/webm');
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => { await result.current.start(); });

    expect(result.current.isRecording).toBe(true);
  });

  it('starts recording with no mimeType when neither format is supported', async () => {
    (MockMediaRecorder as any).isTypeSupported = jest.fn(() => false);
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => { await result.current.start(); });

    expect(result.current.isRecording).toBe(true);
  });

  it('shows alert and does not start when getUserMedia throws', async () => {
    mockGetUserMedia.mockRejectedValue(new Error('Permission denied'));
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => { await result.current.start(); });

    expect(result.current.isRecording).toBe(false);
    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Microphone access denied'));
    alertSpy.mockRestore();
  });

  it('increments elapsed every second while recording', async () => {
    (MockMediaRecorder as any).isTypeSupported = jest.fn(() => false);
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => { await result.current.start(); });
    act(() => { jest.advanceTimersByTime(3000); });

    expect(result.current.elapsed).toBe(3);
  });

  it('stops recording and returns a Blob', async () => {
    (MockMediaRecorder as any).isTypeSupported = jest.fn(() => false);
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => { await result.current.start(); });

    let blob!: Blob;
    await act(async () => { blob = await result.current.stop(); });

    expect(blob).toBeInstanceOf(Blob);
    expect(result.current.isRecording).toBe(false);
  });

  it('returns empty Blob when stop() called with no active recorder', async () => {
    const { result } = renderHook(() => useAudioRecorder());
    const blob = await result.current.stop();
    expect(blob.size).toBe(0);
  });
});
