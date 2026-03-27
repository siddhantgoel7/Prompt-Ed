/**
 * Tests for filesApi utility functions.
 * Covers fetchFilesApi, uploadFileApi, deleteFileApi, getFileDownloadUrlApi
 * — both success and error paths.
 */
import { fetchFilesApi, uploadFileApi, deleteFileApi, getFileDownloadUrlApi } from '@/lib/api/filesApi';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockOk(body: unknown) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as Response);
}
function mockFail(body: unknown = {}) {
  return Promise.resolve({ ok: false, json: () => Promise.resolve(body) } as Response);
}

describe('filesApi', () => {
  beforeEach(() => mockFetch.mockReset());

  // ── fetchFilesApi ────────────────────────────────────────────────────────

  describe('fetchFilesApi', () => {
    it('returns file list on success', async () => {
      const files = [{ id: 'f1', lessonId: 'l1', fileName: 'notes.pdf' }];
      mockFetch.mockReturnValue(mockOk(files));
      const result = await fetchFilesApi('l1');
      expect(result).toEqual(files);
      expect(mockFetch).toHaveBeenCalledWith('/api/lessons/l1/files');
    });

    it('throws on non-ok response', async () => {
      mockFetch.mockReturnValue(mockFail());
      await expect(fetchFilesApi('l1')).rejects.toThrow('Failed to fetch files');
    });
  });

  // ── uploadFileApi ────────────────────────────────────────────────────────

  describe('uploadFileApi', () => {
    it('resolves on success', async () => {
      mockFetch.mockReturnValue(mockOk({}));
      const file = new File(['content'], 'slides.pdf', { type: 'application/pdf' });
      await expect(uploadFileApi('l1', file)).resolves.toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/lessons/l1/upload',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('throws specific error message from response body', async () => {
      mockFetch.mockReturnValue(mockFail({ error: 'File too large' }));
      const file = new File(['content'], 'slides.pdf');
      await expect(uploadFileApi('l1', file)).rejects.toThrow('File too large');
    });

    it('throws fallback message when error field is missing', async () => {
      mockFetch.mockReturnValue(mockFail({}));
      const file = new File(['content'], 'slides.pdf');
      await expect(uploadFileApi('l1', file)).rejects.toThrow('Upload failed');
    });
  });

  // ── deleteFileApi ────────────────────────────────────────────────────────

  describe('deleteFileApi', () => {
    it('resolves on success', async () => {
      mockFetch.mockReturnValue(mockOk({}));
      await expect(deleteFileApi('l1', 'f1')).resolves.toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith('/api/lessons/l1/files/f1', { method: 'DELETE' });
    });

    it('throws on non-ok response', async () => {
      mockFetch.mockReturnValue(mockFail());
      await expect(deleteFileApi('l1', 'f1')).rejects.toThrow('Delete failed');
    });
  });

  // ── getFileDownloadUrlApi ────────────────────────────────────────────────

  describe('getFileDownloadUrlApi', () => {
    it('returns url and fileName on success', async () => {
      const payload = { url: 'https://example.com/file.pdf', fileName: 'notes.pdf' };
      mockFetch.mockReturnValue(mockOk(payload));
      const result = await getFileDownloadUrlApi('l1', 'f1');
      expect(result).toEqual(payload);
      expect(mockFetch).toHaveBeenCalledWith('/api/lessons/l1/files/f1');
    });

    it('throws on non-ok response', async () => {
      mockFetch.mockReturnValue(mockFail());
      await expect(getFileDownloadUrlApi('l1', 'f1')).rejects.toThrow('Failed to get download URL');
    });
  });
});
