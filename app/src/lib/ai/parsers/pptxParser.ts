// Parses PPTX files into plain text by extracting slide body, speaker notes,
// and optionally describing embedded images via GPT-4o vision (one call per slide).
import JSZip from 'jszip';
import type { AIProvider } from '@/lib/ai/providers';

const NO_VISUAL_CONTENT = 'NO_VISUAL_CONTENT';
const VISION_DEBUG = process.env.VISION_DEBUG === 'true';
function dlog(msg: string) { if (VISION_DEBUG) console.log(msg); }

// MIME types GPT-4o vision accepts, mapped from PPTX media extensions.
// EMF, WMF, SVG, GIF are intentionally excluded — GPT-4o does not accept them.
const VISION_MIME_MAP: Record<string, 'image/png' | 'image/jpeg' | 'image/webp'> = {
  png:  'image/png',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

/**
 * Extracts text AND visual content from a PPTX buffer.
 *
 * Per-slide pipeline:
 *   1. Body text  → [Slide N Body]
 *   2. Speaker notes → [Slide N Notes]
 *   3. Embedded images (PNG/JPG/WEBP) + body + notes → ONE GPT-4o call
 *      → [Slide N Visual Content]
 *
 * Why one call per slide (not one call per image):
 *   - GPT-4o sees body text, notes, and ALL images simultaneously, so it can
 *     cross-reference diagram labels with slide text without losing context.
 *   - Reduces API calls from (images × slides) to (slides with images).
 *   - The model is explicitly told not to repeat what's already in text/notes,
 *     so visual descriptions are additive, not redundant.
 *
 * Why not send the whole PPTX as a file (like we do for PDF):
 *   - OpenAI file inputs only support PDF natively; PPTX is not a supported format.
 *   - We extract images directly from the ZIP and send them as image_url parts.
 */
export async function parsePptx(buffer: Buffer, aiProvider?: AIProvider): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);

  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => slideNum(a) - slideNum(b));

  dlog(`[pptxParser] slidesFound=${slideFiles.length} aiProvider=${!!aiProvider}`);

  // Process all slides in parallel — vision calls (one per slide) are the bottleneck,
  // so running them concurrently reduces total time from O(slides) to O(1) round-trips.
  // Promise.all preserves input order so slide numbering stays correct.
  const parts = (await Promise.all(slideFiles.map(async (slideFile) => {
    const n = slideNum(slideFile);
    const slideParts: string[] = [];

    dlog(`[pptxParser] ── slide ${n} ──────────────────────`);

    // ── 1) Body text ──────────────────────────────────────────────────────────
    const slideXml = await zip.files[slideFile].async('text');
    const bodyText = extractTextNodes(slideXml);
    if (bodyText) {
      slideParts.push(`[Slide ${n} Body] ${bodyText}`);
      dlog(`[pptxParser] slide=${n} bodyText len=${bodyText.length}: "${bodyText.slice(0, 80)}..."`);
    } else {
      dlog(`[pptxParser] slide=${n} bodyText: (empty)`);
    }

    // ── 2) Speaker notes ──────────────────────────────────────────────────────
    const relsFile = `ppt/slides/_rels/slide${n}.xml.rels`;
    let relsXml = '';
    if (zip.files[relsFile]) {
      relsXml = await zip.files[relsFile].async('text');
    }

    let notesText = '';
    if (relsXml) {
      const notesPath = findNotesSlideTarget(relsXml, n);
      if (notesPath && zip.files[notesPath]) {
        const notesXml = await zip.files[notesPath].async('text');
        notesText = extractTextNodes(notesXml);
      }
    }

    if (notesText) {
      slideParts.push(`[Slide ${n} Notes] ${notesText}`);
      dlog(`[pptxParser] slide=${n} notes len=${notesText.length}: "${notesText.slice(0, 80)}..."`);
    } else {
      dlog(`[pptxParser] slide=${n} notes: (empty)`);
    }

    // ── 3) Vision pass — one call per slide with ALL images ───────────────────
    if (!aiProvider) {
      dlog(`[pptxParser] slide=${n} vision: SKIPPED (no aiProvider)`);
    } else {
      // Collect all supported images for this slide
      const imageTargets = findImageTargets(relsXml);
      dlog(`[pptxParser] slide=${n} imageRefs found=${imageTargets.length}: ${imageTargets.join(', ')}`);

      const images: Array<{ base64: string; mimeType: 'image/png' | 'image/jpeg' | 'image/webp'; zipPath: string }> = [];

      for (const relTarget of imageTargets) {
        const zipPath = resolveMediaPath(relTarget);
        if (!zipPath || !zip.files[zipPath]) {
          dlog(`[pptxParser] slide=${n} imageRef="${relTarget}" → zipPath="${zipPath}" NOT FOUND in zip`);
          continue;
        }

        const ext = zipPath.split('.').pop()?.toLowerCase() ?? '';
        const mimeType = VISION_MIME_MAP[ext];

        if (!mimeType) {
          dlog(`[pptxParser] slide=${n} zipPath="${zipPath}" ext="${ext}" → SKIPPED (unsupported format)`);
          continue;
        }

        const imageBuffer = await zip.files[zipPath].async('nodebuffer');
        const base64 = imageBuffer.toString('base64');
        images.push({ base64, mimeType, zipPath });
        dlog(`[pptxParser] slide=${n} image loaded: zipPath="${zipPath}" mime=${mimeType} b64Chars=${base64.length}`);
      }

      dlog(`[pptxParser] slide=${n} vision-eligible images=${images.length}`);

      if (images.length === 0) {
        dlog(`[pptxParser] slide=${n} vision: SKIPPED (no supported images)`);
      } else {
        // One GPT-4o call: body text + notes + all images together
        dlog(`[pptxParser] slide=${n} calling generatePptxSlideVisualDescription with ${images.length} image(s)`);
        try {
          const description = await aiProvider.generatePptxSlideVisualDescription(
            n,
            bodyText,
            notesText,
            images.map(({ base64, mimeType }) => ({ base64, mimeType }))
          );

          const isNoVisual = !description || description === NO_VISUAL_CONTENT;
          dlog(
            `[pptxParser] slide=${n} vision result: isNoVisual=${isNoVisual} ` +
            `len=${description?.length ?? 0} preview="${(description ?? '').slice(0, 120)}"`
          );

          if (!isNoVisual) {
            slideParts.push(`[Slide ${n} Visual Content] ${description}`);
          }
        } catch (err) {
          console.warn(`[pptxParser] slide=${n} vision call failed, skipping:`, err);
        }
      }
    }

    dlog(`[pptxParser] slide=${n} done — parts emitted: ${slideParts.length}`);
    return slideParts.length > 0 ? slideParts.join('\n') : null;
  }))).filter((p): p is string => p !== null);

  const combined = parts.join('\n');
  dlog(`[pptxParser] COMPLETE — total chars=${combined.length}`);
  return stripControlChars(combined);
}

