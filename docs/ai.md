# **PMCOL Teaching Tool — Sprint 3: AI Pipeline Technical Documentation**

## **Table of Contents**

1. System Overview  
2. File Upload & Parsing  
3. Embeddings  
4. Speech-to-Text (Whisper)  
5. RAG Generation  
6. Security  
7. UI Components & Hooks  
8. Provider Architecture  
9. Image & PDF Vision Pipeline  
10. Database Schema  
11. Configuration Reference

---

## **1\. System Overview**

Sprint 3 adds a full Retrieval-Augmented Generation (RAG) pipeline to the PMCOL teaching tool. Instructors upload PDF or PPTX lecture slides before class; the system chunks, embeds, and stores them in a pgvector store. During class, the instructor records a spoken segment, which is transcribed by OpenAI Whisper. That transcript is embedded and used for semantic similarity search, retrieving the most relevant slide chunks before GPT-4o-mini generates discussion question candidates. The instructor selects one and publishes it to students via Supabase Realtime.

### **1.1 End-to-End Instructor Workflow**

Before class:  Upload PDF/PPTX via Files tab in session sidebar  
System:        Detect file type → parse text \+ visual content → chunk → embed → store in lesson\_chunks (status \= ready)  
During class:  Click "Start Recording" while explaining a concept  
               Click "Stop & Transcribe" → audio POST → /api/lessons/\[lessonId\]/transcript → Whisper returns text  
System:        Embed transcript → vector similarity search → retrieve top-8 chunks → GPT-4o-mini → N candidates  
Instructor:    Click candidate card → click "Publish This Question" → handlePublishAiCandidate()  
Realtime:      Discussion broadcast to all students (is\_correct stripped before broadcast)

### **1.2 Technology Stack**

| Layer | Technology |
| ----- | ----- |
| PDF parsing | `pdfjs-serverless` with `@napi-rs/canvas` polyfill |
| PDF vision | GPT-4o native PDF file input (whole-document, one API call) |
| PPTX parsing | JSZip \+ OOXML `<a:t>` regex \+ rels chain for speaker notes |
| PPTX vision | GPT-4o per-slide image pass (body \+ notes \+ images in one call) |
| Chunking | `@langchain/textsplitters` RecursiveCharacterTextSplitter (500 chars / 200 overlap) |
| Embeddings | OpenAI `text-embedding-3-small` — 1536 dimensions — batched 100/request |
| Vector store | Supabase pgvector, `match_lesson_chunks` RPC with HNSW index |
| Speech-to-Text | OpenAI Whisper `whisper-1` — `audio/webm;codecs=opus` preferred |
| Generation | OpenAI `gpt-4o-mini` — `json_object` mode — temperature 0.7 |
| Realtime | Supabase Broadcast Channel (`discussion:published` event) |
| AI Provider Layer | `OpenAIProvider` class in `src/lib/ai/providers.ts` (interface-based) |

---

## **2\. File Upload & Parsing**

**Route:** `src/app/api/lessons/[lessonId]/upload/route.ts`

### **2.1 Upload Pipeline**

The POST handler orchestrates the full ingest pipeline **with background processing**. The file record is inserted immediately with `status = 'processing'` and the HTTP response is returned to the client before parsing begins. Processing runs in a fire-and-forget async function.

**Foreground (blocking, returns HTTP response):**

1. Auth — `supabase.auth.getUser()`  
2. Ownership — two-step query: `lessons → courses` (see §6.1)  
3. File validation — 25 MB size limit \+ magic-byte type detection  
4. File cap — maximum 5 files per lesson (COUNT query)  
5. Storage upload — `lesson-files` bucket at `{lessonId}/{uuid}-{name}`  
6. DB insert — `lesson_files` row with `status = 'processing'`  
7. Return HTTP 200 immediately with the file record

**Background (non-blocking, fire-and-forget):**

