import { parsePdf } from '@/lib/ai/parsers/pdfParser';
import { parsePptx } from '@/lib/ai/parsers/pptxParser';
import { parseFile } from '@/lib/ai/parsers/index';
import type { AIProvider } from '@/lib/ai/providers';
import JSZip from 'jszip';

//pdfjs-serverless mock
jest.mock('pdfjs-serverless', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: jest.fn((src: { data: Uint8Array }) => {
    const content = Buffer.from(src.data).toString();

    if (content.includes('EMPTY')) {
      // All pages have no text — simulates image-only PDF
      return {
        promise: Promise.resolve({
          numPages: 1,
          getPage: jest.fn().mockResolvedValue({
            getTextContent: jest.fn().mockResolvedValue({ items: [] }),
          }),
        }),
      };
    }

    if (content.includes('MULTI')) {
      // 2-page PDF for ordering tests
      return {
        promise: Promise.resolve({
          numPages: 2,
          getPage: jest.fn().mockImplementation((n: number) =>
            Promise.resolve({
              getTextContent: jest.fn().mockResolvedValue({
                items: [{ str: `Page ${n} text` }],
              }),
            })
          ),
        }),
      };
    }

    return {
      promise: Promise.resolve({
        numPages: 1,
        getPage: jest.fn().mockResolvedValue({
          getTextContent: jest.fn().mockResolvedValue({
            items: [{ str: 'Hello PDF content' }],
          }),
        }),
      }),
    };
  }),
}));

// @napi-rs/canvas mock
jest.mock('@napi-rs/canvas', () => ({
  createCanvas: jest.fn(),
  Path2D: class { },
}));

// Shared mock AIProvider factory
function makeMockProvider(overrides: Partial<AIProvider> = {}): AIProvider {
  return {
    generateChatCompletion: jest.fn(),
    generateEmbedding: jest.fn(),
    generateVisionDescription: jest.fn().mockResolvedValue('NO_VISUAL_CONTENT'),
    generatePdfVisualDescriptions: jest.fn().mockResolvedValue(new Map()),
    generatePptxSlideVisualDescription: jest.fn().mockResolvedValue('NO_VISUAL_CONTENT'),
    ...overrides,
  };
}

