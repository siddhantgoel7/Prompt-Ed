// types/lesson.ts
export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  date_created: string;
  created_at: string;
}

export interface CreateLessonInput {
  title: string;
}