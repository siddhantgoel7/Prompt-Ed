-- Migration: add general_questions table
-- Stores pre-generated multiple-choice questions derived from all uploaded course materials.
-- These are persisted (unlike live AI candidates) and can be published as discussions at any time.

CREATE TABLE IF NOT EXISTS general_questions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id      UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  prompt_text    TEXT NOT NULL,
  mc_options     JSONB NOT NULL,        -- Array of {label, text, is_correct} (same shape as discussions.mc_options)
  correct_option VARCHAR(1) NOT NULL,   -- 'A','B','C','D'
  display_order  INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by lesson
CREATE INDEX IF NOT EXISTS idx_general_questions_lesson_id ON general_questions(lesson_id);

-- RLS: only the lesson's course instructor can read/write general questions
ALTER TABLE general_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Instructors can manage their own general questions"
  ON general_questions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN courses c ON c.id = l.course_id
      WHERE l.id = general_questions.lesson_id
        AND c.instructor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN courses c ON c.id = l.course_id
      WHERE l.id = general_questions.lesson_id
        AND c.instructor_id = auth.uid()
    )
  );
