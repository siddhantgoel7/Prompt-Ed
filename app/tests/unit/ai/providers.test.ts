import { OpenAIProvider } from '@/lib/ai/providers';

// OpenAI SDK mock
const mockCreate = jest.fn();
const mockEmbeddingsCreate = jest.fn();

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: { create: mockCreate },
    },
    embeddings: { create: mockEmbeddingsCreate },
  }));
});

function makeCompletion(content: string) {
  return {
    choices: [{ message: { content } }],
  };
}

// generatePdfVisualDescriptions
describe('[US 1.16] OpenAIProvider.generatePdfVisualDescriptions', () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new OpenAIProvider('test-key');
  });

  it('success: returns a map of pageNumber → description for pages with visual content', async () => {
    const jsonResponse = JSON.stringify({
      pages: [
        { page: 1, description: 'NO_VISUAL_CONTENT' },
        { page: 2, description: 'RNAi pathway diagram showing nucleus, Dicer, and RISC complex' },
        { page: 3, description: 'NO_VISUAL_CONTENT' },
        { page: 4, description: 'ASO gapmer mechanism: DNA-RNA hybrid, RNase H cleavage arrows' },
      ],
    });
    mockCreate.mockResolvedValue(makeCompletion(jsonResponse));

    const result = await provider.generatePdfVisualDescriptions(Buffer.from('fake pdf'), 4);

    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(2);
    expect(result.get(2)).toContain('RNAi pathway');
    expect(result.get(4)).toContain('ASO gapmer');
    // Text-only pages must NOT be in the map
    expect(result.has(1)).toBe(false);
    expect(result.has(3)).toBe(false);
  });

  it('success: calls GPT-4o (not gpt-4o-mini) with PDF file input and json_object mode', async () => {
    mockCreate.mockResolvedValue(makeCompletion('{"pages":[]}'));

    await provider.generatePdfVisualDescriptions(Buffer.from('fake pdf'), 1);

    const call = mockCreate.mock.calls[0][0];
    expect(call.model).toBe('gpt-4o');
    expect(call.response_format).toEqual({ type: 'json_object' });

    // Must include a file-type content part with the base64 PDF
    const filePart = call.messages[1].content.find((p: any) => p.type === 'file');
    expect(filePart).toBeDefined();
    expect(filePart.file.file_data).toMatch(/^data:application\/pdf;base64,/);
  });

  it('success: returns empty map when all pages are text-only (NO_VISUAL_CONTENT)', async () => {
    const jsonResponse = JSON.stringify({
      pages: [
        { page: 1, description: 'NO_VISUAL_CONTENT' },
        { page: 2, description: 'NO_VISUAL_CONTENT' },
      ],
    });
    mockCreate.mockResolvedValue(makeCompletion(jsonResponse));

    const result = await provider.generatePdfVisualDescriptions(Buffer.from('pdf'), 2);
    expect(result.size).toBe(0);
  });

  it('failure: returns empty map (not throws) when GPT-4o returns malformed JSON', async () => {
    mockCreate.mockResolvedValue(makeCompletion('this is not json at all'));

    const result = await provider.generatePdfVisualDescriptions(Buffer.from('pdf'), 2);
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
  });

  it('failure: propagates API errors (network failure, 429, 500)', async () => {
    mockCreate.mockRejectedValue(new Error('OpenAI 429 Rate Limit'));

    await expect(
      provider.generatePdfVisualDescriptions(Buffer.from('pdf'), 1)
    ).rejects.toThrow('OpenAI 429 Rate Limit');
  });
});

