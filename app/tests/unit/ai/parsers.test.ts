/**
 * Unit tests for PDF and PPTX file parsers.
 * @see US 1.16
 */
import { parsePdf } from '@/lib/ai/parsers/pdfParser';
import { parsePptx } from '@/lib/ai/parsers/pptxParser';
import { parseFile } from '@/lib/ai/parsers/index';

// Mock pdf-parse to avoid actual PDF processing in unit tests
jest.mock('pdf-parse', () =>
  jest.fn((buf: Buffer) => {
    const content = buf.toString();
    if (content.includes('EMPTY')) {
      return Promise.resolve({ text: '' });
    }
    return Promise.resolve({ text: 'Hello PDF content' });
  })
);

describe('parsePdf', () => {
  it('returns extracted text from a PDF buffer', async () => {
    const buf = Buffer.from('fake pdf content');
    const result = await parsePdf(buf);
    expect(result).toBe('Hello PDF content');
  });

  it('throws when PDF has no extractable text', async () => {
    const buf = Buffer.from('EMPTY');
    await expect(parsePdf(buf)).rejects.toThrow(
      'No text found in this PDF'
    );
  });
});

describe('parsePptx', () => {
  it('extracts slide body and notes text', async () => {
    // Build a minimal PPTX (ZIP) in memory using jszip
    const JSZip = require('jszip');
    const zip = new JSZip();

    // Minimal slide XML with a text run
    const slideXml = `<?xml version="1.0" encoding="UTF-8"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld><p:spTree>
    <p:sp><p:txBody><a:p><a:r><a:t>Slide body text</a:t></a:r></a:p></p:txBody></p:sp>
  </p:spTree></p:cSld>
</p:sld>`;

    // Minimal notes slide XML
    const notesXml = `<?xml version="1.0" encoding="UTF-8"?>
<p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
         xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld><p:spTree>
    <p:sp><p:txBody><a:p><a:r><a:t>Speaker notes text</a:t></a:r></a:p></p:txBody></p:sp>
  </p:spTree></p:cSld>
</p:notes>`;

    // Rels file pointing to notes slide
    const relsXml = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide"
    Target="../notesSlides/notesSlide1.xml"/>
</Relationships>`;

    zip.folder('ppt')?.folder('slides')?.file('slide1.xml', slideXml);
    zip.folder('ppt')?.folder('slides')?.folder('_rels')?.file('slide1.xml.rels', relsXml);
    zip.folder('ppt')?.folder('notesSlides')?.file('notesSlide1.xml', notesXml);

    const buf = await zip.generateAsync({ type: 'nodebuffer' }) as Buffer;
    const result = await parsePptx(buf);

    expect(result).toContain('Slide body text');
    expect(result).toContain('Speaker notes text');
    expect(result).toContain('[Slide 1 Body]');
    expect(result).toContain('[Slide 1 Notes]');
  });

  it('returns empty string for PPTX with no text', async () => {
    const JSZip = require('jszip');
    const zip = new JSZip();
    // Empty PPTX with a slide that has no text nodes
    const emptySlideXml = `<?xml version="1.0" encoding="UTF-8"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld><p:spTree></p:spTree></p:cSld>
</p:sld>`;
    zip.folder('ppt')?.folder('slides')?.file('slide1.xml', emptySlideXml);
    const buf = await zip.generateAsync({ type: 'nodebuffer' }) as Buffer;
    const result = await parsePptx(buf);
    expect(result.trim()).toBe('');
  });
});

describe('parseFile', () => {
  it('dispatches to parsePdf for pdf type', async () => {
    const buf = Buffer.from('fake pdf');
    const result = await parseFile(buf, 'pdf');
    expect(result).toBe('Hello PDF content');
  });

  it('dispatches to parsePptx for pptx type', async () => {
    // Use a minimal valid zip buffer
    const JSZip = require('jszip');
    const zip = new JSZip();
    const buf = await zip.generateAsync({ type: 'nodebuffer' }) as Buffer;
    const result = await parseFile(buf, 'pptx');
    expect(result).toBe('');
  });
});
