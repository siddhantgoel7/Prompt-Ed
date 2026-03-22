# PMCOL Teaching Tool — AI Pipeline Technical Documentation

## Table of Contents

1. System Overview
2. File Upload & Parsing
3. Embeddings
4. Speech-to-Text (Whisper)
5. RAG Generation
6. Prompt Engineering
7. AI Preferences System
8. Security
9. Provider Architecture
10. Database Schema
11. Configuration Reference
12. Design Decisions & Rationale
13. Decisions Reversed

---

## 1. System Overview

The AI pipeline is a **pluggable, provider-agnostic Retrieval-Augmented Generation (RAG) system** built natively in Next.js (TypeScript). Instructors upload PDF or PPTX lecture slides; the system parses, chunks, embeds, and stores them in a pgvector store. During class, the instructor records a spoken segment which is transcribed by Whisper. The transcript is embedded, blended with any focus area preferences, and used for semantic similarity search — retrieving the most relevant slide chunks before GPT-4o-mini generates discussion question candidates. The instructor selects one and publishes it to students via Supabase Realtime.

### 1.1 End-to-End Instructor Workflow

```
Before class:  Upload PDF/PPTX via Files tab in session sidebar
System:        Detect file type → parse text + visual content → chunk → embed → store in lesson_chunks (status = ready)

During class:  Click "Start Recording" while explaining a concept
               Click "Stop & Transcribe" → audio POST → /api/lessons/[lessonId]/transcript → Whisper returns text
System:        Embed transcript → (optionally blend with focusAreas embedding) → vector similarity search
               → retrieve top-8 chunks → GPT-4o-mini → 5 candidates

Instructor:    Click candidate card → optionally override correct MC answer → click "Publish This Question"
Realtime:      Discussion broadcast to all students (is_correct stripped before broadcast)
```

### 1.2 Technology Stack

| Layer | Technology |
|---|---|
| PDF parsing | `pdfjs-serverless` with `@napi-rs/canvas` polyfill |
| PDF vision | GPT-4o native PDF file input (whole-document, one API call) or Gemini (faster, cheaper) |
| PPTX parsing | JSZip + OOXML `<a:t>` regex + rels chain for speaker notes |
| PPTX vision | GPT-4o or Gemini — per-slide call with body + notes + images together |
| Chunking | Custom sentence-aware splitter with content-type-specific sizes |
| Embeddings | OpenAI `text-embedding-3-small` — 1536 dimensions — batched 500/request |
| Vector store | Supabase pgvector, `match_lesson_chunks` RPC with mandatory lesson-scope filter |
| Speech-to-Text | OpenAI Whisper `whisper-1` — `audio/webm;codecs=opus` preferred |
| Generation | OpenAI `gpt-4o-mini` — `json_object` mode — per-type temperature |
| Realtime | Supabase Broadcast Channel (`discussion:published` event) |
| AI Provider Layer | `AIProvider` interface in `src/lib/ai/providers.ts` — `OpenAIProvider` and `GeminiProvider` implementations |

---

## 2. File Upload & Parsing

**Route:** `src/app/api/lessons/[lessonId]/upload/route.ts`

### 2.1 Upload Pipeline

The POST handler orchestrates the full ingest pipeline with **background processing**. The file record is inserted immediately with `status = 'processing'` and the HTTP response is returned to the client before parsing begins. Processing runs in a fire-and-forget async function.

**Foreground (blocking, returns HTTP response):**

1. Auth — `supabase.auth.getUser()`
2. Ownership — two-step query: `lessons → courses` (see §8.1)
3. File validation — 25 MB size limit + magic-byte type detection
4. File cap — maximum 5 files per lesson (enforced by DB trigger to prevent race conditions)
5. Storage upload — `lesson-files` bucket at `{lessonId}/{uuid}-{name}`
6. DB insert — `lesson_files` row with `status = 'processing'`
7. Return HTTP 200 immediately with the file record

**Background (non-blocking, fire-and-forget):**

1. Parse — `parseFile(buffer, detectedType, aiProvider)` dispatches to PDF or PPTX parser (including vision pass if `aiProvider` provided)
2. Chunk — sentence-aware splitter with content-type-specific sizes, max 500 chunks per file
3. Deduplicate — Jaccard similarity filter (threshold 0.70) removes duplicate chunks from multi-column PDFs
4. Insert chunks — `lesson_chunks` rows (no embeddings yet)
5. Embed — `embedChunks(chunks, supabase, aiProvider)` batched at 500
6. Mark ready — `UPDATE lesson_files SET status = 'ready'`
7. On any error — `UPDATE lesson_files SET status = 'failed'`

The client polls every 2 seconds via `useLessonFiles` until `status` transitions to `ready` or `failed`.

### 2.2 Magic-Byte File Type Detection

File type is detected from the first 4 bytes of the buffer — not the `Content-Type` header or file extension, which can be spoofed:

```
PDF:  0x25 0x50 0x44 0x46  (%PDF)
PPTX: 0x50 0x4B 0x03 0x04  (PK ZIP header — PPTX is a ZIP archive)
```

Files not matching either signature are rejected with HTTP 400 before any parsing or storage occurs.

### 2.3 PDF Parser

**File:** `src/lib/ai/parsers/pdfParser.ts`

Uses `pdfjs-serverless` (not the standard `pdfjs-dist` legacy build). The serverless build avoids worker thread requirements in Next.js App Router. `@napi-rs/canvas` is required as a polyfill — `globalThis.Path2D` and `globalThis.createCanvas` are patched before pdfjs initialises.

**Two-phase pipeline per document:**

