import { createClient } from '@/lib/supabase/client';
import type { CreateLessonInput } from '@/types/lesson';

export async function getOwnedCourse(courseId: string, instructorId: string) {
  const supabase = createClient();
  return supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .eq('instructor_id', instructorId)
    .single();
}

export async function listLessons(courseId: string) {
  const supabase = createClient();
  return supabase
    .from('lessons')
    .select('*')
    .eq('course_id', courseId)
    .order('date_created', { ascending: false });
}

export async function createLesson(courseId: string, input: CreateLessonInput) {
  const supabase = createClient();
  return supabase
    .from('lessons')
    .insert([
      {
        title: input.title.trim(),
        course_id: courseId,
        pin_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
      },
    ])
    .select();
}

export async function deleteLesson(lessonId: string) {
  const supabase = createClient();
  return supabase.from('lessons').delete().eq('id', lessonId);
}
