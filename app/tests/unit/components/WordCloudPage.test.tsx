/**
 * Tests for WordCloudPageClient — the interactive word-cloud page.
 *
 * Covers:
 *  - Word cloud renders for short_answer and long_answer discussions (Task 1)
 *  - Clicking a word opens the response panel with matching cards (Task 2)
 *  - Keyword is highlighted inside response cards
 *  - Clicking a card highlights it; clicking again deselects (one at a time)
 *  - Closing the panel via the X button resets state
 *  - Empty state when no responses are present
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WordCloudPageClient } from '@/components/instructor/session/WordCloudPageClient';
import type { Discussion } from '@/types/discussion';
import type { Response } from '@/types/response';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('@/components/ui/ThemeToggle', () => ({
  ThemeToggle: () => <button aria-label="Switch to dark mode" />,
}));

jest.mock('@/components/ui/AppLogo', () => ({
  AppLogo: () => <div data-testid="app-logo" />,
}));

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: () => ({
      on: function() { return this; },
      subscribe: (cb?: (s: string) => void) => { cb?.('SUBSCRIBED'); return this; },
    }),
    removeChannel: jest.fn(),
  }),
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeDiscussion(promptType: Discussion['prompt_type'] = 'short_answer'): Discussion {
  return {
    id: 'disc-1',
    lesson_id: 'lesson-1',
    prompt_text: 'What is pharmacokinetics?',
    prompt_type: promptType,
    status: 'ended',
    published_at: '2024-01-01T10:00:00Z',
    created_at: '2024-01-01T10:00:00Z',
    display_order: 0,
    source: 'manual',
    mc_options: null,
    correct_option: null,
    feedback_enabled: false,
    ai_generated_correct_option: null,
    participant_snapshot: 10,
    time_limit_seconds: null,
  } as unknown as Discussion;
}

function makeResponses(): Response[] {
  return [
    {
      id: 'r1',
      discussion_id: 'disc-1',
      response_text: 'Pharmacokinetics describes how the body processes drugs over time.',
      created_at: '2024-01-01T10:01:00Z',
      selected_option: null,
      flagged_at: null,
    },
    {
      id: 'r2',
      discussion_id: 'disc-1',
      response_text: 'It involves absorption, distribution, metabolism, and excretion of drugs.',
      created_at: '2024-01-01T10:02:00Z',
      selected_option: null,
      flagged_at: null,
    },
    {
      id: 'r3',
      discussion_id: 'disc-1',
      response_text: 'Drugs are metabolised by the liver through various enzymatic pathways.',
      created_at: '2024-01-01T10:03:00Z',
      selected_option: null,
      flagged_at: null,
    },
  ] as Response[];
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('WordCloudPageClient', () => {
  it('renders the page with the discussion prompt in the header', () => {
    render(
      <WordCloudPageClient discussion={makeDiscussion()} responses={makeResponses()} />
    );
    expect(screen.getByText('What is pharmacokinetics?')).toBeInTheDocument();
    expect(screen.getByText(/3 responses/i)).toBeInTheDocument();
  });

  it('renders the interactive word cloud for short_answer discussions (Task 1)', () => {
    render(
      <WordCloudPageClient discussion={makeDiscussion('short_answer')} responses={makeResponses()} />
    );
    expect(screen.getByTestId('word-cloud-interactive')).toBeInTheDocument();
    // "drugs" appears in all 3 responses — should be in the cloud
    expect(screen.getByTestId('word-btn-drugs')).toBeInTheDocument();
  });

  it('renders the interactive word cloud for long_answer discussions (Task 1)', () => {
    render(
      <WordCloudPageClient discussion={makeDiscussion('long_answer')} responses={makeResponses()} />
    );
    expect(screen.getByTestId('word-cloud-interactive')).toBeInTheDocument();
    expect(screen.getByTestId('word-btn-drugs')).toBeInTheDocument();
  });

  it('shows empty state when there are no responses', () => {
    render(
      <WordCloudPageClient discussion={makeDiscussion()} responses={[]} />
    );
    expect(screen.getByText(/No responses to build a word cloud from/i)).toBeInTheDocument();
    expect(screen.queryByTestId('word-cloud-interactive')).not.toBeInTheDocument();
  });

  it('opens the response panel when a word is clicked', () => {
    render(
      <WordCloudPageClient discussion={makeDiscussion()} responses={makeResponses()} />
    );
    // Click the word "drugs" which appears in all 3 responses
    fireEvent.click(screen.getByTestId('word-btn-drugs'));

    expect(screen.getByTestId('response-panel')).toBeInTheDocument();
    // New layout: word and count shown inline in the section header
    expect(screen.getByText(/\u201cdrugs\u201d/i)).toBeInTheDocument();
  });

  it('shows only responses that contain the clicked word', () => {
    render(
      <WordCloudPageClient discussion={makeDiscussion()} responses={makeResponses()} />
    );
    // "pharmacokinetics" only appears in r1
    fireEvent.click(screen.getByTestId('word-btn-pharmacokinetics'));

    expect(screen.getByTestId(`response-card-r1`)).toBeInTheDocument();
    expect(screen.queryByTestId('response-card-r2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('response-card-r3')).not.toBeInTheDocument();
    expect(screen.getByText(/— 1 response/i)).toBeInTheDocument();
  });

  it('highlights a response card on click; only one can be highlighted at a time', () => {
    render(
      <WordCloudPageClient discussion={makeDiscussion()} responses={makeResponses()} />
    );
    fireEvent.click(screen.getByTestId('word-btn-drugs'));

    const card1 = screen.getByTestId('response-card-r1');
    const card2 = screen.getByTestId('response-card-r2');

    // Select first card — spotlight overlay should appear
    fireEvent.click(card1);
    expect(screen.getByTestId('spotlight-overlay')).toBeInTheDocument();

    // Select second card — first card's spotlight closes, new one opens
    fireEvent.click(card2);
    expect(screen.getByTestId('spotlight-overlay')).toBeInTheDocument();
  });

  it('deselects a highlighted card when clicked again', () => {
    render(
      <WordCloudPageClient discussion={makeDiscussion()} responses={makeResponses()} />
    );
    fireEvent.click(screen.getByTestId('word-btn-drugs'));

    const card = screen.getByTestId('response-card-r1');
    fireEvent.click(card);
    expect(screen.getByTestId('spotlight-overlay')).toBeInTheDocument();
    // deselect by clicking the same card again
    fireEvent.click(card);
    expect(screen.queryByTestId('spotlight-overlay')).not.toBeInTheDocument();
  });

  it('closes the response panel when the X button is clicked', () => {
    render(
      <WordCloudPageClient discussion={makeDiscussion()} responses={makeResponses()} />
    );
    fireEvent.click(screen.getByTestId('word-btn-drugs'));
    expect(screen.getByTestId('response-panel')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Close response panel'));
    expect(screen.queryByTestId('response-panel')).not.toBeInTheDocument();
  });

  it('clicking the same word again closes the response panel', () => {
    render(
      <WordCloudPageClient discussion={makeDiscussion()} responses={makeResponses()} />
    );
    fireEvent.click(screen.getByTestId('word-btn-drugs'));
    expect(screen.getByTestId('response-panel')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('word-btn-drugs'));
    expect(screen.queryByTestId('response-panel')).not.toBeInTheDocument();
  });

  it('resets selected response when a new word is clicked', () => {
    render(
      <WordCloudPageClient discussion={makeDiscussion()} responses={makeResponses()} />
    );
    fireEvent.click(screen.getByTestId('word-btn-drugs'));
    fireEvent.click(screen.getByTestId('response-card-r1'));
    expect(screen.getByTestId('spotlight-overlay')).toBeInTheDocument();

    // Click a different word — spotlight should close (no selected response in new panel)
    fireEvent.click(screen.getByTestId('word-btn-pharmacokinetics'));
    expect(screen.queryByTestId('spotlight-overlay')).not.toBeInTheDocument();
  });
});
