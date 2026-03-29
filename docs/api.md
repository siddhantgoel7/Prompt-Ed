# API & Supabase Guide

The PMCOL Teaching Tool exposes a small set of server-side Next.js API routes. Most read/write operations on courses, lessons, discussions, and responses happen directly from the browser via the Supabase client using the anon key. The server routes handle operations that require elevated privileges: OAuth session exchange, admin user lookups, AI generation, file upload/parsing, and audio transcription.

A full OpenAPI 3.0 specification is available at [`docs/openapi.yaml`](../docs/openapi.yaml) and can be browsed interactively — see [Swagger UI](#swagger-ui) below.

---

## Authentication

All protected routes use the **server-side Supabase client** (`app/src/lib/supabase/server.ts`) to verify the session cookie set by the OAuth callback. Routes that return `401` have no valid session; routes that return `403` have a valid session but the authenticated user does not own the requested resource.

Ownership is verified via a two-step lookup: lesson → course → `instructor_id === user.id`.

---

## Routes

### Auth

#### `GET /api/auth/callback`

Handles the Google OAuth redirect from Supabase. Exchanges the one-time authorization code for a server-side session cookie, then enforces the `@ualberta.ca` domain restriction. Accounts that fail the domain check are signed out and deleted via the admin client before redirecting to the sign-up page with an error.

| Query param | Required | Description |
|-------------|----------|-------------|
| `code` | Yes | One-time authorization code from Supabase OAuth provider |

**Responses:**
- `302 → /instructor_dashboard` — success
- `302 → /create_instructor?error=<message>` — Supabase error or domain rejection

**Security:** No session required. Uses `SUPABASE_SERVICE_ROLE_KEY` (server-only) to delete rejected accounts.

---

#### `POST /api/auth/check-email`

Checks whether an email address already has a registered account. Called during sign-up to prevent duplicates. Uses the Supabase admin client to enumerate users — requires no session so the UI can show a message before OAuth begins.

**Request body:**
```json
{ "email": "instructor@ualberta.ca" }
```

**Response:**
```json
{ "exists": false }
```

**Error responses:** `500` if the admin query fails.

---

### Lesson Files

All file routes require an authenticated session and verify that the caller owns the lesson's course.

#### `GET /api/lessons/{lessonId}/files`

Returns all files uploaded to a lesson, ordered by upload time descending. Each record includes the current processing `status`: `processing | ready | failed`.

**Response:** Array of `LessonFile` objects — see [Schemas](#schemas).

---

#### `POST /api/lessons/{lessonId}/upload`

Uploads a PDF or PPTX lecture file (max 25 MB, max 5 files per lesson). File type is verified by magic bytes, not just extension.

The route **returns immediately** with `status: "processing"` while background work continues asynchronously:
1. File parsed — text extracted; GPT-4o vision generates descriptions for image-heavy slides
2. Content split into overlapping sentence-boundary chunks
3. Near-duplicate chunks dropped via Jaccard similarity (threshold 0.7)
4. Chunks embedded with `text-embedding-3-small` and stored in `lesson_chunks`
5. File status updated to `ready` (or `failed` on error)

**Request:** `multipart/form-data` with a `file` field.

**Response:** `LessonFile` object with `status: "processing"`.

**Error responses:** `400` (no file / too large / wrong type), `401`, `403`, `404`, `500`.

---

#### `GET /api/lessons/{lessonId}/files/{fileId}`

Returns a short-lived Supabase Storage signed URL (valid 10 minutes) for downloading the original file, plus the original filename.

**Response:**
```json
{
  "url": "https://xyz.supabase.co/storage/v1/object/sign/...",
  "fileName": "lecture-week3.pdf"
}
```

---

#### `DELETE /api/lessons/{lessonId}/files/{fileId}`

Permanently removes a file in three steps:
1. Deletes all associated vector chunks from `lesson_chunks`
2. Removes the record from `lesson_files`
3. Removes the raw file from Supabase Storage

**Response:** `{ "success": true }`

---

### Lessons

#### `POST /api/lessons/{lessonId}/transcript`

Accepts an audio recording (max 25 MB, any Whisper-supported format) and transcribes it using OpenAI Whisper (`whisper-1`, English). The transcript text is **returned immediately**. In the background, the transcript is embedded and stored as a `lesson_chunk` so it becomes available for RAG-based prompt generation.

**Request:** `multipart/form-data` with an `audio` field.

**Response:**
```json
{ "transcript": "Today we will cover the pharmacokinetics of beta-blockers..." }
```

**Error responses:** `400` (no audio / too large / no speech detected), `401`, `403`, `404`, `500`.

---

#### `POST /api/lessons/{lessonId}/generate`

Generates AI discussion prompt candidates using Retrieval-Augmented Generation. The pipeline:
1. Embeds any provided `transcriptText`
2. Retrieves the most semantically similar chunks from `lesson_chunks` via pgvector
3. Constructs a context-aware prompt and calls GPT-4o
4. Returns a `CandidateSet` with multiple prompt options

For `multiple_choice` prompts, `is_correct` is included in the instructor response so the UI can pre-select the correct answer. It is stripped before being broadcast to student clients.

Set `MOCK_AI=true` in `.env.local` to return deterministic fake prompts without calling OpenAI (useful for development).

**Request body:**
```json
{
  "promptType": "multiple_choice",
  "transcriptText": "optional live lecture text",
  "preferencesOverride": { "difficulty": "advanced", "style": "socratic", "length": "standard", "focusAreas": "" }
}
```

`promptType` must be one of: `short_answer`, `long_answer`, `multiple_choice`. Defaults to `long_answer`.

`preferencesOverride` is optional — if omitted, the instructor's saved preferences are fetched from the database.

**Response:** `CandidateSet` — see [Schemas](#schemas).

**Error responses:** `400` (invalid promptType), `401`, `403`, `404`, `500`.

---

### User

#### `GET /api/user/ai-preferences`

Returns the authenticated instructor's saved AI generation preferences. Returns defaults if none have been saved yet:

```json
{
  "difficulty": "intermediate",
  "style": "socratic",
  "length": "standard",
  "focusAreas": ""
}
```

---

#### `PUT /api/user/ai-preferences`

Saves (upserts) the instructor's AI generation preferences. `focusAreas` is trimmed and capped at 500 characters; an empty string is stored as `null`.

**Request body:** `AIPromptPreferences` — see [Schemas](#schemas).

**Response:** `{ "success": true }`

---

### Internal

#### `GET /api/socket`

Placeholder stub — not used in production. Real-time functionality is handled entirely through Supabase Realtime WebSocket channels. See [Realtime](#realtime) below.

---

## Schemas

### `LessonFile`
| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | File record ID |
| `lessonId` | uuid | Parent lesson ID |
| `fileName` | string | Original filename |
| `fileType` | `pdf` \| `pptx` | Detected file type |
| `fileSizeBytes` | integer | File size in bytes |
| `status` | `processing` \| `ready` \| `failed` | Embedding pipeline status |
| `uploadedAt` | datetime | Upload timestamp |

### `AIPromptPreferences`
| Field | Type | Values |
|-------|------|--------|
| `difficulty` | string | `beginner`, `intermediate`, `advanced` |
| `style` | string | `socratic`, `direct`, `conceptual`, `applied` |
| `length` | string | `brief`, `standard`, `detailed` |
| `focusAreas` | string | Free-text, max 500 chars |

### `CandidateSet`
```json
{
  "promptType": "multiple_choice",
  "candidates": [
    {
      "question": "Which receptor does propranolol primarily target?",
      "rationale": "Tests recall of drug mechanism...",
      "mcOptions": [
        { "label": "A", "text": "Alpha-1 adrenergic", "is_correct": false },
        { "label": "B", "text": "Beta-1 adrenergic", "is_correct": true }
      ]
    }
  ]
}
```

---

## Supabase Configuration

- Public keys: `app/.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- Browser client factory: `app/src/lib/supabase/client.ts`
- Server client (cookie-based auth): `app/src/lib/supabase/server.ts`
- Auth helpers (email/password, Google OAuth): `app/src/lib/supabase/auth.ts`

### Direct Client Access (Browser → Supabase)

These service functions call Supabase directly from the frontend using the anon key — they are **not** API routes:

| Service | File |
|---------|------|
| Courses | `app/src/services/courseService.ts` |
| Lessons | `app/src/services/lessonService.ts` |
| Discussions | `app/src/services/discussionService.ts` |
| Responses | `app/src/services/responseService.ts` |

TypeScript models for all Supabase tables (`instructors`, `courses`, `lessons`, `discussions`, `responses`) are in `app/src/types/*.ts`.

---

## Realtime

Live session updates between instructors and students use Supabase Realtime broadcast channels — not the API routes.

- **Channel naming:** `lesson:{lessonId}`
- **Hook:** `app/src/lib/realtime/useRealtime.ts` (broadcast with ack enabled)
- **Used for:** prompt publishing, response aggregation, session status, timer sync

---

## Swagger UI

Browse the full OpenAPI spec interactively:

```bash
cd app
npm install          # first time only
npm run api:swagger  # opens http://127.0.0.1:8080 with live reload
```

Stop with `Ctrl+C`.

---

## Environment Variables

| Variable | Where used | Description |
|----------|-----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client | Supabase anon key for browser access |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Admin key for user enumeration and deletion |
| `OPENAI_API_KEY` | Server only | OpenAI key for GPT-4o, Whisper, and embeddings |
| `MOCK_AI` | Server only | Set to `true` to bypass OpenAI calls during development |
