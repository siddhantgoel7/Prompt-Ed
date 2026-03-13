// Tests for the response highlight/expand and flag-as-inappropriate feature
// on the DiscussionPage (discussion history view).

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DiscussionPage } from '@/components/instructor/DiscussionPage';
import type { Discussion } from '@/types/discussion';
import type { Response } from '@/types/response';

// Mock realtime — the DiscussionPage connects to Supabase Realtime
jest.mock('@/lib/realtime/useRealtime', () => ({
  useRealtime: () => ({ channel: null, isConnected: false }),
}));

// Mock DiscussionAnalyticsModal
jest.mock('@/components/instructor/session/DiscussionAnalyticsModal', () => ({
  DiscussionAnalyticsContent: () => <div>Analytics Content</div>,
}));

// Mock deleteResponseApi
const mockDeleteResponseApi = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/api/discussionsApi', () => ({
  deleteResponseApi: (...args: unknown[]) => mockDeleteResponseApi(...args),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DISCUSSION: Discussion = {
  id: 'disc-1',
  lesson_id: 'lesson-1',
  prompt_text: 'Describe drug metabolism pathways.',
  prompt_type: 'short_answer',
  status: 'closed',
  created_at: '2024-01-01T10:00:00Z',
  published_at: '2024-01-01T10:00:00Z',
  closed_at: '2024-01-01T10:30:00Z',
  display_order: 1,
  participant_snapshot: 5,
  mc_options: null,
  correct_option: null,
  source: 'manual',
  feedback_enabled: false,
  ai_generated_correct_option: null,
};

const RESPONSES: Response[] = [
  {
    id: 'r1',
    discussion_id: 'disc-1',
    response_text: 'Phase I reactions include oxidation and reduction.',
    selected_option: null,
    created_at: '2024-01-01T10:05:00Z',
    is_correct: null,
  },
  {
    id: 'r2',
    discussion_id: 'disc-1',
    response_text: 'The liver is the primary site for drug metabolism.',
    selected_option: null,
    created_at: '2024-01-01T10:06:00Z',
    is_correct: null,
  },
  {
    id: 'r3',
    discussion_id: 'disc-1',
    response_text: 'CYP450 enzymes are key in phase I metabolism.',
    selected_option: null,
    created_at: '2024-01-01T10:07:00Z',
    is_correct: null,
  },
];

function renderPage(responses = RESPONSES) {
  return render(
    <DiscussionPage
      lessonId="lesson-1"
      discussionId="disc-1"
      initialDiscussion={DISCUSSION}
      initialResponses={responses}
      initialIsActive={false}
    />,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DiscussionPage — response highlight & flag feature', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all responses in their default collapsed state', () => {
    renderPage();

    expect(screen.getByText(/Phase I reactions/)).toBeInTheDocument();
    expect(screen.getByText(/The liver is the primary site/)).toBeInTheDocument();
    expect(screen.getByText(/CYP450 enzymes/)).toBeInTheDocument();
    // No flag button visible initially
    expect(screen.queryByRole('button', { name: /Flag as Inappropriate/i })).not.toBeInTheDocument();
  });

  it('clicking a response highlights it and shows the flag button', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByText(/Phase I reactions/));

    expect(screen.getByRole('button', { name: /Flag as Inappropriate/i })).toBeInTheDocument();
  });

  it('clicking a highlighted response collapses it', async () => {
    const user = userEvent.setup();
    renderPage();

    const response = screen.getByText(/Phase I reactions/);

    // Expand
    await user.click(response);
    expect(screen.getByRole('button', { name: /Flag as Inappropriate/i })).toBeInTheDocument();

    // Collapse
    await user.click(response);
    expect(screen.queryByRole('button', { name: /Flag as Inappropriate/i })).not.toBeInTheDocument();
  });

  it('selecting a different response moves the highlight', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByText(/Phase I reactions/));
    expect(screen.getAllByRole('button', { name: /Flag as Inappropriate/i })).toHaveLength(1);

    await user.click(screen.getByText(/CYP450 enzymes/));
    expect(screen.getAllByRole('button', { name: /Flag as Inappropriate/i })).toHaveLength(1);
  });

  it('flagging a response calls deleteResponseApi and removes it from the DOM', async () => {
    const user = userEvent.setup();
    renderPage();

    // Select the second response
    await user.click(screen.getByText(/The liver is the primary site/));

    // Click flag
    const flagBtn = screen.getByRole('button', { name: /Flag as Inappropriate/i });
    await user.click(flagBtn);

    await waitFor(() => {
      expect(mockDeleteResponseApi).toHaveBeenCalledWith('r2');
    });

    // Response should be removed from the DOM
    await waitFor(() => {
      expect(screen.queryByText(/The liver is the primary site/)).not.toBeInTheDocument();
    });

    // Other responses should still be visible
    expect(screen.getByText(/Phase I reactions/)).toBeInTheDocument();
    expect(screen.getByText(/CYP450 enzymes/)).toBeInTheDocument();
  });

  it('shows empty state when all responses are flagged', async () => {
    const user = userEvent.setup();
    renderPage([RESPONSES[0]]);

    // Select and flag the only response
    await user.click(screen.getByText(/Phase I reactions/));
    await user.click(screen.getByRole('button', { name: /Flag as Inappropriate/i }));

    await waitFor(() => {
      expect(screen.getByText(/No responses recorded yet/)).toBeInTheDocument();
    });
  });

  it('flag button is not visible when no response is selected', () => {
    renderPage();

    expect(screen.queryByRole('button', { name: /Flag as Inappropriate/i })).not.toBeInTheDocument();
  });
});
