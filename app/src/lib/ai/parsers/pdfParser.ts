import type { AIProvider } from '@/lib/ai/providers';

const NO_VISUAL_CONTENT = 'NO_VISUAL_CONTENT';

const VISION_DEBUG = process.env.VISION_DEBUG === 'true';

function dlog(msg: string) {
  if (VISION_DEBUG) console.log(msg);
}

export async function parsePdf(buffer: Buffer, aiProvider?: AIProvider): Promise<string> {
  // Step 1: Extract text per page
  const pageTexts = await extractPageTexts(buffer);

  dlog(`[pdfParser] pages=${pageTexts.length} aiProvider=${!!aiProvider}`);
  dlog(
    `[pdfParser] textStats nonEmpty=${pageTexts.filter((t) => (t ?? '').trim().length > 0).length}`
  );

  const parts: string[] = [];

  // pdf2pic is dynamically imported to avoid bundling issues in Next.js
  let fromBuffer:
    | ((buf: Buffer, opts: Record<string, unknown>) => {
        bulk: (
          pages: number[],
          opts: { responseType: 'buffer' }
        ) => Promise<Array<{ buffer?: Buffer }>>;
      })
    | null = null;

  try {
    const pdf2pic = await import('pdf2pic');
    fromBuffer = pdf2pic.fromBuffer;
    dlog('[pdfParser] pdf2pic loaded — vision enabled');
  } catch (err) {
    console.warn('[pdfParser] pdf2pic not available — vision will be skipped:', err);
  }

  for (let i = 0; i < pageTexts.length; i++) {
    const pageNumber = i + 1;
    const pageText = pageTexts[i];
    const pageParts: string[] = [];

    dlog(`[pdfParser] page=${pageNumber} start textLen=${(pageText ?? '').length}`);

    if (pageText) {
      pageParts.push(`[Page ${pageNumber} Text] ${pageText}`);
    }

    // Helpful skip logging
    if (!aiProvider) {
      dlog(`[pdfParser] page=${pageNumber} visionSkipped: aiProvider=false`);
    } else if (!fromBuffer) {
      dlog(`[pdfParser] page=${pageNumber} visionSkipped: pdf2pic(fromBuffer)=false`);
    }

    // Vision: render page to PNG and describe visual content
    if (aiProvider && fromBuffer) {
      try {
        dlog(`[pdfParser] page=${pageNumber} visionAttempt fromBuffer=true`);

        const converter = fromBuffer(buffer, {
          density: 150, // 150 DPI — good quality/cost balance for vision
          format: 'png',
          width: 1200,
          height: 1600,
          preserveAspectRatio: true,
        });

        const results = await converter.bulk([pageNumber], { responseType: 'buffer' });
        const pageImage = results[0];

        dlog(
          `[pdfParser] page=${pageNumber} renderOK hasBuffer=${!!pageImage?.buffer} bytes=${
            pageImage?.buffer?.length ?? 0
          }`
        );

        if (pageImage?.buffer && pageImage.buffer.length > 0) {
          const base64 = pageImage.buffer.toString('base64');

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
        } else {
          dlog(`[pdfParser] page=${pageNumber} renderEmptyBuffer=true`);
        }
      } catch (err) {
        // Vision failure on one page must not abort the whole upload
        console.warn(`[pdfParser] Vision failed for page ${pageNumber}, skipping:`, err);
      }
    }

    if (pageParts.length > 0) {
      parts.push(pageParts.join('\n'));
    }
  }

  const result = parts.join('\n').trim();

  if (!result) {
    throw new Error(
      'No text or visual content found in this PDF. ' +
        'Please upload a text-based or image-based PDF.'
    );
  }

  return result;
}

/**
 * Extracts text content per page using pdfjs-dist (or LlamaParse if key is set).
 * Returns an array where index i = text for page i+1. Empty string if page had no text.
 *
 * NOTE: If LLAMA_CLOUD_API_KEY is set, this implementation returns a single-element array.
 * That means parsePdf() will only attempt vision on page 1 (because pageTexts.length === 1).
 * If you want per-page vision for the whole PDF, you must still compute the real page count
 * (e.g., via pdfjs numPages) and iterate 1..numPages for rendering.
 */
async function extractPageTexts(buffer: Buffer): Promise<string[]> {
  // LlamaParse path — returns a single markdown string, not per-page.
  if (process.env.LLAMA_CLOUD_API_KEY) {
    try {
      const { LlamaParse } = await import('llama-parse');
      const parser = new LlamaParse({ apiKey: process.env.LLAMA_CLOUD_API_KEY });
      const blob = new Blob([new Uint8Array(buffer)], { type: 'application/pdf' });
      const result = await parser.parseFile(blob as unknown as File);
      if (result.markdown) {
        return [result.markdown.trim()];
      }
    } catch (err) {
      console.warn('[pdfParser] LlamaParse failed, falling back to pdfjs-dist:', err);
    }
  }

  // pdfjs-dist path — per-page text extraction
  const pdfjsLib = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as {
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
  const pageTexts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item) => item.str).join(' ').trim();
    pageTexts.push(text); // empty string if no text — vision still runs
  }

  return pageTexts;
}