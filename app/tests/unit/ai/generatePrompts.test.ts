import { generatePrompts } from '@/lib/ai/generatePrompts';
import { 
  retrieveChunksBySimilarity, 
  retrieveRecentChunks, 
  blendEmbeddings, 
  normalizeEmbedding 
} from '@/lib/ai/retrieveChunks';
import { buildSystemPrompt, buildUserPrompt } from '@/lib/ai/prompts/discussionPrompt';
import type { AIProvider } from '@/lib/ai/providers';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock dependencies
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
  TEMPERATURE_BY_TYPE: {
    multiple_choice: 0.2,
    open_ended: 0.7,
  },
}));

jest.mock('@/lib/utils/random', () => ({
  secureRandom: jest.fn(() => 0.5),
  secureShuffle: jest.fn((arr) => arr), // Simple passthrough for deterministic tests
}));

describe('generatePrompts', () => {
  let mockSupabase: jest.Mocked<SupabaseClient>;
  let mockAI: jest.Mocked<AIProvider>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {} as any;
    mockAI = {
      generateEmbedding: jest.fn().mockResolvedValue([[0.1, 0.2]]),
      generateChatCompletion: jest.fn().mockResolvedValue({
        content: JSON.stringify([
          { promptText: 'Q1', mcOptions: [{ label: 'A', text: 'Opt 1', is_correct: true }] }
        ]),
        tokenUsage: { prompt: 10, completion: 20, total: 30 },
        model: 'gpt-4o-mini'
      }),
    } as any;
  });

  it('success: full semantic retrieval with transcript and focusAreas blending', async () => {
     (retrieveChunksBySimilarity as jest.Mock).mockResolvedValue([
       { content: 'chunk1', metadata: {} }
     ]);
     (blendEmbeddings as jest.Mock).mockReturnValue([0.15, 0.25]);
     (normalizeEmbedding as jest.Mock).mockReturnValue([0.15, 0.25]);

     const result = await generatePrompts(
       'l1', 
       'transcript text', 
       'short_answer', 
       mockSupabase, 
       mockAI, 
       { 
         focusAreas: 'focus',
         difficulty: 'intermediate',
         style: 'socratic',
         length: 'standard'
       }
     );

     expect(mockAI.generateEmbedding).toHaveBeenCalledTimes(2); // 1 for transcript, 1 for focus
     expect(blendEmbeddings).toHaveBeenCalledWith([0.1, 0.2], [0.1, 0.2], 0.7);
     expect(retrieveChunksBySimilarity).toHaveBeenCalled();
     expect(result.candidates).toHaveLength(1);
     expect(result.candidates[0].promptText).toBe('Q1');
  });

  it('success: fallback to recent chunks when retrieval is empty', async () => {
    (retrieveChunksBySimilarity as jest.Mock).mockResolvedValue([]);
    (retrieveRecentChunks as jest.Mock).mockResolvedValue([
      { content: 'recent1', metadata: {} }
    ]);

    const result = await generatePrompts(
      'l1',
      '',
      'short_answer',
      mockSupabase,
      mockAI
    );

    expect(retrieveRecentChunks).toHaveBeenCalled();
    expect(result.warning).toContain('No transcript provided');
    expect(result.candidates).toHaveLength(1);
  });

  it('success: Multiple Choice position assignment logic', async () => {
    (retrieveRecentChunks as jest.Mock).mockResolvedValue([{ content: 'c', metadata: {} }]);
    
    // Mock 5 candidates as the parser expects CANDIDATE_COUNT (5)
    const rawResponse = JSON.stringify({
      candidates: [
        { promptText: 'Q1', mcOptions: [{ label: 'A', text: 'C', is_correct: true }, { label: 'B', text: 'I1', is_correct: false }, { label: 'C', text: 'I2', is_correct: false }, { label: 'D', text: 'I3', is_correct: false }] },
        { promptText: 'Q2', mcOptions: [{ label: 'A', text: 'C', is_correct: true }, { label: 'B', text: 'I1', is_correct: false }, { label: 'C', text: 'I2', is_correct: false }, { label: 'D', text: 'I3', is_correct: false }] },
        { promptText: 'Q3', mcOptions: [{ label: 'A', text: 'C', is_correct: true }, { label: 'B', text: 'I1', is_correct: false }, { label: 'C', text: 'I2', is_correct: false }, { label: 'D', text: 'I3', is_correct: false }] },
        { promptText: 'Q4', mcOptions: [{ label: 'A', text: 'C', is_correct: true }, { label: 'B', text: 'I1', is_correct: false }, { label: 'C', text: 'I2', is_correct: false }, { label: 'D', text: 'I3', is_correct: false }] },
        { promptText: 'Q5', mcOptions: [{ label: 'A', text: 'C', is_correct: true }, { label: 'B', text: 'I1', is_correct: false }, { label: 'C', text: 'I2', is_correct: false }, { label: 'D', text: 'I3', is_correct: false }] },
      ]
    });
    mockAI.generateChatCompletion.mockResolvedValue({ content: rawResponse, tokenUsage: {} as any, model: 'm' });

    const result = await generatePrompts('l1', '', 'multiple_choice', mockSupabase, mockAI);

    expect(result.candidates).toHaveLength(5);
    // Verify one of them (since we mocked shuffle as passthrough, pos 0 should be 'A' or 'extra')
    expect(result.candidates[0].mcOptions?.find(o => o.is_correct)).toBeDefined();
    // Labels should be re-assigned A, B, C, D
    const labels = result.candidates[0].mcOptions?.map(o => o.label);
    expect(labels).toEqual(['A', 'B', 'C', 'D']);
  });

  it('failure: returns fallback candidates on JSON parse error', async () => {
    (retrieveRecentChunks as jest.Mock).mockResolvedValue([{ content: 'c', metadata: {} }]);
    mockAI.generateChatCompletion.mockResolvedValue({ content: 'invalid json', tokenUsage: {} as any, model: 'm' });

    const result = await generatePrompts('l1', '', 'short_answer', mockSupabase, mockAI);

    expect(result.candidates).toHaveLength(5);
    expect(result.candidates[0].promptText).toContain('AI response could not be parsed');
  });

  it('failure: throws error when AIProvider dependency fails', async () => {
    mockAI.generateEmbedding.mockRejectedValue(new Error('Network Error'));

    await expect(generatePrompts('l1', 't', 'short_answer', mockSupabase, mockAI))
      .rejects.toThrow('Network Error');
  });
});
