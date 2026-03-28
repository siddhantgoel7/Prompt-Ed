-- Migration: Ensure cascading deletes across all tables in the schema.
-- This script safely drops existing foreign key constraints and re-adds them with ON DELETE CASCADE.
-- This ensures that deleting an instructor account, a course, or a lesson automatically 
-- cleans up all dependent records (lessons, files, chunks, transcripts, responses, etc.).

DO $$ 
BEGIN
    -- 1. instructor_ai_preferences: user_id -> auth.users(id)
    ALTER TABLE IF EXISTS public.instructor_ai_preferences 
    DROP CONSTRAINT IF EXISTS instructor_ai_preferences_user_id_fkey;
    ALTER TABLE IF EXISTS public.instructor_ai_preferences 
    ADD CONSTRAINT instructor_ai_preferences_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

    -- 2. courses: instructor_id -> auth.users(id)
    ALTER TABLE IF EXISTS public.courses 
    DROP CONSTRAINT IF EXISTS courses_instructor_id_fkey;
    ALTER TABLE IF EXISTS public.courses 
    ADD CONSTRAINT courses_instructor_id_fkey 
    FOREIGN KEY (instructor_id) REFERENCES auth.users(id) ON DELETE CASCADE;

    -- 3. lessons: course_id -> courses(id)
    ALTER TABLE IF EXISTS public.lessons 
    DROP CONSTRAINT IF EXISTS lessons_course_id_fkey;
    ALTER TABLE IF EXISTS public.lessons 
    ADD CONSTRAINT lessons_course_id_fkey 
    FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

    -- 4. lesson_files: lesson_id -> lessons(id)
    ALTER TABLE IF EXISTS public.lesson_files 
    DROP CONSTRAINT IF EXISTS lesson_files_lesson_id_fkey;
    ALTER TABLE IF EXISTS public.lesson_files 
    ADD CONSTRAINT lesson_files_lesson_id_fkey 
    FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;

    -- 5. lesson_chunks: lesson_file_id -> lesson_files(id) AND lesson_id -> lessons(id)
    ALTER TABLE IF EXISTS public.lesson_chunks 
    DROP CONSTRAINT IF EXISTS lesson_chunks_lesson_file_id_fkey;
    ALTER TABLE IF EXISTS public.lesson_chunks 
    ADD CONSTRAINT lesson_chunks_lesson_file_id_fkey 
    FOREIGN KEY (lesson_file_id) REFERENCES public.lesson_files(id) ON DELETE CASCADE;

    ALTER TABLE IF EXISTS public.lesson_chunks 
    DROP CONSTRAINT IF EXISTS lesson_chunks_lesson_id_fkey;
    ALTER TABLE IF EXISTS public.lesson_chunks 
    ADD CONSTRAINT lesson_chunks_lesson_id_fkey 
    FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;

    -- 6. discussions: lesson_id -> lessons(id)
    ALTER TABLE IF EXISTS public.discussions 
    DROP CONSTRAINT IF EXISTS discussions_lesson_id_fkey;
    ALTER TABLE IF EXISTS public.discussions 
    ADD CONSTRAINT discussions_lesson_id_fkey 
    FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;

    -- 7. responses: discussion_id -> discussions(id)
    ALTER TABLE IF EXISTS public.responses 
    DROP CONSTRAINT IF EXISTS responses_discussion_id_fkey;
    ALTER TABLE IF EXISTS public.responses 
    ADD CONSTRAINT responses_discussion_id_fkey 
    FOREIGN KEY (discussion_id) REFERENCES public.discussions(id) ON DELETE CASCADE;

    -- 8. general_questions: lesson_id -> lessons(id) (Already has cascade, but re-applying to be sure)
    ALTER TABLE IF EXISTS public.general_questions 
    DROP CONSTRAINT IF EXISTS general_questions_lesson_id_fkey;
    ALTER TABLE IF EXISTS public.general_questions 
    ADD CONSTRAINT general_questions_lesson_id_fkey 
    FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;

END $$;
