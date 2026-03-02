/**
 * Extracts text from a PDF buffer.
 * If LLAMA_CLOUD_API_KEY is present, natively parses scanned PDFs and diagrams using LlamaParse.
 * Otherwise, falls back to text-only extraction using pdfjs-dist.
 *
 * @see US 1.16
 */
export async function parsePdf(buffer: Buffer): Promise<string> {
  if (process.env.LLAMA_CLOUD_API_KEY) {
    try {
      // Dynamic import to avoid bundling issues
      const { LlamaParse } = await import('llama-parse');
      const parser = new LlamaParse({ apiKey: process.env.LLAMA_CLOUD_API_KEY });

      // LlamaParse supports Blob directly
      const blob = new Blob([new Uint8Array(buffer)], { type: 'application/pdf' });
      const result = await parser.parseFile(blob as unknown as File);

      if (result.markdown) {
        return result.markdown.trim();
      }
    } catch (err) {
      console.warn('LlamaParse failed, falling back to text-only pdfjs-dist:', err);
    }
  }

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
