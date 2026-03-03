import JSZip from 'jszip';
import type { AIProvider } from '@/lib/ai/providers';

const NO_VISUAL_CONTENT = 'NO_VISUAL_CONTENT';

const VISION_DEBUG = process.env.VISION_DEBUG === 'true';

function dlog(msg: string) {
  if (VISION_DEBUG) console.log(msg);
}

// MIME types GPT-4o vision accepts, mapped from PPTX media extensions
const VISION_MIME_MAP: Record<string, 'image/png' | 'image/jpeg' | 'image/webp'> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

/**
 * Extracts text AND visual content from a PPTX buffer.
 */
export async function parsePptx(buffer: Buffer, aiProvider?: AIProvider): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);

  // Collect all slide file names in slide-number order
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] ?? '0', 10);
      const numB = parseInt(b.match(/\d+/)?.[0] ?? '0', 10);
      return numA - numB;
    });

  dlog(`[pptxParser] slidesFound=${slideFiles.length} aiProvider=${!!aiProvider}`);

  const parts: string[] = [];

  for (const slideFile of slideFiles) {
    const slideNumber = parseInt(slideFile.match(/slide(\d+)\.xml$/)?.[1] ?? '0', 10);
    const slideParts: string[] = [];

    dlog(`[pptxParser] slide=${slideNumber} start file=${slideFile}`);

    // --- 1. Slide body text ---
    const slideXml = await zip.files[slideFile].async('text');
    const slideBodyText = extractTextNodes(slideXml);
    if (slideBodyText) {
      slideParts.push(`[Slide ${slideNumber} Body] ${slideBodyText}`);
    }

    // --- 2. Speaker notes ---
    const relsFile = `ppt/slides/_rels/slide${slideNumber}.xml.rels`;
    let relsXml = '';
    if (zip.files[relsFile]) {
      relsXml = await zip.files[relsFile].async('text');
    }
    dlog(`[pptxParser] slide=${slideNumber} relsLoaded=${!!relsXml && relsXml.length > 0}`);

    if (relsXml) {
      const notesPath = findNotesSlideTarget(relsXml, slideNumber);
      if (notesPath && zip.files[notesPath]) {
        const notesXml = await zip.files[notesPath].async('text');
        const notesText = extractTextNodes(notesXml);
        if (notesText) {
          slideParts.push(`[Slide ${slideNumber} Notes] ${notesText}`);
        }
      }
    }

    // --- 3. Embedded images via vision ---
    if (!aiProvider) {
      dlog(`[pptxParser] slide=${slideNumber} visionSkipped: aiProvider=false`);
    }

    if (aiProvider) {
      const imageTargets = findImageTargets(relsXml);
      dlog(`[pptxParser] slide=${slideNumber} imageTargets=${imageTargets.length}`);

      let imageIndex = 0;

      for (const relTarget of imageTargets) {
        const zipPath = resolveMediaPath(relTarget);
        dlog(`[pptxParser] slide=${slideNumber} relTarget=${relTarget} zipPath=${zipPath}`);

        if (!zipPath || !zip.files[zipPath]) continue;

        const ext = zipPath.split('.').pop()?.toLowerCase() ?? '';
        const mimeType = VISION_MIME_MAP[ext];

        dlog(
          `[pptxParser] slide=${slideNumber} zipPath=${zipPath} ext=${ext} mime=${
            mimeType ?? 'unsupported'
          }`
        );

        // Skip unsupported formats (gif, emf, wmf, svg, etc.)
        if (!mimeType) {
          console.log(`[pptxParser] Skipping unsupported image type: ${zipPath}`);
          continue;
        }

        imageIndex++;

        try {
          const imageBuffer = await zip.files[zipPath].async('nodebuffer');
          const base64 = imageBuffer.toString('base64');

          dlog(
            `[pptxParser] slide=${slideNumber} image=${imageIndex} callingVision b64Chars=${base64.length} mime=${mimeType}`
          );

          // Pass slide text as context so vision focuses on what text doesn't cover
          const contextHint = slideBodyText || undefined;
          const description = await aiProvider.generateVisionDescription(base64, mimeType, contextHint);

          dlog(
            `[pptxParser] slide=${slideNumber} image=${imageIndex} visionResult len=${
              (description ?? '').length
            } isNoVisual=${description === NO_VISUAL_CONTENT} preview="${(description ?? '').slice(
              0,
              120
            )}"`
          );

          if (description && description !== NO_VISUAL_CONTENT) {
            slideParts.push(`[Slide ${slideNumber} Image ${imageIndex} Visual Content] ${description}`);
          }
        } catch (err) {
          console.warn(
            `[pptxParser] Vision failed for slide ${slideNumber} image ${imageIndex} (${zipPath}), skipping:`,
            err
          );
        }
      }
    }

    if (slideParts.length > 0) {
      parts.push(slideParts.join('\n'));
    }
  }

  const combined = parts.join('\n');
  return stripControlChars(combined);
}

function extractTextNodes(xml: string): string {
  const matches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) ?? [];
  return matches
    .map((m) => m.replace(/<[^>]+>/g, ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findNotesSlideTarget(relsXml: string, slideNumber: number): string | null {
  const notesRelPattern = /Type="[^"]*notesSlide"[^>]*Target="([^"]+)"/g;
  let match;
  while ((match = notesRelPattern.exec(relsXml)) !== null) {
    const target = match[1];
    if (target.startsWith('../')) return `ppt/${target.slice(3)}`;
    if (!target.startsWith('ppt/')) return `ppt/slides/${target}`;
    return target;
  }
  return `ppt/notesSlides/notesSlide${slideNumber}.xml`;
}

function findImageTargets(relsXml: string): string[] {
  if (!relsXml) return [];
  const imageRelPattern = /Type="[^"]*\/image"[^>]*Target="([^"]+)"/g;
  const targets: string[] = [];
  let match;
  while ((match = imageRelPattern.exec(relsXml)) !== null) {
    targets.push(match[1]);
  }
  return targets;
}

function resolveMediaPath(target: string): string | null {
  if (!target) return null;
  if (target.startsWith('../')) return `ppt/${target.slice(3)}`;
  if (target.startsWith('ppt/')) return target;
  return `ppt/slides/${target}`;
}

function stripControlChars(text: string): string {
  return text.replace(/[\u0000-\u0008\u000B-\u001F\u202A-\u202E\u2066-\u2069]/g, '');
}