// parsePdf
describe('[US 1.16] parsePdf', () => {

  describe('text extraction', () => {
    // 37.1
    it('success: returns page_text section when PDF has text content', async () => {
      const result = await parsePdf(Buffer.from('fake pdf content'));
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ content: 'Hello PDF content', contentOrigin: 'page_text', pageNumber: 1 });
    });

    // 37.2
    it('success: returns page_text sections for all pages in a multi-page PDF', async () => {
      const result = await parsePdf(Buffer.from('MULTI'));
      const page1 = result.find(s => s.pageNumber === 1 && s.contentOrigin === 'page_text');
      const page2 = result.find(s => s.pageNumber === 2 && s.contentOrigin === 'page_text');
      expect(page1?.content).toBe('Page 1 text');
      expect(page2?.content).toBe('Page 2 text');
    });

    // 37.3
    it('failure: returns empty array when PDF yields no text and no aiProvider for vision', async () => {
      const result = await parsePdf(Buffer.from('EMPTY'));
      expect(result).toEqual([]);
    });
  });

  describe('vision pass (generatePdfVisualDescriptions)', () => {
    // 37.4
    it('success: emits both page_text and visual_description sections', async () => {
      const descMap = new Map([[1, 'Diagram showing DNA double helix and RNAi pathway']]);
      const provider = makeMockProvider({
        generatePdfVisualDescriptions: jest.fn().mockResolvedValue(descMap),
      });

      const result = await parsePdf(Buffer.from('fake pdf content'), provider);

      const textSection = result.find(s => s.contentOrigin === 'page_text');
      const visualSection = result.find(s => s.contentOrigin === 'visual_description');
      expect(textSection?.content).toBe('Hello PDF content');
      expect(visualSection?.content).toContain('Diagram showing DNA double helix');
      expect(visualSection?.pageNumber).toBe(1);
      expect(provider.generatePdfVisualDescriptions).toHaveBeenCalledWith(
        expect.any(Buffer), 1
      );
    });

    // 37.5
    it('success: emits only page_text section when provider returns empty map (text-only page)', async () => {
      const provider = makeMockProvider({
        generatePdfVisualDescriptions: jest.fn().mockResolvedValue(new Map()),
      });

      const result = await parsePdf(Buffer.from('fake pdf content'), provider);

      expect(result).toHaveLength(1);
      expect(result[0].contentOrigin).toBe('page_text');
      expect(result.find(s => s.contentOrigin === 'visual_description')).toBeUndefined();
    });

    // 37.6
    it('failure: falls back to text-only sections when vision API call fails', async () => {
      jest.spyOn(console, 'warn').mockImplementation(() => { });
      const provider = makeMockProvider({
        generatePdfVisualDescriptions: jest.fn().mockRejectedValue(new Error('OpenAI 500')),
      });

      const result = await parsePdf(Buffer.from('fake pdf content'), provider);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ content: 'Hello PDF content', contentOrigin: 'page_text' });
      (console.warn as jest.Mock).mockRestore();
    });

    // 37.7
    it('success: visual_description alone satisfies result when page has no text', async () => {
      const descMap = new Map([[1, 'Scanned chemical structure: benzene ring with OH group']]);
      const provider = makeMockProvider({
        generatePdfVisualDescriptions: jest.fn().mockResolvedValue(descMap),
      });

      // EMPTY mock → no text items on any page
      const result = await parsePdf(Buffer.from('EMPTY'), provider);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ contentOrigin: 'visual_description', pageNumber: 1 });
      expect(result[0].content).toContain('Scanned chemical structure');
    });

    // 37.8
    it('success: no vision call is made when aiProvider is not supplied', async () => {
      const result = await parsePdf(Buffer.from('fake pdf content'));
      expect(result).toHaveLength(1);
      expect(result[0].contentOrigin).toBe('page_text');
    });
  });
});

// parsePptx helpers

async function buildPptx(slides: Array<{
  num: number;
  bodyText?: string;
  notesText?: string;
  images?: Array<{ name: string; bytes: Buffer }>;
}>): Promise<Buffer> {
  const zip = new JSZip();

  for (const slide of slides) {
    const n = slide.num;

    const bodyNodes = slide.bodyText
      ? `<p:sp><p:txBody><a:p><a:r><a:t>${slide.bodyText}</a:t></a:r></a:p></p:txBody></p:sp>`
      : '';

    zip.folder('ppt')?.folder('slides')?.file(`slide${n}.xml`,
      `<?xml version="1.0" encoding="UTF-8"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld><p:spTree>${bodyNodes}</p:spTree></p:cSld>
</p:sld>`);

    if (slide.notesText) {
      zip.folder('ppt')?.folder('notesSlides')?.file(`notesSlide${n}.xml`,
        `<?xml version="1.0" encoding="UTF-8"?>
<p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
         xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld><p:spTree>
    <p:sp><p:txBody><a:p><a:r><a:t>${slide.notesText}</a:t></a:r></a:p></p:txBody></p:sp>
  </p:spTree></p:cSld>
</p:notes>`);
    }

    const notesRel = slide.notesText
      ? `<Relationship Id="rId1"
           Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide"
           Target="../notesSlides/notesSlide${n}.xml"/>`
      : '';

    const imageRels = (slide.images ?? []).map((img, i) =>
      `<Relationship Id="rId${i + 2}"
         Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
         Target="../media/${img.name}"/>`
    ).join('\n');

    zip.folder('ppt')?.folder('slides')?.folder('_rels')?.file(`slide${n}.xml.rels`,
      `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${notesRel}
  ${imageRels}
</Relationships>`);

    for (const img of slide.images ?? []) {
      zip.folder('ppt')?.folder('media')?.file(img.name, img.bytes);
    }
  }

  return zip.generateAsync({ type: 'nodebuffer' }) as Promise<Buffer>;
}

