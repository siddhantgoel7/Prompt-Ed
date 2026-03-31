# Response Rate Fix — Working Context

## Branch: `bug-fix/response-rate`

## Problem
Response rate metrics are broken for discussions with multiple responses enabled. The percentage can exceed 100% and the denominator (student count) is inconsistent across views.

## Current State

### What's been done
- Added `student_session_id TEXT` column to `responses` table — a persistent anonymous UUID stored in the student's `localStorage`, sent with every response
- Metrics now calculate unique respondents via `new Set(responses.map(r => r.student_session_id)).size` instead of `responses.length`
- Response rate is capped at 100% via `Math.min(100, ...)`
- Extracted `useParticipantPeak` hook to share peak student count tracking between lesson page and discussion page
- Peak student count is persisted to `participant_snapshot` in DB so it survives page navigation

### What's still broken
- **"Live Responses" header** in `ActiveRightPanel.tsx` (line 57-58) shows `responses.length / peakStudentCount` — this is total responses, not unique respondents. With multiple responses enabled, this shows e.g. "5 / 2" which is confusing. Needs to either show unique respondents or be relabeled.
- **Response rate on the discussion detail page** may still show incorrect values when navigating between pages — the `participant_snapshot` and `peakStudentCount` synchronization has edge cases
- **Old test data** in the database has `student_session_id = NULL` — existing responses from before the migration won't be counted as unique respondents. Only affects pre-migration data.

### Migration required
```sql
ALTER TABLE responses DROP COLUMN IF EXISTS is_first_response;
ALTER TABLE responses ADD COLUMN student_session_id TEXT;
```

## Key Files

### Metrics calculation (3 locations — must stay in sync)
- `app/src/components/instructor/session/DiscussionAnalyticsModal.tsx` — analytics popup + discussion detail page sidebar
- `app/src/components/instructor/session/EndedDiscussionCard.tsx` — ended session discussion cards
- `app/src/hooks/useSessionPage.ts` — CSV export (line ~630)

### Peak student count tracking
- `app/src/hooks/useParticipantPeak.ts` — shared hook used by both pages
- `app/src/hooks/useSessionPage/useLessonDiscussions.ts` — lesson page uses the hook + syncs in-memory discussion objects
- `app/src/components/instructor/DiscussionPage.tsx` — discussion detail page uses the hook

### Student session ID
- `app/src/hooks/useStudentSession.ts` — `getStudentSessionId()` generates/retrieves UUID from `localStorage`, sent with every `submitStudentResponseApi` call
- `app/src/lib/api/discussionsApi.ts` — `submitStudentResponseApi` accepts and inserts `student_session_id`
- `app/src/types/response.ts` — `Response` type includes `student_session_id: string | null`

### Display components that show response counts
- `app/src/components/instructor/session/ActiveRightPanel.tsx` (line 55-58) — "Live Responses X / Y" header
- `app/src/components/instructor/session/DiscussionAnalyticsModal.tsx` — "Responses" and "Response Rate" stat cards

## How unique respondents are counted
```ts
const uniqueRespondents = new Set(
  responses.map(r => r.student_session_id).filter(Boolean)
).size;
```
Responses without `student_session_id` (pre-migration) are excluded from the unique count.

## How peak student count works
- `useParticipantPeak(discussionId, initialSnapshot, liveStudentCount)` tracks the highest student count seen
- Seeds from `participant_snapshot` in DB on mount
- Updates when `liveStudentCount` exceeds the peak
- Persists new peaks to DB via `updateParticipantSnapshotApi`
- The peak never decreases — students leaving doesn't reduce the denominator
