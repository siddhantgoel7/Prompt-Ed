import { parsePdf } from './pdfParser';
import { parsePptx } from './pptxParser';

/**
 * Dispatches file parsing based on file type.
 * Returns extracted text content as a single string.
 *
 * @see US 1.16
 */
export async function parseFile(buffer: Buffer, fileType: 'pdf' | 'pptx'): Promise<string> {
  if (fileType === 'pdf') {
    return parsePdf(buffer);
  }
  return parsePptx(buffer);
}
