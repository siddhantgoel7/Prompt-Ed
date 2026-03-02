/**
 * Extracts text from a PDF buffer using pdfjs-dist directly.
 * pdf-parse was skipped — its installed version misresolves to pdfjs-dist internals.
 * pdfjs-dist is already present as a transitive dependency.
 *
 * MVP LIMITATION: Scanned PDFs (image-based) return empty string — no OCR.
 *
 * @see US 1.16
 */
export async function parsePdf(buffer: Buffer): Promise<string> {
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

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item) => item.str).join(' ').trim();
    if (text) pages.push(text);
  }

  const result = pages.join('\n').trim();
  if (!result) {
    throw new Error(
      'No text found in this PDF. Please upload a text-based PDF (not a scanned image).'
    );
  }
  return result;
}
