import type { AIProvider } from '@/lib/ai/providers';
import { createCanvas } from 'canvas';

const NO_VISUAL_CONTENT = 'NO_VISUAL_CONTENT';

const VISION_DEBUG = process.env.VISION_DEBUG === 'true';
function dlog(msg: string) {
  if (VISION_DEBUG) console.log(msg);
}

/**
 * Parses a PDF buffer into a combined text + visual-description string.
 *
 * - Text extraction: pdfjs-dist getTextContent()
 * - Visual extraction: pdfjs-dist page.render() into a Node canvas, then PNG bytes → base64 → vision
 *
 * Output format:
 *   [Page N Text] ...
 *   [Page N Visual Content] ...
 */
export async function parsePdf(buffer: Buffer, aiProvider?: AIProvider): Promise<string> {
  // Load pdfjs legacy build (server-friendly)
  const pdfjsLib = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as {
    getDocument: (src: { data: Uint8Array }) => {
      promise: Promise<{
        numPages: number;
        getPage: (n: number) => Promise<{
          getTextContent: () => Promise<{ items: Array<{ str: string }> }>;
          getViewport: (opts: { scale: number }) => { width: number; height: number };
          render: (ctx: { canvasContext: unknown; viewport: unknown }) => { promise: Promise<void> };
        }>;
      }>;
    };
  };

  const data = new Uint8Array(buffer);
  const pdf = await pdfjsLib.getDocument({ data }).promise;

  dlog(`[pdfParser] pages=${pdf.numPages} aiProvider=${!!aiProvider}`);

  const parts: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const pageParts: string[] = [];

    // ---- 1) Text extraction ----
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: { str: string }) => item.str)
      .join(' ')
      .trim();

    dlog(`[pdfParser] page=${pageNumber} textLen=${pageText.length}`);

    if (pageText) {
      pageParts.push(`[Page ${pageNumber} Text] ${pageText}`);
    }

    // ---- 2) Vision rendering + description ----
    if (aiProvider) {
      try {
        // scale ~1.5 is a good balance; increase if diagrams are tiny
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
        const ctx = canvas.getContext('2d');

        await page.render({ canvasContext: ctx as unknown, viewport: viewport as unknown }).promise;

        const pngBuffer = canvas.toBuffer('image/png');
        dlog(`[pdfParser] page=${pageNumber} rendered bytes=${pngBuffer.length}`);

        if (pngBuffer.length > 0) {
          const base64 = pngBuffer.toString('base64');

          dlog(
            `[pdfParser] page=${pageNumber} callingVision b64Chars=${base64.length} mime=image/png`
          );

          const description = await aiProvider.generateVisionDescription(
            base64,
            'image/png',
            pageText || undefined
          );

          dlog(
            `[pdfParser] page=${pageNumber} visionResult len=${(description ?? '').length} isNoVisual=${
              description === NO_VISUAL_CONTENT
            } preview="${(description ?? '').slice(0, 120)}"`
          );

          if (description && description !== NO_VISUAL_CONTENT) {
            pageParts.push(`[Page ${pageNumber} Visual Content] ${description}`);
          }
        }
      } catch (err) {
        // Vision failure on one page must not abort the whole upload
        console.warn(`[pdfParser] Vision failed for page ${pageNumber}, skipping:`, err);
      }
    } else {
      dlog(`[pdfParser] page=${pageNumber} visionSkipped: aiProvider=false`);
    }

    if (pageParts.length > 0) {
      parts.push(pageParts.join('\n'));
    }
  }

  const result = parts.join('\n').trim();

  if (!result) {
    throw new Error(
      'No text or visual content found in this PDF. Please upload a text-based or image-based PDF.'
    );
  }

  return result;
}