const FAKE_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG magic bytes
const FAKE_JPEG = Buffer.from([0xff, 0xd8, 0xff]);       // JPEG magic bytes

// parsePptx
describe('[US 1.16] parsePptx', () => {

  describe('text extraction', () => {
    // 37.9
    it('success: emits slide_body section with correct content', async () => {
      const buf = await buildPptx([{ num: 1, bodyText: 'Slide body text' }]);
      const result = await parsePptx(buf);
      const section = result.find(s => s.contentOrigin === 'slide_body');
      expect(section?.content).toContain('Slide body text');
      expect(section?.slideNumber).toBe(1);
    });

    // 37.10
    it('success: emits slide_notes section with correct content', async () => {
      const buf = await buildPptx([{ num: 1, bodyText: 'Body', notesText: 'Speaker notes text' }]);
      const result = await parsePptx(buf);
      const section = result.find(s => s.contentOrigin === 'slide_notes');
      expect(section?.content).toContain('Speaker notes text');
      expect(section?.slideNumber).toBe(1);
    });

    // 37.11
    it('success: sections for slide 1 appear before sections for slide 2', async () => {
      const buf = await buildPptx([
        { num: 1, bodyText: 'First slide' },
        { num: 2, bodyText: 'Second slide' },
      ]);
      const result = await parsePptx(buf);
      const idx1 = result.findIndex(s => s.slideNumber === 1);
      const idx2 = result.findIndex(s => s.slideNumber === 2);
      expect(idx1).toBeLessThan(idx2);
    });

    // 37.12
    it('success: returns empty array for PPTX with no text nodes anywhere', async () => {
      const buf = await buildPptx([{ num: 1 }]);
      expect(await parsePptx(buf)).toEqual([]);
    });
  });

  describe('vision pass (generatePptxSlideVisualDescription)', () => {
    // 37.13
    it('success: emits visual_description section when vision returns content', async () => {
      const provider = makeMockProvider({
        generatePptxSlideVisualDescription: jest.fn().mockResolvedValue(
          'RNAi pathway: nucleus at top, Dicer cleavage in cytoplasm, RISC loading'
        ),
      });
      const buf = await buildPptx([{
        num: 1,
        bodyText: 'RNAi Pathway',
        notesText: 'Describe the steps',
        images: [{ name: 'pathway.png', bytes: FAKE_PNG }],
      }]);

      const result = await parsePptx(buf, provider);

      expect(provider.generatePptxSlideVisualDescription).toHaveBeenCalledWith(
        1, 'RNAi Pathway', 'Describe the steps',
        [{ base64: expect.any(String), mimeType: 'image/png' }]
      );
      const visual = result.find(s => s.contentOrigin === 'visual_description');
      expect(visual?.content).toContain('RNAi pathway');
      expect(visual?.slideNumber).toBe(1);
    });

    // 37.14
    it('success: no visual_description section when vision returns NO_VISUAL_CONTENT', async () => {
      const provider = makeMockProvider({
        generatePptxSlideVisualDescription: jest.fn().mockResolvedValue('NO_VISUAL_CONTENT'),
      });
      const buf = await buildPptx([{
        num: 1, bodyText: 'Text only', images: [{ name: 'logo.png', bytes: FAKE_PNG }],
      }]);

      const result = await parsePptx(buf, provider);
      expect(result.find(s => s.contentOrigin === 'visual_description')).toBeUndefined();
      expect(result.find(s => s.contentOrigin === 'slide_body')?.content).toContain('Text only');
    });

    // 37.15
    it('success: skips vision entirely for slides with no supported image formats (EMF/WMF)', async () => {
      const provider = makeMockProvider();
      const buf = await buildPptx([{
        num: 1,
        bodyText: 'Slide with vector graphic',
        images: [{ name: 'diagram.emf', bytes: Buffer.from('emf data') }],
      }]);

      await parsePptx(buf, provider);
      expect(provider.generatePptxSlideVisualDescription).not.toHaveBeenCalled();
    });

    // 37.16
    it('success: handles JPEG images with correct mime type', async () => {
      const provider = makeMockProvider({
        generatePptxSlideVisualDescription: jest.fn().mockResolvedValue('JPEG diagram'),
      });
      const buf = await buildPptx([{
        num: 1, bodyText: 'Body',
        images: [{ name: 'chart.jpg', bytes: FAKE_JPEG }],
      }]);

      await parsePptx(buf, provider);
      expect(provider.generatePptxSlideVisualDescription).toHaveBeenCalledWith(
        1, 'Body', '',
        [{ base64: expect.any(String), mimeType: 'image/jpeg' }]
      );
    });

    // 37.17
    it('failure: continues processing remaining slides when vision fails on one slide', async () => {
      jest.spyOn(console, 'warn').mockImplementation(() => { });
      let callCount = 0;
      const provider = makeMockProvider({
        generatePptxSlideVisualDescription: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) return Promise.reject(new Error('OpenAI 500'));
          return Promise.resolve('Slide 2 diagram: receptor signaling cascade');
        }),
      });
      const buf = await buildPptx([
        { num: 1, bodyText: 'Slide 1', images: [{ name: 'img1.png', bytes: FAKE_PNG }] },
        { num: 2, bodyText: 'Slide 2', images: [{ name: 'img2.png', bytes: FAKE_PNG }] },
      ]);

      const result = await parsePptx(buf, provider);

      // Slide 1: vision failed but body text still emitted
      expect(result.find(s => s.slideNumber === 1 && s.contentOrigin === 'slide_body')?.content).toContain('Slide 1');
      expect(result.find(s => s.slideNumber === 1 && s.contentOrigin === 'visual_description')).toBeUndefined();
      // Slide 2: vision succeeded
      expect(result.find(s => s.slideNumber === 2 && s.contentOrigin === 'visual_description')?.content).toContain('Slide 2 diagram');
      (console.warn as jest.Mock).mockRestore();
    });

    // 37.18
    it('success: no vision calls when aiProvider is not supplied', async () => {
      const buf = await buildPptx([{
        num: 1, bodyText: 'Body text',
        images: [{ name: 'image1.png', bytes: FAKE_PNG }],
      }]);
      const result = await parsePptx(buf);
      expect(result.find(s => s.contentOrigin === 'slide_body')?.content).toContain('Body text');
      expect(result.find(s => s.contentOrigin === 'visual_description')).toBeUndefined();
    });
  });

  describe('security & robustness', () => {
    // [Manual Test] Covers Zip Bomb prevention (S5042)
    it('failure: throws error when PPTX exceeds MAX_TOTAL_SIZE (Zip Bomb prevention)', async () => {
      const zip = new JSZip();
      // Add a large file (151MB > 150MB limit)
      // Note: We use a small compressed buffer but large uncompressedSize
      zip.file('large.txt', Buffer.alloc(151 * 1024 * 1024)); 
      const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
      await expect(parsePptx(buf)).rejects.toThrow(/exceeds safety limit|High compression ratio/);
    });

    // [Manual Test] Covers ReDoS prevention logic (S5852)
    it('success: extractTextNodes handles deeply nested <a:t> nodes using XMLParser', async () => {
      const zip = new JSZip();
      zip.folder('ppt')?.folder('slides')?.file('slide1.xml', `
        <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <p:cSld><p:spTree><p:sp><p:txBody><a:p>
            <a:r><a:t>Level 1</a:t></a:r>
            <a:fld><a:t>Level 2 (Field)</a:t></a:fld>
          </a:p></p:txBody></p:sp></p:spTree></p:cSld>
        </p:sld>
      `);
      const buf = await zip.generateAsync({ type: 'nodebuffer' });
      const result = await parsePptx(buf);
      expect(result[0].content).toBe('Level 1 Level 2 (Field)');
    });

    it('success: handles missing .rels files gracefully with fallback target', async () => {
      const zip = new JSZip();
      // Slide XML but NO .rels folder
      zip.folder('ppt')?.folder('slides')?.file('slide1.xml', '<a:t>Content</a:t>');
      const buf = await zip.generateAsync({ type: 'nodebuffer' });
      
      const result = await parsePptx(buf);
      // Should not crash, just returns content
      expect(result[0].content).toBe('Content');
    });

    it('success: findImageTargets handles multiple image relationships correctly', async () => {
      const zip = new JSZip();
      zip.folder('ppt')?.folder('slides')?.file('slide1.xml', '<a:t>Slide with images</a:t>');
      zip.folder('ppt')?.folder('slides')?.folder('_rels')?.file('slide1.xml.rels', `
        <?xml version="1.0" encoding="UTF-8"?>
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
          <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>
          <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image2.jpg"/>
          <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="../notesSlides/notesSlide1.xml"/>
        </Relationships>
      `);
      
      const provider = makeMockProvider({
        generatePptxSlideVisualDescription: jest.fn().mockResolvedValue('Description'),
      });
      // Mock images exist in zip
      zip.folder('ppt')?.folder('media')?.file('image1.png', FAKE_PNG);
      zip.folder('ppt')?.folder('media')?.file('image2.jpg', FAKE_JPEG);

      const buf = await zip.generateAsync({ type: 'nodebuffer' });
      await parsePptx(buf, provider);

      expect(provider.generatePptxSlideVisualDescription).toHaveBeenCalledWith(
        1, 'Slide with images', '',
        expect.arrayContaining([
          expect.objectContaining({ mimeType: 'image/png' }),
          expect.objectContaining({ mimeType: 'image/jpeg' }),
        ])
      );
    });
  });
});