1. **Text extraction** — all pages processed in parallel via `Promise.all`, calling `page.getTextContent()` and joining `item.str` values. Parallel processing reduces time from O(pages) to O(1) round-trips.
2. **Vision pass** — entire PDF buffer sent to a vision model in a single API call. Returns a `Map<pageNumber, description>` for pages with visual content. Text-only pages return `NO_VISUAL_CONTENT` and are excluded.

**Why whole-PDF vision instead of per-page rendering:**

- `pdfjs-serverless`'s internal canvas factory fails on image-bearing pages (`@napi-rs/canvas is not available`) because the check is inside the pre-bundled module scope, outside the reach of globalThis polyfills.
- GPT-4o natively parses PDFs including all embedded images/diagrams, preserving layout context (captions stay with their figures).
- One API call vs N page renders: faster and cheaper.

### 2.4 PPTX Parser

**File:** `src/lib/ai/parsers/pptxParser.ts`

PPTX files are ZIP archives. JSZip unpacks them. The parser processes all slides in parallel via `Promise.all`.

**Per-slide pipeline:**

1. **Body text** — parse `ppt/slides/slideN.xml`, extract all `<a:t>` text run nodes
2. **Speaker notes** — follow OOXML relationship chain:
   - Rels file: `ppt/slides/_rels/slideN.xml.rels` → find `Type` ending in `notesSlide`
   - Resolve relative target path → e.g. `ppt/notesSlides/notesSlide1.xml`
   - Fallback: `ppt/notesSlides/notesSlideN.xml` if no rels entry
3. **Vision pass** — collect all image refs from rels (PNG, JPG, WEBP only; EMF/WMF/SVG/GIF excluded — vision models do not accept these formats). Send body text + notes + ALL images together in **one** vision call per slide.

**Why one call per slide (not one call per image):**

- The model sees body text, notes, and all images simultaneously, enabling cross-reference of diagram labels with slide text.
- Reduces API calls from `(images × slides)` to `(slides with images)`.
- Model is instructed not to repeat what's already in text/notes, so descriptions are additive and complement the extracted text.

**Control character stripping:** All extracted text goes through a `stripControlChars()` pass that removes Unicode BiDi control characters (U+202A–U+202E, U+2066–U+2069) and other control chars. BiDi overrides can be embedded in slide content to override AI system prompts (prompt injection vector).

**Debug logging:** Set `VISION_DEBUG=true` in `.env.local` to enable verbose per-slide logs.

### 2.5 Vision Extraction Rules

All three vision tasks (PDF whole-document, single image, PPTX slide) share the same extraction rules (`VISION_EXTRACTION_RULES` in `providers.ts`):

- **Flowcharts and pathway diagrams:** Express each directional link as a natural-language sentence (e.g. "FFA stimulates insulin resistance." "TNF-alpha promotes inflammation."). Flat label lists lose causality; sentences preserve directionality.
- **Tables:** One sentence per cell in the form "For [row], [column] requires [value]." Every row and column covered — no summarisation.
- **Graphs/charts:** Describe axes, units, and the main trend.
- **Chemical structures:** Name the compound, describe atoms, bonds, and functional groups.

**Why natural language sentences, not symbol notation:**

`text-embedding-3-small` is trained on natural language prose. "FFA stimulates insulin resistance" embeds with richer semantic context than "Arrows: FFA→Insulin resistance", and retrieval against conversational student queries improves significantly.

### 2.6 Chunking

Chunking uses a custom **sentence-aware splitter** (replaced `@langchain/textsplitters` `RecursiveCharacterTextSplitter`). The splitter splits text by sentence boundaries (`[.!?]`), groups sentences until the cumulative length reaches the target, and carries over the last sentence into the next chunk as overlap.

**Content-type-specific chunk sizes:**

| Content Origin | Max Chunk Size | Rationale |
|---|---|---|
| `slide_body` | 512 chars | Dense, structured bullet text — smaller chunks improve retrieval precision |
| `slide_notes` | 768 chars | Prose, richer context — slightly larger to preserve sentence flow |
| `page_text` | 1024 chars | Narrative PDF text — larger to capture full explanatory paragraphs |
| `visual_description` | Never split | Pre-structured by vision model as a coherent unit; splitting breaks semantic integrity |
| `transcript` | 1024 chars | Conversational — matches page_text size |

**Label soup detection:** Chunks where the average token length is below a threshold (typically OCR artifacts from scanned figures — isolated labels, chemical abbreviations, or axis tick marks) are suppressed when a visual description already exists for the same page or slide. This prevents retrieval poisoning from meaningless character sequences.

**Jaccard deduplication:** After chunking, pairs of chunks within the same file are compared by word-set overlap. Pairs with Jaccard similarity > 0.70 have the later chunk dropped. This eliminates near-duplicate paragraphs common in multi-column PDF layouts where the same paragraph is extracted twice.

**Max chunks per file:** 500. Safety cap to prevent runaway embedding costs on unusually large files.

---

## 3. Embeddings

**File:** `src/lib/ai/embedChunks.ts`

`embedChunks(chunks, supabase, aiProvider)` accepts chunks as `{ id: string; content: string }[]` — callers already have the content in memory after inserting chunks, avoiding a redundant DB fetch.

### 3.1 Batch Strategy

Batched at 500 per request:

```typescript
const BATCH_SIZE = 500;
for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
  const batch = chunks.slice(i, i + BATCH_SIZE);
  const embeddings = await aiProvider.generateEmbedding(batch.map(c => c.content));
  // parallel UPDATE calls within each batch
  await Promise.all(
    batch.map((chunk, j) =>
      supabase.from('lesson_chunks').update({ embedding: JSON.stringify(embeddings[j]) }).eq('id', chunk.id)
    )
  );
}
```

Each embedding is a 1536-dimension float array stored as `JSON.stringify(embedding)` in the `lesson_chunks.embedding` column (`vector(1536)` type).