1. Parse — `parseFile(buffer, detectedType, aiProvider)` dispatches to PDF or PPTX parser (including vision pass if `aiProvider` provided)  
2. Chunk — `RecursiveCharacterTextSplitter`, max 500 chunks  
3. Insert chunks — `lesson_chunks` rows (no embeddings yet)  
4. Embed — `embedChunks(chunkIds, supabase, aiProvider)` batches at 100  
5. Mark ready — `UPDATE lesson_files SET status = 'ready'`  
6. On any error — `UPDATE lesson_files SET status = 'failed'`

**Key change from old doc:** Processing is now fully non-blocking. The client receives `status: 'processing'` immediately and polls every 2 seconds (via `useLessonFiles` polling hook) until `status` transitions to `ready` or `failed`.

### **2.2 Magic-Byte File Type Detection**

File type is detected from the first 4 bytes of the buffer — not the `Content-Type` header or file extension, which can be spoofed:

PDF:  0x25 0x50 0x44 0x46  (%PDF)  
PPTX: 0x50 0x4B 0x03 0x04  (PK ZIP header — PPTX is a ZIP archive)

Files not matching either signature are rejected with HTTP 400 before any parsing or storage occurs.

### **2.3 Parser Dispatcher**

**File:** `src/lib/ai/parsers/index.ts`

export async function parseFile(  
    buffer: Buffer,  
    fileType: 'pdf' | 'pptx',  
    aiProvider?: AIProvider  
): Promise\<string\>

The `aiProvider` parameter is optional. When provided, vision passes run for both PDF and PPTX. When omitted, parsing is text-only (used in tests and mock mode).

### **2.4 PDF Parser**

**File:** `src/lib/ai/parsers/pdfParser.ts`

Uses `pdfjs-serverless` (not the standard `pdfjs-dist` legacy build as documented previously). The serverless build avoids worker thread requirements in Next.js App Router.

**Important:** `@napi-rs/canvas` is required as a polyfill. `globalThis.Path2D` and `globalThis.createCanvas` are patched before pdfjs initialises, because the bundled pdfjs scope checks these globals directly.

**Three-phase pipeline per document:**

1. **Text extraction** — iterate every page, call `page.getTextContent()`, join `item.str` values  
2. **Vision pass** — send the entire PDF buffer to GPT-4o as a native file input (`type: 'file'`) in a single API call. Returns a `Map<pageNumber, description>` for pages with visual content. Text-only pages return `NO_VISUAL_CONTENT` and are excluded.  
3. **Merge** — combine `[Page N Text]` and `[Page N Visual Content]` blocks per page

**Why whole-PDF vision instead of per-page rendering:**

* `pdfjs-serverless`'s internal canvas factory fails on image-bearing pages (`@napi-rs/canvas is not available`) regardless of globalThis polyfills, because the check is inside the pre-bundled module scope.  
* GPT-4o natively parses PDFs including all embedded images/diagrams, preserving layout context (captions stay with their figures).  
* One API call vs N page renders: faster and cheaper.

### **2.5 PPTX Parser**

**File:** `src/lib/ai/parsers/pptxParser.ts`

PPTX files are ZIP archives. JSZip unpacks them. The parser processes every slide in slide-number order.

**Per-slide pipeline:**

1. **Body text** — parse `ppt/slides/slideN.xml`, extract all `<a:t>` text run nodes  
2. **Speaker notes** — follow OOXML relationship chain:  
   * Rels file: `ppt/slides/_rels/slideN.xml.rels` → find `Type` ending in `notesSlide`  
   * Resolve relative target path → e.g. `ppt/notesSlides/notesSlide1.xml`  
   * Fallback: `ppt/notesSlides/notesSlideN.xml` if no rels entry  
3. **Vision pass** — collect all image refs from rels (PNG, JPG, WEBP only; EMF/WMF/SVG/GIF excluded — GPT-4o does not accept them), send body text \+ notes \+ ALL images together in **one** GPT-4o call per slide

**Why one call per slide (not one call per image):**

* GPT-4o sees body text, notes, and all images simultaneously, enabling cross-reference of diagram labels with slide text  
* Reduces API calls from `(images × slides)` to `(slides with images)`  
* Model is instructed not to repeat what's already in text/notes, so descriptions are additive

**Output format:**

