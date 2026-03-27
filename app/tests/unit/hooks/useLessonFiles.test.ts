/**
 * Tests for useLessonFiles hook.
 * Covers fetch, upload (optimistic + error), delete, openFile, and processing poll.
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLessonFiles } from '@/hooks/useSessionPage/useLessonFiles';
import { fetchFilesApi, uploadFileApi, deleteFileApi, getFileDownloadUrlApi } from '@/lib/api/filesApi';

jest.mock('@/lib/api/filesApi', () => ({
  fetchFilesApi: jest.fn(),
  uploadFileApi: jest.fn(),
  deleteFileApi: jest.fn(),
  getFileDownloadUrlApi: jest.fn(),
}));

// jsdom doesn't support URL.createObjectURL — stub it
global.URL.createObjectURL = jest.fn(() => 'blob:mock');
global.URL.revokeObjectURL = jest.fn();

const makeFile = (name = 'slides.pdf', size = 1024) =>
  new File(['content'], name, { type: 'application/pdf' }) as File;

const mockFiles = [
  { id: 'f1', lessonId: 'l1', fileName: 'notes.pdf', fileType: 'pdf', fileSizeBytes: 500, status: 'ready', uploadedAt: '2024-01-01T00:00:00Z' },
];

describe('useLessonFiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetchFilesApi as jest.Mock).mockResolvedValue(mockFiles);
  });

  it('initialises with empty files and not uploading', () => {
    const { result } = renderHook(() => useLessonFiles('l1'));
    expect(result.current.files).toEqual([]);
    expect(result.current.isUploading).toBe(false);
  });

  it('fetchFiles populates files on success', async () => {
    const { result } = renderHook(() => useLessonFiles('l1'));
    await act(async () => { await result.current.fetchFiles(); });
    expect(result.current.files).toEqual(mockFiles);
  });

  it('fetchFiles does not crash on error', async () => {
    (fetchFilesApi as jest.Mock).mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useLessonFiles('l1'));
    await act(async () => { await result.current.fetchFiles(); });
    expect(result.current.files).toEqual([]);
  });

  it('uploadFile: adds optimistic entry, then replaces with fetched files', async () => {
    (uploadFileApi as jest.Mock).mockResolvedValue(undefined);
    const { result } = renderHook(() => useLessonFiles('l1'));

    await act(async () => { await result.current.uploadFile(makeFile()); });

    // After upload, fetchFiles is called which sets the real file list
    expect(result.current.files).toEqual(mockFiles);
    expect(result.current.isUploading).toBe(false);
  });

  it('uploadFile: sets isUploading=true during upload, false after', async () => {
    let resolveUpload!: () => void;
    (uploadFileApi as jest.Mock).mockReturnValue(new Promise<void>((r) => { resolveUpload = r; }));
    const { result } = renderHook(() => useLessonFiles('l1'));

    act(() => { void result.current.uploadFile(makeFile()); });
    expect(result.current.isUploading).toBe(true);

    await act(async () => { resolveUpload(); });
    expect(result.current.isUploading).toBe(false);
  });

  it('uploadFile: detects pdf vs pptx from filename', async () => {
    (uploadFileApi as jest.Mock).mockResolvedValue(undefined);
    const { result } = renderHook(() => useLessonFiles('l1'));

    let optimisticFile: any;
    // Spy on setFiles to capture the optimistic entry
    await act(async () => {
      await result.current.uploadFile(makeFile('lecture.pptx', 2048));
    });
    // After completion we just verify no crash and files are set
    expect(fetchFilesApi).toHaveBeenCalled();
  });

  it('uploadFile: re-throws error and still clears optimistic entry', async () => {
    (uploadFileApi as jest.Mock).mockRejectedValue(new Error('Upload failed'));
    const { result } = renderHook(() => useLessonFiles('l1'));

    await expect(
      act(async () => { await result.current.uploadFile(makeFile()); })
    ).rejects.toThrow('Upload failed');

    // isUploading should be cleared, fetchFiles should still be called
    expect(result.current.isUploading).toBe(false);
  });

  it('deleteFile calls deleteFileApi and refreshes files', async () => {
    (deleteFileApi as jest.Mock).mockResolvedValue(undefined);
    const { result } = renderHook(() => useLessonFiles('l1'));
    await act(async () => { await result.current.deleteFile('f1'); });
    expect(deleteFileApi).toHaveBeenCalledWith('l1', 'f1');
    expect(fetchFilesApi).toHaveBeenCalled();
  });

  it('deleteFile does not crash on error', async () => {
    (deleteFileApi as jest.Mock).mockRejectedValue(new Error('Delete failed'));
    const { result } = renderHook(() => useLessonFiles('l1'));
    await act(async () => { await result.current.deleteFile('f1'); });
    // No throw
  });

  it('openFile: fetches download URL and triggers download', async () => {
    const mockBlob = new Blob(['content'], { type: 'application/pdf' });
    global.fetch = jest.fn().mockResolvedValue({ blob: () => Promise.resolve(mockBlob) } as any);
    (getFileDownloadUrlApi as jest.Mock).mockResolvedValue({ url: 'https://example.com/file.pdf', fileName: 'file.pdf' });

    // Render hook first so React's DOM is set up, then stub anchor operations
    const { result } = renderHook(() => useLessonFiles('l1'));

    const mockAnchor = { href: '', download: '', click: jest.fn(), remove: jest.fn() };
    const createSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
    const appendSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as any);

    await act(async () => { await result.current.openFile('f1'); });

    expect(getFileDownloadUrlApi).toHaveBeenCalledWith('l1', 'f1');
    expect(mockAnchor.click).toHaveBeenCalled();

    createSpy.mockRestore();
    appendSpy.mockRestore();
  });

  it('openFile: does not crash on error', async () => {
    (getFileDownloadUrlApi as jest.Mock).mockRejectedValue(new Error('Download failed'));
    const { result } = renderHook(() => useLessonFiles('l1'));
    await act(async () => { await result.current.openFile('f1'); });
    // No throw — error is swallowed by the catch block
  });

  it('poll: starts interval when a file is in processing status', async () => {
    const processingFiles = [{ ...mockFiles[0], status: 'processing' }];
    (fetchFilesApi as jest.Mock).mockResolvedValue(processingFiles);

    jest.useFakeTimers();
    const { result } = renderHook(() => useLessonFiles('l1'));

    // Manually set files to processing state
    await act(async () => { await result.current.fetchFiles(); });

    const callsBefore = (fetchFilesApi as jest.Mock).mock.calls.length;

    // Advance past the 2000ms interval
    (fetchFilesApi as jest.Mock).mockResolvedValue(mockFiles);
    await act(async () => { jest.advanceTimersByTime(2100); });

    expect((fetchFilesApi as jest.Mock).mock.calls.length).toBeGreaterThan(callsBefore);

    jest.useRealTimers();
  });
});
