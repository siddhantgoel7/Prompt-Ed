/**
 * Extra branch coverage for generatePrompts.
 * Targets:
 *   - focusAreas retrieval when transcript is empty and retrieval returns nothing (lines 54-57)
 *   - parseAIResponse: object with non-'candidates' array key (lines 110-111)
 *   - parseAIResponse: object with no array key → fallback (line 114)
 *   - parseAIResponse: MC candidate with empty/missing mcOptions (lines 139-140)
 */
import { generatePrompts } from '@/lib/ai/generatePrompts';
import {
  retrieveChunksBySimilarity,
  retrieveRecentChunks,
  blendEmbeddings,
  normalizeEmbedding,
} from '@/lib/ai/retrieveChunks';

jest.mock('@/lib/ai/retrieveChunks', () => ({
  retrieveChunksBySimilarity: jest.fn(),
  retrieveRecentChunks: jest.fn(),
  blendEmbeddings: jest.fn(),
  normalizeEmbedding: jest.fn(),
}));

jest.mock('@/lib/ai/prompts/discussionPrompt', () => ({
  buildSystemPrompt: jest.fn(() => 'system prompt'),
  buildUserPrompt: jest.fn(() => 'user prompt'),
  CANDIDATE_COUNT: 5,
  TEMPERATURE_BY_TYPE: { short_answer: 0.7, multiple_choice: 0.2 },
}));

jest.mock('@/lib/utils/random', () => ({
  secureRandom: jest.fn(() => 0.5),
  secureShuffle: jest.fn((arr: any[]) => arr),
}));

describe('generatePrompts (extra branches)', () => {
  let mockSupabase: any;
  let mockAI: any;

  beforeEach(() => {
    // resetAllMocks clears queued mockResolvedValueOnce() values across tests
    jest.resetAllMocks();
    mockSupabase = {};
    mockAI = {
      generateEmbedding: jest.fn().mockResolvedValue([[0.1, 0.2]]),
      generateChatCompletion: jest.fn().mockResolvedValue({
        content: JSON.stringify([{ promptText: 'Q1' }]),
        tokenUsage: {},
        model: 'gpt-4o-mini',
      }),
    };
    // Default: retrieveChunksBySimilarity returns empty, retrieveRecentChunks returns one chunk
    (retrieveChunksBySimilarity as jest.Mock).mockResolvedValue([]);
    (retrieveRecentChunks as jest.Mock).mockResolvedValue([{ content: 'c', metadata: {} }]);
  });

  // ── focusAreas retrieval when no transcript and retrieval empty ─────────────

  it('uses focusAreas embedding when transcript is empty and retrieval returns nothing (lines 54-57)', async () => {
    // focusAreas retrieval also returns empty → falls through to recentChunks
    (retrieveChunksBySimilarity as jest.Mock).mockResolvedValue([]);
    (retrieveRecentChunks as jest.Mock).mockResolvedValue([{ content: 'recent', metadata: {} }]);

    const result = await generatePrompts('l1', '', 'short_answer', mockSupabase, mockAI, {
      focusAreas: 'drug mechanisms',
      difficulty: 'intermediate',
      style: 'factual',
      length: 'standard',
    });

    // generateEmbedding should be called for focusAreas
    expect(mockAI.generateEmbedding).toHaveBeenCalledWith('drug mechanisms');
    expect(retrieveRecentChunks).toHaveBeenCalled();
    expect(result.candidates).toBeDefined();
  });

  it('uses focusAreas retrieval result when it returns chunks (lines 55-57, non-empty path)', async () => {
    (retrieveChunksBySimilarity as jest.Mock).mockResolvedValue([{ content: 'focused chunk', metadata: {} }]);

    const result = await generatePrompts('l1', '', 'short_answer', mockSupabase, mockAI, {
      focusAreas: 'pharmacokinetics',
      difficulty: 'intermediate',
      style: 'factual',
      length: 'standard',
    });

    expect(mockAI.generateEmbedding).toHaveBeenCalledWith('pharmacokinetics');
    expect(retrieveRecentChunks).not.toHaveBeenCalled();
    expect(result.candidates).toBeDefined();
  });

  // ── parseAIResponse: object with non-'candidates' array key ──────────────

  it('parses response object using non-candidates array key (lines 110-111)', async () => {
    (retrieveRecentChunks as jest.Mock).mockResolvedValue([{ content: 'c', metadata: {} }]);
    // Wrap in an object with a different array key (not "candidates")
    mockAI.generateChatCompletion.mockResolvedValue({
      content: JSON.stringify({ prompts: [{ promptText: 'Via arrayKey Q' }] }),
      tokenUsage: {},
      model: 'm',
    });

    const result = await generatePrompts('l1', '', 'short_answer', mockSupabase, mockAI);

    expect(result.candidates[0].promptText).toBe('Via arrayKey Q');
  });

  it('returns fallback candidates when object has no array key (line 114)', async () => {
    (retrieveRecentChunks as jest.Mock).mockResolvedValue([{ content: 'c', metadata: {} }]);
    mockAI.generateChatCompletion.mockResolvedValue({
      content: JSON.stringify({ notAnArray: 'just a string' }),
      tokenUsage: {},
      model: 'm',
    });

    const result = await generatePrompts('l1', '', 'short_answer', mockSupabase, mockAI);

    // Object with no array key → candidates = [] (empty mapping, not getFallbackCandidates)
    expect(result.candidates).toEqual([]);
  });

  // ── parseAIResponse: MC candidate with empty mcOptions ───────────────────

  it('sets placeholder text for MC candidate with empty mcOptions (lines 139-140)', async () => {
    (retrieveRecentChunks as jest.Mock).mockResolvedValue([{ content: 'c', metadata: {} }]);
    // MC candidate with empty mcOptions array
    mockAI.generateChatCompletion.mockResolvedValue({
      content: JSON.stringify({
        candidates: [
          { promptText: 'MC Q with no options', mcOptions: [] },
          { promptText: 'MC Q2', mcOptions: [] },
          { promptText: 'MC Q3', mcOptions: [] },
          { promptText: 'MC Q4', mcOptions: [] },
          { promptText: 'MC Q5', mcOptions: [] },
        ],
      }),
      tokenUsage: {},
      model: 'm',
    });

    const result = await generatePrompts('l1', '', 'multiple_choice', mockSupabase, mockAI);

    // The MC candidate with empty options gets the fallback prompt text
    expect(result.candidates[0].promptText).toContain('Multiple choice options could not be generated');
    expect(result.candidates[0].mcOptions).toEqual([]);
  });
});
