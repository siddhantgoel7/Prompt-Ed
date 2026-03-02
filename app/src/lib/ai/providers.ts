import OpenAI from 'openai';

export type AIMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export interface AIProvider {
    generateChatCompletion(
        messages: AIMessage[],
        options?: { temperature?: number; jsonMode?: boolean }
    ): Promise<string>;

    generateEmbedding(text: string | string[]): Promise<number[][]>;
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
}

