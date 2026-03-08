// Parses PDF files into text using pdfjs-serverless, then optionally sends the whole
// PDF to GPT-4o for a single-pass visual description of any pages with diagrams or images.
import type { AIProvider } from '@/lib/ai/providers';
import { createCanvas, Path2D } from '@napi-rs/canvas';

const NO_VISUAL_CONTENT = 'NO_VISUAL_CONTENT';
const VISION_DEBUG = process.env.VISION_DEBUG === 'true';
function dlog(msg: string) { if (VISION_DEBUG) console.log(msg); }

/** Polyfills globalThis.Path2D and globalThis.createCanvas needed by pdfjs-serverless. */
function registerCanvasGlobals() {
  const g = globalThis as unknown as Record<string, unknown>;
  if (typeof g.Path2D === 'undefined') {
    g.Path2D = Path2D;
    dlog('[pdfParser] Polyfilled globalThis.Path2D');
  }
  if (typeof g.createCanvas === 'undefined') {
    g.createCanvas = createCanvas;
    dlog('[pdfParser] Polyfilled globalThis.createCanvas');
  }
}

/**
 * Extracts text and visual content from a PDF buffer.
 * Returns a page-annotated string with [Page N Text] and optional [Page N Visual Content] sections.
 */
export async function parsePdf(buffer: Buffer, aiProvider?: AIProvider): Promise<string> {
  registerCanvasGlobals();

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdf = await (pdfjs.getDocument as any)({
    data,
    canvasFactory: CanvasFactory,
    cMapPacked: true,
  }).promise;

  dlog(`[pdfParser] pages=${pdf.numPages} aiProvider=${!!aiProvider}`);

  // ── Step 1: Extract text from every page (pdfjs, always works) ─────────────
  const pageTexts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = (content.items as Array<{ str: string }>)
      .map((item) => item.str)
      .join(' ')
      .trim();
    pageTexts.push(text);
    dlog(`[pdfParser] page=${i} textLen=${text.length}`);
  }

  // ── Step 2: One-shot visual pass — send whole PDF to GPT-4o ────────────────
  // Why one whole-PDF call instead of per-page rendering:
  //   - pdfjs-serverless's internal canvas factory breaks on image-bearing pages
  //     (Error: @napi-rs/canvas is not available) regardless of globalThis polyfills,
  //     because the check lives inside the pre-bundled module scope.
  //   - OpenAI GPT-4o natively parses PDFs including all embedded images/diagrams,
  //     preserving layout context (captions stay with their figures).
  //   - One API call vs N page renders: faster and cheaper.
  let visualDescriptionsByPage: Map<number, string> = new Map();

  if (aiProvider) {
    try {
      const descriptions = await aiProvider.generatePdfVisualDescriptions(buffer, pdf.numPages);
      visualDescriptionsByPage = descriptions;
      dlog(`[pdfParser] PDF vision pass complete — got descriptions for ${descriptions.size} pages`);
    } catch (err) {
      console.warn('[pdfParser] PDF vision pass failed, continuing with text only:', err);
    }
  }

  // ── Step 3: Merge text + visual descriptions per page ──────────────────────
  const parts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const pageParts: string[] = [];
    if (pageTexts[i - 1]) {
      pageParts.push(`[Page ${i} Text] ${pageTexts[i - 1]}`);
    }
    const visual = visualDescriptionsByPage.get(i);
    if (visual && visual !== NO_VISUAL_CONTENT) {
      pageParts.push(`[Page ${i} Visual Content] ${visual}`);
    }
    if (pageParts.length > 0) parts.push(pageParts.join('\n'));
  }

  const result = parts.join('\n').trim();
  if (!result) {
    throw new Error('No text or visual content found in this PDF.');
  }
  return result;
}