**Why UPDATE and not upsert:** The upsert INSERT path triggers RLS policies that fail when only `{id, embedding}` are provided (missing required lesson-level context). The UPDATE path is already authorized because the instructor owns the lesson.

### 3.2 Error Handling

If a batch fails, `embedChunks` throws back to the upload background handler, which sets `lesson_files.status = 'failed'`. Chunk rows remain in the DB with `null` embeddings. Re-uploading the file triggers fresh parsing and re-embedding.

---

## 4. Speech-to-Text — Whisper

**User Story:** US 1.17

### 4.1 useAudioRecorder Hook

**File:** `src/hooks/useAudioRecorder.ts`

Wraps the browser `MediaRecorder` API. Codec selection: `audio/webm;codecs=opus` → `audio/webm` → browser default, checked via `MediaRecorder.isTypeSupported()`. `recorder.start(500)` fires `ondataavailable` every 500ms; chunks are assembled into a single `Blob` on stop.

### 4.2 Transcript Route

**File:** `src/app/api/lessons/[lessonId]/transcript/route.ts`

POST accepts audio as `multipart/form-data` with field name `audio`. Max 25 MB. Returns `{ transcript: string }` immediately, then embeds and stores the transcript as a `lesson_chunks` row in a fire-and-forget background IIFE.

```typescript
await openai.audio.transcriptions.create({
  file: audioFile,
  model: 'whisper-1',
  language: 'en',
})
```

**Background embedding:** After returning, the transcript is embedded and inserted into `lesson_chunks` with `content_type = 'transcript'`, `lesson_file_id = null`, and metadata `{ contentOrigin: 'transcript', recordedAt: ISO timestamp }`. These transcript chunks participate in pgvector retrieval during generation.

### 4.3 Auto-Generate After Transcription

In `ActiveCenter.tsx`, `handleStopAndTranscribe()` calls `setTimeout(() => onGenerate(), 50)` after setting transcript state. The 50ms timeout is required because React batches state updates — without it, `generateCandidates()` would read the previous (empty) `transcriptText` from its closure.

---

## 5. RAG Generation

**User Stories:** US 1.18, 1.19, 1.23

### 5.1 Generate Route

**File:** `src/app/api/lessons/[lessonId]/generate/route.ts`

```typescript
POST body: {
  promptType: 'short_answer' | 'long_answer' | 'multiple_choice',
  transcriptText?: string,
  preferencesOverride?: AIPromptPreferences  // for sweep/debug testing only
}

Response: CandidateSet {
  candidates: GeneratedPrompt[],
  warning?: string,
  tokenUsage?: TokenUsage,
  model?: string
}
```

On request, the route fetches the instructor's saved preferences from `instructor_ai_preferences` (or uses `preferencesOverride` if provided), then calls `generatePrompts()`. Returns `tokenUsage` and `model` for observability.

**Mock mode:** `MOCK_AI=true` in `.env.local` imports `src/lib/ai/__mocks__/generatePrompts.ts` — returns hardcoded candidates for all three prompt types with no API call.

### 5.2 Retrieval — Embedding Blending

**File:** `src/lib/ai/retrieveChunks.ts`, `src/lib/ai/generatePrompts.ts`

The retrieval query is constructed differently depending on what context is available:

**Scenario 1 — Transcript present, focusAreas set:**

```
Embed transcriptText → transcriptEmbedding (1536-dim)
Embed preferences.focusAreas → focusAreasEmbedding (1536-dim)
Blend: blendEmbeddings(transcriptEmbedding, focusAreasEmbedding, 0.70)
  → [0.7 * transcript[i] + 0.3 * focusAreas[i] for all i]
Normalize to unit sphere (required for cosine similarity after blending)
Retrieve top-8 chunks by pgvector similarity
```

**Scenario 2 — Transcript present, no focusAreas:**
Use transcriptEmbedding directly. No blending.

**Scenario 3 — No transcript, focusAreas set:**
Embed focusAreas and retrieve. This handles the file-upload-without-STT workflow where instructors set topic direction but haven't recorded yet.

**Scenario 4 — No transcript, no focusAreas:**
Retrieve 8 most recently created chunks (recency fallback). A warning is included in the `CandidateSet`.

**Why 70/30 blend:** The transcript captures what was just said (immediate context, 70% weight). focusAreas represents explicit instructor intent (30% weight). The blend handles synonym drift — if the transcript says "side effects" but the focusAreas say "adverse reactions", pure transcript retrieval would miss pharmacologically equivalent content. The blend steers retrieval toward instructor intent without losing the transcript's context signal.

**Why L2 normalization after blending:** Blending creates an arbitrary vector that may drift off the unit sphere. Cosine similarity (`<=>` in pgvector) requires unit vectors for correct distance interpretation. The `normalizeEmbedding()` utility handles the zero-vector edge case (returns unchanged to avoid divide-by-zero).

### 5.3 Retrieval — pgvector RPC

```typescript
await supabase.rpc('match_lesson_chunks', {
  p_lesson_id: lessonId,      // MANDATORY — see §8.3
  p_embedding: queryEmbedding,
  p_match_count: 8,
})
```

Returns top-8 chunks ordered by cosine similarity. The `lesson_id` filter is a hard security requirement (see §8.3).

### 5.4 Candidate Count

**File:** `src/lib/ai/prompts/discussionPrompt.ts`

```typescript
export const CANDIDATE_COUNT = 5;
```

To change: edit only `CANDIDATE_COUNT` — the prompt and parser both reference this constant.

### 5.5 Temperature

**File:** `src/lib/ai/prompts/discussionPrompt.ts`

