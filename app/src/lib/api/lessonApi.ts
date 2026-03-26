// Client-side Supabase helpers for lesson and course CRUD operations.
import { createClient } from '@/lib/supabase/client';
import type { CreateLessonInput } from '@/types/lesson';
import { generateSecureAlphanumeric } from '@/lib/utils/random';

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
                pin_code: generateSecureAlphanumeric(6),
            },
        ])
        .select();
}

export async function deleteLesson(lessonId: string) {
    const supabase = createClient();
    return supabase.from('lessons').delete().eq('id', lessonId);
}

export async function fetchTranscriptsApi(lessonId: string) {
    const supabase = createClient();
    return supabase
        .from('lesson_chunks')
        .select('id, content, created_at, metadata')
        .eq('lesson_id', lessonId)
        .eq('content_type', 'transcript')
        .order('created_at', { ascending: true });
}

export async function fetchLessonWithInstructorIdApi(lessonId: string) {
    const supabase = createClient();
    return supabase
        .from('lessons')
        .select('*, courses!inner(instructor_id)')
        .eq('id', lessonId)
        .single();
}

export async function activateDraftLessonApi(lessonId: string, pinCode: string) {
    const supabase = createClient();
    return supabase
        .from('lessons')
        .update({ status: 'active', pin_code: pinCode, started_at: new Date().toISOString() })
        .eq('id', lessonId)
        .select()
        .single();
}

export async function endLessonApi(lessonId: string, now: string) {
    const supabase = createClient();
    return supabase
        .from('lessons')
        .update({ status: 'ended', ended_at: now })
        .eq('id', lessonId);
}

export async function reactivateLessonApi(lessonId: string) {
    const supabase = createClient();
    return supabase
        .from('lessons')
        .update({ status: 'active', started_at: new Date().toISOString(), ended_at: null })
        .eq('id', lessonId);
}

export async function fetchLessonByPinApi(pinCode: string) {
    const supabase = createClient();
    return supabase
        .from('lessons')
        .select('id, status')
        .eq('pin_code', pinCode)
        .single();
}

export async function fetchLessonByIdApi(lessonId: string) {
    const supabase = createClient();
    return supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .single();
}
