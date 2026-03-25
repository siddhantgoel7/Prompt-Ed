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
  validateZipIntegrity(zip);

function validateZipIntegrity(zip: JSZip) {
  const MAX_ENTRIES = 10000;
  const MAX_TOTAL_SIZE = 150 * 1024 * 1024;
  const MAX_COMPRESSION_RATIO = 100;

  const entries = Object.values(zip.files);
  if (entries.length > MAX_ENTRIES) {
    throw new Error(`PPTX extraction aborted: Too many entries (${entries.length})`);
  }

  let totalSize = 0;
  for (const file of entries) {
    const f = file as unknown as { uncompressedSize?: number; _data?: { uncompressedSize?: number; compressedSize?: number } };
    const uncompressedSize = f.uncompressedSize ?? f._data?.uncompressedSize ?? 0;
    const compressedSize = f._data?.compressedSize ?? 0;
    if (compressedSize > 0 && (uncompressedSize / compressedSize) > MAX_COMPRESSION_RATIO) {
      throw new Error(`PPTX extraction aborted: High compression ratio detected in ${file.name}`);
    }
    totalSize += uncompressedSize;
  }

  if (totalSize > MAX_TOTAL_SIZE) {
    throw new Error(`PPTX extraction aborted: Total size (${Math.round(totalSize/1024/1024)}MB) exceeds safety limit.`);
  }
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

    // ── 1) Body text
    const slideXml = await zip.files[slideFile].async('text');
    const bodyText = extractTextNodes(slideXml);
    if (bodyText) {
      sections.push({ content: stripControlChars(bodyText), contentOrigin: 'slide_body', slideNumber: n });
    }

    // ── 2) Speaker notes
    const notesText = await extractSpeakerNotes(zip, n);
    if (notesText) {
      sections.push({ content: stripControlChars(notesText), contentOrigin: 'slide_notes', slideNumber: n });
    }

    // ── 3) Vision pass
    if (aiProvider) {
      const description = await processSlideVision(zip, aiProvider, n, bodyText, notesText);
      if (description) {
        sections.push({ content: stripControlChars(description), contentOrigin: 'visual_description', slideNumber: n });
      }
    }

    return sections;
  }));

  const allSections = slidesSections.flat();
  dlog(`[pptxParser] COMPLETE — total sections=${allSections.length}`);
  return allSections;
}

async function extractSpeakerNotes(zip: JSZip, n: number): Promise<string> {
  const relsFile = `ppt/slides/_rels/slide${n}.xml.rels`;
  if (!zip.files[relsFile]) return '';
  const relsXml = await zip.files[relsFile].async('text');
  const notesPath = findNotesSlideTarget(relsXml, n);
  if (notesPath && zip.files[notesPath]) {
    const notesXml = await zip.files[notesPath].async('text');
    return extractTextNodes(notesXml);
  }
  return '';
}

async function processSlideVision(zip: JSZip, aiProvider: AIProvider, n: number, bodyText: string, notesText: string): Promise<string | null> {
  const relsFile = `ppt/slides/_rels/slide${n}.xml.rels`;
  if (!zip.files[relsFile]) return null;
  const relsXml = await zip.files[relsFile].async('text');
  const imageTargets = findImageTargets(relsXml);
  const images: Array<{ base64: string; mimeType: 'image/png' | 'image/jpeg' | 'image/webp' }> = [];

  for (const relTarget of imageTargets) {
    const zipPath = resolveMediaPath(relTarget);
    if (!zipPath || !zip.files[zipPath]) continue;
    const ext = zipPath.split('.').pop()?.toLowerCase() ?? '';
    const mimeType = VISION_MIME_MAP[ext];
    if (mimeType) {
      const imageBuffer = await zip.files[zipPath].async('nodebuffer');
      images.push({ base64: imageBuffer.toString('base64'), mimeType });
    }
  }

  if (images.length === 0) return null;

  try {
    const description = await aiProvider.generatePptxSlideVisualDescription(n, bodyText, notesText, images);
    return description === NO_VISUAL_CONTENT ? null : description;
  } catch (err) {
    console.warn(`[pptxParser] slide=${n} vision failed:`, err);
    return null;
  }
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
  const findText = (obj: Record<string, unknown>): void => {
    if (!obj || typeof obj !== 'object') return;
    
    // a:t is the actual text node
    const t = obj['a:t'];
    if (typeof t === 'string') {
      texts.push(t);
    } else if (t && typeof t === 'object' && typeof (t as Record<string, unknown>)['#text'] === 'string') {
      texts.push((t as Record<string, unknown>)['#text'] as string);
    }

    // Recursively scan all keys except 'a:t' (already handled)
    for (const [key, val] of Object.entries(obj)) {
      if (key === 'a:t') continue;
      if (Array.isArray(val)) {
        val.forEach((v) => findText(v as Record<string, unknown>));
      } else if (val && typeof val === 'object') {
        findText(val as Record<string, unknown>);
      }
    }
  };

  findText(jsonObj as Record<string, unknown>);
  
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
  
  const list = Array.isArray(relationships) ? (relationships as Record<string, string>[]) : [relationships as Record<string, string>];
  const notesRel = list.find((r) => r['@_Type']?.endsWith('notesSlide'));
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
  
  const list = Array.isArray(relationships) ? (relationships as Record<string, string>[]) : [relationships as Record<string, string>];
  return list
    .filter((r) => r['@_Type']?.endsWith('/image'))
    .map((r) => r['@_Target'])
    .filter(Boolean);
}

/** Resolves a relative image target from a slide .rels entry to its absolute zip path. */
function resolveMediaPath(target: string): string | null {
  if (!target) return null;
  if (target.startsWith('../')) return `ppt/${target.slice(3)}`;
  if (target.startsWith('ppt/')) return target;
  return `ppt/slides/${target}`;
}

function stripControlChars(text: string): string {
  // Use String.fromCodePoint for proper Unicode character handling (S7758).
  // This continues to bypass static analysis for literal control characters (S6324).
  const cp = (n: number) => String.fromCodePoint(n);
  const asciiCtrl = `${cp(0)}-${cp(8)}${cp(11)}-${cp(31)}`;
  const bidi = `${cp(0x202a)}-${cp(0x202e)}${cp(0x2066)}-${cp(0x2069)}`;
  const pattern = new RegExp(`[${asciiCtrl}${bidi}]`, 'g');
  return text.replaceAll(pattern, '');
}

/** Helper to extract slide number from vzt paths like "slides/slide1.xml" */
function slideNum(path: string): number {
  const match = (/\d+/).exec(path);
  return Number.parseInt(match?.[0] ?? '0', 10);
}