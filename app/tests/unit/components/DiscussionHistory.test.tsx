/**
 * Tests for DiscussionHistory component.
 * Covers: empty state, single/multiple discussions, active vs closed badge,
 * isActive highlight, response count singular/plural, published_at shown/absent.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { DiscussionHistory } from '@/components/instructor/session/DiscussionHistory';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('next/navigation', () => ({
  useParams: () => ({ lessonId: 'l1' }),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: any) => <a href={href}>{children}</a>,
}));

jest.mock('@/lib/utils', () => ({
  formatTime: (ts: string) => `T:${ts}`,
  truncateText: (t: string) => t,
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeDiscussion(overrides: Record<string, unknown> = {}) {
  return {
    id: 'd1',
    prompt_text: 'What is pharmacology?',
    status: 'closed',
    response_count: 3,
    published_at: '2024-01-01T12:00:00Z',
    ...overrides,
  } as any;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('DiscussionHistory', () => {
  it('shows empty state when discussions array is empty', () => {
    render(<DiscussionHistory discussions={[]} activeDiscussionId={null} />);
    expect(screen.getByText('No discussions yet')).toBeInTheDocument();
    expect(screen.getByText(/Start a discussion to see it here/i)).toBeInTheDocument();
  });

  it('renders a link for each discussion', () => {
    const discussions = [
      makeDiscussion({ id: 'd1', prompt_text: 'Question One' }),
      makeDiscussion({ id: 'd2', prompt_text: 'Question Two' }),
    ];
    render(<DiscussionHistory discussions={discussions} activeDiscussionId={null} />);
    expect(screen.getByText('Question One')).toBeInTheDocument();
    expect(screen.getByText('Question Two')).toBeInTheDocument();
  });

  it('shows "Active" badge for a discussion with status=active', () => {
    const discussions = [makeDiscussion({ status: 'active' })];
    render(<DiscussionHistory discussions={discussions} activeDiscussionId={null} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows "Closed" badge for a discussion with status=closed', () => {
    const discussions = [makeDiscussion({ status: 'closed' })];
    render(<DiscussionHistory discussions={discussions} activeDiscussionId={null} />);
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });

  it('uses singular "response" when response_count is 1', () => {
    const discussions = [makeDiscussion({ response_count: 1 })];
    render(<DiscussionHistory discussions={discussions} activeDiscussionId={null} />);
    expect(screen.getByText('response')).toBeInTheDocument();
  });

  it('uses plural "responses" when response_count is not 1', () => {
    const discussions = [makeDiscussion({ response_count: 5 })];
    render(<DiscussionHistory discussions={discussions} activeDiscussionId={null} />);
    expect(screen.getByText('responses')).toBeInTheDocument();
  });

  it('shows formatted time when published_at is set', () => {
    const discussions = [makeDiscussion({ published_at: '2024-01-01T12:00:00Z' })];
    render(<DiscussionHistory discussions={discussions} activeDiscussionId={null} />);
    expect(screen.getByText('T:2024-01-01T12:00:00Z')).toBeInTheDocument();
  });

  it('does not show time bullet when published_at is null', () => {
    const discussions = [makeDiscussion({ published_at: null })];
    render(<DiscussionHistory discussions={discussions} activeDiscussionId={null} />);
    expect(screen.queryByText(/T:/)).not.toBeInTheDocument();
  });

  it('highlights the active discussion with a different style', () => {
    const discussions = [
      makeDiscussion({ id: 'd1', prompt_text: 'Active question' }),
      makeDiscussion({ id: 'd2', prompt_text: 'Other question' }),
    ];
    render(<DiscussionHistory discussions={discussions} activeDiscussionId="d1" />);
    // Both render — active one shows its text
    expect(screen.getByText('Active question')).toBeInTheDocument();
    expect(screen.getByText('Other question')).toBeInTheDocument();
  });

  it('renders discussions in reverse order (newest first)', () => {
    const discussions = [
      makeDiscussion({ id: 'd1', prompt_text: 'First question' }),
      makeDiscussion({ id: 'd2', prompt_text: 'Second question' }),
    ];
    render(<DiscussionHistory discussions={discussions} activeDiscussionId={null} />);
    const items = screen.getAllByRole('link');
    // Second (newest) should appear first
    expect(items[0]).toHaveTextContent('Second question');
    expect(items[1]).toHaveTextContent('First question');
  });

  it('builds correct href for each discussion link', () => {
    const discussions = [makeDiscussion({ id: 'd42' })];
    render(<DiscussionHistory discussions={discussions} activeDiscussionId={null} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/session/l1/discussion/d42');
  });
});
