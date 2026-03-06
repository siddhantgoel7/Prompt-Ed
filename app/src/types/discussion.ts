import { MCOptionSafe } from './ai';

export type PromptType = 'short_answer' | 'long_answer' | 'multiple_choice';
export type DiscussionStatus = 'draft' | 'active' | 'closed';

export interface Discussion {
  id: string;
  lesson_id: string;
  prompt_text: string;
  prompt_type: PromptType;
  status: DiscussionStatus;
  created_at: string;
  published_at: string | null;
  closed_at: string | null;
  display_order: number;
  source: 'manual' | 'ai_generated' | null;
  mc_options: MCOptionSafe[] | null;
  correct_option: string | null;
  feedback_enabled: boolean;
  ai_generated_correct_option: string | null;
}

export interface CreateDiscussionInput {
  prompt_text: string;
  prompt_type: PromptType;
}

export interface DiscussionWithResponseCount extends Discussion {
  response_count: number;
}
