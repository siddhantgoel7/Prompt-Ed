/**
 * Tests for CandidateCard component.
 * Covers: selected vs unselected state, onSelect click, onMouseEnter/Leave
 * with isSelected=true and isSelected=false, tooltip metadata branches
 * (bloomsLevel, topicArea, rationale — each present/absent), mcOptions rendering.
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

function renderCard(props: {
  candidate?: any;
  isSelected?: boolean;
  onSelect?: () => void;
}) {
  const onSelect = props.onSelect ?? jest.fn();
  const candidate = props.candidate ?? makeCandidate();
  const isSelected = props.isSelected ?? false;
  render(<CandidateCard candidate={candidate} isSelected={isSelected} onSelect={onSelect} />);
  return { onSelect };
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
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('shows "Selected" badge when isSelected=true', () => {
    renderCard({ isSelected: true });
    expect(screen.getByText('Selected')).toBeInTheDocument();
  });

  it('does not show "Selected" badge when isSelected=false', () => {
    renderCard({ isSelected: false });
    expect(screen.queryByText('Selected')).not.toBeInTheDocument();
  });

  // ── Mouse hover — unselected (border changes) ────────────────────────────

  it('changes border color on mouseEnter when NOT selected', () => {
    renderCard({ isSelected: false });
    const btn = screen.getByRole('button');
    fireEvent.mouseEnter(btn);
    expect(btn.style.borderColor).toBe('var(--color-primary-300)');
  });

  it('resets border color on mouseLeave when NOT selected', () => {
    renderCard({ isSelected: false });
    const btn = screen.getByRole('button');
    fireEvent.mouseEnter(btn);
    fireEvent.mouseLeave(btn);
    expect(btn.style.borderColor).toBe('var(--border-default)');
  });

  // ── Mouse hover — selected (no border change) ────────────────────────────

  it('does NOT change border color on mouseEnter when selected', () => {
    renderCard({ isSelected: true });
    const btn = screen.getByRole('button');
    const before = btn.style.borderColor;
    fireEvent.mouseEnter(btn);
    // borderColor must remain unchanged (guard: if (!isSelected) skips the assignment)
    expect(btn.style.borderColor).toBe(before);
  });

  it('does NOT change border color on mouseLeave when selected', () => {
    renderCard({ isSelected: true });
    const btn = screen.getByRole('button');
    const before = btn.style.borderColor;
    fireEvent.mouseLeave(btn);
    expect(btn.style.borderColor).toBe(before);
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
