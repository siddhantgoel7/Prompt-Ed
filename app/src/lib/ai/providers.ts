// AI provider abstraction layer. Defines the AIProvider interface and concrete
// implementations: OpenAIProvider (chat, embeddings, vision) and GeminiProvider
// (PDF vision — faster and cheaper for multi-page documents).
import OpenAI from 'openai';
import { GoogleGenerativeAI, type Part, type Content } from '@google/generative-ai';

/** Represents a single message in the chat history passed to the LLM. */
export type AIMessage = { role: 'system' | 'user' | 'assistant'; content: string };

// ── Shared PDF vision prompt ────────────────────────────────────────────────
// Single source of truth used by both OpenAIProvider and GeminiProvider so
// prompt changes only need to be made in one place.
const PDF_VISION_SYSTEM_PROMPT =
    'You are a visual content extractor for a teaching tool. ' +
    'For each page with diagrams, figures, chemical structures, tables, graphs, or images: ' +
    'list only the key visual elements — component names, labels, arrow directions, table headers and values. ' +
    'Write as a compact list of facts, not prose. No full sentences, no explanation, no interpretation. ' +
    'Good: "Flowchart: A→B→C; feedback loop B→A. Labels: Input, Process, Output." ' +
    'Bad: "The diagram shows a flowchart that illustrates how data flows between components..." ' +
    'For pages with ONLY text and no visual elements, output exactly: NO_VISUAL_CONTENT';

const buildPdfVisionUserPrompt = (numPages: number): string =>
    `This PDF has ${numPages} pages. ` +
    'For EACH page output a JSON object:\n' +
    '{ "pages": [ { "page": 1, "description": "..." }, ... ] }\n\n' +
    `Use "NO_VISUAL_CONTENT" for text-only pages. Include all ${numPages} pages.`;

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

    /**
     * Sends an entire PDF to GPT-4o and returns a map of
     * pageNumber → visual description for pages that contain diagrams,
     * images, tables, or other non-text content.
     *
     * Uses OpenAI's native PDF file input (data URI) which lets GPT-4o
     * process all pages including embedded images in a single API call.
     * Pages with only text return NO_VISUAL_CONTENT and are excluded from the map.
     */
    generatePdfVisualDescriptions(
        pdfBuffer: Buffer,
        numPages: number
    ): Promise<Map<number, string>>;

    /**
     * Describes all visual content on a single PPTX slide.
     *
     * Sends the slide's extracted text, speaker notes, AND all embedded images
     * together in one GPT-4o call. Combining them gives the model full context —
     * it can see which labels in the text correspond to which diagram — and
     * avoids redundant per-image API calls.
     *
     * Returns a plain-text description of visual content not already captured
     * in the slide text/notes, or NO_VISUAL_CONTENT if nothing visual is present.
     *
     * @param slideNumber   1-based slide index (for logging)
     * @param bodyText      Extracted slide body text (may be empty)
     * @param notesText     Extracted speaker notes text (may be empty)
     * @param images        Array of { base64, mimeType } for each embedded image
     */
    generatePptxSlideVisualDescription(
        slideNumber: number,
        bodyText: string,
        notesText: string,
        images: Array<{ base64: string; mimeType: 'image/png' | 'image/jpeg' | 'image/webp' }>
    ): Promise<string>;
}

/** Concrete AI provider backed by the OpenAI API (gpt-4o-mini for chat, text-embedding-3-small for embeddings). */
export class OpenAIProvider implements AIProvider {
    private openai: OpenAI;

