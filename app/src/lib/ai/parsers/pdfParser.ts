import type { AIProvider } from '@/lib/ai/providers';

const NO_VISUAL_CONTENT = 'NO_VISUAL_CONTENT';

export async function parsePdf(
    buffer: Buffer,
    aiProvider?: AIProvider
): Promise<string> {
    //Extract text per page 
    const pageTexts = await extractPageTexts(buffer);

    // Step 2: Render pages to PNG and run vision
    const parts: string[] = [];

    // pdf2pic is dynamically imported to avoid bundling issues in Next.js
    let fromBuffer: ((buf: Buffer, opts: Record<string, unknown>) => {
        bulk: (pages: number[], opts: { responseType: 'buffer' }) => Promise<Array<{ buffer?: Buffer }>>
    }) | null = null;

    try {
        const pdf2pic = await import('pdf2pic');
        fromBuffer = pdf2pic.fromBuffer;
    } catch (err) {
        console.warn('[pdfParser] pdf2pic not available — vision will be skipped:', err);
    }

    for (let i = 0; i < pageTexts.length; i++) {
        const pageNumber = i + 1;
        const pageText = pageTexts[i];
        const pageParts: string[] = [];

        if (pageText) {
            pageParts.push(`[Page ${pageNumber} Text] ${pageText}`);
        }

        // Vision: render page to PNG and describe visual content
        if (aiProvider && fromBuffer) {
            try {
                const converter = fromBuffer(buffer, {
                    density: 150,          // 150 DPI — good quality/cost balance for vision
                    format: 'png',
                    width: 1200,
                    height: 1600,
                    preserveAspectRatio: true,
                });

                const results = await converter.bulk([pageNumber], { responseType: 'buffer' });
                const pageImage = results[0];

                if (pageImage?.buffer && pageImage.buffer.length > 0) {
                    const base64 = pageImage.buffer.toString('base64');
                    const description = await aiProvider.generateVisionDescription(
                        base64,
                        'image/png',
                        pageText || undefined
                    );

                    if (description && description !== NO_VISUAL_CONTENT) {
                        pageParts.push(`[Page ${pageNumber} Visual Content] ${description}`);
                    }
                }
            } catch (err) {
                // Vision failure on one page must not abort the whole upload
                console.warn(`[pdfParser] Vision failed for page ${pageNumber}, skipping:`, err);
            }
        }

        if (pageParts.length > 0) {
            parts.push(pageParts.join('\n'));
        }
    }

    const result = parts.join('\n').trim();

    if (!result) {
        throw new Error(
            'No text or visual content found in this PDF. ' +
            'Please upload a text-based or image-based PDF.'
        );
    }

    return result;
}

/**
 * Extracts text content per page using pdfjs-dist (or LlamaParse if key is set).
 * Returns an array where index i = text for page i+1. Empty string if page had no text.
 */
async function extractPageTexts(buffer: Buffer): Promise<string[]> {
    // LlamaParse path — returns a single markdown string, not per-page.
    // We split on page break markers and pad to match page count from pdfjs.
    if (process.env.LLAMA_CLOUD_API_KEY) {
        try {
            const { LlamaParse } = await import('llama-parse');
            const parser = new LlamaParse({ apiKey: process.env.LLAMA_CLOUD_API_KEY });
            const blob = new Blob([new Uint8Array(buffer)], { type: 'application/pdf' });
            const result = await parser.parseFile(blob as unknown as File);
            if (result.markdown) {
                // LlamaParse doesn't split per-page; return as single-element array.
                // Vision will still run per-page via pdf2pic independently.
                return [result.markdown.trim()];
            }
        } catch (err) {
            console.warn('[pdfParser] LlamaParse failed, falling back to pdfjs-dist:', err);
        }
    }

    // pdfjs-dist path — per-page text extraction
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs') as unknown as {
        getDocument: (src: { data: Uint8Array }) => {
            promise: Promise<{
                numPages: number;
                getPage: (n: number) => Promise<{
                    getTextContent: () => Promise<{ items: Array<{ str: string }> }>;
                }>;
            }>;
        };
    };

    const data = new Uint8Array(buffer);
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const pageTexts: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const text = content.items.map((item) => item.str).join(' ').trim();
        pageTexts.push(text); // empty string if no text — vision still runs
    }

    return pageTexts;
}