\[Slide N Body\] ...slide text...  
\[Slide N Notes\] ...speaker notes...  
\[Slide N Visual Content\] ...GPT-4o vision description...

**Prompt injection guard:** A final pass strips Unicode BiDi control characters (U+202A–U+202E, U+2066–U+2069) and control chars (U+0000–U+001F except `\t` and `\n`).

**Debug logging:** Set `VISION_DEBUG=true` in `.env.local` to enable verbose per-slide logs including image counts, text lengths, and vision call results.

### **2.6 Chunking**

Uses `@langchain/textsplitters` `RecursiveCharacterTextSplitter`:

| Parameter | Value | Rationale |
| ----- | ----- | ----- |
| `chunkSize` | 500 characters | \~80–100 words; fits within embedding token limits |
| `chunkOverlap` | 200 characters | Prevents sentences from being cut at boundaries |
| `MAX_CHUNKS_PER_FILE` | 500 | Safety cap to prevent runaway costs on large files |

Empty/whitespace-only chunks are filtered after splitting. Chunks are inserted into `lesson_chunks` with `content_type = 'slide'` and metadata containing `file_name` and `chunk_index`.

---

## **3\. Embeddings**

**File:** `src/lib/ai/embedChunks.ts`

`embedChunks(chunkIds, supabase, aiProvider)` is called after chunks are inserted. It fetches chunk content from the DB, generates embeddings, and writes them back.

### **3.1 Batch Strategy**

Batched at 100 per request (conservative vs the OpenAI limit of \~2048):

for (let i \= 0; i \< chunks.length; i \+= BATCH\_SIZE) {  
  const batch \= chunks.slice(i, i \+ BATCH\_SIZE);  
  embeddings \= await aiProvider.generateEmbedding(batch.map(c \=\> c.content));  
  // update each chunk row individually  
}

`generateEmbedding` accepts `string | string[]` and returns `number[][]`. Each embedding is a 1536-dimension float array stored as `JSON.stringify(embedding)` in the `lesson_chunks.embedding` column (`vector(1536)` type).

### **3.2 Error Handling**

If a batch fails, `embedChunks` throws back to the caller (upload background task). The background handler catches it and sets `status = 'failed'`. Chunk rows remain in the DB with `null` embeddings — re-uploading the file triggers re-embedding.

---

## **4\. Speech-to-Text — Whisper**

**User Story:** US 1.17

### **4.1 useAudioRecorder Hook**

**File:** `src/hooks/useAudioRecorder.ts`

A standalone React hook (extracted from `ActiveCenter` into its own file) that wraps the browser `MediaRecorder` API.

**Codec selection:** Three-tier preference: `audio/webm;codecs=opus` → `audio/webm` → browser default. Checked via `MediaRecorder.isTypeSupported()` before instantiation.

**Data collection:** `recorder.start(500)` fires `ondataavailable` every 500ms. Chunks collected in `chunksRef`. On `stop()`, assembled into a single `Blob` immediately.

**Exposed API:**

{ isRecording, elapsed, fmt, start, stop }

### **4.2 Transcript Route**

**File:** `src/app/api/lessons/[lessonId]/transcript/route.ts`

POST handler accepts audio as `multipart/form-data` with field name `audio`. Max size 25MB. Auth and ownership use the same two-step pattern.

**Note:** This route currently uses a direct `new OpenAI(...)` construction (not via the `OpenAIProvider` class). It embeds the transcript and stores the chunk in a background IIFE after returning the transcript to the client. This is a known inconsistency — `OpenAIProvider` adoption here is a Sprint 4 candidate.

**Whisper call:**

await openai.audio.transcriptions.create({  
  file: audioFile,  
  model: 'whisper-1',  
  language: 'en',  
})

**Background embedding:** After returning the transcript, a fire-and-forget IIFE embeds the transcript text and inserts a `lesson_chunks` row with `content_type = 'transcript'`, `lesson_file_id = null`, and metadata `{ source: 'transcript', recordedAt: ISO timestamp }`.

### **4.3 Auto-Generate After Transcription**

