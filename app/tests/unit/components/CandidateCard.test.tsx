/**
 * Tests for CandidateCard component (unselected preview card).
 * Covers: prompt rendering, onSelect click, hover border change,
 * tooltip metadata branches (bloomsLevel, topicArea, rationale),
 * and mcOptions rendering.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CandidateCard } from '@/components/instructor/session/CandidateCard';

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeCandidate(overrides: Record<string, unknown> = {}) {
  return {
    promptText: 'What is the mechanism of aspirin?',
    promptType: 'short_answer',
    bloomsLevel: undefined as string | undefined,
    topicArea: undefined as string | undefined,
    rationale: undefined as string | undefined,
    mcOptions: [] as { label: string; text: string }[],
    ...overrides,
  } as any;
}

function renderCard(props: { candidate?: any; onSelect?: () => void; isSelected?: boolean }) {
  const onSelect = props.onSelect ?? jest.fn();
  const candidate = props.candidate ?? makeCandidate();
  const result = render(
    <CandidateCard
      candidate={candidate}
      index={0}
      isSelected={props.isSelected ?? false}
      onSelect={onSelect}
      isConnected={true}
      onRequestPublish={jest.fn()}
    />
  );
  return { ...result, onSelect };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('CandidateCard', () => {
  it('renders the prompt text', () => {
    renderCard({});
    expect(screen.getByText('What is the mechanism of aspirin?')).toBeInTheDocument();
  });

  it('calls onSelect when the card is clicked', () => {
    const onSelect = jest.fn();
    renderCard({ onSelect });
    // Card is the large button with selection label
    fireEvent.click(screen.getByRole('button', { name: /Select:/i }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  // ── Mouse hover ──────────────────────────────────────────────────────────

  it('changes border color on mouseEnter', () => {
    const { container } = renderCard({});
    const cardDiv = container.firstChild as HTMLElement;
    fireEvent.mouseEnter(cardDiv);
    expect(cardDiv.style.border).toContain('var(--color-primary-300)');
  });

  it('resets border color on mouseLeave', () => {
    const { container } = renderCard({});
    const cardDiv = container.firstChild as HTMLElement;
    fireEvent.mouseEnter(cardDiv);
    fireEvent.mouseLeave(cardDiv);
    expect(cardDiv.style.border).toContain('var(--border-default)');
  });

  // ── Tooltip metadata branches ─────────────────────────────────────────────

  it('shows bloomsLevel when present', () => {
    renderCard({ candidate: makeCandidate({ bloomsLevel: 'Understand' }) });
    expect(screen.getByText(/Understand/)).toBeInTheDocument();
  });

  it('shows topicArea when present', () => {
    renderCard({ candidate: makeCandidate({ topicArea: 'Pharmacokinetics' }) });
    expect(screen.getByText(/Pharmacokinetics/)).toBeInTheDocument();
  });

  it('shows rationale when present', () => {
    renderCard({ candidate: makeCandidate({ rationale: 'Tests recall of core concept' }) });
    expect(screen.getByText(/Tests recall of core concept/)).toBeInTheDocument();
  });

  it('shows "No metadata" when all metadata fields are absent', () => {
    renderCard({ candidate: makeCandidate({ bloomsLevel: undefined, topicArea: undefined, rationale: undefined }) });
    expect(screen.getByText('No metadata')).toBeInTheDocument();
  });

  // ── MC options ────────────────────────────────────────────────────────────

  it('renders mc options when present', () => {
    const mcOptions = [
      { label: 'A', text: 'Inhibits COX-1' },
      { label: 'B', text: 'Inhibits COX-2' },
    ];
    renderCard({ candidate: makeCandidate({ mcOptions }) });
    expect(screen.getByText('Inhibits COX-1')).toBeInTheDocument();
    expect(screen.getByText('Inhibits COX-2')).toBeInTheDocument();
  });

  it('does not render options list when mcOptions is empty', () => {
    renderCard({ candidate: makeCandidate({ mcOptions: [] }) });
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('formats promptType by replacing underscores with spaces', () => {
    renderCard({ candidate: makeCandidate({ promptType: 'multiple_choice' }) });
    expect(screen.getByText('multiple choice')).toBeInTheDocument();
  });
});