```typescript
export const TEMPERATURE_BY_TYPE: Record<PromptType, number> = {
  short_answer: 0.7,
  multiple_choice: 0.7,
  long_answer: 0.7,
};
```

Currently unified at 0.7 (balanced creativity + grounding). The per-type structure is intentional — it enables future A/B testing of individual types without changing the others.

### 5.6 LLM Call & Response Parsing

Called via `aiProvider.generateChatCompletion(messages, { jsonMode: true, temperature })`. `json_object` mode forces the model to return valid JSON.

**Response parsing handles multiple shapes:** GPT-4o-mini occasionally wraps the array in an object (e.g. `{ "candidates": [...] }`). The parser handles:

- `JSON.parse` returns an `Array` → use directly
- Returns an `Object` → find the first key whose value is an `Array`
- Any parse failure → return `CANDIDATE_COUNT` fallback candidates with an error message

### 5.7 Token Usage & Model Tracking

`generateChatCompletion` returns `{ content, tokenUsage, model }` from both `OpenAIProvider` and `GeminiProvider`. This propagates through `generatePrompts()` → `CandidateSet` → API response → displayed in the instructor UI debug report.

**Cost calculation** (displayed in debug report and sweep export):
```
cost_usd = (promptTokens × $0.15 / 1,000,000) + (completionTokens × $0.60 / 1,000,000)
```

---

## 6. Prompt Engineering

**File:** `src/lib/ai/prompts/discussionPrompt.ts`

### 6.1 System Prompt Structure

The system prompt has 13 explicit rules grouped into two tiers:

**Core pedagogical rules (1–7):**
- GROUNDING: Every question must be traceable to the provided context or transcript
- ACCURACY: Drug mechanisms and facts must match the provided content exactly
- COGNITIVE LEVEL: Maps difficulty preference to Bloom's taxonomy levels (see §6.2)
- STYLE: Frames questions per instructor style preference (see §6.3)
- AUDIENCE: University-level — assumes prerequisite knowledge, no remedial scaffolding
- FORMAT: Word counts per question type (see §6.4)
- DIVERSITY: Non-repetitive across the 5 candidates — vary topic, framing, and cognitive level

**Safety guardrails (8–13):**
- QUESTION_TYPE_LOCK: All 5 candidates must match the requested prompt type
- MC_DISTRACTORS: Each wrong option must use one of four named strategies; no strategy repeated within one question (see §6.5)
- MC_ANSWER_POSITION: Distribute correct answers across A, B, C, D positions across the 5 candidates
- META_LECTURE: Do not ask about class logistics, schedules, or assessment procedures
- STT_NOISE: Skip transcription artifacts — Whisper produces filler words and false starts that should not become question fodder
- OUTPUT: Valid JSON only, matching the defined schema

### 6.2 Difficulty & Bloom's Taxonomy

Difficulty preference maps to different Bloom's taxonomy level schedules. MC and free-response have different schedules because multiple choice cannot meaningfully assess "create" (creation requires generating novel artefacts, which selection prevents).

**MC candidates (no "create" level):**

| Difficulty | Bloom's Distribution |
|---|---|
| Basic | remember×2, understand×2, apply×1 |
| Intermediate | remember×1, understand×1, apply×2, analyze×1 |
| Advanced | apply×1, analyze×2, evaluate×2 |

**Free-response (short_answer + long_answer):**

| Difficulty | Bloom's Distribution |
|---|---|
| Basic | remember×1, understand×2, apply×2 |
| Intermediate | understand×1, apply×1, analyze×2, evaluate×1 |
| Advanced | analyze×2, evaluate×2, create×1 |

The Bloom's distribution is **shuffled on every generation call** — the set of levels is fixed by difficulty, but the assignment of which candidate gets which level is randomised. This prevents the model from memorising slot patterns (e.g. always putting "apply" in candidate 2).

### 6.3 Style Modes

**Socratic (default):** Questions encourage reasoning and questioning. Surface tensions or gaps in understanding. Avoid yes/no questions.

**Factual:** Direct recall and foundational facts. Clearly correct answers grounded in the provided content. At advanced difficulty, factual + advanced resolves to multi-step reasoning (not pure recall) — both constraints can be satisfied simultaneously.

**Clinical Scenario:** Embed concepts in realistic patient cases. Force interpretation of symptoms within the pharmacological context. Questions describe a scenario before asking the interpretive question.

### 6.4 Length Guidance

Word count targets are enforced per prompt type and length preference. Multiple choice stem length is also controlled — stems must be answerable from context without being artificially padded.

### 6.5 MC Distractor Strategies

Each wrong option must use exactly one of four named strategies. No two distractors in the same question may use the same strategy.

1. **Mechanism Confusion** — Correct drug/target, wrong receptor subtype or pathway step (e.g. "Alpha-1 receptor" when the answer is "Beta-1 receptor")
2. **Location Confusion** — Correct mechanism, wrong tissue/organ/compartment (e.g. "in kidney" when the mechanism acts "in peripheral vasculature")
3. **Dose Confusion** — Correct drug and mechanism, wrong dosing rationale or therapeutic window
4. **Partial Truth** — Statement that is true in a different context or for a related drug (e.g. a Warfarin-ibuprofen interaction where the distractor describes the correct interaction pathway for a different NSAID)

Option text lengths should be roughly equivalent — do not pad distractors or truncate the correct answer.

### 6.6 Few-Shot Examples

The system prompt includes few-shot examples per prompt type. MC examples specifically cover all four label positions: A, B, C, and D. D appears in two examples because it is historically underrepresented in LLM positional distributions. Each example annotates which distractor strategy each wrong option uses.

### 6.7 MC Positional Bias Fix

**Problem:** LLMs exhibit positional bias — a tendency to place correct answers at certain positions (particularly B) regardless of content.