// generatePptxSlideVisualDescription
describe('[US 1.16] OpenAIProvider.generatePptxSlideVisualDescription', () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new OpenAIProvider('test-key');
  });

  const singleImage = [{ base64: 'aGVsbG8=', mimeType: 'image/png' as const }];

  it('success: returns visual description string for slide with images', async () => {
    mockCreate.mockResolvedValue(
      makeCompletion('Receptor pathway diagram: GPCR on left, G-protein activation, adenylyl cyclase, cAMP production')
    );

    const result = await provider.generatePptxSlideVisualDescription(
      3, 'Beta-adrenergic signalling', 'Notes about cAMP', singleImage
    );

    expect(result).toContain('Receptor pathway diagram');
  });

  it('success: sends slide text and notes as context in user message', async () => {
    mockCreate.mockResolvedValue(makeCompletion('NO_VISUAL_CONTENT'));

    await provider.generatePptxSlideVisualDescription(
      1, 'Body text here', 'Notes here', singleImage
    );

    const call = mockCreate.mock.calls[0][0];
    const userContent = call.messages[1].content;

    // First content part must be text with body and notes
    const textPart = userContent.find((p: any) => p.type === 'text' && p.text.includes('Body text here'));
    expect(textPart).toBeDefined();
    expect(textPart.text).toContain('Notes here');
  });

  it('success: sends all images as image_url parts in the user message', async () => {
    mockCreate.mockResolvedValue(makeCompletion('Two diagrams described'));

    const twoImages = [
      { base64: 'aW1hZ2Ux', mimeType: 'image/png' as const },
      { base64: 'aW1hZ2Uy', mimeType: 'image/jpeg' as const },
    ];

    await provider.generatePptxSlideVisualDescription(2, 'Body', '', twoImages);

    const call = mockCreate.mock.calls[0][0];
    const imageParts = call.messages[1].content.filter((p: any) => p.type === 'image_url');
    expect(imageParts).toHaveLength(2);
    expect(imageParts[0].image_url.url).toMatch(/^data:image\/png;base64,/);
    expect(imageParts[1].image_url.url).toMatch(/^data:image\/jpeg;base64,/);
  });

  it('success: uses GPT-4o (not gpt-4o-mini) for vision quality', async () => {
    mockCreate.mockResolvedValue(makeCompletion('description'));

    await provider.generatePptxSlideVisualDescription(1, '', '', singleImage);

    expect(mockCreate.mock.calls[0][0].model).toBe('gpt-4o');
  });

  it('success: returns "NO_VISUAL_CONTENT" string when model determines no visual info to add', async () => {
    mockCreate.mockResolvedValue(makeCompletion('NO_VISUAL_CONTENT'));

    const result = await provider.generatePptxSlideVisualDescription(1, 'Text', '', singleImage);
    expect(result).toBe('NO_VISUAL_CONTENT');
  });

  it('failure: propagates API errors to caller (caller handles gracefully in parsePptx)', async () => {
    mockCreate.mockRejectedValue(new Error('OpenAI 500'));

    await expect(
      provider.generatePptxSlideVisualDescription(1, '', '', singleImage)
    ).rejects.toThrow('OpenAI 500');
  });
});

// generateChatCompletion
describe('[US 1.18 + 1.23] OpenAIProvider.generateChatCompletion', () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new OpenAIProvider('test-key');
  });

  it('success: returns content string from model response', async () => {
    mockCreate.mockResolvedValue(makeCompletion('{"candidates": []}'));

    const result = await provider.generateChatCompletion([
      { role: 'system', content: 'You are a pharmacology quiz generator.' },
      { role: 'user', content: 'Generate a short answer question.' },
    ]);

    expect(result).toBe('{"candidates": []}');
  });

  it('[US 1.23] success: enables json_object mode when jsonMode=true', async () => {
    mockCreate.mockResolvedValue(makeCompletion('{}'));

    await provider.generateChatCompletion(
      [{ role: 'user', content: 'prompt' }],
      { jsonMode: true }
    );

    expect(mockCreate.mock.calls[0][0].response_format).toEqual({ type: 'json_object' });
  });

  it('success: uses gpt-4o-mini (not gpt-4o) for cost efficiency', async () => {
    mockCreate.mockResolvedValue(makeCompletion('response'));

    await provider.generateChatCompletion([{ role: 'user', content: 'prompt' }]);

    expect(mockCreate.mock.calls[0][0].model).toBe('gpt-4o-mini');
  });

  it('success: applies custom temperature when provided', async () => {
    mockCreate.mockResolvedValue(makeCompletion('response'));

    await provider.generateChatCompletion(
      [{ role: 'user', content: 'prompt' }],
      { temperature: 0.2 }
    );

    expect(mockCreate.mock.calls[0][0].temperature).toBe(0.2);
  });

  it('failure: returns empty string when API response has no content', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: null } }] });

    const result = await provider.generateChatCompletion([{ role: 'user', content: 'prompt' }]);
    expect(result).toBe('');
  });
});

// generateEmbedding
describe('[US 1.18] OpenAIProvider.generateEmbedding', () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new OpenAIProvider('test-key');
    mockEmbeddingsCreate.mockResolvedValue({
      data: [
        { embedding: [0.1, 0.2, 0.3] },
        { embedding: [0.4, 0.5, 0.6] },
      ],
    });
  });

  it('success: returns array of embeddings for batch string input', async () => {
    const result = await provider.generateEmbedding(['chunk one', 'chunk two']);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual([0.1, 0.2, 0.3]);
    expect(result[1]).toEqual([0.4, 0.5, 0.6]);
  });

  it('success: accepts single string input (wraps in array internally)', async () => {
    mockEmbeddingsCreate.mockResolvedValue({ data: [{ embedding: [0.1, 0.2] }] });

    const result = await provider.generateEmbedding('single chunk');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([0.1, 0.2]);
  });

  it('success: uses text-embedding-3-small model', async () => {
    await provider.generateEmbedding(['text']);

    expect(mockEmbeddingsCreate.mock.calls[0][0].model).toBe('text-embedding-3-small');
  });

  it('failure: propagates API errors to caller', async () => {
    mockEmbeddingsCreate.mockRejectedValue(new Error('OpenAI 401 Invalid API key'));

    await expect(provider.generateEmbedding(['text'])).rejects.toThrow('OpenAI 401 Invalid API key');
  });
});