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
 * Deletes a course and all its associated data (lessons, files, chunks, etc.).
 * Uses DB-level ON DELETE CASCADE for data, and manually cleans up Supabase Storage.
 */
export async function deleteCourseCascade(courseId: string) {
  const supabase = createClient();

  // 1. Fetch all storage paths for files in lessons belonging to this course
  const { data: storagePaths } = await supabase
    .from('lesson_files')
    .select('storage_path, lessons!inner(course_id)')
    .eq('lessons.course_id', courseId);

  // 2. Delete files from storage if they exist
  if (storagePaths && storagePaths.length > 0) {
    const paths = storagePaths.map((f) => f.storage_path).filter(Boolean);
    if (paths.length > 0) {
      await supabase.storage.from('lesson-files').remove(paths);
    }
  }

  // 3. Delete the course (DB CASCADE will handle lessons, chunks, discussions, etc.)
  const courseResult = await supabase.from('courses').delete().eq('id', courseId);

  return { courseResult };
}