In `ActiveCenter.tsx`, `handleStopAndTranscribe()`:

const transcript \= await transcribeAudioApi(lessonId, audioBlob);  
setTranscriptText(transcript ?? '');  
setPromptInput(transcript ?? '');  
setSttStatus('idle');  
setTimeout(() \=\> onGenerate(), 50);

The 50ms timeout is required because React batches state updates — without it, `generateCandidates()` would read the previous (empty) `transcriptText` from the closure.

---

## **5\. RAG Generation**

**User Stories:** US 1.18, 1.19, 1.23

### **5.1 Generate Route**

**File:** `src/app/api/lessons/[lessonId]/generate/route.ts`

POST body: `{ promptType: 'short_answer' | 'long_answer' | 'multiple_choice', transcriptText?: string }`

Returns: `CandidateSet` (N candidates — see `CANDIDATE_COUNT` in `discussionPrompt.ts`)

**Security note (updated from Sprint 2 behaviour):** `is_correct` is **no longer stripped** at this route. The instructor UI requires it to auto-select the correct option when publishing. Stripping for student safety happens exclusively in `handlePublishAiCandidate()` inside `useSessionPage` before the `channel.send()` broadcast.

**Mock mode:** `MOCK_AI=true` in `.env.local` imports `src/lib/ai/__mocks__/generatePrompts.ts` — returns hardcoded pharmacology questions for all three prompt types with no API call.

### **5.2 useLessonAI Hook**

**File:** `src/hooks/useSessionPage/useLessonAI.ts`

Encapsulates all AI state for the session page:

{ transcriptText, setTranscriptText, promptType, setPromptType,  
  candidates, isGenerating, generationWarning,  
  generateCandidates, selectCandidate, regenerateCandidates, clearAIState }

`generateCandidates` calls `generateCandidatesApi` (POST to generate route). `clearAIState` resets candidates, transcript, and prompt input — called after a candidate is published.

### **5.3 Candidate Count**

**File:** `src/lib/ai/prompts/discussionPrompt.ts`

export const CANDIDATE\_COUNT \= 5;

The generate route returns 5 candidates by default (changed from 3 in the original spec). To change: edit only `CANDIDATE_COUNT` — the prompt and parser both reference this constant.

### **5.4 Retrieval**

**File:** `src/lib/ai/retrieveChunks.ts`

**`retrieveChunksBySimilarity` (primary path):** When `transcriptText` is non-empty, `generatePrompts` embeds it via `aiProvider.generateEmbedding()` and calls the `match_lesson_chunks` Postgres RPC:

await supabase.rpc('match\_lesson\_chunks', {  
  p\_lesson\_id: lessonId,  
  p\_embedding: queryEmbedding,  
  p\_match\_count: 8,  
})

Returns top-8 chunks ordered by cosine similarity (`<=>` operator).

**`retrieveRecentChunks` (fallback path):** If `transcriptText` is empty OR similarity retrieval returns 0 results:

SELECT content FROM lesson\_chunks WHERE lesson\_id \= ? ORDER BY created\_at DESC LIMIT 8

A warning string is included in the `CandidateSet` to inform the instructor.

**Future (Sprint 4):** Replace with weighted blended retrieval — 40% file chunks (semantic), 40% current transcript, 20% prior transcript.

### **5.5 Prompt Assembly**

**File:** `src/lib/ai/prompts/discussionPrompt.ts`

`buildUserPrompt()` wraps retrieved chunks and transcript in XML delimiters:

\<instructions\>  
  \<question\_type\_rules\>...\</question\_type\_rules\>  
  \<output\_format\>...\</output\_format\>  
  \<example\>...\</example\>  
\</instructions\>

\<context\>  
\[Chunk 1\]  
{content}  
...  
\</context\>

\<transcript\>  
{transcriptText or '(No transcript provided)'}  
\</transcript\>

XML delimiters prevent prompt injection — adversarial text inside a chunk cannot escape the `<context>` block and override system instructions.

To change AI persona, style, or pharmacology-specific instructions: edit `buildSystemPrompt()`. To change candidate count: change `CANDIDATE_COUNT`. No other files need to be touched.

