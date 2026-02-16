import { createClient } from '@/lib/supabase/client';
import type { CreateCourseInput } from '@/types/course';

export async function listInstructorCourses(instructorId: string) {
  const supabase = createClient();

  return supabase
    .from('courses')
    .select('*')
    .eq('instructor_id', instructorId)
    .order('date_created', { ascending: false });
}

export async function createCourse(instructorId: string, input: CreateCourseInput) {
  const supabase = createClient();

  return supabase
    .from('courses')
    .insert([
      {
        instructor_id: instructorId,
        title: input.title.trim(),
        image_url: input.image_url?.trim() ? input.image_url.trim() : null,
      },
    ])
    .select();
}

export async function updateCourse(courseId: string, input: CreateCourseInput) {
  const supabase = createClient();

  return supabase
    .from('courses')
    .update({
      title: input.title.trim(),
      image_url: input.image_url?.trim() ? input.image_url.trim() : null,
    })
    .eq('id', courseId)
    .select();
}

/**
 * Prefer DB-level ON DELETE CASCADE for lessons.
 * We keep the best-effort manual delete for safety/backward compat.
 */
export async function deleteCourseCascade(courseId: string) {
  const supabase = createClient();

  const lessonsResult = await supabase.from('lessons').delete().eq('course_id', courseId);
  // ignore lessons error if table/cascade differs, but return it for logging
  const courseResult = await supabase.from('courses').delete().eq('id', courseId);

  return { lessonsResult, courseResult };
}
