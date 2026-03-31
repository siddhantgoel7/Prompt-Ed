import { 
  buildSystemPrompt, 
  buildUserPrompt, 
  CANDIDATE_COUNT, 
  TEMPERATURE_BY_TYPE 
} from '@/lib/ai/prompts/discussionPrompt';

jest.mock('@/lib/utils/random', () => ({
  secureRandom: jest.fn(() => 0.5),
  secureShuffle: jest.fn((arr) => arr), // Pass through for deterministic tests
}));

describe('discussionPrompt configuration', () => {
  it('constants: verified expected values', () => {
    expect(CANDIDATE_COUNT).toBe(5);
    expect(TEMPERATURE_BY_TYPE.multiple_choice).toBeDefined();
  });

  describe('buildSystemPrompt', () => {
    it('success: builds default prompt when no preferences given', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('expert pharmacology teaching assistant');
      expect(prompt).toContain('Socratic approach'); // default style
      expect(prompt).toContain('apply" and "analyze"'); // default difficulty
    });

    it('success: includes specific blocks for advanced difficulty and clinical style', () => {
      const prompt = buildSystemPrompt({ 
        difficulty: 'advanced', 
        style: 'clinical_scenario',
        length: 'standard'
      });
      expect(prompt).toContain('analyze", "evaluate", and "create"');
      expect(prompt).toContain('clinical scenarios and patient cases');
    });

    it('success: includes few-shot example for requested prompt type', () => {
      const prompt = buildSystemPrompt({
        difficulty: 'basic',
        style: 'factual',
        length: 'brief'
      }, 'multiple_choice');
      expect(prompt).toContain('Multiple choice examples');
      expect(prompt).not.toContain('Short answer example');
    });
  });

  describe('buildUserPrompt', () => {
    const defaultParams = {
      chunks: ['chunk 1 content'],
      transcriptText: 'transcript content',
      promptType: 'short_answer' as const,
    };

    it('success: builds prompt with context and transcript tags', () => {
      const prompt = buildUserPrompt(defaultParams);
      expect(prompt).toContain('<context>\n[Chunk 1]\nchunk 1 content\n</context>');
      expect(prompt).toContain('<transcript>\ntranscript content\n</transcript>');
      expect(prompt).toContain('Each question should be answerable in 1-2 sentences');
    });

    it('success: handles empty context gracefully', () => {
      const prompt = buildUserPrompt({ ...defaultParams, chunks: [] });
      expect(prompt).toContain('(No file content available');
    });

    it('success: includes focus_areas block when specified', () => {
      const prompt = buildUserPrompt({ 
        ...defaultParams, 
        preferences: { 
            focusAreas: 'beta-blockers',
            difficulty: 'basic',
            style: 'factual',
            length: 'brief'
        } 
      });
      expect(prompt).toContain('<focus_areas>');
      expect(prompt).toContain('address these instructor-specified topics: beta-blockers');
    });

    it('success: includes multiple_choice specific instructions', () => {
      const prompt = buildUserPrompt({ ...defaultParams, promptType: 'multiple_choice' });
      expect(prompt).toContain('exactly 4 answer options (A, B, C, D)');
      expect(prompt).toContain('"mcOptions" must be an array of exactly 4 objects');
      expect(prompt).toContain('<bloom_distribution>');
    });
  });
});