### **5.6 GPT-4o-mini Call**

**File:** `src/lib/ai/generatePrompts.ts`

Called via `aiProvider.generateChatCompletion(messages, { jsonMode: true, temperature: 0.7 })`.

`json_object` mode forces GPT-4o-mini to always return valid JSON. Temperature 0.7 balances creativity with accuracy.

**Response parsing:** GPT-4o-mini occasionally wraps the array in an object (e.g. `{ "questions": [...] }`). The parser handles both shapes:

* If `JSON.parse` returns an `Array`: use directly  
* If it returns an `Object`: find the first key whose value is an `Array`  
* On any parse failure: return `CANDIDATE_COUNT` fallback candidates with an error message

---

## **6\. Security**

### **6.1 Two-Step Ownership Check**

All 5 routes (upload, files GET, files DELETE, generate, transcript) use the same two-query ownership pattern:

// Step 1: get lesson (and its course\_id)  
const { data: lesson } \= await supabase.from('lessons')  
  .select('id, course\_id').eq('id', lessonId).single();

// Step 2: get course and check instructor\_id  
const { data: course } \= await supabase.from('courses')  
  .select('instructor\_id').eq('id', lesson.course\_id).single();

if (course.instructor\_id \!== user.id) return 403;

This avoids Supabase `!inner` join TypeScript type issues (`TS2352` cast errors).

### **6.2 is\_correct Handling**

**Updated from Sprint 2:** `is_correct` is now retained in the `/generate` response sent to the instructor client. It is stripped in exactly **one** place:

`handlePublishAiCandidate()` in `useLessonDiscussions.ts` — `mc_options` is stripped before `channel.send()`:  
 mc\_options: candidate.mcOptions  ? candidate.mcOptions.map(({ label, text }) \=\> ({ label, text }))  : null,

* 

The `MCOptionSafe` TypeScript type explicitly excludes `is_correct`, making accidental inclusion a compile error on the student side. The `mc_options` column in `discussions` stores full options including `is_correct` for server-side validation.

### **6.3 lesson\_id Isolation in pgvector**

The `match_lesson_chunks` RPC includes a mandatory `WHERE lesson_id = p_lesson_id` clause. Without this, the cosine similarity search would operate across all instructors' lesson chunks. This clause is enforced in the SQL function and documented as a required code review gate in `retrieveChunks.ts`.

### **6.4 Magic-Byte Validation**

File type is validated by reading the first 4 bytes of the actual buffer. Files not matching PDF or PPTX signatures are rejected before any parsing or storage occurs.

### **6.5 Prompt Injection Guard**

Both parsers apply a final `stripControlChars()` pass removing Unicode BiDi control characters and other control chars that could be embedded in slide text to override the AI system prompt.

---

## **7\. UI Components & Hooks**

### **7.1 ActiveCenter**

**File:** `src/components/instructor/session/ActiveCenter.tsx`

The main instructor panel during a live session. Combines recording, transcript, generation, and publish flows.

**Context integration:** Reads from `SessionContext` (provided by `SessionProvider`) with prop fallback for standalone usage. This allows the component to be used both inside the full session page and in isolation for testing.

**Key state:**

* `selectedIndex` — which candidate card is selected  
* `sttStatus` — `'idle' | 'transcribing' | 'error'`  
* `overrideCorrectOption` — instructor-selected correct option for MC questions (overrides AI suggestion)  
* `feedbackEnabled` — whether to show correctness feedback to students

**Correct answer override (new in Sprint 3):** When an MC candidate is selected, a radio group appears showing all four options. The AI's suggested correct answer is pre-selected but the instructor can change it before publishing. This is passed as `overrideCorrectOption` to `handlePublishAiCandidate`.

**Feedback toggle (new in Sprint 3):** A checkbox lets the instructor enable/disable per-student correctness feedback for MC questions.

### **7.2 SessionContext**

**File:** `src/components/instructor/session/SessionContext.tsx`

