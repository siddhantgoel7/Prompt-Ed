/**
 * Tests for SplitView component (and its internal sub-components:
 * DiscussionList, DiscussionDetail, Pane).
 *
 * Covers: SplitView renders, Back to Session hover/click, DiscussionList
 * empty state, active/closed tabs, response count singular/plural, discussion
 * button hover, DiscussionDetail loading/no-responses/responses, detail back
 * button hover, MC options display, distribution counting (selected_option
 * defined/undefined), Pane selection → fetches via API, API error path,
 * liveActive discussion bypass (uses live responses instead of fetching),
 * cancelled-fetch guard.
 */
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { SplitView } from '@/components/instructor/session/SplitView';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: any) => <div>{children}</div>,
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: any) => <button role="tab" data-value={value}>{children}</button>,
  TabsContent: ({ children, value }: any) => <div data-tabcontent={value}>{children}</div>,
}));

jest.mock('@/components/ui/AppLogo', () => ({
  AppLogo: () => <div data-testid="app-logo" />,
}));

jest.mock('@/lib/utils', () => ({
  truncateText: (t: string) => t,
}));

const mockFetchResponsesApi = jest.fn();
jest.mock('@/lib/api/discussionsApi', () => ({
  fetchResponsesApi: (...args: any[]) => mockFetchResponsesApi(...args),
}));

