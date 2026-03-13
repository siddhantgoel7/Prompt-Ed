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
  it('[US 1.36][AC1-AT1] renders in collapsed state with base styling when not selected', () => {
    const { container } = renderCard({ isSelected: false });

    const card = container.firstChild as HTMLElement;
    // Default (unselected) styling: white background, thin border, base text
    expect(card.className).toMatch(/bg-white/);
    expect(card.className).toMatch(/border-gray-200/);
    expect(card.className).not.toMatch(/bg-yellow-50/);
    expect(card.className).not.toMatch(/shadow-2xl/);

    // Text should use base size
    const text = screen.getByText(/Sample student response/);
    expect(text.className).toMatch(/text-base/);
    expect(text.className).not.toMatch(/text-3xl/);
  });

  it('[US 1.36][AC1-AT2] renders with prominent styling when selected (larger text, colour, border, shadow)', () => {
    const { container } = renderCard({ isSelected: true });

    const card = container.firstChild as HTMLElement;
    // Selected styling: yellow background, thick border, ring, large shadow, elevated z-index
    expect(card.className).toMatch(/bg-yellow-50/);
    expect(card.className).toMatch(/border-2/);
    expect(card.className).toMatch(/border-black/);
    expect(card.className).toMatch(/ring-4/);
    expect(card.className).toMatch(/shadow-2xl/);
    expect(card.className).toMatch(/z-10/);

    // Text should be larger and semibold
    const text = screen.getByText(/Sample student response/);
    expect(text.className).toMatch(/text-3xl/);
    expect(text.className).toMatch(/font-semibold/);
  });

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

  it('[US 1.36][AC1-AT3] clicking the card calls onToggle to toggle highlight', async () => {
    const user = userEvent.setup();
    const onToggle = jest.fn();
    renderCard({ onToggle });

    await user.click(screen.getByText(/Sample student response/));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// [US 1.36] AC1 & AC2 — Visual emphasis when highlighted (compact variant)
// ---------------------------------------------------------------------------

describe('ResponseCard — visual emphasis (compact variant)', () => {
  it('[US 1.36][AC1-AT1] renders with base styling when not selected', () => {
    const { container } = renderCard({ variant: 'compact', isSelected: false });

    // Compact renders inside a Card > CardContent
    const card = container.firstChild as HTMLElement;
    expect(card.className).toMatch(/border-gray-200/);
    expect(card.className).not.toMatch(/bg-yellow-50/);

    const text = screen.getByText(/Sample student response/);
    expect(text.className).toMatch(/text-sm/);
  });

  it('[US 1.36][AC1-AT2] renders prominently when selected (larger text, colour, border, shadow)', () => {
    const { container } = renderCard({ variant: 'compact', isSelected: true });

    const card = container.firstChild as HTMLElement;
    expect(card.className).toMatch(/bg-yellow-50/);
    expect(card.className).toMatch(/border-2/);
    expect(card.className).toMatch(/border-black/);
    expect(card.className).toMatch(/ring-4/);
    expect(card.className).toMatch(/shadow-xl/);
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
  it('[US 1.35][AC1-AT1] uses red styling when in flagged mode and selected', () => {
    const { container } = renderCard({ mode: 'flagged', isSelected: true });

    const card = container.firstChild as HTMLElement;
    expect(card.className).toMatch(/bg-red-50/);
    expect(card.className).toMatch(/border-red-400/);
    expect(card.className).toMatch(/ring-red-200/);
    // Should NOT have yellow/black styling
    expect(card.className).not.toMatch(/bg-yellow-50/);
    expect(card.className).not.toMatch(/border-black/);
  });

  it('[US 1.35][AC1-AT2] shows Unflag button instead of Flag when in flagged mode and selected', () => {
    renderCard({ mode: 'flagged', isSelected: true });

    expect(screen.getByRole('button', { name: /Unflag/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Flag as Inappropriate/i })).not.toBeInTheDocument();
  });

  it('[US 1.35][AC1-AT3] shows Restoring... text when isBeingFlagged in flagged mode', () => {
    renderCard({ mode: 'flagged', isSelected: true, isBeingFlagged: true });

    expect(screen.getByRole('button', { name: /Restoring/i })).toBeInTheDocument();
  });

  it('[US 1.35][AC1-AT4] shows Removing... text when isBeingFlagged in normal mode', () => {
    renderCard({ mode: 'normal', isSelected: true, isBeingFlagged: true });

    expect(screen.getByRole('button', { name: /Removing/i })).toBeInTheDocument();
  });
});
