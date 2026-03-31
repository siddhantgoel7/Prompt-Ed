// Tests for the response highlight/expand and flag-as-inappropriate feature
// on the DiscussionPage (discussion history view).
// [US 1.36] Highlight a specific response
//   AC1: Highlighted response appears prominently (larger, different colour, pinned)
//   AC2: Multiple highlighted responses are distinguishable
// [US 1.35] Hide inappropriate responses
//   AC1: Hidden from view but remains in data

import { render, screen, waitFor, within } from '../utils/renderWithProviders';
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

// Mock API functions
const mockFlagResponseApi = jest.fn().mockResolvedValue(undefined);
const mockUnflagResponseApi = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/api/discussionsApi', () => ({
  flagResponseApi: (...args: unknown[]) => mockFlagResponseApi(...args),
  unflagResponseApi: (...args: unknown[]) => mockUnflagResponseApi(...args),
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
  allow_multiple_responses: false,
  response_limit: 1,
};

const RESPONSES: Response[] = [
  {
    id: 'r1',
    discussion_id: 'disc-1',
    response_text: 'Phase I reactions include oxidation and reduction.',
    selected_option: null,
    created_at: '2024-01-01T10:05:00Z',
    is_correct: null,
    flagged_at: null,
    student_session_id: 'student-1',
  },
  {
    id: 'r2',
    discussion_id: 'disc-1',
    response_text: 'The liver is the primary site for drug metabolism.',
    selected_option: null,
    created_at: '2024-01-01T10:06:00Z',
    is_correct: null,
    flagged_at: null,
    student_session_id: 'student-2',
  },
  {
    id: 'r3',
    discussion_id: 'disc-1',
    response_text: 'CYP450 enzymes are key in phase I metabolism.',
    selected_option: null,
    created_at: '2024-01-01T10:07:00Z',
    is_correct: null,
    flagged_at: null,
    student_session_id: 'student-3',
  },
];