    constructor(apiKey?: string) {
        this.openai = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY });
    }

    /** Calls gpt-4o-mini with the given messages and returns the response text. */
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

    /** Generates embeddings for one or more text strings using text-embedding-3-small. */
    async generateEmbedding(text: string | string[]): Promise<number[][]> {
        const input = Array.isArray(text) ? text.map(t => t.trim()) : text.trim();
        const response = await this.openai.embeddings.create({
            model: 'text-embedding-3-small',
            input,
        });
        return response.data.map(d => d.embedding);
    }

    /** Sends a single image to gpt-4o and returns a factual text description of visual content. */
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
            model: 'gpt-4o',
            max_tokens: 500,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent },
            ],
        });

        return response.choices[0]?.message?.content?.trim() ?? '';
    }

    async generatePdfVisualDescriptions(
        pdfBuffer: Buffer,
        numPages: number
    ): Promise<Map<number, string>> {
        const base64Pdf = pdfBuffer.toString('base64');
        const pdfDataUri = `data:application/pdf;base64,${base64Pdf}`;

        const response = await this.openai.chat.completions.create({
            model: 'gpt-4o',
            max_tokens: 16384,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: PDF_VISION_SYSTEM_PROMPT },
                {
                    role: 'user',
                    content: [
                        {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            type: 'file' as any,
                            file: {
                                filename: 'lecture.pdf',
                                file_data: pdfDataUri,
                            },
                        } as OpenAI.Chat.ChatCompletionContentPart,
                        {
                            type: 'text',
                            text: buildPdfVisionUserPrompt(numPages),
                        },
                    ],
                },
            ],
        });

        const raw = response.choices[0]?.message?.content ?? '{}';
        const result = new Map<number, string>();

        try {
            const parsed = JSON.parse(raw) as { pages?: Array<{ page: number; description: string }> };
            for (const entry of parsed.pages ?? []) {
                if (entry.description && entry.description !== 'NO_VISUAL_CONTENT') {
                    result.set(entry.page, entry.description);
                }
            }
        } catch (err) {
            console.warn('[providers] Failed to parse PDF vision JSON response:', err, raw.slice(0, 200));
        }

        return result;
    }

    async generatePptxSlideVisualDescription(

        slideNumber: number,
        bodyText: string,
        notesText: string,
        images: Array<{ base64: string; mimeType: 'image/png' | 'image/jpeg' | 'image/webp' }>
    ): Promise<string> {
        const systemPrompt =
            'You are a visual content extractor for a pharmacology teaching tool. ' +
            'You will be given a PowerPoint slide: its text, speaker notes, and embedded images. ' +
            'Describe ONLY visual content not already captured in the text/notes: ' +
            'chemical structures (atoms, bonds, functional groups, stereochemistry), ' +
            'receptor/pathway diagrams (all components, arrows, labels), ' +
            'tables (transcribe all cell values), graphs (axes, units, data trends). ' +
            'Do NOT repeat information already present in the slide text or notes. ' +
            'Be factual and specific — describe exactly what is visually present. ' +
            'If the images add no information beyond what the text/notes already cover, ' +
            'respond with exactly: NO_VISUAL_CONTENT';

        // Build user message: text context first, then all images
        const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [];

        // Text context block
        const contextParts: string[] = [`Slide ${slideNumber} text: ${bodyText || '(none)'}`];
        if (notesText) contextParts.push(`Speaker notes: ${notesText}`);
        userContent.push({ type: 'text', text: contextParts.join('\n') });

        // All slide images
        for (const img of images) {
            userContent.push({
                type: 'image_url',
                image_url: {
                    url: `data:${img.mimeType};base64,${img.base64}`,
                    detail: 'high',
                },
            });
        }

        userContent.push({
            type: 'text',
            text: 'Describe any visual content in the images above that is NOT already covered by the slide text or speaker notes.',
        });

        const response = await this.openai.chat.completions.create({
            model: 'gpt-4o',
            max_tokens: 600,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent },
            ],
        });

        return response.choices[0]?.message?.content?.trim() ?? '';
    }
}

/** Concrete AI provider backed by the Google Gemini API.
 *  Uses gemini-1.5-pro for all vision and chat tasks, and
 *  text-embedding-004 for embeddings.
 *
 *  Key advantage over OpenAIProvider: generatePdfVisualDescriptions accepts
 *  a PDF buffer as inline data — no page-by-page rendering needed —
 *  cutting PDF vision latency by ~50-65% at ~90% lower token cost.
 */
export class GeminiProvider implements AIProvider {
    private genAI: GoogleGenerativeAI;
    private readonly model = 'gemini-2.5-flash';
    private readonly NO_VISUAL_CONTENT = 'NO_VISUAL_CONTENT';

    constructor(apiKey?: string) {
        this.genAI = new GoogleGenerativeAI(apiKey || process.env.GOOGLE_AI_API_KEY || '');
    }

