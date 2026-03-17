// Entry point for the file parser module — routes to the correct parser based on file type.
import { parsePdf } from './pdfParser';
import { parsePptx } from './pptxParser';
import type { AIProvider } from '@/lib/ai/providers';
import type { ParsedSection } from '@/types/ai';

/**
 * Parses a PDF or PPTX buffer into structured sections suitable for chunking and embedding.
 * Each section carries content origin and page/slide provenance for chunk metadata.
 * @param opts.onVisionRawJson [DEV-INSPECT] Receives the raw vision-model JSON string (PDF only).
 *   Remove with [DEV-INSPECT].
 */
export async function parseFile(
    buffer: Buffer,
    fileType: 'pdf' | 'pptx',
    aiProvider?: AIProvider,
    opts?: { onVisionRawJson?: (raw: string) => void } // [DEV-INSPECT]
): Promise<ParsedSection[]> {
    if (fileType === 'pdf') {
        return parsePdf(buffer, aiProvider, opts); // [DEV-INSPECT] opts passed through
    }
    return parsePptx(buffer, aiProvider);
}