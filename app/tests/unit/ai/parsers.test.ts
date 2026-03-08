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
    it('success: returns labelled page text when PDF has text content', async () => {
      const result = await parsePdf(Buffer.from('fake pdf content'));
      expect(result).toBe('[Page 1 Text] Hello PDF content');
    });

    it('success: returns text for all pages in a multi-page PDF', async () => {
      const result = await parsePdf(Buffer.from('MULTI'));
      expect(result).toContain('[Page 1 Text] Page 1 text');
      expect(result).toContain('[Page 2 Text] Page 2 text');
    });

    it('failure: throws when PDF yields no text and no aiProvider for vision', async () => {
      await expect(parsePdf(Buffer.from('EMPTY'))).rejects.toThrow(
        'No text or visual content found in this PDF.'
      );
    });
  });

  describe('vision pass (generatePdfVisualDescriptions)', () => {
    it('success: merges visual description alongside page text', async () => {
      const descMap = new Map([[1, 'Diagram showing DNA double helix and RNAi pathway']]);
      const provider = makeMockProvider({
        generatePdfVisualDescriptions: jest.fn().mockResolvedValue(descMap),
      });

      const result = await parsePdf(Buffer.from('fake pdf content'), provider);

      expect(result).toContain('[Page 1 Text] Hello PDF content');
      expect(result).toContain('[Page 1 Visual Content] Diagram showing DNA double helix');
      expect(provider.generatePdfVisualDescriptions).toHaveBeenCalledWith(
        expect.any(Buffer), 1
      );
    });

    it('success: omits Visual Content label when provider returns empty map (text-only page)', async () => {
      const provider = makeMockProvider({
        generatePdfVisualDescriptions: jest.fn().mockResolvedValue(new Map()),
      });

      const result = await parsePdf(Buffer.from('fake pdf content'), provider);

      expect(result).toContain('[Page 1 Text] Hello PDF content');
      expect(result).not.toContain('Visual Content');
    });

    it('failure: falls back to text-only result when vision API call fails', async () => {
      jest.spyOn(console, 'warn').mockImplementation(() => { });
      const provider = makeMockProvider({
        generatePdfVisualDescriptions: jest.fn().mockRejectedValue(new Error('OpenAI 500')),
      });

      // Must not throw — vision failure is non-fatal
      const result = await parsePdf(Buffer.from('fake pdf content'), provider);
      expect(result).toBe('[Page 1 Text] Hello PDF content');
      (console.warn as jest.Mock).mockRestore();
    });

    it('success: visual content alone satisfies non-empty result when page has no text', async () => {
      const descMap = new Map([[1, 'Scanned chemical structure: benzene ring with OH group']]);
      const provider = makeMockProvider({
        generatePdfVisualDescriptions: jest.fn().mockResolvedValue(descMap),
      });

      // EMPTY mock → no text items on any page
      const result = await parsePdf(Buffer.from('EMPTY'), provider);
      expect(result).toContain('[Page 1 Visual Content] Scanned chemical structure');
    });

    it('success: no vision call is made when aiProvider is not supplied', async () => {
      const result = await parsePdf(Buffer.from('fake pdf content'));
      expect(result).toBe('[Page 1 Text] Hello PDF content');
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
    it('success: extracts slide body text with correct label', async () => {
      const buf = await buildPptx([{ num: 1, bodyText: 'Slide body text' }]);
      expect(await parsePptx(buf)).toContain('[Slide 1 Body] Slide body text');
    });

    it('success: extracts speaker notes with correct label', async () => {
      const buf = await buildPptx([{ num: 1, bodyText: 'Body', notesText: 'Speaker notes text' }]);
      const result = await parsePptx(buf);
      expect(result).toContain('[Slide 1 Notes] Speaker notes text');
    });

    it('success: processes multiple slides in slide-number order', async () => {
      const buf = await buildPptx([
        { num: 1, bodyText: 'First slide' },
        { num: 2, bodyText: 'Second slide' },
      ]);
      const result = await parsePptx(buf);
      expect(result.indexOf('[Slide 1 Body]')).toBeLessThan(result.indexOf('[Slide 2 Body]'));
    });

    it('success: returns empty string for PPTX with no text nodes anywhere', async () => {
      const buf = await buildPptx([{ num: 1 }]);
      expect((await parsePptx(buf)).trim()).toBe('');
    });
  });

  describe('vision pass (generatePptxSlideVisualDescription)', () => {
    it('success: calls vision with body, notes, and image — appends Visual Content label', async () => {
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
      expect(result).toContain('[Slide 1 Visual Content] RNAi pathway');
    });

    it('success: omits Visual Content label when vision returns NO_VISUAL_CONTENT', async () => {
      const provider = makeMockProvider({
        generatePptxSlideVisualDescription: jest.fn().mockResolvedValue('NO_VISUAL_CONTENT'),
      });
      const buf = await buildPptx([{
        num: 1, bodyText: 'Text only', images: [{ name: 'logo.png', bytes: FAKE_PNG }],
      }]);

      const result = await parsePptx(buf, provider);
      expect(result).not.toContain('Visual Content');
      expect(result).toContain('[Slide 1 Body] Text only');
    });

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
      expect(result).toContain('[Slide 1 Body] Slide 1');
      expect(result).not.toContain('[Slide 1 Visual Content]');
      // Slide 2: vision succeeded
      expect(result).toContain('[Slide 2 Visual Content] Slide 2 diagram');
      (console.warn as jest.Mock).mockRestore();
    });

    it('success: no vision calls when aiProvider is not supplied', async () => {
      const buf = await buildPptx([{
        num: 1, bodyText: 'Body text',
        images: [{ name: 'image1.png', bytes: FAKE_PNG }],
      }]);
      const result = await parsePptx(buf);
      expect(result).toContain('[Slide 1 Body] Body text');
      expect(result).not.toContain('Visual Content');
    });
  });
});

// parseFile dispatcher
describe('[US 1.16] parseFile dispatcher', () => {
  it('success: routes "pdf" type to parsePdf', async () => {
    const result = await parseFile(Buffer.from('fake pdf'), 'pdf');
    expect(result).toBe('[Page 1 Text] Hello PDF content');
  });

  it('success: routes "pptx" type to parsePptx', async () => {
    const buf = await (new JSZip()).generateAsync({ type: 'nodebuffer' }) as Buffer;
    expect(await parseFile(buf, 'pptx')).toBe('');
  });

  it('success: passes aiProvider through to parsePdf vision path', async () => {
    const descMap = new Map([[1, 'Visual description from provider']]);
    const provider = makeMockProvider({
      generatePdfVisualDescriptions: jest.fn().mockResolvedValue(descMap),
    });
    const result = await parseFile(Buffer.from('fake pdf'), 'pdf', provider);
    expect(result).toContain('[Page 1 Visual Content] Visual description from provider');
  });

  it('success: passes aiProvider through to parsePptx vision path', async () => {
    const provider = makeMockProvider({
      generatePptxSlideVisualDescription: jest.fn().mockResolvedValue('Diagram via dispatcher'),
    });
    const buf = await buildPptx([{
      num: 1, bodyText: 'Dispatcher test',
      images: [{ name: 'img.png', bytes: FAKE_PNG }],
    }]);
    const result = await parseFile(buf, 'pptx', provider);
    expect(result).toContain('[Slide 1 Visual Content] Diagram via dispatcher');
  });
});