**Fix — three layers:**

1. **Rule 10 in system prompt:** "Across the N candidates, distribute the correct answer across different label positions."
2. **Few-shot examples:** Cover A, B, C, D (D twice) to demonstrate the expectation.
3. **Server-side rotation:** After parsing the LLM response, `assignMCPositions()` reassigns positions to guarantee all four labels appear at least once across 5 candidates. The extra slot (candidate 5) gets a random label. The rotation order is shuffled so no pattern is discernible.

This three-layer approach (system prompt + examples + server enforcement) was validated to eliminate the observed B-preference bias.

### 6.8 User Prompt Structure

Retrieved chunks and instructor context are wrapped in XML tags to prevent prompt injection:

```xml
<instructions>
  <question_type_rules>...</question_type_rules>
  <diversity>...</diversity>
  <bloom_distribution>
    Candidate 1: "analyze"
    Candidate 2: "remember"
    ...
  </bloom_distribution>
  <grounding>Every question must be traceable to the context or transcript.</grounding>
</instructions>

<context>
  [Chunk 1]
  {content}
  [Chunk 2]
  {content}
  ...
</context>

<transcript>
  {transcriptText}
</transcript>

<focus_areas>
  {preferences.focusAreas}
  Craft at least 2 of the N questions to directly address these topics.
</focus_areas>
```

XML delimiters prevent adversarial text inside a chunk from escaping the `<context>` block and overriding system instructions. The `<focus_areas>` block is only included when `preferences.focusAreas` is non-empty.

---

## 7. AI Preferences System

### 7.1 AIPromptPreferences Type

**File:** `src/types/ai.ts`

```typescript
export interface AIPromptPreferences {
  difficulty: 'basic' | 'intermediate' | 'advanced';
  style: 'socratic' | 'factual' | 'clinical_scenario';
  length: 'brief' | 'standard' | 'detailed';
  focusAreas?: string;   // free-text, max 500 chars, trimmed and nulled if empty
}
```

Defaults: `difficulty: 'intermediate'`, `style: 'socratic'`, `length: 'standard'`, `focusAreas: ''`.

### 7.2 Persistence

**Table:** `instructor_ai_preferences` (one row per authenticated instructor, keyed by `user_id`)

**API:**
- `GET /api/user/ai-preferences` — fetch preferences; returns defaults if no row exists (PGRST116 empty result)
- `PUT /api/user/ai-preferences` — upsert preferences; `focusAreas` trimmed to 500 chars, set to null if empty

**Hook:** `useAIPreferences()` in `src/hooks/useAIPreferences.ts` — loads on mount, exposes `savePreferences()`.

### 7.3 Preference Flow into Generation

1. Instructor sets preferences via `AIPreferencesDialog` in `ActiveCenter`
2. Saved to DB via `savePreferences()`
3. On generate request: preferences fetched from `instructor_ai_preferences` (or `preferencesOverride` if provided)
4. Passed to `generatePrompts()` which uses them to:
   - Build the difficulty block (Bloom's distribution) in the system prompt
   - Build the style block
   - Build the length block
   - Embed `focusAreas` and blend (30%) with the transcript embedding for retrieval steering
   - Include `<focus_areas>` block in the user prompt

---

## 8. Security

### 8.1 Two-Step Ownership Check

All API routes use the same two-query ownership pattern to avoid Supabase `!inner` join TypeScript issues:

```typescript
// Step 1: get lesson (and its course_id)
const { data: lesson } = await supabase.from('lessons')
  .select('id, course_id').eq('id', lessonId).single();

// Step 2: get course and check instructor_id
const { data: course } = await supabase.from('courses')
  .select('instructor_id').eq('id', lesson.course_id).single();

if (course.instructor_id !== user.id) return 403;
```

### 8.2 is_correct — Two-Stage Handling

`is_correct` is intentionally **not stripped** at the generate API route. The instructor UI needs it to auto-select the correct option in the MC radio group when reviewing candidates.

Stripping happens in exactly **one** place: `handlePublishAiCandidate()` in `useLessonDiscussions.ts`, immediately before `channel.send()`:

```typescript
mc_options: candidate.mcOptions
  ? candidate.mcOptions.map(({ label, text }) => ({ label, text }))
  : null,
```

The `MCOptionSafe = Omit<MCOption, 'is_correct'>` TypeScript type makes accidental inclusion on the student side a compile error. The `discussions.mc_options` column in the database stores the full object including `is_correct` for server-side answer validation.

### 8.3 lesson_id Isolation in pgvector

The `match_lesson_chunks` RPC includes `WHERE lesson_id = p_lesson_id`. Without this clause, cosine similarity search operates across all instructors' lesson chunks — Instructor A's query would return Instructor B's content. This filter is documented as a required code review gate in `retrieveChunks.ts`.

### 8.4 Magic-Byte Validation

File type is validated from the first 4 bytes of the actual buffer. Files not matching PDF or PPTX signatures are rejected before any parsing or storage occurs.

### 8.5 Prompt Injection Guard

Both parsers strip Unicode BiDi control characters (U+202A–U+202E, U+2066–U+2069) from all extracted text. These can be embedded in slide content to reverse text rendering direction and override AI system prompt instructions. XML tag delimiters in the user prompt provide a second layer of defence.

### 8.6 5-File Limit Enforcement

The 5-files-per-lesson cap is enforced by a database trigger (`check_lesson_file_limit`), not only by application-level code. DB-level enforcement prevents race conditions where two simultaneous uploads could both pass the application check before either is committed.

---

## 9. Provider Architecture

**File:** `src/lib/ai/providers.ts`

### 9.1 AIProvider Interface

```typescript
export interface AIProvider {
  generateChatCompletion(
    messages: AIMessage[],
    options?: { temperature?: number; jsonMode?: boolean }
  ): Promise<ChatCompletionResult>;   // { content, tokenUsage?, model? }

  generateEmbedding(text: string | string[]): Promise<number[][]>;

  generateVisionDescription(
    base64Image: string,
    mimeType: 'image/png' | 'image/jpeg' | 'image/webp',
    contextHint?: string
  ): Promise<string>;

  generatePdfVisualDescriptions(
    pdfBuffer: Buffer,
    numPages: number
  ): Promise<Map<number, string>>;

  generatePptxSlideVisualDescription(
    slideNumber: number,
    bodyText: string,
    notesText: string,
    images: Array<{ base64: string; mimeType: ... }>
  ): Promise<string>;
}
```

### 9.2 OpenAIProvider

| Method | Model | Notes |
|---|---|---|
| `generateChatCompletion` | `gpt-4o-mini` | json_object mode, per-type temperature |
| `generateEmbedding` | `text-embedding-3-small` | 1536 dimensions |
| `generateVisionDescription` | `gpt-4o` | max 500 tokens, high detail |
| `generatePdfVisualDescriptions` | `gpt-4o` | max 16384 tokens, native PDF file input |
| `generatePptxSlideVisualDescription` | `gpt-4o` | max 600 tokens |

### 9.3 GeminiProvider

Uses `gemini-2.5-flash` for all tasks; `text-embedding-004` for embeddings.

**Key advantage over OpenAIProvider for PDF vision:** Gemini accepts PDF as inline base64 data without requiring per-page rendering. This cuts PDF vision latency by ~50–65% and token cost by ~90% compared to GPT-4o for equivalent multi-page documents.

**`thinkingConfig: { thinkingBudget: 0 }`** is set on Gemini 2.5 for all vision tasks. Gemini 2.5's extended thinking mode is disabled because factual visual extraction (describe what you see, don't reason about it) gains no benefit from extended inference.

