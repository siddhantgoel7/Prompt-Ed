// Parses PDF files into structured sections using pdfjs-serverless, then optionally sends the
// whole PDF to a vision model for a single-pass visual description of diagram/image pages.
import type { AIProvider } from '@/lib/ai/providers';
import type { ParsedSection } from '@/types/ai';
import { GeminiProvider } from '@/lib/ai/providers';
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
 * Returns one ParsedSection per page per content type (page_text, visual_description),
 * preserving page provenance for downstream chunk metadata.
 *
 * @param opts.onVisionRawJson [DEV-INSPECT] Called with the raw JSON string from the vision model,
 *   before page-level parsing. Remove with [DEV-INSPECT].
 */
export async function parsePdf(
  buffer: Buffer,
  aiProvider?: AIProvider,
  opts?: { onVisionRawJson?: (raw: string) => void } // [DEV-INSPECT] raw JSON callback
): Promise<ParsedSection[]> {
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
  // Process all pages in parallel — reduces total time from O(pages) to O(1) round-trips.
  // Promise.all preserves input order so page numbering stays correct.
  const pageTexts = await Promise.all(
    Array.from({ length: pdf.numPages }, async (_, idx) => {
      const i = idx + 1;
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = (content.items as Array<{ str: string }>)
        .map((item) => item.str)
        .join(' ')
        .trim();
      dlog(`[pdfParser] page=${i} textLen=${text.length}`);
      return text;
    })
  );

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
    // Prefer GeminiProvider for PDF vision when GOOGLE_AI_API_KEY is available —
    // same quality as GPT-4o at ~90% lower cost.
    const visionProvider: AIProvider = process.env.GOOGLE_AI_API_KEY
      ? new GeminiProvider()
      : aiProvider;
    try {
      const { descriptions, rawJson } = await visionProvider.generatePdfVisualDescriptions(buffer, pdf.numPages); // [DEV-INSPECT] unpack rawJson
      visualDescriptionsByPage = descriptions;
      opts?.onVisionRawJson?.(rawJson); // [DEV-INSPECT] forward raw JSON to caller
      dlog(`[pdfParser] PDF vision pass complete — got descriptions for ${descriptions.size} pages`);
    } catch (err) {
      console.warn('[pdfParser] PDF vision pass failed, continuing with text only:', err);
    }
  }

  // ── Step 3: Emit per-page sections with provenance metadata ─────────────────
  // Each section is a discrete unit (text layer or visual description) tagged with
  // its page number and content origin so the upload route can store them separately.
  const sections: ParsedSection[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    if (pageTexts[i - 1]) {
      sections.push({ content: pageTexts[i - 1], contentOrigin: 'page_text', pageNumber: i });
    }
    const visual = visualDescriptionsByPage.get(i);
    if (visual && visual !== NO_VISUAL_CONTENT) {
      sections.push({ content: visual, contentOrigin: 'visual_description', pageNumber: i });
    }
  }

  return sections;
}