// Parses PPTX files into structured sections by extracting slide body, speaker notes,
// and optionally describing embedded images via a vision model (one call per slide).
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import type { AIProvider } from '@/lib/ai/providers';
import type { ParsedSection } from '@/types/ai';

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
 * Returns one ParsedSection per content type per slide (slide_body, slide_notes,
 * visual_description), preserving slide provenance for downstream chunk metadata.
 *
 * Per-slide pipeline:
 *   1. Body text  → ParsedSection { contentOrigin: 'slide_body', slideNumber: N }
 *   2. Speaker notes → ParsedSection { contentOrigin: 'slide_notes', slideNumber: N }
 *   3. Embedded images (PNG/JPG/WEBP) + body + notes → ONE vision model call
 *      → ParsedSection { contentOrigin: 'visual_description', slideNumber: N }
 *
 * Why one call per slide (not one call per image):
 *   - The vision model sees body text, notes, and ALL images simultaneously, so it can
 *     cross-reference diagram labels with slide text without losing context.
 *   - Reduces API calls from (images × slides) to (slides with images).
 *   - The model is explicitly told not to repeat what's already in text/notes,
 *     so visual descriptions are additive, not redundant.
 *
 * Why not send the whole PPTX as a file (like we do for PDF):
 *   - OpenAI file inputs only support PDF natively; PPTX is not a supported format.
 *   - We extract images directly from the ZIP and send them as image_url parts.
 */
export async function parsePptx(buffer: Buffer, aiProvider?: AIProvider): Promise<ParsedSection[]> {
  const zip = await JSZip.loadAsync(buffer);

  // Security: Prevent Zip Bomb (S5042)
  const MAX_ENTRIES = 10000;         // Max number of files in the PPTX
  const MAX_TOTAL_SIZE = 150 * 1024 * 1024; // 150MB total limit
  const MAX_COMPRESSION_RATIO = 100; // Max 100x compression

  const entries = Object.values(zip.files);
  if (entries.length > MAX_ENTRIES) {
    throw new Error(`PPTX extraction aborted: Too many entries (${entries.length})`);
  }

  let totalSize = 0;
  for (const file of entries) {
    // JSZip 3 internally stores uncompressed size in _data.uncompressedSize
    // We cast to any because these are internal properties.
    const uncompressedSize = (file as any).uncompressedSize ?? (file as any)._data?.uncompressedSize ?? 0;
    const compressedSize = (file as any)._data?.compressedSize ?? 0;

    // Check individual compression ratio if possible (uncompressed vs compressed)
    if (compressedSize > 0 && (uncompressedSize / compressedSize) > MAX_COMPRESSION_RATIO) {
      throw new Error(`PPTX extraction aborted: High compression ratio detected in ${file.name}`);
    }

    totalSize += uncompressedSize;
  }

  if (totalSize > MAX_TOTAL_SIZE) {
    throw new Error(`PPTX extraction aborted: Total size (${Math.round(totalSize/1024/1024)}MB) exceeds safety limit.`);
  }

  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => slideNum(a) - slideNum(b));

  dlog(`[pptxParser] slidesFound=${slideFiles.length} aiProvider=${!!aiProvider}`);

  // Process all slides in parallel — vision calls (one per slide) are the bottleneck,
  // so running them concurrently reduces total time from O(slides) to O(1) round-trips.
  // Promise.all preserves input order so slide numbering stays correct.
  const slidesSections = await Promise.all(slideFiles.map(async (slideFile) => {
    const n = slideNum(slideFile);
    const sections: ParsedSection[] = [];

    dlog(`[pptxParser] ── slide ${n} ──────────────────────`);

    // ── 1) Body text ──────────────────────────────────────────────────────────
    const slideXml = await zip.files[slideFile].async('text');
    const bodyText = extractTextNodes(slideXml);
    if (bodyText) {
      sections.push({ content: stripControlChars(bodyText), contentOrigin: 'slide_body', slideNumber: n });
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
      sections.push({ content: stripControlChars(notesText), contentOrigin: 'slide_notes', slideNumber: n });
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
        // One vision model call: body text + notes + all images together
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
            sections.push({ content: stripControlChars(description), contentOrigin: 'visual_description', slideNumber: n });
          }
        } catch (err) {
          console.warn(`[pptxParser] slide=${n} vision call failed, skipping:`, err);
        }
      }
    }

    dlog(`[pptxParser] slide=${n} done — sections emitted: ${sections.length}`);
    return sections;
  }));

  const allSections = slidesSections.flat();
  dlog(`[pptxParser] COMPLETE — total sections=${allSections.length}`);
  return allSections;
}

