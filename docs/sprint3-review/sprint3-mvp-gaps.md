# Sprint 3 MVP Gaps

**Date**: February 24, 2026
**Purpose**: Document what Sprint 3 does NOT deliver and why, so Sprint 4 planning starts informed.

---

## 1. Images and Diagrams in Slides/PDFs

**Description**: The text-only parsing pipeline (`pdf-parse` for PDFs, custom XML extraction for PPTX) cannot extract images, diagrams, charts, or embedded figures. Only text content is chunked and embedded.

**Impact**: Slide decks that rely heavily on visual content (e.g., molecular structures, pharmacokinetic curves) will produce incomplete context for AI prompt generation, potentially leading to less relevant discussion questions.

**Recommended Sprint 4 approach**: Integrate OpenAI Vision API to process extracted images, or fall back to alt-text extraction from PPTX image elements. Budget additional API cost for vision calls.

---

## 2. Speaker Notes Validation

**Description**: The PPTX parser targets the correct XML paths for speaker notes (`p:notes`), but has only been tested against synthetic test files. Real-world PPTX files from PowerPoint, Google Slides exports, and Keynote exports may have structural differences.

**Impact**: Speaker notes may silently fail to extract for certain file formats, reducing AI context quality without any user-visible error.

**Recommended Sprint 4 approach**: Collect 5-10 real PPTX files from instructors and validate extraction. Add a warning in the upload response if zero speaker notes are found in a file that contains slides.

---

## 3. Speech-to-Text (STT)

**Description**: US 1.17 (STT) is deferred. Sprint 3 provides a manual `transcriptText` field on the generate API route as a placeholder.

**Impact**: Instructors must manually type or paste lecture context rather than having it captured automatically from speech. This reduces the convenience quality goal for live lectures.

**Recommended Sprint 4 approach**: Integrate Whisper API (or browser-based Web Speech API for lower latency). Stream audio from the instructor's microphone, transcribe in segments, and persist chunks to `lesson_chunks` with `source = 'transcript'`.

---

## 4. Weighted RAG Retrieval

**Description**: The 40% transcript / 40% slides / 20% file weighting scheme is documented in the architecture proposal but not implemented. Sprint 3 uses equal-weight cosine similarity across all chunk sources.

**Impact**: AI prompt generation treats all context sources equally. In practice, recent transcript content should be weighted higher to produce discussion questions relevant to what was just said in the lecture.

**Recommended Sprint 4 approach**: Implement source-weighted retrieval in `retrieveChunks.ts` using the existing `source` column in `lesson_chunks`. Apply configurable weight multipliers to similarity scores before ranking.

---

## 5. Chunk Quality Filtering

**Description**: No minimum-length filter is applied to chunks. Headers, page numbers, footer text, and other short fragments may appear as chunks and consume embedding space.

**Impact**: Low-quality chunks can dilute retrieval results, causing the AI to receive noisy context. This is unlikely to cause major issues at classroom scale but reduces prompt quality for content-dense slide decks.

**Recommended Sprint 4 approach**: Add a minimum character threshold (e.g., 50 characters) when creating chunks. Optionally apply a stop-word ratio filter to discard chunks that are mostly boilerplate.

---

## 6. Transcript Persistence

**Description**: The `lesson_chunks` schema includes support for `source = 'transcript'` chunks, but the STT route that would create these chunks is not built. The `/api/lessons/[lessonId]/transcript` route accepts text but does not persist it as chunks.

**Impact**: Transcript text is used only for the current generation request and is not stored for future retrieval or re-generation. If an instructor regenerates prompts later, the transcript context is lost.

**Recommended Sprint 4 approach**: When the transcript route receives text, chunk it using the same `RecursiveCharacterTextSplitter` used for files, embed the chunks, and store them in `lesson_chunks` with `source = 'transcript'`.

---

## 7. Rate Limiting on AI Routes

**Description**: No rate limiting is implemented on the `/api/lessons/[lessonId]/generate` or `/api/lessons/[lessonId]/transcript` routes.

**Impact**: At classroom scale (1 instructor per lesson, ~50-200 students), this is acceptable. However, a malicious or buggy client could trigger excessive OpenAI API calls, leading to unexpected costs.

**Recommended Sprint 4 approach**: Add a simple per-lesson rate limit (e.g., max 10 generation requests per lesson per hour) using an in-memory counter or Supabase row check. No external rate-limiting infrastructure is needed at this scale.