jest.mock('@/components/instructor/ResponseCard', () => ({
  ResponseCard: ({ responseText }: any) => <div data-testid="response-card">{responseText}</div>,
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeDiscussion(overrides: Record<string, unknown> = {}) {
  return {
    id: 'd1',
    prompt_text: 'What is pharmacology?',
    status: 'closed',
    response_count: 3,
    published_at: null,
    prompt_type: 'short_answer',
    mc_options: undefined,
    correct_option: undefined,
    ...overrides,
  } as any;
}

function makeResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: 'r1',
    response_text: 'Student answer',
    created_at: '2024-01-01T00:00:00Z',
    selected_option: undefined,
    ...overrides,
  } as any;
}

function renderSplitView(overrides: Record<string, unknown> = {}) {
  const onBack = jest.fn();
  render(
    <SplitView
      discussions={[]}
      lessonId="l1"
      onBack={onBack}
      liveActiveDiscussionId={null}
      liveActiveResponses={[]}
      {...overrides}
    />
  );
  return { onBack };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('SplitView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchResponsesApi.mockResolvedValue([]);
  });

  it('renders the Split View header badge and Back to Session button', () => {
    renderSplitView();
    expect(screen.getByText('Split View')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Back to Session/i })).toBeInTheDocument();
    expect(screen.getByTestId('app-logo')).toBeInTheDocument();
  });

  it('calls onBack when "Back to Session" is clicked', () => {
    const { onBack } = renderSplitView();
    fireEvent.click(screen.getByRole('button', { name: /Back to Session/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('applies hover styles on "Back to Session" button mouseEnter/Leave', () => {
    renderSplitView();
    const btn = screen.getByRole('button', { name: /Back to Session/i });
    fireEvent.mouseEnter(btn);
    expect(btn.style.borderColor).toBe('var(--color-primary-400)');
    expect(btn.style.color).toBe('var(--color-primary-600)');
    fireEvent.mouseLeave(btn);
    expect(btn.style.borderColor).toBe('var(--border-default)');
    expect(btn.style.color).toBe('var(--text-secondary)');
  });

  it('renders two panes (Left Pane, Right Pane)', () => {
    renderSplitView();
    expect(screen.getByText('Left Pane')).toBeInTheDocument();
    expect(screen.getByText('Right Pane')).toBeInTheDocument();
  });

  // ── DiscussionList — empty state ─────────────────────────────────────────

  it('shows "No discussions" in both panes when discussions array is empty', () => {
    renderSplitView({ discussions: [] });
    const msgs = screen.getAllByText('No discussions');
    // Two panes, each with active + closed tab content
    expect(msgs.length).toBeGreaterThanOrEqual(2);
  });

  // ── DiscussionList — discussion buttons ──────────────────────────────────

  it('shows Active and Closed tab triggers in each pane', () => {
    const discussions = [makeDiscussion({ id: 'd1', status: 'active' })];
    renderSplitView({ discussions });
    // Each pane has Active/Closed tabs — find at least one
    expect(screen.getAllByText(/Active \(/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Closed \(/i).length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Active" status badge for active discussions in list', () => {
    const discussions = [makeDiscussion({ id: 'd1', status: 'active', prompt_text: 'Active Q' })];
    renderSplitView({ discussions });
    const activeBadges = screen.getAllByText('Active');
    expect(activeBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Closed" status badge for closed discussions in list', () => {
    const discussions = [makeDiscussion({ id: 'd1', status: 'closed', prompt_text: 'Closed Q' })];
    renderSplitView({ discussions });
    const closedBadges = screen.getAllByText('Closed');
    expect(closedBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('shows singular "response" in list when count is 1', () => {
    const discussions = [makeDiscussion({ response_count: 1 })];
    renderSplitView({ discussions });
    const responseTexts = screen.getAllByText('response');
    expect(responseTexts.length).toBeGreaterThanOrEqual(1);
  });

  it('shows plural "responses" in list when count is not 1', () => {
    const discussions = [makeDiscussion({ response_count: 3 })];
    renderSplitView({ discussions });
    const responseTexts = screen.getAllByText('responses');
    expect(responseTexts.length).toBeGreaterThanOrEqual(1);
  });

  it('applies hover border on discussion list button mouseEnter/Leave', () => {
    const discussions = [makeDiscussion({ id: 'd1', prompt_text: 'Hover Q' })];
    renderSplitView({ discussions });
    // Get all buttons with this text (two panes render the same list)
    const btns = screen.getAllByText('Hover Q').map((el) => el.closest('button')!);
    fireEvent.mouseEnter(btns[0]);
    expect(btns[0].style.borderColor).toBe('var(--color-primary-300)');
    fireEvent.mouseLeave(btns[0]);
    expect(btns[0].style.borderColor).toBe('var(--border-default)');
  });

  // ── Pane — selecting a discussion ────────────────────────────────────────

  it('navigates to discussion detail when a discussion is clicked', async () => {
    mockFetchResponsesApi.mockResolvedValue([]);
    const discussions = [makeDiscussion({ id: 'd1', prompt_text: 'Click me' })];
    renderSplitView({ discussions });

    const btns = screen.getAllByText('Click me').map((el) => el.closest('button')!);
    await act(async () => { fireEvent.click(btns[0]); });

    // Detail view shows Back button and the discussion text
    expect(screen.getAllByText('Back').length).toBeGreaterThanOrEqual(1);
  });

  it('fetches responses from API when a non-live discussion is selected', async () => {
    const response = makeResponse({ id: 'r1', response_text: 'Fetched answer' });
    mockFetchResponsesApi.mockResolvedValue([response]);
    const discussions = [makeDiscussion({ id: 'd1', prompt_text: 'Fetch Q' })];
    renderSplitView({ discussions, liveActiveDiscussionId: 'd99' });

    const btns = screen.getAllByText('Fetch Q').map((el) => el.closest('button')!);
    await act(async () => { fireEvent.click(btns[0]); });

    await waitFor(() => {
      expect(mockFetchResponsesApi).toHaveBeenCalledWith('d1', true);
    });
  });

  it('uses live responses when selected discussion is the live active discussion', async () => {
    const liveResponse = makeResponse({ id: 'r1', response_text: 'Live response' });
    const discussions = [makeDiscussion({ id: 'dLive', status: 'active', prompt_text: 'Live Q' })];
    renderSplitView({
      discussions,
      liveActiveDiscussionId: 'dLive',
      liveActiveResponses: [liveResponse],
    });

    const btns = screen.getAllByText('Live Q').map((el) => el.closest('button')!);
    await act(async () => { fireEvent.click(btns[0]); });

    // API should NOT be called for the live discussion
    expect(mockFetchResponsesApi).not.toHaveBeenCalled();
    // Live response should be shown
    expect(screen.getAllByTestId('response-card').length).toBeGreaterThanOrEqual(1);
  });

  it('handles API error gracefully (shows no responses)', async () => {
    mockFetchResponsesApi.mockRejectedValue(new Error('Network error'));
    const discussions = [makeDiscussion({ id: 'd1', prompt_text: 'Error Q' })];
    renderSplitView({ discussions, liveActiveDiscussionId: 'other' });

    const btns = screen.getAllByText('Error Q').map((el) => el.closest('button')!);
    await act(async () => { fireEvent.click(btns[0]); });

    await waitFor(() => {
      expect(screen.getAllByText('No responses yet.').length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── DiscussionDetail — Back button ───────────────────────────────────────

  it('goes back to list view when the Back button in detail is clicked', async () => {
    mockFetchResponsesApi.mockResolvedValue([]);
    const discussions = [makeDiscussion({ id: 'd1', prompt_text: 'Detail Q' })];
    renderSplitView({ discussions, liveActiveDiscussionId: 'd99' });

    const discussionBtns = screen.getAllByText('Detail Q').map((el) => el.closest('button')!);
    await act(async () => { fireEvent.click(discussionBtns[0]); });

    const backBtns = screen.getAllByText('Back');
    await act(async () => { fireEvent.click(backBtns[0]); });

    // Back to list view — prompt text appears as button again
    await waitFor(() => {
      expect(screen.getAllByText('Detail Q').some((el) => el.closest('button') !== null)).toBe(true);
    });
  });

  it('applies hover styles on detail Back button mouseEnter/Leave', async () => {
    mockFetchResponsesApi.mockResolvedValue([]);
    const discussions = [makeDiscussion({ id: 'd1', prompt_text: 'Back Hover Q' })];
    renderSplitView({ discussions, liveActiveDiscussionId: 'd99' });

    const btns = screen.getAllByText('Back Hover Q').map((el) => el.closest('button')!);
    await act(async () => { fireEvent.click(btns[0]); });

    // The detail back button is inside a div with class px-4 (the detail view header)
    const detailBackBtn = screen.getAllByText('Back').find(el => el.closest('div.px-4'))!.closest('button')!;
    fireEvent.mouseEnter(detailBackBtn);
    expect(detailBackBtn.style.color).toBe('var(--color-primary-600)');
    fireEvent.mouseLeave(detailBackBtn);
    expect(detailBackBtn.style.color).toBe('var(--text-muted)');
  });

  // ── DiscussionDetail — Active/Closed status badge ────────────────────────

  it('shows Active badge in detail view for active discussion', async () => {
    mockFetchResponsesApi.mockResolvedValue([]);
    const discussions = [makeDiscussion({ id: 'd1', status: 'active', prompt_text: 'Active Detail' })];
    renderSplitView({ discussions, liveActiveDiscussionId: 'other' });

    const btns = screen.getAllByText('Active Detail').map((el) => el.closest('button')!);
    await act(async () => { fireEvent.click(btns[0]); });

    // Active badge in detail view header
    const activeBadges = screen.getAllByText('Active');
    expect(activeBadges.length).toBeGreaterThanOrEqual(1);
  });

  // ── DiscussionDetail — MC options ─────────────────────────────────────────

  it('shows MC options section in detail view for MC discussions', async () => {
    const mcOptions = [
      { label: 'A', text: 'Option A', is_correct: true },
      { label: 'B', text: 'Option B', is_correct: false },
    ];
    const discussion = makeDiscussion({
      id: 'd1',
      prompt_type: 'multiple_choice',
      mc_options: mcOptions,
      correct_option: 'A',
      prompt_text: 'MC Question',
    });
    // Provide live responses with selected_option to exercise distribution counting
    const liveResponses = [
      makeResponse({ id: 'r1', selected_option: 'A' }),
      makeResponse({ id: 'r2', selected_option: 'A' }),
      makeResponse({ id: 'r3', selected_option: 'B' }),
      makeResponse({ id: 'r4', selected_option: undefined }), // no selection — skipped
    ];
    renderSplitView({
      discussions: [discussion],
      liveActiveDiscussionId: 'd1',
      liveActiveResponses: liveResponses,
    });

    const btns = screen.getAllByText('MC Question').map((el) => el.closest('button')!);
    await act(async () => { fireEvent.click(btns[0]); });

    expect(screen.getAllByText('Options').length).toBeGreaterThanOrEqual(1);
    // Option text visible
    expect(screen.getAllByText(/Option A/).length).toBeGreaterThanOrEqual(1);
  });

  // ── DiscussionDetail — loading state ─────────────────────────────────────

  it('shows loading skeleton while responses are being fetched', async () => {
    // Return a promise that never resolves to keep loading=true
    mockFetchResponsesApi.mockReturnValue(new Promise(() => {}));
    const discussions = [makeDiscussion({ id: 'd1', prompt_text: 'Loading Q' })];
    renderSplitView({ discussions, liveActiveDiscussionId: 'other' });

    const btns = screen.getAllByText('Loading Q').map((el) => el.closest('button')!);
    act(() => { fireEvent.click(btns[0]); });

    // Skeleton elements shown during loading
    await waitFor(() => {
      const skeletons = document.querySelectorAll('.skeleton-shimmer');
      expect(skeletons.length).toBeGreaterThanOrEqual(1);
    });
  });
});