    /** Calls gemini-1.5-pro with the given messages and returns the response text. */
    async generateChatCompletion(
        messages: AIMessage[],
        options?: { temperature?: number; jsonMode?: boolean }
    ): Promise<string> {
        const systemMessage = messages.find(m => m.role === 'system');
        const chatMessages = messages.filter(m => m.role !== 'system');

        const geminiModel = this.genAI.getGenerativeModel({
            model: this.model,
            systemInstruction: systemMessage?.content,
            generationConfig: {
                temperature: options?.temperature ?? 0.7,
                responseMimeType: options?.jsonMode ? 'application/json' : 'text/plain',
            },
        });

        const contents: Content[] = chatMessages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
        }));
        const result = await geminiModel.generateContent({ contents });
        return result.response.text();
    }

    /** Generates embeddings using text-embedding-004. */
    async generateEmbedding(text: string | string[]): Promise<number[][]> {
        const inputs = Array.isArray(text) ? text : [text];
        const embeddingModel = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
        const results = await Promise.all(
            inputs.map(t => embeddingModel.embedContent(t.trim()))
        );
        return results.map(r => r.embedding.values);
    }

    /** Sends a single image to gemini-1.5-pro and returns a factual text description of visual content. */
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
            `respond with exactly: ${this.NO_VISUAL_CONTENT}`;

        const parts: Part[] = [{ inlineData: { mimeType, data: base64Image } }];
        if (contextHint) {
            parts.push({ text: `Context — text already extracted from this slide: ${contextHint}` });
        }

        const geminiModel = this.genAI.getGenerativeModel({
            model: this.model,
            systemInstruction: systemPrompt,
        });
        const result = await geminiModel.generateContent(parts);
        return result.response.text().trim();
    }

    /**
     * Sends an entire PDF to gemini-1.5-pro as inline data and returns a map of
     * pageNumber → visual description for pages containing non-text visual content.
     * Dramatically faster than GPT-4o for multi-page PDFs — no page rendering required.
     */
    async generatePdfVisualDescriptions(
        pdfBuffer: Buffer,
        numPages: number
    ): Promise<Map<number, string>> {
        // thinkingConfig is a Gemini 2.5 feature not yet in the SDK's GenerationConfig types.
        // Passed via unknown → Record spread to avoid any.
        const generationConfig: Record<string, unknown> = {
            responseMimeType: 'application/json',
            maxOutputTokens: 16384,
            thinkingConfig: { thinkingBudget: 0 }, // Disable thinking — no benefit for factual extraction
        };

        const geminiModel = this.genAI.getGenerativeModel({
            model: this.model,
            systemInstruction: PDF_VISION_SYSTEM_PROMPT,
            generationConfig: generationConfig as Parameters<typeof this.genAI.getGenerativeModel>[0]['generationConfig'],
        });

        const result = await geminiModel.generateContent([
            { inlineData: { mimeType: 'application/pdf', data: pdfBuffer.toString('base64') } },
            buildPdfVisionUserPrompt(numPages),
        ]);

        const raw = result.response.text();
        const descriptions = new Map<number, string>();

        try {
            const parsed = JSON.parse(raw) as { pages?: Array<{ page: number; description: string }> };
            for (const entry of parsed.pages ?? []) {
                if (entry.description && entry.description !== this.NO_VISUAL_CONTENT) {
                    descriptions.set(entry.page, entry.description);
                }
            }
        } catch (err) {
            console.warn('[GeminiProvider] Failed to parse PDF vision JSON:', err, raw.slice(0, 200));
        }

        return descriptions;
    }

    /** Describes all visual content on a single PPTX slide using gemini-1.5-pro. */
    async generatePptxSlideVisualDescription(
        slideNumber: number,
        bodyText: string,
        notesText: string,
        images: Array<{ base64: string; mimeType: 'image/png' | 'image/jpeg' | 'image/webp' }>
    ): Promise<string> {
        const systemPrompt =
            'You are a visual content extractor for a pharmacology teaching tool. ' +
            'You will be given a PowerPoint slide: its text, speaker notes, and embedded images. ' +
            'Describe ONLY visual content not already captured in the text/notes: ' +
            'chemical structures (atoms, bonds, functional groups, stereochemistry), ' +
            'receptor/pathway diagrams (all components, arrows, labels), ' +
            'tables (transcribe all cell values), graphs (axes, units, data trends). ' +
            'Do NOT repeat information already present in the slide text or notes. ' +
            'Be factual and specific — describe exactly what is visually present. ' +
            'If the images add no information beyond what the text/notes already cover, ' +
            `respond with exactly: ${this.NO_VISUAL_CONTENT}`;

        const contextText = [`Slide ${slideNumber} text: ${bodyText || '(none)'}`];
        if (notesText) contextText.push(`Speaker notes: ${notesText}`);
        contextText.push('Describe any visual content in the images above that is NOT already covered by the slide text or speaker notes.');

        const parts: Part[] = [{ text: contextText.join('\n') }];
        for (const img of images) {
            parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
        }

        const geminiModel = this.genAI.getGenerativeModel({
            model: this.model,
            systemInstruction: systemPrompt,
        });
        const result = await geminiModel.generateContent(parts);
        return result.response.text().trim();
    }
}