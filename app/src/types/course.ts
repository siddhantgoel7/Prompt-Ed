// Type definitions for courses owned by instructors.

/** A course record as stored in the database. */
export interface Course {
  id: string;
  title: string;
  image_url?: string;
  date_created: string;
  instructor_id: string;
}

/** Fields required to create a new course. */
export interface CreateCourseInput {
  title: string;
  image_url?: string;
}