export const SessionContext \= React.createContext\<SessionVM | null\>(null);  
export function SessionProvider({ vm, children })  
export function useSessionContext()

Wraps the full `SessionVM` (from `useSessionPage`) in context, allowing deeply nested components to access session state without prop drilling.

### **7.3 useLessonFiles Hook**

**File:** `src/hooks/useSessionPage/useLessonFiles.ts`

Manages file upload state with optimistic UI updates:

* On upload: adds an optimistic `LessonFile` with `status = 'uploading'` immediately, then removes it and re-fetches after the API call resolves  
* **Polling:** If any file has `status = 'processing'`, a `setInterval` runs every 2 seconds calling `fetchFiles()` until all files reach a terminal state

**Exposed API:**

{ files, isUploading, fetchFiles, uploadFile, deleteFile, openFile }

`openFile` fetches a signed URL from `/api/lessons/[lessonId]/files/[fileId]` (GET) and triggers a browser download.

### **7.4 useLessonDiscussions Hook**

**File:** `src/hooks/useSessionPage/useLessonDiscussions.ts`

Manages all discussion lifecycle: fetch, publish (manual and AI), close, and realtime response ingestion.

**`handlePublishAiCandidate`** (updated):

* Accepts `overrideCorrectOption` and `feedbackEnabled` parameters  
* Determines final correct option: `overrideCorrectOption || aiSuggestedCorrectOption`  
* Stores full `mc_options` (with `is_correct`) in the `discussions` table  
* Strips `is_correct` from the Realtime broadcast payload  
* Stores `ai_generated_correct_option` separately for analytics

---

## **8\. Provider Architecture**

**File:** `src/lib/ai/providers.ts`

All AI functionality is encapsulated behind the `AIProvider` interface. There is a single implementation: `OpenAIProvider`.

### **8.1 AIProvider Interface**

export interface AIProvider {  
  generateChatCompletion(messages: AIMessage\[\], options?: { temperature?: number; jsonMode?: boolean }): Promise\<string\>;  
  generateEmbedding(text: string | string\[\]): Promise\<number\[\]\[\]\>;  
  generateVisionDescription(base64Image, mimeType, contextHint?): Promise\<string\>;  
  generatePdfVisualDescriptions(pdfBuffer: Buffer, numPages: number): Promise\<Map\<number, string\>\>;  
  generatePptxSlideVisualDescription(slideNumber, bodyText, notesText, images): Promise\<string\>;  
}

### **8.2 OpenAIProvider**

Models used per method:

| Method | Model |
| ----- | ----- |
| `generateChatCompletion` | `gpt-4o-mini` |
| `generateEmbedding` | `text-embedding-3-small` |
| `generateVisionDescription` | `gpt-4o` (max 500 tokens) |
| `generatePdfVisualDescriptions` | `gpt-4o` (max 4096 tokens, native PDF input) |
| `generatePptxSlideVisualDescription` | `gpt-4o` (max 600 tokens) |

### **8.3 Known Inconsistency**

The transcript route (`/api/lessons/[lessonId]/transcript/route.ts`) currently constructs `new OpenAI(...)` directly rather than using `OpenAIProvider`. This is the only call site not using the provider layer. Planned for Sprint 4 cleanup.

### **8.4 Switching Providers**

To switch to an OpenAI-compatible provider (OpenRouter, Azure OpenAI, Groq, Together AI), only environment variables need to change — the `OpenAIProvider` constructor accepts a `baseURL` via `process.env.AI_BASE_URL`.

Before switching, verify:

* **Embedding dimensions:** System assumes 1536\. If the replacement model differs, `lesson_chunks.embedding` column and `match_lesson_chunks` RPC must be updated.  
* **Whisper availability:** Most providers do not expose `audio/transcriptions`. May need to keep Whisper on OpenAI separately.  
* **`json_object` mode:** Not universally supported. If unavailable, the system prompt must instruct JSON-only output and the response parser must strip markdown fences.

For non-compatible providers (Anthropic Claude, Google Gemini), implement a new class conforming to `AIProvider` and swap at the construction site.

---

## **9\. Image & PDF Vision Pipeline**

