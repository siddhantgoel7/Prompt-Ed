import OpenAI from 'openai';

export type AIMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export interface AIProvider {
    generateChatCompletion(
        messages: AIMessage[],
        options?: { temperature?: number; jsonMode?: boolean }
    ): Promise<string>;

    generateEmbedding(text: string | string[]): Promise<number[][]>;

    generateVisionDescription(
        base64Image: string,
        mimeType: 'image/png' | 'image/jpeg' | 'image/webp',
        contextHint?: string
    ): Promise<string>;
}

export class OpenAIProvider implements AIProvider {
    private openai: OpenAI;

    constructor(apiKey?: string) {
        this.openai = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY });
    }

    async generateChatCompletion(
        messages: AIMessage[],
        options?: { temperature?: number; jsonMode?: boolean }
    ): Promise<string> {
        const response = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages,
            temperature: options?.temperature ?? 0.7,
            response_format: options?.jsonMode ? { type: 'json_object' } : undefined,
        });
        return response.choices[0]?.message?.content ?? '';
    }

    async generateEmbedding(text: string | string[]): Promise<number[][]> {
        const input = Array.isArray(text) ? text.map(t => t.trim()) : text.trim();
        const response = await this.openai.embeddings.create({
            model: 'text-embedding-3-small',
            input,
        });
        return response.data.map(d => d.embedding);
    }

    async generateVisionDescription(
        base64Image: string,
        mimeType: 'image/png' | 'image/jpeg' | 'image/webp',
        contextHint?: string
    ): Promise<string> {
        const systemPrompt =
            'You are a visual content extractor for a pharmacology teaching tool. ' +
            'Describe all visual content in the image concisely and precisely: ' +
            'chemical structures (name atoms, bonds, functional groups), receptor diagrams, ' +
            'pathway figures, tables (transcribe all cell values), charts (axes, data points), ' +
            'and any embedded text not already captured as slide text. ' +
            'Be factual. Do not interpret — describe exactly what is visually present. ' +
            'If the image contains no meaningful content (blank slide, logo, decorative element), ' +
            'respond with exactly: NO_VISUAL_CONTENT';

        const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [
            {
                type: 'image_url',
                image_url: {
                    url: `data:${mimeType};base64,${base64Image}`,
                    detail: 'high',
                },
            },
        ];

        if (contextHint) {
            userContent.push({
                type: 'text',
                text: `Context — text already extracted from this slide: ${contextHint}`,
            });
        }

        const response = await this.openai.chat.completions.create({
            // Must use gpt-4o here — gpt-4o-mini has significantly weaker image understanding
            model: 'gpt-4o',
            max_tokens: 500,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent },
            ],
        });

        return response.choices[0]?.message?.content?.trim() ?? '';
    }
}