**Auto-selection:** If `GOOGLE_AI_API_KEY` is set, `pdfParser.ts` and `pptxParser.ts` automatically construct a `GeminiProvider` for the vision pass. The caller uses the same `AIProvider` interface regardless of which implementation is active.

### 9.4 Switching Providers

To add a new provider: implement `AIProvider` and swap at the construction site. Verify before switching:

- **Embedding dimensions:** System assumes 1536. A different dimension requires a schema migration on `lesson_chunks.embedding` and a rebuild of the `match_lesson_chunks` RPC.
- **Whisper availability:** Most providers do not expose `audio/transcriptions`. Keep Whisper on OpenAI separately if switching chat provider.
- **`json_object` mode:** Not universally supported. If unavailable, the system prompt must instruct JSON-only output and the parser must strip markdown fences.

---

## 10. Database Schema

### 10.1 lesson_files

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `lesson_id` | UUID FK → lessons.id | |
| `file_name` | text | Original filename as uploaded |
| `file_type` | varchar(10) | `'pdf'` or `'pptx'` — detected via magic bytes |
| `file_size_bytes` | int8 | |
| `storage_path` | text | `{lessonId}/{uuid}-{name}` in `lesson-files` bucket |
| `status` | varchar(20) | `'uploading' \| 'processing' \| 'ready' \| 'failed'` |
| `uploaded_at` | timestamptz | default `now()` |

Max 5 files per lesson, enforced by DB trigger.

### 10.2 lesson_chunks

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `lesson_id` | UUID FK | Indexed; mandatory in all retrieval queries |
| `lesson_file_id` | UUID FK → lesson_files.id | NULL for transcript chunks |
| `content_type` | varchar(20) | See values below |
| `content` | text | Raw chunk text |
| `embedding` | vector(1536) | Float array from embedding model; NULL until `embedChunks` runs |
| `metadata` | jsonb | `ChunkMetadata` — provenance for each chunk |
| `created_at` | timestamptz | default `now()` |

**content_type values:**

| Value | Source |
|---|---|
| `slide_body` | PPTX slide body text |
| `slide_notes` | PPTX speaker notes |
| `page_text` | PDF text layer |
| `visual_description` | Vision model description of diagrams/images |
| `transcript` | STT output from Whisper |

**ChunkMetadata** (`src/types/ai.ts`):

```typescript
interface ChunkMetadata {
  contentOrigin: ContentOrigin;   // matches content_type
  chunkType: 'text';              // 'page_summary' and 'relationship' reserved for future use
  fileName?: string;              // source file name
  pageNumber?: number;            // 1-based (PDF only)
  slideNumber?: number;           // 1-based (PPTX only)
  chunkIndex: number;             // 0-based sequential index within the file
  segmentIndex?: number;          // transcript only
  recordedAt?: string;            // transcript only, ISO timestamp
}
```

### 10.3 instructor_ai_preferences

| Column | Type | Notes |
|---|---|---|
| `user_id` | UUID PK → auth.users.id | One row per instructor |
| `difficulty` | varchar | `'basic' \| 'intermediate' \| 'advanced'` |
| `style` | varchar | `'socratic' \| 'factual' \| 'clinical_scenario'` |
| `length` | varchar | `'brief' \| 'standard' \| 'detailed'` |
| `focus_areas` | text | nullable, max 500 chars |
| `updated_at` | timestamptz | |

### 10.4 match_lesson_chunks RPC

