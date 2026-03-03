import type { AIProvider } from '@/lib/ai/providers';
import { createCanvas, Image } from 'canvas';

const NO_VISUAL_CONTENT = 'NO_VISUAL_CONTENT';
const VISION_DEBUG = process.env.VISION_DEBUG === 'true';
function dlog(msg: string) { if (VISION_DEBUG) console.log(msg); }

/**
 * Canvas factory required by pdfjs-dist when running in Node.
 * Without this, pdfjs cannot decode embedded images and falls back
 * to a no-op renderer that produces blank PNGs.
 */
const NodeCanvasFactory = {
  create(width: number, height: number) {
    const canvas = createCanvas(width, height);
    return { canvas, context: canvas.getContext('2d') };
  },
  reset(
    canvasAndContext: { canvas: ReturnType<typeof createCanvas>; context: unknown },
    width: number,
    height: number
  ) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  },
  destroy(canvasAndContext: { canvas: ReturnType<typeof createCanvas> }) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
  },
};

export async function parsePdf(buffer: Buffer, aiProvider?: AIProvider): Promise<string> {
  const pdfjsLib = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as {
    getDocument: (src: {
      data: Uint8Array;
      canvasFactory?: typeof NodeCanvasFactory;
      cMapUrl?: string;
      cMapPacked?: boolean;
    }) => {
      promise: Promise<{
        numPages: number;
        getPage: (n: number) => Promise<{
          getTextContent: () => Promise<{ items: Array<{ str: string }> }>;
          getViewport: (opts: { scale: number }) => { width: number; height: number };
          render: (ctx: {
            canvasContext: unknown;
            viewport: unknown;
            canvasFactory?: typeof NodeCanvasFactory;
          }) => { promise: Promise<void> };
        }>;
      }>;
    };
  };

  const data = new Uint8Array(buffer);
  const pdf = await pdfjsLib.getDocument({
    data,
    canvasFactory: NodeCanvasFactory,
  }).promise;

  dlog(`[pdfParser] pages=${pdf.numPages} aiProvider=${!!aiProvider}`);

  const parts: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const pageParts: string[] = [];

    // ---- 1) Text ----
    const content = await page.getTextContent();
    const pageText = content.items.map((item: { str: string }) => item.str).join(' ').trim();
    dlog(`[pdfParser] page=${pageNumber} textLen=${pageText.length}`);
    if (pageText) {
      pageParts.push(`[Page ${pageNumber} Text] ${pageText}`);
    }

    // ---- 2) Vision ----
    if (aiProvider) {
      try {
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
        const ctx = canvas.getContext('2d');

        await page.render({
          canvasContext: ctx as unknown,
          viewport: viewport as unknown,
          canvasFactory: NodeCanvasFactory,
        }).promise;

        const pngBuffer = canvas.toBuffer('image/png');
        dlog(`[pdfParser] page=${pageNumber} rendered bytes=${pngBuffer.length}`);

        if (pngBuffer.length > 5000) { // blank PNG is ~6424, real content is much larger
          const base64 = pngBuffer.toString('base64');
          dlog(`[pdfParser] page=${pageNumber} callingVision b64Chars=${base64.length}`);

          const description = await aiProvider.generateVisionDescription(
            base64,
            'image/png',
            pageText || undefined
          );

          dlog(`[pdfParser] page=${pageNumber} vision="${(description ?? '').slice(0, 120)}"`);

          if (description && description !== NO_VISUAL_CONTENT) {
            pageParts.push(`[Page ${pageNumber} Visual Content] ${description}`);
          }
        } else {
          dlog(`[pdfParser] page=${pageNumber} skippingVision: blank canvas (bytes=${pngBuffer.length})`);
        }
      } catch (err) {
        console.warn(`[pdfParser] Vision failed for page ${pageNumber}, skipping:`, err);
      }
    }

    if (pageParts.length > 0) {
      parts.push(pageParts.join('\n'));
    }
  }

  const result = parts.join('\n').trim();
  if (!result) {
    throw new Error('No text or visual content found in this PDF.');
  }
  return result;
}