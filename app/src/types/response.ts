export interface Response {
  id: string;
  discussion_id: string;
  response_text: string;
  created_at: string;
  selected_option: string | null;
  is_correct: boolean | null;
}

export interface CreateResponseInput {
  discussion_id: string;
  response_text: string;
}
