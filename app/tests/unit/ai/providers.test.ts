import { GeminiProvider } from '@/lib/ai/providers';
import { GoogleGenerativeAI } from '@google/generative-ai';

jest.mock('@google/generative-ai', () => {
    const mockModel = {
        generateContent: jest.fn(),
        embedContent: jest.fn(),
    };
    return {
        GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
            getGenerativeModel: jest.fn().mockReturnValue(mockModel),
        })),
    };
});

describe('GeminiProvider', () => {
    let provider: GeminiProvider;
    let mockModel: any;

    beforeEach(() => {
        jest.clearAllMocks();
        provider = new GeminiProvider('fake-key');
        const genAI = new GoogleGenerativeAI('fake-key');
        mockModel = (genAI.getGenerativeModel as jest.Mock)();
    });

    it('generateChatCompletion: formatted correctly and returns text', async () => {
        mockModel.generateContent.mockResolvedValue({
            response: {
                text: () => 'Hello World',
                usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 2, totalTokenCount: 3 }
            }
        });

        const result = await provider.generateChatCompletion([
            { role: 'system', content: 'You are an AI' },
            { role: 'user', content: 'Hi' }
        ]);

        expect(result.content).toBe('Hello World');
        expect(result.tokenUsage?.totalTokens).toBe(3);
    });

    it('generateEmbedding: calls embedContent for each input', async () => {
        mockModel.embedContent.mockResolvedValue({
            embedding: { values: [0.1, 0.2] }
        });

        const result = await provider.generateEmbedding(['text1', 'text2']);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual([0.1, 0.2]);
        expect(mockModel.embedContent).toHaveBeenCalledTimes(2);
    });

    it('generateVisionDescription: sends inlineData for images', async () => {
        mockModel.generateContent.mockResolvedValue({
            response: { text: () => 'Description' }
        });

        const result = await provider.generateVisionDescription('base64', 'image/png', 'some context');

        expect(result).toBe('Description');
        expect(mockModel.generateContent).toHaveBeenCalledWith(expect.arrayContaining([
            { inlineData: { mimeType: 'image/png', data: 'base64' } }
        ]));
    });

    it('generatePdfVisualDescriptions: parses JSON array of page descriptions', async () => {
        mockModel.generateContent.mockResolvedValue({
            response: { text: () => JSON.stringify({ pages: [{ page: 1, description: 'Vis 1' }] }) }
        });

        const result = await provider.generatePdfVisualDescriptions(Buffer.from('pdf'), 1);

        expect(result.get(1)).toBe('Vis 1');
    });

    it('generatePptxSlideVisualDescription: combines text and images', async () => {
        mockModel.generateContent.mockResolvedValue({
            response: { text: () => 'Slide Desc' }
        });

        const result = await provider.generatePptxSlideVisualDescription(1, 'body', 'notes', [{ base64: 'b64', mimeType: 'image/png' }]);

        expect(result).toBe('Slide Desc');
        expect(mockModel.generateContent).toHaveBeenCalled();
    });
});