The pipeline now has **full vision support** via GPT-4o. This supersedes the "Current Limitations" section from earlier documentation.

### **9.1 What Is Now Supported**

| Content Type | Support |
| ----- | ----- |
| PDF embedded text | ✅ Full (pdfjs-serverless) |
| PDF images, diagrams, figures | ✅ Full (GPT-4o native PDF input) |
| PDF chemical structures | ✅ Full |
| PDF scanned pages | ✅ Full (GPT-4o vision) |
| PPTX text body | ✅ Full |
| PPTX speaker notes | ✅ Full |
| PPTX embedded PNG/JPG/WEBP | ✅ Full (GPT-4o per-slide) |
| PPTX EMF/WMF/SVG/GIF | ❌ Excluded (GPT-4o does not accept these formats) |

### **9.2 Vision Cost Estimates**

| Operation | Approximate Cost |
| ----- | ----- |
| Per PPTX slide with images | \~$0.002–$0.005 (gpt-4o, high detail) |
| Per PDF (whole document) | \~$0.01–$0.05 depending on page count and image density |

Vision passes are non-blocking (run in the background processing task). They do not affect upload response time.

### **9.3 Debug Mode**

Set `VISION_DEBUG=true` in `.env.local` to enable verbose logging of:

* Number of slides found  
* Per-slide: body text length, notes length, image refs found, zip paths resolved, vision call result

---

## **10\. Database Schema**

### **10.1 lesson\_files**

| Column | Type | Notes |
| ----- | ----- | ----- |
| `id` | UUID PK |  |
| `lesson_id` | UUID FK → lessons.id |  |
| `file_name` | text | Original filename as uploaded |
| `file_type` | varchar(10) | `'pdf'` or `'pptx'` — detected via magic bytes |
| `file_size_bytes` | int8 |  |
| `storage_path` | text | `{lessonId}/{uuid}-{name}` in `lesson-files` bucket |
| `status` | varchar(20) | `'uploading' | 'processing' | 'ready' | 'failed'` |
| `uploaded_at` | timestamptz | default `now()` |

### **10.2 lesson\_chunks**

| Column | Type | Notes |
| ----- | ----- | ----- |
| `id` | UUID PK |  |
| `lesson_id` | UUID FK | Indexed; used in all retrieval queries |
| `lesson_file_id` | UUID FK → lesson\_files.id | NULL for transcript chunks |
| `content_type` | varchar(20) | `'slide'` (from file) | `'transcript'` (from Whisper) |
| `content` | text | Raw chunk text |
| `embedding` | vector(1536) | Float array from `text-embedding-3-small` |
| `metadata` | jsonb | `{ file_name, chunk_index }` for slides; `{ source, recordedAt }` for transcripts |
| `created_at` | timestamptz | default `now()` |

**Chunk metadata types** (see `src/types/ai.ts`):

export type ChunkSource \= 'slide\_body' | 'slide\_notes' | 'transcript' | 'prior\_transcript';  
export interface ChunkMetadata {  
  source: ChunkSource;  
  slideNumber?: number;  
  fileName?: string;  
  segmentIndex?: number;  
  recordedAt?: string;  
}

These types are defined in anticipation of Sprint 4 weighted retrieval.

### **10.3 match\_lesson\_chunks RPC**

CREATE FUNCTION match\_lesson\_chunks(  
  p\_lesson\_id   UUID,  
  p\_embedding   vector(1536),  
  p\_match\_count INT DEFAULT 8  
) RETURNS TABLE (  
  id            UUID,  
  lesson\_id     UUID,  
  content       TEXT,  
  content\_type  VARCHAR(20),  \-- must match column type exactly  
  metadata      JSONB,  
  similarity    FLOAT  
) AS $$  
  SELECT id, lesson\_id, content, content\_type, metadata,  
         1 \- (embedding \<=\> p\_embedding) AS similarity  
  FROM lesson\_chunks  
  WHERE lesson\_id \= p\_lesson\_id  
  ORDER BY embedding \<=\> p\_embedding  
  LIMIT p\_match\_count  
