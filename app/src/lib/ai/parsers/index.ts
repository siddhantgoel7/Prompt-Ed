// Entry point for the file parser module — routes to the correct parser based on file type.
import { parsePdf } from './pdfParser';
import { parsePptx } from './pptxParser';
import type { AIProvider } from '@/lib/ai/providers';
import type { ParsedSection } from '@/types/ai';

/**
 * Parses a PDF or PPTX buffer into structured sections suitable for chunking and embedding.
 * Each section carries content origin and page/slide provenance for chunk metadata.
 */
export async function parseFile(
    buffer: Buffer,
    fileType: 'pdf' | 'pptx',
    aiProvider?: AIProvider,
): Promise<ParsedSection[]> {
    if (fileType === 'pdf') {
        return parsePdf(buffer, aiProvider);
    }
    return parsePptx(buffer, aiProvider);
}