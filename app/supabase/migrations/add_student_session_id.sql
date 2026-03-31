-- Anonymous per-browser session identifier for tracking unique respondents.
-- Stored in localStorage on the student's device; included with every response.
-- Allows accurate response rate calculation via COUNT(DISTINCT student_session_id).
ALTER TABLE responses ADD COLUMN student_session_id TEXT;
