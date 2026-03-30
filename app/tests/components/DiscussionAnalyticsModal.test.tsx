// [US 1.39] list view of responses — sequential display with timestamps
// [US 1.40] metrics view — participation rate, avg response length, timeline

import { render, screen } from '../utils/renderWithProviders';
import { DiscussionAnalyticsModal } from '@/components/instructor/session/DiscussionAnalyticsModal';
import type { Discussion } from '@/types/discussion';
import type { Response } from '@/types/response';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_DISCUSSION: Discussion = {
  id: 'disc-1',
  lesson_id: 'lesson-1',
  prompt_text: 'What is a closure?',
  prompt_type: 'short_answer',
  status: 'closed',
  created_at: '2024-01-01T10:00:00Z',
  published_at: '2024-01-01T10:00:00Z',
  closed_at: '2024-01-01T10:05:00Z',
  display_order: 1,
  participant_snapshot: 4,
  mc_options: null,
  correct_option: null,
  source: 'manual',
  feedback_enabled: false,
  ai_generated_correct_option: null,
  allow_multiple_responses: false,
  response_limit: 1,
};

const ACTIVE_DISCUSSION: Discussion = {
  ...BASE_DISCUSSION,
  id: 'disc-2',
  status: 'active',
  closed_at: null,
  participant_snapshot: 3,
};

function makeResponse(id: string, overrides: Partial<Response> = {}): Response {
  return {
    id,
    discussion_id: 'disc-1',
    response_text: 'A function that captures its lexical scope.',
    selected_option: null,
    created_at: '2024-01-01T10:00:09Z',
    ...overrides,
  } as unknown as Response;
}

const RESPONSES: Response[] = [
  makeResponse('r1', { response_text: 'First response here.', created_at: '2024-01-01T10:00:09Z' }),
  makeResponse('r2', { response_text: 'Second response here.', created_at: '2024-01-01T10:00:30Z' }),
  makeResponse('r3', { response_text: 'Third response here.', created_at: '2024-01-01T10:01:05Z' }),
];


const MC_DISCUSSION: Discussion = {
  ...BASE_DISCUSSION,
  id: 'disc-mc',
  prompt_type: 'multiple_choice',
  participant_snapshot: 3,
  mc_options: [
    { label: 'A', text: 'Stores program state' },
    { label: 'B', text: 'Pairs a lambda with its environment' },
    { label: 'C', text: 'Compiles functions' },
  ],
  correct_option: 'B',
};

const MC_RESPONSES: Response[] = [
  makeResponse('r4', { response_text: '', selected_option: 'A', created_at: '2024-01-01T10:00:05Z' }),
  makeResponse('r5', { response_text: '', selected_option: 'B', created_at: '2024-01-01T10:00:10Z' }),
  makeResponse('r6', { response_text: '', selected_option: 'B', created_at: '2024-01-01T10:00:15Z' }),
];

function renderModal(
  discussion: Discussion,
  responses: Response[],
  studentCount = 4,
) {
  render(
    <DiscussionAnalyticsModal
      open={true}
      onClose={jest.fn()}
      discussion={discussion}
      responses={responses}
      studentCount={studentCount}
    />,
  );
}

// ---------------------------------------------------------------------------
// US 1.39 — List view: sequential responses with timestamps
// ---------------------------------------------------------------------------