```sql
CREATE FUNCTION match_lesson_chunks(
  p_lesson_id    uuid,
  p_embedding    vector(1536),
  p_match_count  int
)
RETURNS TABLE (
  id              uuid,
  content         text,
  metadata        jsonb,
  content_type    text,
  lesson_file_id  uuid,
  similarity      float
)
LANGUAGE sql STABLE AS $$
  SELECT id, content, metadata, content_type, lesson_file_id,
         1 - (embedding <=> p_embedding) AS similarity
  FROM lesson_chunks
  WHERE lesson_id = p_lesson_id
  ORDER BY embedding <=> p_embedding
  LIMIT p_match_count;
$$;
```

**CRITICAL:** `content_type` must match the column type exactly in `RETURNS TABLE`. Type mismatches cause Postgres error `42804` at runtime. The `lesson_id = p_lesson_id` clause is mandatory — without it, the similarity search operates across all instructors' lesson chunks.

---

## 11. Configuration Reference

### 11.1 Environment Variables

| Variable | Required | Notes |
|---|---|---|
| `OPENAI_API_KEY` | Yes | Chat completion (gpt-4o-mini), embeddings (text-embedding-3-small), Whisper, vision (gpt-4o) |
| `GOOGLE_AI_API_KEY` | No | If set, Gemini is used for PDF and PPTX vision — ~90% cheaper than GPT-4o for vision |
| `MOCK_AI` | No | `'true'` → hardcoded candidates, no API calls |
| `VISION_DEBUG` | No | `'true'` → verbose per-slide/per-page vision logging |
| `NEXT_PUBLIC_DEBUG_TOOLS` | No | `'true'` → enables sweep UI in ActiveCenter (run all parameter combinations) |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |

### 11.2 next.config.ts

```typescript
experimental: {
  serverActions: { bodySizeLimit: '26mb' }  // allows 25MB file/audio uploads
},
serverExternalPackages: ['pdfjs-serverless', '@napi-rs/canvas']
```

The default `serverActions.bodySizeLimit` is 1MB. Without the override, uploads silently fail. `pdfjs-serverless` and `@napi-rs/canvas` must be in `serverExternalPackages` to prevent the Next.js bundler from wrapping them as CommonJS modules, which breaks their internal binary loading.

### 11.3 Key Tunable Constants

| Constant | Location | Default | Notes |
|---|---|---|---|
| `CANDIDATE_COUNT` | `discussionPrompt.ts` | 5 | Candidates returned per generation; prompt and parser both reference this |
| `TEMPERATURE_BY_TYPE` | `discussionPrompt.ts` | 0.7 all types | Per-type temperatures for future A/B testing |
| `BATCH_SIZE` | `embedChunks.ts` | 500 | Embedding batch size per OpenAI request |
| `MATCH_COUNT` | `retrieveChunks.ts` | 8 | Top-K chunks for RAG context |
| `BLEND_ALPHA` | `generatePrompts.ts` | 0.70 | Transcript weight in transcript/focusAreas blend |

### 11.4 Required npm Packages

| Package | Purpose |
|---|---|
| `openai` | OpenAI SDK — chat, embeddings, Whisper, vision |
| `@google/generative-ai` | Google Gemini SDK — vision, chat, embeddings |
| `pdfjs-serverless` | PDF text extraction — serverless build for Next.js App Router |
| `@napi-rs/canvas` | Canvas polyfill required by pdfjs-serverless |
| `jszip` | PPTX ZIP unpacking — OOXML container parsing |

---

## 12. Design Decisions & Rationale

This section documents non-obvious choices and the reasoning behind them.

### 12.1 Node.js Native Pipeline — No Python Sidecar

An early proposal was to implement parsing and embedding in a Python sidecar process. Rejected because:

- A single Next.js process requires no supervisord, no Python runtime, and one restart command.
- Python cold-start takes 8–15 seconds. supervisord `startsecs` defaults to 1 second — the process would silently fail after 3 restart attempts before the app was ready.
- Node.js `@langchain/textsplitters` (later replaced with a custom splitter) provided equivalent text splitting functionality.

### 12.2 Sentence-Aware Chunking vs LangChain RecursiveCharacterTextSplitter

The original implementation used `@langchain/textsplitters` `RecursiveCharacterTextSplitter` with fixed character boundaries. Replaced because:

- Fixed character boundaries cut through sentences mid-phrase, producing chunks that are semantically incomplete and embed poorly.
- Sentence-aware splitting preserves semantic units, improving retrieval precision.
- Removing the LangChain dependency simplifies the dependency tree and gives full control over splitting logic.
- Content-type-specific sizes (512/768/1024) cannot be expressed in LangChain's single-size API without multiple instances.

### 12.3 Single-Call PDF Vision vs Per-Page Rendering

Sending the entire PDF to the vision model in one call (vs. rendering each page to an image and sending individually) was chosen because:

- `pdfjs-serverless`'s internal canvas factory fails on image-bearing pages due to a pre-bundled scope check that globalThis polyfills cannot reach.
- GPT-4o's native PDF file input preserves layout context — captions stay with their figures, multi-page diagrams are understood holistically.
- One API call is faster and cheaper than N render operations.

### 12.4 Per-Slide PPTX Vision vs Per-Image

One vision call per slide (body text + speaker notes + all embedded images together) vs. one call per image because:

- The model can cross-reference diagram labels with slide text — e.g. "TNF-alpha" in the text corresponds to a node in the pathway diagram.
- Reduces API calls from `(images × slides)` to `(slides with images)`.
- The model is instructed not to repeat what's in text/notes, so descriptions are additive and non-redundant.

### 12.5 Natural Language Vision Descriptions

Vision extraction rules produce natural-language sentences ("FFA stimulates insulin resistance") rather than compact symbol notation ("FFA→IR") because `text-embedding-3-small` is trained on prose. Natural language descriptions embed with richer semantic context and retrieve better against conversational student queries.

### 12.6 70/30 Embedding Blend

