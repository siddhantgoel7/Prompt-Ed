// Entry point for the file parser module — routes to the correct parser based on file type.
import { parsePdf } from './pdfParser';
import { parsePptx } from './pptxParser';
import type { AIProvider } from '@/lib/ai/providers';

/**
 * Parses a PDF or PPTX buffer into plain text suitable for chunking and embedding.
 * @param opts.onVisionRawJson [DEV-INSPECT] Receives the raw vision-model JSON string (PDF only).
 *   Remove with [DEV-INSPECT].
 */
export async function parseFile(
    buffer: Buffer,
    fileType: 'pdf' | 'pptx',
    aiProvider?: AIProvider,
    opts?: { onVisionRawJson?: (raw: string) => void } // [DEV-INSPECT]
): Promise<string> {
    if (fileType === 'pdf') {
        return parsePdf(buffer, aiProvider, opts); // [DEV-INSPECT] opts passed through
    }
    return parsePptx(buffer, aiProvider);
}