// parseFile dispatcher
describe('[US 1.16] parseFile dispatcher', () => {
  // 37.19
  it('success: routes "pdf" type to parsePdf and returns ParsedSection[]', async () => {
    const result = await parseFile(Buffer.from('fake pdf'), 'pdf');
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toMatchObject({ contentOrigin: 'page_text' });
  });

  // 37.20
  it('success: routes "pptx" type to parsePptx and returns empty array for empty PPTX', async () => {
    const buf = await (new JSZip()).generateAsync({ type: 'nodebuffer' }) as Buffer;
    expect(await parseFile(buf, 'pptx')).toEqual([]);
  });

  // 37.21
  it('success: passes aiProvider through to parsePdf vision path', async () => {
    const descMap = new Map([[1, 'Visual description from provider']]);
    const provider = makeMockProvider({
      generatePdfVisualDescriptions: jest.fn().mockResolvedValue(descMap),
    });
    const result = await parseFile(Buffer.from('fake pdf'), 'pdf', provider);
    expect(result.find(s => s.contentOrigin === 'visual_description')?.content).toContain('Visual description from provider');
  });

  // 37.22
  it('success: passes aiProvider through to parsePptx vision path', async () => {
    const provider = makeMockProvider({
      generatePptxSlideVisualDescription: jest.fn().mockResolvedValue('Diagram via dispatcher'),
    });
    const buf = await buildPptx([{
      num: 1, bodyText: 'Dispatcher test',
      images: [{ name: 'img.png', bytes: FAKE_PNG }],
    }]);
    const result = await parseFile(buf, 'pptx', provider);
    expect(result.find(s => s.contentOrigin === 'visual_description')?.content).toContain('Diagram via dispatcher');
  });
});
