// Type definitions for discussions (questions) published during a live lesson session.
import { MCOptionSafe } from './ai';

/** The three supported question formats for a discussion prompt. */
export type PromptType = 'short_answer' | 'long_answer' | 'multiple_choice';
/** Lifecycle state of a discussion: draft before publish, active while open, closed when ended. */
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
  // Number of students present when this discussion was published (snapshotted from realtime presence)
  participant_snapshot: number | null;
}

export interface CreateDiscussionInput {
  prompt_text: string;
  prompt_type: PromptType;
}

/** Discussion record enriched with the pre-computed student response count, used in list views. */
export interface DiscussionWithResponseCount extends Discussion {
  response_count: number;
}