The focusAreas blend weight (30%) was chosen to steer retrieval toward instructor intent without losing the transcript's immediate context signal (70%). Pure transcript retrieval misses synonyms — "side effects" vs "adverse reactions" are semantically equivalent in pharmacology but map to different vector regions. The blend bridges this gap. The ratio is fixed (not exposed as a preference) to avoid an additional tuning surface.

### 12.7 Bloom's Schedules Different for MC vs Free-Response

Multiple choice cannot meaningfully assess "create" — creation requires generating novel artefacts, which selection prevents. MC schedules stop at "evaluate". Free-response schedules include "create" at advanced difficulty, enabling open-ended synthesis questions.

### 12.8 MC Few-Shot Examples Cover All Label Positions

Five examples include: one with correct at A, one at B, one at C, two at D. D appears twice because early generation testing showed D was consistently underrepresented in LLM output. The examples explicitly demonstrate the expected distribution across all positions.

### 12.9 Two-Stage is_correct Handling

The generate API route intentionally does not strip `is_correct`. The instructor UI needs it to pre-select the correct option in the radio group when reviewing candidates — this is part of the "quick publish" flow where the instructor doesn't have to manually identify the correct answer. Stripping happens exclusively before the student broadcast. The split is intentional and documented; it should not be collapsed without understanding the UI dependency.

---

## 13. Decisions Reversed

Approaches that were tried and removed. Documented here to prevent re-introduction.

### 13.1 excludeAreas Preference

An `excludeAreas` preference field was added alongside `focusAreas` — instructors could specify topics to suppress in generated questions. Removed because:

- Retrieval-level filtering (dropping chunks mentioning excluded topics) proved ineffective. The excluded topics still appeared in LLM output because GPT-4o-mini synthesises across all retrieved chunks; removing a few chunks doesn't suppress a topic that appears in many.
- The correct approach is system-prompt rules ("do not ask about X"), not retrieval filtering.
- The DB column `exclude_areas` remains in `instructor_ai_preferences` but is no longer read by the application.

### 13.2 filterExcludedChunks and parseKeywords Utilities

Keyword-based retrieval filtering functions (`filterExcludedChunks`, `parseKeywords`) were built to support the `excludeAreas` preference. Deleted alongside that feature. Keyword matching is the wrong primitive for this task — semantic similarity retrieval already handles relevance; keyword negation on top creates complex interaction effects without improving output quality.

### 13.3 LangChain RecursiveCharacterTextSplitter

Replaced with a custom sentence-aware splitter. See §12.2.

### 13.4 Pharmacology-Specific System Prompt Language

Early versions of the system prompt framed the AI as a "pharmacology teaching assistant" with pharmacology-specific examples. Replaced with domain-agnostic framing because the tool serves the entire Faculty of Pharmacy and Pharmaceutical Sciences, not just pharmacology. Domain-specific framing would also bias question generation toward drug mechanisms even for non-pharmacology lesson content.

### 13.5 pdf-parse npm Package

`pdf-parse` was the first PDF parsing library attempted. Its `require('pdf-parse')` call returns `pdfjs-dist` internals due to a broken package install interaction. Replaced with `pdfjs-serverless` which is purpose-built for serverless/edge environments.

---

## Appendix: Key File Locations

| File | Purpose |
|---|---|
| `src/app/api/lessons/[lessonId]/upload/route.ts` | File upload + background parse/embed pipeline |
| `src/app/api/lessons/[lessonId]/files/route.ts` | List lesson files (GET) |
| `src/app/api/lessons/[lessonId]/files/[fileId]/route.ts` | Get signed URL (GET), delete file (DELETE) |
| `src/app/api/lessons/[lessonId]/generate/route.ts` | RAG generation endpoint |
| `src/app/api/lessons/[lessonId]/transcript/route.ts` | Whisper STT endpoint |
| `src/app/api/user/ai-preferences/route.ts` | Fetch/upsert instructor preferences |
| `src/lib/ai/providers.ts` | `AIProvider` interface, `OpenAIProvider`, `GeminiProvider` |
| `src/lib/ai/parsers/index.ts` | Parser dispatcher |
| `src/lib/ai/parsers/pdfParser.ts` | PDF text + vision extraction |
| `src/lib/ai/parsers/pptxParser.ts` | PPTX text + speaker notes + vision extraction |
| `src/lib/ai/embedChunks.ts` | Batch embedding via `aiProvider.generateEmbedding` |
| `src/lib/ai/generatePrompts.ts` | RAG orchestration (blend → retrieve → prompt → generate → parse) |
| `src/lib/ai/retrieveChunks.ts` | Similarity retrieval, embedding blend, recency fallback |
| `src/lib/ai/prompts/discussionPrompt.ts` | System prompt, user prompt builder, `CANDIDATE_COUNT`, `TEMPERATURE_BY_TYPE` |
| `src/lib/ai/__mocks__/generatePrompts.ts` | Mock mode — hardcoded candidates |
| `src/hooks/useAIPreferences.ts` | Fetch/save instructor AI preferences |
| `src/hooks/useAudioRecorder.ts` | Browser `MediaRecorder` hook for STT |
| `src/hooks/useSessionPage/useLessonAI.ts` | AI state management for session page |
| `src/hooks/useSessionPage/useLessonFiles.ts` | File state + polling + optimistic upload |
| `src/hooks/useSessionPage/useLessonDiscussions.ts` | Discussion lifecycle + Realtime + publish (is_correct stripped here) |
| `src/components/instructor/session/ActiveCenter.tsx` | Main instructor session UI, debug report, sweep tool |
| `src/types/ai.ts` | `AIPromptPreferences`, `LessonFile`, `GeneratedPrompt`, `CandidateSet`, `MCOption`, `MCOptionSafe`, `ChunkMetadata` |