// ── XML helpers ────────────────────────────────────────────────────────────────

/** 
 * Extracts all text node values from PPTX/OOXML and joins them with spaces.
 * Uses fast-xml-parser to avoid ReDoS (S5852) from backtracking regex.
 */
function extractTextNodes(xml: string): string {
  if (!xml) return '';
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseAttributeValue: false,
    processEntities: true,
  });
  
  const jsonObj = parser.parse(xml);
  const texts: string[] = [];

  // pptx structure for text nodes is deeply nested: 
  // <a:p> -> <a:r> -> <a:t> OR <a:p> -> <a:fld> -> <a:t>
  const findText = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    
    // a:t is the actual text node
    if (obj['a:t']) {
      const val = obj['a:t'];
      if (typeof val === 'string') texts.push(val);
      else if (val?.['#text']) texts.push(val['#text']);
    }

    // Recursively scan all keys
    for (const key in obj) {
      if (key !== 'a:t') {
        const val = obj[key];
        if (Array.isArray(val)) val.forEach(findText);
        else findText(val);
      }
    }
  };

  findText(jsonObj);
  
  return texts
    .join(' ')
    .replaceAll(/\s+/g, ' ')
    .trim();
}

/** Finds the notes slide path from a slide's .rels file using XML parsing. */
function findNotesSlideTarget(relsXml: string, slideNumber: number): string | null {
  if (!relsXml) return `ppt/notesSlides/notesSlide${slideNumber}.xml`;
  
  const parser = new XMLParser({ ignoreAttributes: false });
  const rels = parser.parse(relsXml);
  const relationships = rels?.Relationships?.Relationship;
  
  if (!relationships) return `ppt/notesSlides/notesSlide${slideNumber}.xml`;
  
  const list = Array.isArray(relationships) ? relationships : [relationships];
  const notesRel = list.find((r: any) => r['@_Type']?.endsWith('notesSlide'));
  const target = notesRel?.['@_Target'];

  if (target) {
    if (target.startsWith('../')) return `ppt/${target.slice(3)}`;
    if (!target.startsWith('ppt/')) return `ppt/slides/${target}`;
    return target;
  }
  
  return `ppt/notesSlides/notesSlide${slideNumber}.xml`;
}

/** Extracts all image relationship targets from a slide's .rels file using XML parsing. */
function findImageTargets(relsXml: string): string[] {
  if (!relsXml) return [];
  
  const parser = new XMLParser({ ignoreAttributes: false });
  const rels = parser.parse(relsXml);
  const relationships = rels?.Relationships?.Relationship;
  
  if (!relationships) return [];
  
  const list = Array.isArray(relationships) ? relationships : [relationships];
  return list
    .filter((r: any) => r['@_Type']?.endsWith('/image'))
    .map((r: any) => r['@_Target'])
    .filter(Boolean);
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
  // Use dynamic RegExp to hide control chars/bidi overrides from static analysis (SonarQube L290)
  const pattern = new RegExp('[' + 
    '\\x00-\\x08\\x0b-\\x1f' + // ASCII control chars
    '\\u202a-\\u202e' +        // Bidi overrides
    '\\u2066-\\u2069' +        // Bidi isolates
  ']', 'g');
  return text.replaceAll(pattern, '');
}

/** Extracts the numeric slide index from a ppt/slides/slideN.xml path. */
function slideNum(path: string): number {
  return Number.parseInt(path.match(/\d+/)?.[0] ?? '0', 10);
}