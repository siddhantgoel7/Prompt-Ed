-- Soft delete for flagged responses.
-- Instead of permanently deleting responses flagged as inappropriate,
-- we set a timestamp so they can be reviewed or restored later.
--
-- Run this in the Supabase SQL Editor.

-- 1. Add the flagged_at column (skip if already added)
ALTER TABLE responses ADD COLUMN IF NOT EXISTS flagged_at timestamptz DEFAULT NULL;

-- 2. Index for faster filtering of non-flagged responses
CREATE INDEX IF NOT EXISTS idx_responses_flagged_at ON responses (flagged_at) WHERE flagged_at IS NULL;

-- 3. RLS policy: allow authenticated users (instructors) to update responses.
--    Without this policy, the .update() call silently has no effect.
CREATE POLICY "Authenticated users can update responses"
  ON responses FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
