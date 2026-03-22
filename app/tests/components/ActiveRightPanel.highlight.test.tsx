// Tests for the response highlight/expand and flag-as-inappropriate feature
// on the ActiveRightPanel (live session sidebar).
// [US 1.36] Highlight a specific response
//   AC1: Highlighted response appears prominently (larger, different colour, pinned)
//   AC2: Multiple highlighted responses are distinguishable
// [US 1.35] Hide inappropriate responses
//   AC1: Hidden from view but remains in data

// Polyfill ResizeObserver for jsdom (required by Radix ScrollArea)
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { ActiveRightPanel } from '@/components/instructor/session/ActiveRightPanel';
import { SessionContext } from '@/components/instructor/session/SessionContext';
import type { SessionVM } from '@/hooks/useSessionPage';
import type { Discussion } from '@/types/discussion';
import type { Response } from '@/types/response';

// Mock DiscussionAnalyticsModal
jest.mock('@/components/instructor/session/DiscussionAnalyticsModal', () => ({
  DiscussionAnalyticsContent: () => <div>Analytics Content</div>,
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DISCUSSION: Discussion = {
  id: 'disc-1',
  lesson_id: 'lesson-1',
  prompt_text: 'Explain pharmacokinetics.',
  prompt_type: 'short_answer',
  status: 'active',
  created_at: '2024-01-01T10:00:00Z',
  published_at: '2024-01-01T10:00:00Z',
  closed_at: null,
  display_order: 1,
  participant_snapshot: null,
  mc_options: null,
  correct_option: null,
  source: 'manual',
  feedback_enabled: false,
  ai_generated_correct_option: null,
};

const MC_DISCUSSION: Discussion = {
  ...DISCUSSION,
  id: 'disc-mc-1',
  prompt_type: 'multiple_choice',
  mc_options: [
    { label: 'A', text: 'Correct option' },
    { label: 'B', text: 'Incorrect option' },
  ],
  correct_option: 'A',
};

function makeResponse(id: string, text: string): Response {
  return {
    id,
    discussion_id: 'disc-1',
    response_text: text,
    selected_option: null,
    created_at: '2024-01-01T10:01:00Z',
    is_correct: null,
    flagged_at: null,
  };
}

const RESPONSES: Response[] = [
  makeResponse('r1', 'First student response about pharmacokinetics'),
  makeResponse('r2', 'Second student response about drug absorption'),
  makeResponse('r3', 'Third student response about bioavailability'),
];

// Minimal SessionVM mock that provides removeResponse via context
function makeContextValue(overrides: Partial<SessionVM> = {}): SessionVM {
  return {
    responses: RESPONSES,
    activeDiscussion: DISCUSSION,
    studentCount: 3,
    peakStudentCount: 3,
    removeResponse: jest.fn().mockResolvedValue(undefined),
    // Remaining required SessionVM fields (not used by ActiveRightPanel)
    lesson: {} as SessionVM['lesson'],
    loading: false,
    notFound: false,
    isConnected: true,
    handleReconnect: jest.fn(),
    discussions: [],
    promptInput: '',
    setPromptInput: jest.fn(),
    displayState: false,
    handleDisplay: jest.fn(),
    endingLesson: false,
    endError: null,
    handleEnd: jest.fn(),
    transcripts: [],
    transcriptsLoading: false,
    transcriptsError: null,
    openFile: jest.fn(),
    handlePublishDiscussion: jest.fn(),
    handleCloseDiscussion: jest.fn(),
    historyLoading: false,
    historyError: null,
    lessonDiscussions: [],
    exportingData: false,
    activatingLesson: false,
    handleExportLessonData: jest.fn(),
    handleActivate: jest.fn(),
    files: [],
    isUploading: false,
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
    transcriptText: '',
    setTranscriptText: jest.fn(),
    promptType: 'short_answer',
    setPromptType: jest.fn(),
    candidates: [],
    isGenerating: false,
    generationWarning: null,
    generateCandidates: jest.fn(),
    selectCandidate: jest.fn(),
    regenerateCandidates: jest.fn(),
    handlePublishAiCandidate: jest.fn(),
    flaggedResponses: [],
    restoreResponse: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as SessionVM;
}

function renderWithContext(vm?: Partial<SessionVM>) {
  const contextValue = makeContextValue(vm);
  return {
    contextValue,
    ...render(
      <SessionContext.Provider value={contextValue}>
        <ActiveRightPanel />
      </SessionContext.Provider>,
    ),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ActiveRightPanel — response highlight & flag feature', () => {

  it('[US 1.36][AC1-AT1] renders all response cards in collapsed state by default', () => {
    renderWithContext();

    expect(screen.getByText(/First student response/)).toBeInTheDocument();
    expect(screen.getByText(/Second student response/)).toBeInTheDocument();
    expect(screen.getByText(/Third student response/)).toBeInTheDocument();
    // Flag button should not be visible when nothing is selected
    expect(screen.queryByRole('button', { name: /Flag as Inappropriate/i })).not.toBeInTheDocument();
  });

  it('[US 1.36][AC1-AT2] clicking a response highlights it and shows the flag button', async () => {
    const user = userEvent.setup();
    renderWithContext();

    const firstResponse = screen.getByText(/First student response/);
    await user.click(firstResponse);

    // Flag button should now be visible
    expect(screen.getByRole('button', { name: /Flag as Inappropriate/i })).toBeInTheDocument();
  });

  it('[US 1.36][AC1-AT3] clicking a highlighted response collapses it and hides the flag button', async () => {
    const user = userEvent.setup();
    renderWithContext();

    const firstResponse = screen.getByText(/First student response/);

    // Click to expand
    await user.click(firstResponse);
    expect(screen.getByRole('button', { name: /Flag as Inappropriate/i })).toBeInTheDocument();

    // Click again to collapse
    await user.click(firstResponse);
    expect(screen.queryByRole('button', { name: /Flag as Inappropriate/i })).not.toBeInTheDocument();
  });

  it('[US 1.36][AC2-AT1] clicking a different response highlights both responses', async () => {
    const user = userEvent.setup();
    renderWithContext();

    // Select the first response
    await user.click(screen.getByText(/First student response/));
    expect(screen.getAllByRole('button', { name: /Flag as Inappropriate/i })).toHaveLength(1);

    // Select the second response as well
    await user.click(screen.getByText(/Second student response/));
    // Both should now be highlighted with their own flag buttons
    const flagButtons = screen.getAllByRole('button', { name: /Flag as Inappropriate/i });
    expect(flagButtons).toHaveLength(2);
  });

  it('[US 1.35][AC1-AT1] clicking "Flag as Inappropriate" calls removeResponse with the response ID', async () => {
    const user = userEvent.setup();
    const { contextValue } = renderWithContext();

    // Select a response
    await user.click(screen.getByText(/Second student response/));

    // Click the flag button
    const flagBtn = screen.getByRole('button', { name: /Flag as Inappropriate/i });
    await user.click(flagBtn);

    await waitFor(() => {
      expect(contextValue.removeResponse).toHaveBeenCalledWith('r2');
    });
  });

  it('does not render "Flag as Inappropriate" for multiple-choice responses', async () => {
    const user = userEvent.setup();
    renderWithContext({
      activeDiscussion: MC_DISCUSSION,
      responses: [
        {
          ...makeResponse('mc-r1', 'Option A: Correct option'),
          discussion_id: MC_DISCUSSION.id,
          selected_option: 'A',
        },
      ],
    });

    await user.click(screen.getByText(/Option A: Correct option/i));
    expect(screen.queryByRole('button', { name: /Flag as Inappropriate/i })).not.toBeInTheDocument();
  });

  it('[US 1.36][AC2-AT2] multiple responses can be highlighted at the same time', async () => {
    const user = userEvent.setup();
    renderWithContext();

    // Click first response
    await user.click(screen.getByText(/First student response/));
    expect(screen.getAllByRole('button', { name: /Flag as Inappropriate/i })).toHaveLength(1);

    // Click third response
    await user.click(screen.getByText(/Third student response/));
    expect(screen.getAllByRole('button', { name: /Flag as Inappropriate/i })).toHaveLength(2);

    // Click second response
    await user.click(screen.getByText(/Second student response/));
    expect(screen.getAllByRole('button', { name: /Flag as Inappropriate/i })).toHaveLength(3);
  });

  it('[US 1.36][AC2-AT3] clicking a highlighted response deselects only that response', async () => {
    const user = userEvent.setup();
    renderWithContext();

    // Select first and third responses
    await user.click(screen.getByText(/First student response/));
    await user.click(screen.getByText(/Third student response/));
    expect(screen.getAllByRole('button', { name: /Flag as Inappropriate/i })).toHaveLength(2);

    // Deselect first response by clicking it again
    await user.click(screen.getByText(/First student response/));
    // Only the third response should remain highlighted
    expect(screen.getAllByRole('button', { name: /Flag as Inappropriate/i })).toHaveLength(1);
  });

  it('[US 1.36][AC1-AT4] filter toggle is hidden when no responses are highlighted', () => {
    renderWithContext();
    expect(screen.queryByRole('button', { name: /Show highlighted only/i })).not.toBeInTheDocument();
  });

  it('[US 1.36][AC1-AT5] filter toggle appears when responses are highlighted', async () => {
    const user = userEvent.setup();
    renderWithContext();

    await user.click(screen.getByText(/First student response/));
    expect(screen.getByRole('button', { name: /Show highlighted only \(1\)/i })).toBeInTheDocument();
  });

  it('[US 1.36][AC1-AT6] filter toggle shows only highlighted responses when active', async () => {
    const user = userEvent.setup();
    renderWithContext();

    // Select first response
    await user.click(screen.getByText(/First student response/));

    // Click the filter toggle
    await user.click(screen.getByRole('button', { name: /Show highlighted only/i }));

    // Only the highlighted response should be visible
    expect(screen.getByText(/First student response/)).toBeInTheDocument();
    expect(screen.queryByText(/Second student response/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Third student response/)).not.toBeInTheDocument();
  });

  it('[US 1.36][AC1-AT7] "Show all" button restores full response list', async () => {
    const user = userEvent.setup();
    renderWithContext();

    // Select and filter
    await user.click(screen.getByText(/First student response/));
    await user.click(screen.getByRole('button', { name: /Show highlighted only/i }));
    expect(screen.queryByText(/Second student response/)).not.toBeInTheDocument();

    // Click "Show all"
    await user.click(screen.getByRole('button', { name: /Show all/i }));

    // All responses visible again
    expect(screen.getByText(/First student response/)).toBeInTheDocument();
    expect(screen.getByText(/Second student response/)).toBeInTheDocument();
    expect(screen.getByText(/Third student response/)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// UI tests — visual emphasis styling
// ---------------------------------------------------------------------------

describe('ActiveRightPanel — highlight visual emphasis', () => {

  it('[US 1.36][AC1-AT1] highlighted response has prominent styling (colour, larger text, shadow)', async () => {
    const user = userEvent.setup();
    renderWithContext();

    const responseText = screen.getByText(/First student response/);

    // Before highlight: base text size
    expect(responseText.className).toMatch(/text-sm/);

    await user.click(responseText);

    // After highlight: larger text and semibold
    expect(responseText.className).toMatch(/text-2xl/);
    expect(responseText.className).toMatch(/font-semibold/);

    // The card wrapper should have elevated z-index (selected state)
    const card = responseText.closest('[class*="z-10"]');
    expect(card).not.toBeNull();
  });

  it('[US 1.36][AC1-AT2] un-highlighted response returns to base styling', async () => {
    const user = userEvent.setup();
    renderWithContext();

    const responseText = screen.getByText(/First student response/);

    // Highlight then un-highlight
    await user.click(responseText);
    expect(responseText.className).toMatch(/text-2xl/);

    await user.click(responseText);
    expect(responseText.className).toMatch(/text-sm/);
    expect(responseText.className).not.toMatch(/text-2xl/);
  });

  it('[US 1.36][AC2-AT1] each of multiple highlighted responses has its own prominent styling', async () => {
    const user = userEvent.setup();
    renderWithContext();

    await user.click(screen.getByText(/First student response/));
    await user.click(screen.getByText(/Third student response/));

    // Both should have prominent text
    expect(screen.getByText(/First student response/).className).toMatch(/text-2xl/);
    expect(screen.getByText(/Third student response/).className).toMatch(/text-2xl/);

    // The non-highlighted response stays in base styling
    expect(screen.getByText(/Second student response/).className).toMatch(/text-sm/);
  });

  it('[US 1.35][AC1-AT1] hidden (flagged) response is removed from the visible list', async () => {
    const user = userEvent.setup();
    const { contextValue } = renderWithContext();

    // Select and flag
    await user.click(screen.getByText(/Second student response/));
    await user.click(screen.getByRole('button', { name: /Flag as Inappropriate/i }));

    await waitFor(() => {
      expect(contextValue.removeResponse).toHaveBeenCalledWith('r2');
    });
  });
});