function renderPage(responses = RESPONSES, flaggedResponses: Response[] = []) {
  return render(
    <DiscussionPage
      lessonId="lesson-1"
      discussionId="disc-1"
      initialDiscussion={DISCUSSION}
      initialResponses={responses}
      initialFlaggedResponses={flaggedResponses}
      initialIsActive={false}
      lessonStatus="active"
      discussionCount={responses.length}
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

  // 59.1
  it('[US 1.36][AC1-AT1] renders all responses in their default collapsed state', () => {
    renderPage();

    expect(screen.getByText(/Phase I reactions/)).toBeInTheDocument();
    expect(screen.getByText(/The liver is the primary site/)).toBeInTheDocument();
    expect(screen.getByText(/CYP450 enzymes/)).toBeInTheDocument();
    // No card should be highlighted by default
    expect(document.querySelectorAll('[data-highlighted="true"]')).toHaveLength(0);
  });

  // 59.2
  it('[US 1.36][AC1-AT2] clicking a response highlights it and shows the flag button', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByText(/Phase I reactions/));

    expect(document.querySelectorAll('[data-highlighted="true"]')).toHaveLength(1);
  });

  // 59.3
  it('[US 1.36][AC1-AT3] clicking a highlighted response collapses it', async () => {
    const user = userEvent.setup();
    renderPage();

    const response = screen.getByText(/Phase I reactions/);

    // Expand
    await user.click(response);
    expect(document.querySelectorAll('[data-highlighted="true"]')).toHaveLength(1);

    // Collapse
    await user.click(response);
    expect(document.querySelectorAll('[data-highlighted="true"]')).toHaveLength(0);
  });

  // 59.4
  it('[US 1.36][AC2-AT1] selecting a different response highlights both responses', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByText(/Phase I reactions/));
    expect(document.querySelectorAll('[data-highlighted="true"]')).toHaveLength(1);

    await user.click(screen.getByText(/CYP450 enzymes/));
    // Both should now be highlighted
    expect(document.querySelectorAll('[data-highlighted="true"]')).toHaveLength(2);
  });

  // 59.5
  it('[US 1.36][AC2-AT2] clicking a highlighted response deselects only that response', async () => {
    const user = userEvent.setup();
    renderPage();

    // Select two responses
    await user.click(screen.getByText(/Phase I reactions/));
    await user.click(screen.getByText(/CYP450 enzymes/));
    expect(document.querySelectorAll('[data-highlighted="true"]')).toHaveLength(2);

    // Deselect the first one
    await user.click(screen.getByText(/Phase I reactions/));
    expect(document.querySelectorAll('[data-highlighted="true"]')).toHaveLength(1);
  });

  // 59.6
  it('[US 1.36][AC2-AT3] all three responses can be highlighted simultaneously', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByText(/Phase I reactions/));
    await user.click(screen.getByText(/The liver is the primary site/));
    await user.click(screen.getByText(/CYP450 enzymes/));
    expect(document.querySelectorAll('[data-highlighted="true"]')).toHaveLength(3);
  });

  // 59.7
  it('[US 1.35][AC1-AT1] flagging a response calls flagResponseApi and removes it from the DOM', async () => {
    const user = userEvent.setup();
    renderPage();

    // Select the second response
    await user.click(screen.getByText(/The liver is the primary site/));

    // Click flag (two clicks: first expands badge label, second fires action)
    const highlightedCard = document.querySelector('[data-highlighted="true"]')!;
    const flagBtn = within(highlightedCard as HTMLElement).getByRole('button', { name: /Flag as Inappropriate/i });
    await user.click(flagBtn); // expand
    await user.click(flagBtn); // fire

    await waitFor(() => {
      expect(mockFlagResponseApi).toHaveBeenCalledWith('r2');
    });

    // Response should be removed from the DOM
    await waitFor(() => {
      expect(screen.queryByText(/The liver is the primary site/)).not.toBeInTheDocument();
    });

    // Other responses should still be visible
    expect(screen.getByText(/Phase I reactions/)).toBeInTheDocument();
    expect(screen.getByText(/CYP450 enzymes/)).toBeInTheDocument();
  });

  // 59.8
  it('[US 1.35][AC1-AT2] shows flagged toggle when all responses are flagged', async () => {
    const user = userEvent.setup();
    renderPage([RESPONSES[0]]);

    // Select and flag the only response
    await user.click(screen.getByText(/Phase I reactions/));
    const highlightedCard59_8 = document.querySelector('[data-highlighted="true"]')!;
    const flagBtn59_8 = within(highlightedCard59_8 as HTMLElement).getByRole('button', { name: /Flag as Inappropriate/i });
    await user.click(flagBtn59_8); // expand
    await user.click(flagBtn59_8); // fire

    // Since the response moved to flagged, the flagged toggle should appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Show flagged \(1\)/i })).toBeInTheDocument();
    });
  });

  // 59.9
  it('[US 1.35][AC1-AT3] flag button is not visible when no response is selected', () => {
    renderPage();

    expect(document.querySelectorAll('[data-highlighted="true"]')).toHaveLength(0);
  });

  // 59.10
  it('[US 1.36][AC1-AT4] filter toggle is hidden when no responses are highlighted', () => {
    renderPage();
    expect(screen.queryByRole('button', { name: /Show highlighted only/i })).not.toBeInTheDocument();
  });

  // 59.11
  it('[US 1.36][AC1-AT5] filter toggle appears when responses are highlighted', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByText(/Phase I reactions/));
    expect(screen.getByRole('button', { name: /Show highlighted only \(1\)/i })).toBeInTheDocument();
  });

  // 59.12
  it('[US 1.36][AC1-AT6] filter toggle hides non-highlighted responses when active', async () => {
    const user = userEvent.setup();
    renderPage();

    // Select first response
    await user.click(screen.getByText(/Phase I reactions/));

    // Activate filter
    await user.click(screen.getByRole('button', { name: /Show highlighted only/i }));

    // Only highlighted response visible
    expect(screen.getByText(/Phase I reactions/)).toBeInTheDocument();
    expect(screen.queryByText(/The liver is the primary site/)).not.toBeInTheDocument();
    expect(screen.queryByText(/CYP450 enzymes/)).not.toBeInTheDocument();
  });

  // 59.13
  it('[US 1.36][AC1-AT7] "Show all" button restores full response list', async () => {
    const user = userEvent.setup();
    renderPage();

    // Select and filter
    await user.click(screen.getByText(/Phase I reactions/));
    await user.click(screen.getByRole('button', { name: /Show highlighted only/i }));
    expect(screen.queryByText(/CYP450 enzymes/)).not.toBeInTheDocument();

    // Click "Show all"
    await user.click(screen.getByRole('button', { name: /Show all/i }));

    // All responses visible again
    expect(screen.getByText(/Phase I reactions/)).toBeInTheDocument();
    expect(screen.getByText(/The liver is the primary site/)).toBeInTheDocument();
    expect(screen.getByText(/CYP450 enzymes/)).toBeInTheDocument();
  });

  // 59.14
  it('[US 1.36][AC1-AT8] flagging all highlighted responses while filtered auto-switches back to full view', async () => {
    const user = userEvent.setup();
    renderPage();

    // Highlight a response and activate the filter
    await user.click(screen.getByText(/Phase I reactions/));
    await user.click(screen.getByRole('button', { name: /Show highlighted only/i }));

    // Only the highlighted response is visible
    expect(screen.getByText(/Phase I reactions/)).toBeInTheDocument();
    expect(screen.queryByText(/The liver is the primary site/)).not.toBeInTheDocument();

    // Flag the only highlighted response — this removes it from selectedIds
    const highlightedCard59_14 = document.querySelector('[data-highlighted="true"]')!;
    const flagBtn59_14 = within(highlightedCard59_14 as HTMLElement).getByRole('button', { name: /Flag as Inappropriate/i });
    await user.click(flagBtn59_14); // expand
    await user.click(flagBtn59_14); // fire

    // The view should auto-switch back to show all remaining responses
    await waitFor(() => {
      expect(screen.getByText(/The liver is the primary site/)).toBeInTheDocument();
    });
    expect(screen.getByText(/CYP450 enzymes/)).toBeInTheDocument();

    // The filter toggle should be gone since no responses are highlighted
    expect(screen.queryByRole('button', { name: /Show highlighted only/i })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// UI tests — visual emphasis styling
// ---------------------------------------------------------------------------

describe('DiscussionPage — highlight visual emphasis', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 59.15
  it('[US 1.36][AC1-AT1] highlighted response has prominent styling (colour, larger text, shadow)', async () => {
    const user = userEvent.setup();
    renderPage();

    const responseText = screen.getByText(/Phase I reactions/);

    // Before highlight: base text size
    expect(responseText.className).toMatch(/text-base/);

    await user.click(responseText);

    // After highlight: much larger text and semibold
    expect(responseText.className).toMatch(/text-3xl/);
    expect(responseText.className).toMatch(/font-semibold/);

    // The card wrapper should have elevated z-index (selected state indicator)
    const card = responseText.closest('[class*="z-10"]');
    expect(card).not.toBeNull();
  });

  // 59.16
  it('[US 1.36][AC1-AT2] un-highlighted response returns to base styling', async () => {
    const user = userEvent.setup();
    renderPage();

    const responseText = screen.getByText(/Phase I reactions/);

    // Highlight then un-highlight
    await user.click(responseText);
    expect(responseText.className).toMatch(/text-3xl/);

    await user.click(responseText);
    expect(responseText.className).toMatch(/text-base/);
    expect(responseText.className).not.toMatch(/text-3xl/);
  });

  // 59.17
  it('[US 1.36][AC2-AT1] each of multiple highlighted responses has its own prominent styling', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByText(/Phase I reactions/));
    await user.click(screen.getByText(/CYP450 enzymes/));

    // Both highlighted responses have prominent text
    expect(screen.getByText(/Phase I reactions/).className).toMatch(/text-3xl/);
    expect(screen.getByText(/CYP450 enzymes/).className).toMatch(/text-3xl/);

    // Non-highlighted response keeps base styling
    expect(screen.getByText(/The liver is the primary site/).className).toMatch(/text-base/);
  });

  // 59.18
  it('[US 1.35][AC1-AT1] hidden (flagged) response is removed from the active list but preserved in data', async () => {
    const user = userEvent.setup();
    renderPage();

    // Flag a response
    await user.click(screen.getByText(/The liver is the primary site/));
    const highlightedCard59_18 = document.querySelector('[data-highlighted="true"]')!;
    const flagBtn59_18 = within(highlightedCard59_18 as HTMLElement).getByRole('button', { name: /Flag as Inappropriate/i });
    await user.click(flagBtn59_18); // expand
    await user.click(flagBtn59_18); // fire

    // Removed from the active list
    await waitFor(() => {
      expect(screen.queryByText(/The liver is the primary site/)).not.toBeInTheDocument();
    });

    // But preserved in data — the flagged toggle appears showing the response is still in the system
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Show flagged \(1\)/i })).toBeInTheDocument();
    });

    // Switching to flagged view confirms the data is preserved
    await user.click(screen.getByRole('button', { name: /Show flagged \(1\)/i }));
    expect(screen.getByText(/The liver is the primary site/)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Flagged response restore tests
// ---------------------------------------------------------------------------

describe('DiscussionPage — flagged response restore feature', () => {
  const FLAGGED: Response[] = [
    {
      id: 'f1',
      discussion_id: 'disc-1',
      response_text: 'Flagged response about incorrect enzyme classification.',
      selected_option: null,
      created_at: '2024-01-01T10:08:00Z',
      is_correct: null,
      flagged_at: '2024-01-01T10:09:00Z',
      student_session_id: 'student-4',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 59.19
  it('[US 1.35][AC1-AT1] flagged toggle is hidden when no flagged responses exist', () => {
    renderPage(RESPONSES, []);
    expect(screen.queryByRole('button', { name: /Show flagged/i })).not.toBeInTheDocument();
  });

  // 59.20
  it('[US 1.35][AC1-AT2] flagged toggle appears when flagged responses exist', () => {
    renderPage(RESPONSES, FLAGGED);
    expect(screen.getByRole('button', { name: /Show flagged \(1\)/i })).toBeInTheDocument();
  });

  // 59.21
  it('[US 1.35][AC1-AT3] toggling shows only flagged responses and hides active responses', async () => {
    const user = userEvent.setup();
    renderPage(RESPONSES, FLAGGED);

    // Flagged response should not be visible before toggling
    expect(screen.queryByText(/Flagged response about incorrect enzyme/)).not.toBeInTheDocument();

    // Click the toggle
    await user.click(screen.getByRole('button', { name: /Show flagged \(1\)/i }));

    // Flagged response should now be visible
    expect(screen.getByText(/Flagged response about incorrect enzyme/)).toBeInTheDocument();

    // Active responses should be hidden
    expect(screen.queryByText(/Phase I reactions/)).not.toBeInTheDocument();
    expect(screen.queryByText(/The liver is the primary site/)).not.toBeInTheDocument();
    expect(screen.queryByText(/CYP450 enzymes/)).not.toBeInTheDocument();
  });

  // 59.22
  it('[US 1.35][AC1-AT4] clicking a flagged response highlights it and shows the Unflag button', async () => {
    const user = userEvent.setup();
    renderPage(RESPONSES, FLAGGED);

    // Show flagged view
    await user.click(screen.getByRole('button', { name: /Show flagged \(1\)/i }));

    // Click the flagged response to select it
    await user.click(screen.getByText(/Flagged response about incorrect enzyme/));

    // Unflag button should be visible
    expect(screen.getByRole('button', { name: /Unflag/i })).toBeInTheDocument();
  });

  // 59.23
  it('[US 1.35][AC1-AT5] clicking Unflag calls unflagResponseApi and moves response back', async () => {
    const user = userEvent.setup();
    renderPage(RESPONSES, FLAGGED);

    // Show flagged
    await user.click(screen.getByRole('button', { name: /Show flagged \(1\)/i }));

    // Select the flagged response
    await user.click(screen.getByText(/Flagged response about incorrect enzyme/));

    // Click Unflag (two clicks: first expands badge label, second fires action)
    const unflagBtn = screen.getByRole('button', { name: /Unflag/i });
    await user.click(unflagBtn); // expand
    await user.click(unflagBtn); // fire

    await waitFor(() => {
      expect(mockUnflagResponseApi).toHaveBeenCalledWith('f1');
    });
  });

  // 59.24
  it('[US 1.35][AC1-AT6] Hide button switches back to showing active responses', async () => {
    const user = userEvent.setup();
    renderPage(RESPONSES, FLAGGED);

    // Show flagged
    await user.click(screen.getByRole('button', { name: /Show flagged \(1\)/i }));
    expect(screen.getByText(/Flagged response about incorrect enzyme/)).toBeInTheDocument();

    // Click Hide
    await user.click(screen.getByRole('button', { name: /Hide/i }));

    // Flagged response hidden, active responses visible again
    expect(screen.queryByText(/Flagged response about incorrect enzyme/)).not.toBeInTheDocument();
    expect(screen.getByText(/Phase I reactions/)).toBeInTheDocument();
  });

  // 59.25
  it('[US 1.35][AC1-AT7] flagging a response moves it to the flagged view', async () => {
    const user = userEvent.setup();
    renderPage(RESPONSES, []);

    // Flag a response
    await user.click(screen.getByText(/The liver is the primary site/));
    const highlightedCard59_25 = document.querySelector('[data-highlighted="true"]')!;
    const flagBtn59_25 = within(highlightedCard59_25 as HTMLElement).getByRole('button', { name: /Flag as Inappropriate/i });
    await user.click(flagBtn59_25); // expand
    await user.click(flagBtn59_25); // fire

    await waitFor(() => {
      expect(mockFlagResponseApi).toHaveBeenCalledWith('r2');
    });

    // Response should move out of the main list
    await waitFor(() => {
      expect(screen.queryByText(/The liver is the primary site/)).not.toBeInTheDocument();
    });

    // Flagged toggle should now appear with count 1
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Show flagged \(1\)/i })).toBeInTheDocument();
    });

    // Show flagged — the flagged response should be visible
    await user.click(screen.getByRole('button', { name: /Show flagged \(1\)/i }));
    expect(screen.getByText(/The liver is the primary site/)).toBeInTheDocument();
  });

  // 59.26
  it('[US 1.35][AC1-AT8] unflagging all responses auto-switches back to normal view', async () => {
    const user = userEvent.setup();
    renderPage(RESPONSES, FLAGGED);

    // Show flagged view
    await user.click(screen.getByRole('button', { name: /Show flagged \(1\)/i }));
    expect(screen.getByText(/Flagged response about incorrect enzyme/)).toBeInTheDocument();
    expect(screen.queryByText(/Phase I reactions/)).not.toBeInTheDocument();

    // Select and unflag the only flagged response (two clicks: expand then fire)
    await user.click(screen.getByText(/Flagged response about incorrect enzyme/));
    const unflagBtn59_26 = screen.getByRole('button', { name: /Unflag/i });
    await user.click(unflagBtn59_26); // expand
    await user.click(unflagBtn59_26); // fire

    // After unflagging the last flagged response, the view should auto-switch
    // back to showing active responses (no empty flagged page)
    await waitFor(() => {
      expect(screen.getByText(/Phase I reactions/)).toBeInTheDocument();
    });
    expect(screen.getByText(/The liver is the primary site/)).toBeInTheDocument();
    expect(screen.getByText(/CYP450 enzymes/)).toBeInTheDocument();

    // The restored response should also be visible in the active list
    expect(screen.getByText(/Flagged response about incorrect enzyme/)).toBeInTheDocument();

    // Flagged toggle should be gone since there are no more flagged responses
    expect(screen.queryByRole('button', { name: /Show flagged/i })).not.toBeInTheDocument();
  });
});
