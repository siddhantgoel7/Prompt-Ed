import type { Discussion, DiscussionWithResponseCount } from '@/types/discussion';
import type { Response } from '@/types/response';

/**
 * Mock data fixtures for testing discussion and response features.
 *
 * These fixtures provide consistent test data across test files,
 * reducing duplication and ensuring data structure validity.
 */

export const mockDiscussion: Discussion = {
  id: 'discussion-123',
  lesson_id: 'lesson-456',
  prompt_text: 'What is the main purpose of the WWW Consortium?',
  prompt_type: 'short_answer',
  status: 'active',
  created_at: '2026-02-10T14:05:23Z',
  published_at: '2026-02-10T14:05:25Z',
  closed_at: null,
  display_order: 0
};

export const mockClosedDiscussion: Discussion = {
  id: 'discussion-456',
  lesson_id: 'lesson-456',
  prompt_text: 'How do standards affect web development?',
  prompt_type: 'long_answer',
  status: 'closed',
  created_at: '2026-02-10T13:50:00Z',
  published_at: '2026-02-10T13:50:05Z',
  closed_at: '2026-02-10T13:58:30Z',
  display_order: 0
};

export const mockMultipleChoiceDiscussion: Discussion = {
  id: 'discussion-789',
  lesson_id: 'lesson-456',
  prompt_text: 'Who makes the web standards?',
  prompt_type: 'multiple_choice',
  status: 'active',
  created_at: '2026-02-10T14:10:00Z',
  published_at: '2026-02-10T14:10:02Z',
  closed_at: null,
  display_order: 1
};

export const mockResponse: Response = {
  id: 'response-789',
  discussion_id: 'discussion-123',
  response_text: 'The WWW Consortium sets web standards to ensure interoperability.',
  created_at: '2026-02-10T14:06:15Z'
};

export const mockResponse2: Response = {
  id: 'response-790',
  discussion_id: 'discussion-123',
  response_text: 'They maintain HTML, CSS, and other web technologies.',
  created_at: '2026-02-10T14:06:45Z'
};

export const mockResponse3: Response = {
  id: 'response-791',
  discussion_id: 'discussion-123',
  response_text: 'The W3C ensures cross-browser compatibility.',
  created_at: '2026-02-10T14:07:12Z'
};

export const mockDiscussionWithCount: DiscussionWithResponseCount = {
  ...mockDiscussion,
  response_count: 5
};

export const mockDiscussionWithZeroResponses: DiscussionWithResponseCount = {
  ...mockMultipleChoiceDiscussion,
  response_count: 0
};

export const mockClosedDiscussionWithCount: DiscussionWithResponseCount = {
  ...mockClosedDiscussion,
  response_count: 12
};

/**
 * Helper function to create multiple discussion fixtures with sequential order.
 * Useful for testing discussion history display.
 *
 * @param count - Number of discussions to create
 * @returns Array of discussions with increasing display_order
 */
export function createMockDiscussions(count: number): Discussion[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `discussion-${index}`,
    lesson_id: 'lesson-456',
    prompt_text: `Discussion prompt #${index + 1}`,
    prompt_type: 'short_answer' as const,
    status: index === count - 1 ? ('active' as const) : ('closed' as const),
    created_at: new Date(2026, 1, 10, 14, index, 0).toISOString(),
    published_at: new Date(2026, 1, 10, 14, index, 2).toISOString(),
    closed_at: index === count - 1 ? null : new Date(2026, 1, 10, 14, index, 30).toISOString(),
    display_order: index
  }));
}

/**
 * Helper function to create multiple response fixtures.
 *
 * @param discussionId - Discussion ID to associate responses with
 * @param count - Number of responses to create
 * @returns Array of responses
 */
export function createMockResponses(discussionId: string, count: number): Response[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `response-${index}`,
    discussion_id: discussionId,
    response_text: `Student response #${index + 1} to the discussion prompt.`,
    created_at: new Date(2026, 1, 10, 14, 6, index * 10).toISOString()
  }));
}

/**
 * Helper function to create discussion with response count.
 *
 * @param discussion - Base discussion object
 * @param responseCount - Number of responses
 * @returns DiscussionWithResponseCount object
 */
export function withResponseCount(
  discussion: Discussion,
  responseCount: number
): DiscussionWithResponseCount {
  return {
    ...discussion,
    response_count: responseCount
  };
}