describe('[US 1.39] Response list view', () => {

  // 60.1
  it('[AT1] success: all responses are displayed in a sequential list', () => {
    renderModal(BASE_DISCUSSION, RESPONSES);

    expect(screen.getByText('First response here.')).toBeInTheDocument();
    expect(screen.getByText('Second response here.')).toBeInTheDocument();
    expect(screen.getByText('Third response here.')).toBeInTheDocument();
  });

  // 60.2
  it('[AT2] success: each response is displayed with a timestamp', () => {
    renderModal(BASE_DISCUSSION, RESPONSES);

    // There should be a timestamp element rendered per response
    // toLocaleTimeString output is locale-dependent so we just check count
    const timestamps = screen.getAllByText(/\d{1,2}:\d{2}:\d{2}/);
    expect(timestamps.length).toBeGreaterThanOrEqual(RESPONSES.length);
  });

  // 60.3
  it('[AT3] success: response count heading shows correct total', () => {
    renderModal(BASE_DISCUSSION, RESPONSES);

    expect(screen.getByText(/All Responses \(3\)/i)).toBeInTheDocument();
  });

  // 60.4
  it('[AT4] failure: empty state shown when no responses exist', () => {
    renderModal(BASE_DISCUSSION, []);

    expect(screen.getByText(/No responses yet/i)).toBeInTheDocument();
  });

  // 60.5
  it('[AT5] success: modal title includes the prompt text', () => {
    renderModal(BASE_DISCUSSION, RESPONSES);

    expect(screen.getByText(/What is a closure\?/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// US 1.40 — Metrics: participation rate, avg length, timeline
// ---------------------------------------------------------------------------

describe('[US 1.40] Response metrics', () => {

  // 60.6
  it('[AT1] success: participation rate shown for closed discussion (responses / snapshot)', () => {
    // 3 responses / 4 students = 75%
    renderModal(BASE_DISCUSSION, RESPONSES, 4);

    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText(/3 \/ 4 students/i)).toBeInTheDocument();
  });

  // 60.7
  it('[AT2] success: participation rate uses studentCount when snapshot is null', () => {
    const noSnapshot: Discussion = { ...BASE_DISCUSSION, participant_snapshot: null };
    // 3 responses / 4 students = 75%
    renderModal(noSnapshot, RESPONSES, 4);

    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  // 60.8
  it('[AT3] success: participation rate is live for active discussion (uses higher of snapshot vs studentCount)', () => {
    // snapshot=3, studentCount=5 → should use 5 → 3/5 = 60%
    renderModal(ACTIVE_DISCUSSION, RESPONSES, 5);

    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText(/3 \/ 5 students/i)).toBeInTheDocument();
  });

  // 60.9
  it('[AT4] failure: participation rate shows — when no student count available', () => {
    const noSnapshot: Discussion = { ...BASE_DISCUSSION, participant_snapshot: null };
    renderModal(noSnapshot, RESPONSES, 0);

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  // 60.10
  it('[AT5] success: response timeline chart is rendered when responses exist', () => {
    renderModal(BASE_DISCUSSION, RESPONSES);

    expect(screen.getByText(/Response Timeline/i)).toBeInTheDocument();
  });

  // 60.11
  it('[AT6] success: only Responses and Response Rate stat cards are shown (avg length and first response removed)', () => {
    renderModal(BASE_DISCUSSION, RESPONSES);

    expect(screen.getByText('Responses')).toBeInTheDocument();
    expect(screen.getByText('Response Rate')).toBeInTheDocument();
    expect(screen.queryByText(/chars/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/after publish/i)).not.toBeInTheDocument();
  });

  // 60.12
  it('[AT7] success: response timeline section is rendered', () => {
    renderModal(BASE_DISCUSSION, RESPONSES);

    expect(screen.getByText(/Response Timeline/i)).toBeInTheDocument();
  });

  // 60.13
  it('[AT8] success: total response count stat card is shown', () => {
    renderModal(BASE_DISCUSSION, RESPONSES);

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Responses')).toBeInTheDocument();
  });

  // MC-specific distribution
  // 60.14
  it('[AT9] success: MC answer distribution shown with correct answer highlighted', () => {
    renderModal(MC_DISCUSSION, MC_RESPONSES, 3);

    expect(screen.getByText(/Answer Distribution/i)).toBeInTheDocument();
    // Option B is correct — "correct" badge appears at least once in the distribution
    expect(screen.getAllByText('correct').length).toBeGreaterThan(0);
  });

  // 60.15
  it('[AT10] success: MC distribution shows per-option counts', () => {
    renderModal(MC_DISCUSSION, MC_RESPONSES, 3);

    // A: 1 vote (33%), B: 2 votes (67%), C: 0 votes (0%)
    // Modal shows option labels and counts, not full option text
    expect(screen.getByText(/1 \(33%\)/i)).toBeInTheDocument();
    expect(screen.getByText(/2 \(67%\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/0 \(0%\)/i).length).toBeGreaterThan(0);
  });
});
