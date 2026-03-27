/**
 * Extra branch coverage for embedChunks.
 * Targets:
 *   - empty chunks early return (line 22 true branch)
 *   - update failure with undefined message (line 52: failed.error.message ?? '' null branch)
 *   - update failure with undefined code (line 53: failed.error.code ?? 'unknown' null branch)
 */
import { embedChunks } from '@/lib/ai/embedChunks';

describe('embedChunks (extra branches)', () => {
  let mockSupabase: any;
  let mockAI: any;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    };
    mockAI = {
      generateEmbedding: jest.fn().mockResolvedValue([[0.1, 0.2]]),
    };
  });

  it('returns immediately when chunks array is empty (line 22 true branch)', async () => {
    await embedChunks([], mockSupabase, mockAI);
    expect(mockAI.generateEmbedding).not.toHaveBeenCalled();
  });

  it('throws with "unknown" code and empty message when error has no message/code (lines 52-53)', async () => {
    // error object with no message or code fields
    mockSupabase.eq.mockResolvedValue({ error: {} });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(embedChunks([{ id: 'c1', content: 'c' }], mockSupabase, mockAI))
      .rejects.toThrow('Failed to store embeddings:');

    // Both ?? branches hit: message ?? '' → '' and code ?? 'unknown' → 'unknown'
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('EMBED_UPDATE_ERR [unknown]')
    );
    consoleSpy.mockRestore();
  });

  it('throws with "unknown" code in AI error catch when err.code is undefined (line 35)', async () => {
    const err = new Error('AI fail') as any;
    // err.code is undefined → takes 'unknown' branch in catch
    mockAI.generateEmbedding.mockRejectedValue(err);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(embedChunks([{ id: 'c1', content: 'c' }], mockSupabase, mockAI))
      .rejects.toThrow('AI fail');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('EMBED_ERR [unknown]')
    );
    consoleSpy.mockRestore();
  });
});
