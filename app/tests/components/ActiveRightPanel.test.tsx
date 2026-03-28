// [US 1.39] View Analytics button presence
// [US 1.40] Student count header, MC response distribution counts

import { render, screen } from '@testing-library/react';
import { ActiveRightPanel } from '@/components/instructor/session/ActiveRightPanel';
import type { Discussion } from '@/types/discussion';
import type { Response } from '@/types/response';

// ---------------------------------------------------------------------------
// Mock DiscussionAnalyticsModal so we can assert it opens without rendering internals
// ---------------------------------------------------------------------------

jest.mock('@/components/instructor/session/DiscussionAnalyticsModal', () => ({
  DiscussionAnalyticsModal: ({ open }: { open: boolean }) =>
    open ? <div>Analytics Modal Open</div> : null,
  DiscussionAnalyticsContent: () => <div>Analytics Content</div>,
}));

// ActiveRightPanel reads from SessionContext if available — supply props directly instead
jest.mock('@/components/instructor/session/SessionContext', () => ({
  SessionContext: { _currentValue: null },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MC_DISCUSSION: Discussion = {
  id: 'disc-1',
  lesson_id: 'lesson-1',
  prompt_text: 'What is a closure?',
  prompt_type: 'multiple_choice',
  status: 'active',
  created_at: '2024-01-01T10:00:00Z',
  published_at: '2024-01-01T10:00:00Z',
  closed_at: null,
  display_order: 1,
  participant_snapshot: null,
  mc_options: [
    { label: 'A', text: 'Stores program state' },
    { label: 'B', text: 'Pairs a lambda with its environment' },
    { label: 'C', text: 'Defines function call order' },
  ],
  correct_option: 'B',
  source: 'manual',
  feedback_enabled: false,
  ai_generated_correct_option: null,
  allow_multiple_responses: false,
  response_limit: 1,
};

const FREE_TEXT_DISCUSSION: Discussion = {
  ...MC_DISCUSSION,
  id: 'disc-2',
  prompt_type: 'short_answer',
  mc_options: null,
  correct_option: null,
};

function makeResponse(id: string, selectedOption: string | null = null): Response {
  return {
    id,
    discussion_id: 'disc-1',
    response_text: selectedOption ? `Option ${selectedOption}: Some text` : 'Free text response',
    selected_option: selectedOption,
    created_at: '2024-01-01T10:00:30Z',
    is_correct: null,
    flagged_at: null,
  } as unknown as Response;
}

function renderPanel({
  responses = [] as Response[],
  activeDiscussion = null as Discussion | null,
  studentCount = 0,
} = {}) {
  render(
    <ActiveRightPanel
      responses={responses}
      activeDiscussion={activeDiscussion}
      studentCount={studentCount}
    />,
  );
}

// US 1.39 — List and Metrics Tabs
// ---------------------------------------------------------------------------

describe('[US 1.39] List and Metrics tabs', () => {

  // 61.1
  it('[AT1] success: "Responses" and "Metrics" tabs shown when discussion is active', () => {
    renderPanel({ activeDiscussion: FREE_TEXT_DISCUSSION });

    expect(screen.getByRole('tab', { name: /Responses/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Metrics/i })).toBeInTheDocument();
  });

  // 61.2
  it('[AT2] failure: no active discussion shows empty state in responses tab', () => {
    renderPanel({ activeDiscussion: null });

    // Tabs are always rendered (Responses, Metrics, Timer)
    expect(screen.getByRole('tab', { name: /Responses/i })).toBeInTheDocument();
    // No active discussion shows empty state message
    expect(screen.getByText(/No active discussion/i)).toBeInTheDocument();
  });

});

// ---------------------------------------------------------------------------
// US 1.40 — Student count header
// ---------------------------------------------------------------------------

describe('[US 1.40] Student count header', () => {

  // 61.3
  it('[AT1] success: shows peak student count in header when > 0', () => {
    renderPanel({ activeDiscussion: FREE_TEXT_DISCUSSION, studentCount: 5 });

    expect(screen.getByText(/\/\s*5/)).toBeInTheDocument();
  });

  // 61.4
  it('[AT2] failure: student count not shown when studentCount is 0', () => {
    renderPanel({ activeDiscussion: FREE_TEXT_DISCUSSION, studentCount: 0 });

    expect(screen.queryByText(/\/\s*\d/)).not.toBeInTheDocument();
  });

  // 61.5
  it('[AT3] success: response count shown in header', () => {
    const responses = [makeResponse('r1'), makeResponse('r2'), makeResponse('r3')];
    renderPanel({ activeDiscussion: FREE_TEXT_DISCUSSION, responses, studentCount: 5 });

    expect(screen.getByText('3')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// US 1.40 — MC response distribution counts
// ---------------------------------------------------------------------------

describe('[US 1.40] MC response distribution counts', () => {

  // 61.6
  it('[AT1] success: per-option response counts shown for MC discussion', () => {
    const responses = [
      makeResponse('r1', 'A'),
      makeResponse('r2', 'A'),
      makeResponse('r3', 'B'),
    ];
    renderPanel({ activeDiscussion: MC_DISCUSSION, responses });

    // Filter to only <span> elements — the distribution rows use spans,
    // while response card text uses <p> elements
    const rows = screen.getAllByText(/Option [ABC]/).filter(
      el => el.tagName.toLowerCase() === 'span'
    );
    expect(rows).toHaveLength(3);
  });

  // 61.7
  it('[AT2] success: correct option counts are reflected per label', () => {
    const responses = [
      makeResponse('r1', 'A'),
      makeResponse('r2', 'A'),
      makeResponse('r3', 'C'),
    ];
    renderPanel({ activeDiscussion: MC_DISCUSSION, responses });

    // The distribution section should show counts
    // A=2, B=0, C=1 — all shown as numbers in the panel
    const counts = screen.getAllByText(/^[0-2]$/);
    expect(counts.length).toBeGreaterThanOrEqual(3);
  });

  // 61.8
  it('[AT3] success: all options show 0 when no responses yet', () => {
    renderPanel({ activeDiscussion: MC_DISCUSSION, responses: [] });

    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(3);
  });

  // 61.9
  it('[AT4] failure: MC distribution not shown for free text discussion', () => {
    renderPanel({ activeDiscussion: FREE_TEXT_DISCUSSION });

    expect(screen.queryByText('Student Responses')).not.toBeInTheDocument();
    expect(screen.queryByText(/Option A:/)).not.toBeInTheDocument();
  });

  // 61.10
  it('[AT5] success: empty state shown when no responses and free text discussion', () => {
    renderPanel({ activeDiscussion: FREE_TEXT_DISCUSSION, responses: [] });

    expect(screen.getByText(/Waiting for student responses/i)).toBeInTheDocument();
  });
});