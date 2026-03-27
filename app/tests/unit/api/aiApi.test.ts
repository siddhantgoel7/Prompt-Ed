/**
 * Tests for aiApi utility functions.
 * Covers generateCandidatesApi, transcribeAudioApi, generateGeneralQuestionsApi,
 * fetchGeneralQuestionsApi — both success and error paths.
 */
import { generateCandidatesApi, transcribeAudioApi, generateGeneralQuestionsApi, fetchGeneralQuestionsApi } from '@/lib/api/aiApi';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockOk(body: unknown) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as Response);
}
function mockFail(body: unknown) {
  return Promise.resolve({ ok: false, json: () => Promise.resolve(body) } as Response);
}

describe('aiApi', () => {
  beforeEach(() => mockFetch.mockReset());

  // ── generateCandidatesApi ────────────────────────────────────────────────

  describe('generateCandidatesApi', () => {
    it('returns candidates on success', async () => {
      const candidates = { candidates: [], model: 'gpt-4o', tokenUsage: null };
      mockFetch.mockReturnValue(mockOk(candidates));
      const result = await generateCandidatesApi('l1', 'short_answer', 'text');
      expect(result).toEqual(candidates);
      expect(mockFetch).toHaveBeenCalledWith('/api/lessons/l1/generate', expect.objectContaining({ method: 'POST' }));
    });

    it('throws on non-ok response with error message', async () => {
      mockFetch.mockReturnValue(mockFail({ error: 'Generation failed' }));
      await expect(generateCandidatesApi('l1', 'short_answer', '')).rejects.toThrow('Generation failed');
    });

    it('throws fallback message when error field missing', async () => {
      mockFetch.mockReturnValue(mockFail({}));
      await expect(generateCandidatesApi('l1', 'short_answer', '')).rejects.toThrow('Generation failed');
    });

    it('passes preferencesOverride in body', async () => {
      mockFetch.mockReturnValue(mockOk({ candidates: [] }));
      const prefs = { difficulty: 'easy' as const, style: 'conceptual' as const, length: 'short' as const, focusAreas: [] };
      await generateCandidatesApi('l1', 'short_answer', '', prefs);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.preferencesOverride).toEqual(prefs);
    });
  });

  // ── transcribeAudioApi ───────────────────────────────────────────────────

  describe('transcribeAudioApi', () => {
    it('returns transcript on success', async () => {
      mockFetch.mockReturnValue(mockOk({ transcript: 'Hello world' }));
      const result = await transcribeAudioApi('l1', new Blob(['audio']));
      expect(result).toBe('Hello world');
    });

    it('throws on non-ok response', async () => {
      mockFetch.mockReturnValue(mockFail({ error: 'Transcription failed' }));
      await expect(transcribeAudioApi('l1', new Blob(['audio']))).rejects.toThrow('Transcription failed');
    });

    it('throws fallback message when error field missing', async () => {
      mockFetch.mockReturnValue(mockFail({}));
      await expect(transcribeAudioApi('l1', new Blob())).rejects.toThrow('Transcription failed');
    });
  });

  // ── generateGeneralQuestionsApi ──────────────────────────────────────────

  describe('generateGeneralQuestionsApi', () => {
    it('returns questions on success', async () => {
      const payload = { questions: [{ id: 'q1' }], warning: undefined };
      mockFetch.mockReturnValue(mockOk(payload));
      const result = await generateGeneralQuestionsApi('l1');
      expect(result.questions).toHaveLength(1);
    });

    it('throws on non-ok response', async () => {
      mockFetch.mockReturnValue(mockFail({ error: 'No materials' }));
      await expect(generateGeneralQuestionsApi('l1')).rejects.toThrow('No materials');
    });

    it('throws fallback message when error field missing', async () => {
      mockFetch.mockReturnValue(mockFail({}));
      await expect(generateGeneralQuestionsApi('l1')).rejects.toThrow('Failed to generate general questions');
    });
  });

  // ── fetchGeneralQuestionsApi ─────────────────────────────────────────────

  describe('fetchGeneralQuestionsApi', () => {
    it('returns questions array on success', async () => {
      mockFetch.mockReturnValue(mockOk({ questions: [{ id: 'q1' }, { id: 'q2' }] }));
      const result = await fetchGeneralQuestionsApi('l1');
      expect(result).toHaveLength(2);
    });

    it('throws on non-ok response', async () => {
      mockFetch.mockReturnValue(mockFail({ error: 'Not found' }));
      await expect(fetchGeneralQuestionsApi('l1')).rejects.toThrow('Not found');
    });

    it('throws fallback message when error field missing', async () => {
      mockFetch.mockReturnValue(mockFail({}));
      await expect(fetchGeneralQuestionsApi('l1')).rejects.toThrow('Failed to fetch general questions');
    });
  });
});
