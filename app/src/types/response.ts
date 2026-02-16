export interface Response {
  id: string;
  discussion_id: string;
  response_text: string;
  created_at: string;
}

export interface CreateResponseInput {
  discussion_id: string;
  response_text: string;
}
