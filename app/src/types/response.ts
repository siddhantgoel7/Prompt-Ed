// Type definitions for student responses submitted to a discussion.

/** A student's response record as stored in the database. */
export interface Response {
  id: string;
  discussion_id: string;
  response_text: string;
  created_at: string;
  selected_option: string | null;
  is_correct: boolean | null;
}

/** Fields required to submit a new student response. */
export interface CreateResponseInput {
  discussion_id: string;
  response_text: string;
}
