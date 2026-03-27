/**
 * Extra branch coverage for AI providers.
 * Targets:
 *   - OpenAIProvider.generatePdfVisualDescriptions: catch block when JSON.parse fails (line 247)
 *   - GeminiProvider.generateVisionDescription: contextHint present branch (line 368)
 *   - GeminiProvider.generatePdfVisualDescriptions: catch block when JSON.parse fails (line 418)
 */
import { OpenAIProvider, GeminiProvider } from '@/lib/ai/providers';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

jest.mock('openai');
jest.mock('@google/generative-ai');

// ── OpenAI extra ──────────────────────────────────────────────────────────────

describe('OpenAIProvider (extra branches)', () => {
  let provider: OpenAIProvider;
  let mockOpenAI: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
      embeddings: { create: jest.fn() },
    };
    (OpenAI as unknown as jest.Mock).mockImplementation(() => mockOpenAI);
    provider = new OpenAIProvider('fake-key');
  });

  it('returns empty map and logs warn when PDF JSON response is invalid (catch branch)', async () => {
    // Return invalid JSON so JSON.parse throws
    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: 'NOT_VALID_JSON!!!' } }],
    });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await provider.generatePdfVisualDescriptions(Buffer.from('%PDF'), 1);

    expect(result.size).toBe(0);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[providers]'),
      expect.anything(),
      expect.anything()
    );
    warnSpy.mockRestore();
  });
});

// ── Gemini extra ──────────────────────────────────────────────────────────────

describe('GeminiProvider (extra branches)', () => {
  let provider: GeminiProvider;
  let mockModel: any;
  let mockGenAI: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockModel = {
      generateContent: jest.fn().mockResolvedValue({
        response: { text: () => 'Gemini Response' },
      }),
      embedContent: jest.fn(),
    };
    mockGenAI = { getGenerativeModel: jest.fn().mockReturnValue(mockModel) };
    (GoogleGenerativeAI as unknown as jest.Mock).mockImplementation(() => mockGenAI);
    provider = new GeminiProvider('fake-key');
  });

  it('includes contextHint as a text part when provided to generateVisionDescription (line 368)', async () => {
    const result = await provider.generateVisionDescription('base64data', 'image/png', 'Slide context hint');

    expect(result).toBe('Gemini Response');
    // Verify generateContent was called with an array containing both image and text parts
    const callArgs = mockModel.generateContent.mock.calls[0][0];
    expect(Array.isArray(callArgs)).toBe(true);
    expect(callArgs.some((p: any) => typeof p.text === 'string' && p.text.includes('Slide context hint'))).toBe(true);
  });

  it('returns empty map and logs warn when PDF JSON response is invalid (catch branch, line 418)', async () => {
    mockModel.generateContent.mockResolvedValueOnce({
      response: { text: () => 'THIS IS NOT JSON' },
    });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await provider.generatePdfVisualDescriptions(Buffer.from('%PDF'), 1);

    expect(result.size).toBe(0);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[GeminiProvider]'),
      expect.anything(),
      expect.anything()
    );
    warnSpy.mockRestore();
  });
});
