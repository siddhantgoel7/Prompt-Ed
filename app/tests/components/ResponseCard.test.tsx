// UI tests for ResponseCard — verifies visual emphasis when highlighting/selecting responses.
// Covers acceptance criteria:
//   [US 1.36] Highlight a specific response
//     AC1: Highlighted response appears prominently (larger, different colour, pinned)
//     AC2: Multiple highlighted responses are distinguishable
//   [US 1.35] Hide inappropriate responses
//     AC1: Hidden from view but remains in data

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResponseCard } from '@/components/instructor/ResponseCard';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderCard(overrides: Partial<React.ComponentProps<typeof ResponseCard>> = {}) {
  const defaults: React.ComponentProps<typeof ResponseCard> = {
    variant: 'full',
    responseText: 'Sample student response',
    createdAt: '2024-01-01T10:00:00Z',
    isSelected: false,
    isBeingFlagged: false,
    onToggle: jest.fn(),
    onFlag: jest.fn(),
    ...overrides,
  };
  return render(<ResponseCard {...defaults} />);
}

// ---------------------------------------------------------------------------
// [US 1.36] AC1 & AC2 — Visual emphasis when highlighted (full variant)
// ---------------------------------------------------------------------------

describe('ResponseCard — visual emphasis (full variant)', () => {
  // 62.1
  it('[US 1.36][AC1-AT1] renders in collapsed state with base styling when not selected', () => {
    renderCard({ isSelected: false });

    // Text should use base size in unselected state
    const text = screen.getByText(/Sample student response/);
    expect(text.className).toMatch(/text-base/);
    expect(text.className).not.toMatch(/text-3xl/);
  });

  // 62.2
  it('[US 1.36][AC1-AT2] renders with prominent styling when selected (larger text, elevated z-index)', () => {
    const { container } = renderCard({ isSelected: true });

    const card = container.firstChild as HTMLElement;
    // Selected state: elevated z-index and relative positioning
    expect(card.className).toMatch(/z-10/);
    expect(card.className).toMatch(/relative/);

    // Text should be larger and semibold
    const text = screen.getByText(/Sample student response/);
    expect(text.className).toMatch(/text-3xl/);
    expect(text.className).toMatch(/font-semibold/);
  });

  // 62.3
  it('[US 1.35][AC1-AT1] shows the Flag action button only when selected', () => {
    const { rerender } = render(
      <ResponseCard
        variant="full"
        responseText="Test"
        createdAt="2024-01-01T10:00:00Z"
        isSelected={false}
        isBeingFlagged={false}
        onToggle={jest.fn()}
        onFlag={jest.fn()}
      />,
    );

    // Not visible when unselected
    expect(screen.queryByRole('button', { name: /Flag as Inappropriate/i })).not.toBeInTheDocument();

    // Rerender as selected
    rerender(
      <ResponseCard
        variant="full"
        responseText="Test"
        createdAt="2024-01-01T10:00:00Z"
        isSelected={true}
        isBeingFlagged={false}
        onToggle={jest.fn()}
        onFlag={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /Flag as Inappropriate/i })).toBeInTheDocument();
  });

  // 62.4
  it('[US 1.36][AC1-AT3] clicking the card calls onToggle to toggle highlight', async () => {
    const user = userEvent.setup();
    const onToggle = jest.fn();
    renderCard({ onToggle });

    await user.click(screen.getByLabelText(/Select response/i));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// [US 1.36] AC1 & AC2 — Visual emphasis when highlighted (compact variant)
// ---------------------------------------------------------------------------

describe('ResponseCard — visual emphasis (compact variant)', () => {
  // 62.5
  it('[US 1.36][AC1-AT1] renders with base styling when not selected', () => {
    renderCard({ variant: 'compact', isSelected: false });

    const text = screen.getByText(/Sample student response/);
    expect(text.className).toMatch(/text-sm/);
  });

  // 62.6
  it('[US 1.36][AC1-AT2] renders prominently when selected (larger text, elevated z-index)', () => {
    const { container } = renderCard({ variant: 'compact', isSelected: true });

    const card = container.firstChild as HTMLElement;
    expect(card.className).toMatch(/z-10/);

    const text = screen.getByText(/Sample student response/);
    expect(text.className).toMatch(/text-2xl/);
    expect(text.className).toMatch(/font-semibold/);
  });
});

// ---------------------------------------------------------------------------
// [US 1.35] AC1 — Flagged mode uses red styling instead of yellow
// ---------------------------------------------------------------------------

describe('ResponseCard — flagged mode visual styling', () => {
  // 62.7
  it('[US 1.35][AC1-AT1] uses red styling when in flagged mode and selected', () => {
    const { container } = renderCard({ mode: 'flagged', isSelected: true });

    const card = container.firstChild as HTMLElement;
    // Selected flagged state uses red styling — check semantic attribute, not color values
    expect(card.querySelector('button')).toHaveAttribute('data-variant', 'flagged-selected');
    // Should have z-10 for elevation
    expect(card.className).toMatch(/z-10/);
  });

  // 62.8
  it('[US 1.35][AC1-AT2] shows Unflag button instead of Flag when in flagged mode and selected', () => {
    renderCard({ mode: 'flagged', isSelected: true });

    expect(screen.getByRole('button', { name: /Unflag/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Flag as Inappropriate/i })).not.toBeInTheDocument();
  });

  // 62.9
  it('[US 1.35][AC1-AT3] shows Restoring... text when isBeingFlagged in flagged mode', () => {
    renderCard({ mode: 'flagged', isSelected: true, isBeingFlagged: true });

    expect(screen.getByRole('button', { name: /Restoring/i })).toBeInTheDocument();
  });

  // 62.10
  it('[US 1.35][AC1-AT4] shows Removing... text when isBeingFlagged in normal mode', () => {
    renderCard({ mode: 'normal', isSelected: true, isBeingFlagged: true });

    expect(screen.getByRole('button', { name: /Removing/i })).toBeInTheDocument();
  });
});
