import { OpenAIProvider, GeminiProvider } from '@/lib/ai/providers';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

jest.mock('openai');
jest.mock('@google/generative-ai');

describe('AI Providers', () => {
    describe('OpenAIProvider', () => {
        let provider: OpenAIProvider;
        let mockOpenAI: any;

        beforeEach(() => {
            jest.clearAllMocks();
            mockOpenAI = {
                chat: {
                    completions: {
                        create: jest.fn().mockResolvedValue({
                            choices: [{ message: { content: 'Test Response' } }],
                            usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
                            model: 'gpt-4o-mini'
                        })
                    }
                },
                embeddings: {
                    create: jest.fn().mockResolvedValue({
                        data: [{ embedding: [0.1, 0.2] }]
                    })
                }
            };
            (OpenAI as unknown as jest.Mock).mockImplementation(() => mockOpenAI);
            provider = new OpenAIProvider('fake-key');
        });

        it('generateChatCompletion: returns content and usage', async () => {
            const res = await provider.generateChatCompletion([{ role: 'user', content: 'hi' }]);
            expect(res.content).toBe('Test Response');
            expect(res.tokenUsage?.totalTokens).toBe(2);
            expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(expect.objectContaining({
                model: 'gpt-4o-mini'
            }));
        });

        it('generateEmbedding: returns array of numbers', async () => {
            const res = await provider.generateEmbedding('hello');
            expect(res[0]).toEqual([0.1, 0.2]);
        });

        it('generateVisionDescription: handles single image with hint', async () => {
            const res = await provider.generateVisionDescription('base64', 'image/png', 'hint');
            expect(res).toBe('Test Response');
            expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(expect.objectContaining({
                model: 'gpt-4o'
            }));
        });

        it('generatePdfVisualDescriptions: parses JSON response', async () => {
            mockOpenAI.chat.completions.create.mockResolvedValueOnce({
                choices: [{ message: { content: '{"pages":[{"page":1,"description":"Page 1 desc"}]}' } }]
            });
            const res = await provider.generatePdfVisualDescriptions(Buffer.from('%PDF'), 1);
            expect(res.get(1)).toBe('Page 1 desc');
        });

        it('generatePptxSlideVisualDescription: builds prompt with images', async () => {
            const res = await provider.generatePptxSlideVisualDescription(1, 'body', 'notes', [{ base64: 'b', mimeType: 'image/png' }]);
            expect(res).toBe('Test Response');
        });
    });

    describe('GeminiProvider', () => {
        let provider: GeminiProvider;
        let mockGenAI: any;
        let mockModel: any;

        beforeEach(() => {
            jest.clearAllMocks();
            mockModel = {
                generateContent: jest.fn().mockResolvedValue({
                    response: {
                        text: () => 'Gemini Response',
                        usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 }
                    }
                }),
                embedContent: jest.fn().mockResolvedValue({
                    embedding: { values: [0.3, 0.4] }
                })
            };
            mockGenAI = {
                getGenerativeModel: jest.fn().mockReturnValue(mockModel)
            };
            (GoogleGenerativeAI as unknown as jest.Mock).mockImplementation(() => mockGenAI);
            provider = new GeminiProvider('fake-key');
        });

        it('generateChatCompletion: returns content', async () => {
            const res = await provider.generateChatCompletion([{ role: 'user', content: 'hi' }]);
            expect(res.content).toBe('Gemini Response');
            expect(res.tokenUsage?.totalTokens).toBe(2);
        });

        it('generateEmbedding: returns values', async () => {
            const res = await provider.generateEmbedding('hello');
            expect(res[0]).toEqual([0.3, 0.4]);
        });

        it('generateVisionDescription: handles image', async () => {
            const res = await provider.generateVisionDescription('base64', 'image/png');
            expect(res).toBe('Gemini Response');
        });

        it('generatePdfVisualDescriptions: handles JSON result', async () => {
            mockModel.generateContent.mockResolvedValueOnce({
                response: { text: () => '{"pages":[{"page":1,"description":"G1"}]}' }
            });
            const res = await provider.generatePdfVisualDescriptions(Buffer.from('%PDF'), 1);
            expect(res.get(1)).toBe('G1');
        });

        it('generatePptxSlideVisualDescription: handles multiple images', async () => {
            const res = await provider.generatePptxSlideVisualDescription(1, 'b', 'n', [{ base64: 'b', mimeType: 'image/jpeg' }]);
            expect(res).toBe('Gemini Response');
        });
    });
});