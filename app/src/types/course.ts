export interface Course {
  id: string;
  title: string;
  image_url?: string;
  date_created: string;
  instructor_id: string;
}

export interface CreateCourseInput {
  title: string;
  image_url?: string;
}