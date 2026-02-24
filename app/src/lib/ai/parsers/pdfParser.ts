/**
 * Extracts text content from a PDF buffer.
 *
 * Uses dynamic require() to avoid ESM/CJS conflict with pdf-parse in Next.js API routes.
 * If this still fails (e.g. webpack bundler issues), replace with pdfjs-dist.
 *
 * MVP LIMITATION: Scanned PDFs (image-based) return empty string — no OCR.
 * Sprint 4: Add OCR pipeline for scanned documents.
 *
 * @see US 1.16
 */
export async function parsePdf(buffer: Buffer): Promise<string> {
  // Dynamic require to avoid ESM/CJS conflict with pdf-parse in Next.js API routes
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;
  const data = await pdfParse(buffer);
  const text = data.text?.trim() ?? '';
  if (!text) {
    throw new Error(
      'No text found in this PDF. Please upload a text-based PDF (not a scanned image).'
    );
  }
  return text;
}
