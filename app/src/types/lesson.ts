// Type definitions for lessons belonging to a course.
// A lesson goes through draft → active → ended lifecycle states.

/** Possible states of a lesson's lifecycle. */
export type LessonStatus = 'draft' | 'active' | 'ended';

/** A lesson record as stored in the database. */
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

/** Fields required to create a new lesson. */
export interface CreateLessonInput {
  title: string;
}