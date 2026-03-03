import { parsePdf } from './pdfParser';
import { parsePptx } from './pptxParser';
import type { AIProvider } from '@/lib/ai/providers';

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