// ── XML helpers ────────────────────────────────────────────────────────────────

/** Extracts all text node values from PPTX/OOXML and joins them with spaces. */
function extractTextNodes(xml: string): string {
  const matches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) ?? [];
  return matches
    .map((m) => m.replace(/<[^>]+>/g, ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Finds the notes slide path from a slide's .rels file, with fallback to the default naming convention. */
function findNotesSlideTarget(relsXml: string, slideNumber: number): string | null {
  const pattern = /Type="[^"]*notesSlide"[^>]*Target="([^"]+)"/g;
  let match;
  while ((match = pattern.exec(relsXml)) !== null) {
    const target = match[1];
    if (target.startsWith('../')) return `ppt/${target.slice(3)}`;
    if (!target.startsWith('ppt/')) return `ppt/slides/${target}`;
    return target;
  }
  return `ppt/notesSlides/notesSlide${slideNumber}.xml`;
}

/** Extracts all image relationship targets from a slide's .rels file. */
function findImageTargets(relsXml: string): string[] {
  if (!relsXml) return [];
  const pattern = /Type="[^"]*\/image"[^>]*Target="([^"]+)"/g;
  const targets: string[] = [];
  let match;
  while ((match = pattern.exec(relsXml)) !== null) {
    targets.push(match[1]);
  }
  return targets;
}

/** Resolves a relative image target from a slide .rels entry to its absolute zip path. */
function resolveMediaPath(target: string): string | null {
  if (!target) return null;
  if (target.startsWith('../')) return `ppt/${target.slice(3)}`;
  if (target.startsWith('ppt/')) return target;
  return `ppt/slides/${target}`;
}

/** Removes control characters and Unicode bidi overrides that can corrupt chunk storage. */
function stripControlChars(text: string): string {
  return text.replace(/[\u0000-\u0008\u000B-\u001F\u202A-\u202E\u2066-\u2069]/g, '');
}

/** Extracts the numeric slide index from a ppt/slides/slideN.xml path. */
function slideNum(path: string): number {
  return parseInt(path.match(/\d+/)?.[0] ?? '0', 10);
}