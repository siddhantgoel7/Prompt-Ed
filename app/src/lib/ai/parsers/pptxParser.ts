import JSZip from 'jszip';
import type { AIProvider } from '@/lib/ai/providers';

const NO_VISUAL_CONTENT = 'NO_VISUAL_CONTENT';

// MIME types GPT-4o vision accepts, mapped from PPTX media extensions
const VISION_MIME_MAP: Record<string, 'image/png' | 'image/jpeg' | 'image/webp'> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
};

/**
 * Extracts text AND visual content from a PPTX buffer.
 *
 * For every slide, in order:
 *   1. Slide body text (<a:t> nodes from slide XML)
 *   2. Speaker notes text (<a:t> nodes from notesSlide XML)
 *   3. Embedded images — located via the slide's rels file, then described by GPT-4o vision
 *
 * Vision is called once per image file per slide. GIF and EMF/WMF files are
 * skipped (not supported by the vision API). Vision failures on individual
 * images are caught, logged, and skipped — slide text is preserved.
 *
 * Output format per slide:
 *   [Slide N Body] ...
 *   [Slide N Notes] ...
 *   [Slide N Image 1 Visual Content] ...
 *   [Slide N Image 2 Visual Content] ...
 *
 * @see US 1.16, §9.2
 */
export async function parsePptx(
    buffer: Buffer,
    aiProvider?: AIProvider
): Promise<string> {
    const zip = await JSZip.loadAsync(buffer);

    // Collect all slide file names in slide-number order
    const slideFiles = Object.keys(zip.files)
        .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
        .sort((a, b) => {
            const numA = parseInt(a.match(/\d+/)?.[0] ?? '0', 10);
            const numB = parseInt(b.match(/\d+/)?.[0] ?? '0', 10);
            return numA - numB;
        });

    const parts: string[] = [];

    for (const slideFile of slideFiles) {
        const slideNumber = parseInt(slideFile.match(/slide(\d+)\.xml$/)?.[1] ?? '0', 10);
        const slideParts: string[] = [];

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
        if (aiProvider) {
            const imageTargets = findImageTargets(relsXml);
            let imageIndex = 0;

            for (const relTarget of imageTargets) {
                // Resolve relative path: "../media/imageN.png" → "ppt/media/imageN.png"
                const zipPath = resolveMediaPath(relTarget);
                if (!zipPath || !zip.files[zipPath]) continue;

                const ext = zipPath.split('.').pop()?.toLowerCase() ?? '';
                const mimeType = VISION_MIME_MAP[ext];

                // Skip unsupported formats (gif, emf, wmf, svg, etc.)
                if (!mimeType) {
                    console.log(`[pptxParser] Skipping unsupported image type: ${zipPath}`);
                    continue;
                }

                imageIndex++;

                try {
                    const imageBuffer = await zip.files[zipPath].async('nodebuffer');
                    const base64 = imageBuffer.toString('base64');

                    // Pass slide text as context so vision focuses on what text doesn't cover
                    const contextHint = slideBodyText || undefined;
                    const description = await aiProvider.generateVisionDescription(
                        base64,
                        mimeType,
                        contextHint
                    );

                    if (description && description !== NO_VISUAL_CONTENT) {
                        slideParts.push(
                            `[Slide ${slideNumber} Image ${imageIndex} Visual Content] ${description}`
                        );
                    }
                } catch (err) {
                    // Vision failure on one image must not abort the slide or the upload
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

/**
 * Extracts all <a:t> text node values from an XML string.
 */
function extractTextNodes(xml: string): string {
    const matches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) ?? [];
    return matches
        .map((m) => m.replace(/<[^>]+>/g, ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Parses the rels XML to find the notesSlide target path.
 */
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

/**
 * Parses the rels XML to find all image relationship targets for a slide.
 * Matches relationships with Type ending in "image".
 */
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

/**
 * Resolves a rels Target attribute to a zip path.
 * "../media/image1.png" → "ppt/media/image1.png"
 * "media/image1.png"   → "ppt/slides/media/image1.png" (edge case)
 */
function resolveMediaPath(target: string): string | null {
    if (!target) return null;
    if (target.startsWith('../')) return `ppt/${target.slice(3)}`;
    if (target.startsWith('ppt/')) return target;
    // Relative without ../  — resolve from ppt/slides/
    return `ppt/slides/${target}`;
}

/**
 * Strips Unicode control characters and BiDi override characters
 * that could be used for prompt injection.
 * Preserves \n (0x0A) and \t (0x09).
 */
function stripControlChars(text: string): string {
    return text.replace(/[\u0000-\u0008\u000B-\u001F\u202A-\u202E\u2066-\u2069]/g, '');
}