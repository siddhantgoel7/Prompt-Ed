import JSZip from 'jszip';

/**
 * Extracts text from PPTX slide bodies AND speaker notes.
 *
 * Speaker notes are critical: pharmacology instructors put detailed explanations
 * in notes, not just slide bodies. Without notes, AI sees only bullet points like
 * "Mechanism: competitive antagonism" with no context.
 *
 * Speaker notes path via relationships:
 *   ppt/slides/slide{N}.xml has a relationship file at:
 *   ppt/slides/_rels/slide{N}.xml.rels
 *   which contains a relationship with Type ending in "notesSlide"
 *   pointing to e.g. "../notesSlides/notesSlide{N}.xml"
 *
 * MVP LIMITATION: Images and diagrams in slides are not extracted.
 * This includes chemical structures and drug mechanism figures.
 * Sprint 4: Add vision API on slide screenshots, or instructor-provided alt text.
 *
 * @see US 1.16
 */
export async function parsePptx(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);

  // Collect all slide file names
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

    // Extract slide body text
    const slideXml = await zip.files[slideFile].async('text');
    const slideBodyText = extractTextNodes(slideXml);
    if (slideBodyText) {
      parts.push(`[Slide ${slideNumber} Body] ${slideBodyText}`);
    }

    // Find notes slide via relationship file
    const relsFile = `ppt/slides/_rels/slide${slideNumber}.xml.rels`;
    if (zip.files[relsFile]) {
      const relsXml = await zip.files[relsFile].async('text');
      const notesPath = findNotesSlideTarget(relsXml, slideNumber);
      if (notesPath && zip.files[notesPath]) {
        const notesXml = await zip.files[notesPath].async('text');
        const notesText = extractTextNodes(notesXml);
        if (notesText) {
          parts.push(`[Slide ${slideNumber} Notes] ${notesText}`);
        }
      }
    }
  }

  const combined = parts.join('\n');
  // Strip Unicode control/BiDi chars that could cause prompt injection
  return stripControlChars(combined);
}

/**
 * Extracts all <a:t> text node values from an XML string.
 * OOXML uses <a:t> for text runs in both slide bodies and notes.
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
 * Returns the normalized path in the zip (e.g. "ppt/notesSlides/notesSlide1.xml").
 */
function findNotesSlideTarget(relsXml: string, slideNumber: number): string | null {
  // Match relationship entries with notesSlide type
  const notesRelPattern =
    /Type="[^"]*notesSlide"[^>]*Target="([^"]+)"/g;
  let match;
  while ((match = notesRelPattern.exec(relsXml)) !== null) {
    const target = match[1];
    // Resolve relative path: "../notesSlides/notesSlideN.xml" → "ppt/notesSlides/notesSlideN.xml"
    if (target.startsWith('../')) {
      return `ppt/${target.slice(3)}`;
    }
    if (!target.startsWith('ppt/')) {
      return `ppt/slides/${target}`;
    }
    return target;
  }
  // Fallback: try conventional path
  const fallback = `ppt/notesSlides/notesSlide${slideNumber}.xml`;
  return fallback;
}

/**
 * Strips Unicode control characters and BiDi override characters
 * that could be used for prompt injection.
 * Preserves \n (0x0A) and \t (0x09).
 */
function stripControlChars(text: string): string {
  // U+0000–U+0008, U+000B–U+001F (control chars except \t and \n)
  // U+202A–U+202E (LTR/RTL embedding/override)
  // U+2066–U+2069 (directional isolates)
  return text.replace(/[\u0000-\u0008\u000B-\u001F\u202A-\u202E\u2066-\u2069]/g, '');
}