$$ LANGUAGE SQL STABLE;

**CRITICAL:** `content_type` must be `VARCHAR(20)` in `RETURNS TABLE`, not `TEXT`. Using `TEXT` causes Postgres error `42804` (type mismatch) at runtime.

---

## **11\. Configuration Reference**

### **11.1 Environment Variables**

| Variable | Required | Notes |
| ----- | ----- | ----- |
| `OPENAI_API_KEY` | Yes | Used for `text-embedding-3-small`, `whisper-1`, `gpt-4o-mini`, `gpt-4o` |
| `MOCK_AI` | No | Set to `'true'` for hardcoded responses — no API key required |
| `VISION_DEBUG` | No | Set to `'true'` for verbose per-slide/per-page vision logging |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |

### **11.2 next.config.ts**

experimental: {  
  serverActions: { bodySizeLimit: '26mb' }  // allows 25MB file/audio uploads  
},  
serverExternalPackages: \['pdf-parse'\]  // prevents CJS bundler wrapping

The default `serverActions.bodySizeLimit` is 1MB. Without the override, uploads silently fail with a 413-class error.

### **11.3 Required npm Packages**

| Package | Purpose |
| ----- | ----- |
| `openai` | OpenAI SDK — embeddings, Whisper, GPT-4o-mini, GPT-4o vision |
| `pdfjs-serverless` | PDF text extraction — serverless build for Next.js App Router |
| `@napi-rs/canvas` | Canvas polyfill required by pdfjs-serverless |
| `jszip` | PPTX ZIP unpacking — OOXML container parsing |
| `@langchain/textsplitters` | `RecursiveCharacterTextSplitter` for chunking |

---

## **Appendix: Key File Locations**

| File | Purpose |
| ----- | ----- |
| `src/app/api/lessons/[lessonId]/upload/route.ts` | File upload \+ background parse/embed pipeline |
| `src/app/api/lessons/[lessonId]/files/route.ts` | List lesson files (GET) |
| `src/app/api/lessons/[lessonId]/files/[fileId]/route.ts` | Get signed URL (GET), delete file (DELETE) |
| `src/app/api/lessons/[lessonId]/generate/route.ts` | RAG generation endpoint |
| `src/app/api/lessons/[lessonId]/transcript/route.ts` | Whisper STT endpoint |
| `src/lib/ai/providers.ts` | `AIProvider` interface \+ `OpenAIProvider` implementation |
| `src/lib/ai/parsers/index.ts` | Parser dispatcher |
| `src/lib/ai/parsers/pdfParser.ts` | PDF text \+ GPT-4o vision |
| `src/lib/ai/parsers/pptxParser.ts` | PPTX text \+ speaker notes \+ GPT-4o vision |
| `src/lib/ai/embedChunks.ts` | Batch embedding via `aiProvider.generateEmbedding` |
| `src/lib/ai/generatePrompts.ts` | RAG orchestration (retrieve → prompt → generate → parse) |
| `src/lib/ai/retrieveChunks.ts` | Similarity and recent-fallback chunk retrieval |
| `src/lib/ai/prompts/discussionPrompt.ts` | System prompt, user prompt builder, `CANDIDATE_COUNT` |
| `src/lib/ai/__mocks__/generatePrompts.ts` | Mock mode — hardcoded pharmacology questions |
| `src/hooks/useAudioRecorder.ts` | Browser `MediaRecorder` hook for STT |
| `src/hooks/useSessionPage/useLessonAI.ts` | AI state management for session page |
| `src/hooks/useSessionPage/useLessonFiles.ts` | File state \+ polling \+ optimistic upload |
| `src/hooks/useSessionPage/useLessonDiscussions.ts` | Discussion lifecycle \+ Realtime \+ publish |
| `src/components/instructor/session/ActiveCenter.tsx` | Main instructor session UI |
| `src/components/instructor/session/SessionContext.tsx` | React context for session VM |
| `src/types/ai.ts` | TypeScript types: `LessonFile`, `GeneratedPrompt`, `CandidateSet`, `MCOption`, `ChunkMetadata` |

