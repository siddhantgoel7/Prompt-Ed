// Entry point for the file parser module — routes to the correct parser based on file type.
import { parsePdf } from './pdfParser';
import { parsePptx } from './pptxParser';
import type { AIProvider } from '@/lib/ai/providers';

/** Parses a PDF or PPTX buffer into plain text suitable for chunking and embedding. */
export async function parseFile(
    buffer: Buffer,
    fileType: 'pdf' | 'pptx',
    aiProvider?: AIProvider
): Promise<string> {
    if (fileType === 'pdf') {
        return parsePdf(buffer, aiProvider);
    }
    return parsePptx(buffer, aiProvider);
}