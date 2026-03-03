import type { AIProvider } from '@/lib/ai/providers';
import { createCanvas, Image } from '@napi-rs/canvas';

const NO_VISUAL_CONTENT = 'NO_VISUAL_CONTENT';
const VISION_DEBUG = process.env.VISION_DEBUG === 'true';
function dlog(msg: string) { if (VISION_DEBUG) console.log(msg); }

export async function parsePdf(buffer: Buffer, aiProvider?: AIProvider): Promise<string> {
  const pdfjs = await import('pdfjs-serverless');
  pdfjs.GlobalWorkerOptions.workerSrc = '';

  const CanvasFactory = {
    create(width: number, height: number) {
      const canvas = createCanvas(width, height);
      return { canvas, context: canvas.getContext('2d') };
    },
    reset(pair: { canvas: ReturnType<typeof createCanvas> }, width: number, height: number) {
      pair.canvas.width = width;
      pair.canvas.height = height;
    },
    destroy(pair: { canvas: ReturnType<typeof createCanvas> }) {
      pair.canvas.width = 0;
      pair.canvas.height = 0;
    },
  };

  const data = new Uint8Array(buffer);

  // Cast to any to pass canvasFactory which exists at runtime but not in the types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdf = await (pdfjs.getDocument as any)({
    data,
    canvasFactory: CanvasFactory,
    cMapPacked: true,
  }).promise;

  dlog(`[pdfParser] pages=${pdf.numPages} aiProvider=${!!aiProvider}`);

  const parts: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const pageParts: string[] = [];

    // ---- 1) Text ----
    const content = await page.getTextContent();
    const pageText = (content.items as Array<{ str: string }>)
      .map((item) => item.str)
      .join(' ')
      .trim();

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

        // Cast canvasContext to any — @napi-rs/canvas context is not
        // identical to CanvasRenderingContext2D but is compatible at runtime
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await page.render({
          canvasContext: ctx as any,
          viewport,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          canvasFactory: CanvasFactory as any,
        }).promise;

        const pngBuffer = await canvas.encode('png');

        dlog(`[pdfParser] page=${pageNumber} rendered bytes=${pngBuffer.length}`);

        if (pngBuffer.length > 10000) {
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
          dlog(`[pdfParser] page=${pageNumber} skippingVision: blank (bytes=${pngBuffer.length})`);
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