// types/lesson.ts
export type LessonStatus = 'draft' | 'active' | 'ended';

export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  date_created: string;
  created_at: string;
  pin_code: string | null;
  status: LessonStatus;
  started_at: string | null;
  ended_at: string | null;
}

export interface CreateLessonInput {
  title: string;
}