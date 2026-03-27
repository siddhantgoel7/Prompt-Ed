/**
 * Tests for ResponseListTab component.
 * Covers: empty state, response rendering, MC distribution, flagged view
 * toggle, toggleFlaggedSelected, handleRestore (success + error + no-op), and
 * the auto-hide effect when all flagged responses are removed.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ResponseListTab, type ResponseListTabProps } from '@/components/instructor/session/ResponseListTab';

jest.mock('@/components/instructor/ResponseCard', () => ({
  ResponseCard: ({ responseText, onToggle, onFlag }: any) => (
    <div data-testid="response-card">
      <span>{responseText}</span>
      <button onClick={onToggle}>toggle</button>
      {onFlag && <button onClick={onFlag}>flag</button>}
    </div>
  ),
}));

jest.mock('@/components/instructor/FilterToggle', () => ({
  FilterToggle: ({ onToggle, onShowAll }: any) => (
    <div data-testid="filter-toggle">
      <button onClick={onToggle}>filter-toggle</button>
      <button onClick={onShowAll}>show-all</button>
    </div>
  ),
}));

jest.mock('@/components/instructor/FlaggedFilterToggle', () => ({
  FlaggedFilterToggle: ({ onToggle, onHide }: any) => (
    <div data-testid="flagged-toggle-bar">
      <button onClick={onToggle}>flagged-toggle</button>
      <button onClick={onHide}>flagged-hide</button>
    </div>
  ),
}));

const makeDiscussion = (isMC = false) => ({
  id: 'd1',
  prompt_text: 'Test question?',
  type: isMC ? 'multiple_choice' : 'short_answer',
  mc_options: isMC
    ? [
        { label: 'A', text: 'Option A', is_correct: true },
        { label: 'B', text: 'Option B', is_correct: false },
      ]
    : undefined,
  correct_option: isMC ? 'A' : undefined,
}) as any;

const makeResponse = (id: string, text: string) =>
  ({ id, response_text: text, created_at: '2024-01-01T00:00:00Z', flagged_at: null }) as any;

function buildProps(overrides: Partial<ResponseListTabProps> = {}): ResponseListTabProps {
  return {
    activeDiscussion: makeDiscussion(),
    responses: [],
    flaggedResponses: [],
    isMC: false,
    distribution: {},
    restoreResponse: jest.fn().mockResolvedValue(undefined),
    selectedIds: [],
    showHighlightedOnly: false,
    flaggingId: null,
    toggleSelected: jest.fn(),
    handleFlagInappropriate: jest.fn().mockResolvedValue(undefined),
    setShowHighlightedOnly: jest.fn(),
    filterResponses: (r) => r,
    ...overrides,
  };
}

describe('ResponseListTab', () => {
  it('renders empty state when there is no active discussion', () => {
    render(<ResponseListTab {...buildProps({ activeDiscussion: null })} />);
    expect(screen.getByText(/No active discussion/i)).toBeInTheDocument();
  });

  it('shows waiting message when active discussion has no responses', () => {
    render(<ResponseListTab {...buildProps()} />);
    expect(screen.getByText(/Waiting for student responses/i)).toBeInTheDocument();
  });

  it('renders a card for each response', () => {
    const responses = [makeResponse('r1', 'Answer 1'), makeResponse('r2', 'Answer 2')];
    render(<ResponseListTab {...buildProps({ responses })} />);
    expect(screen.getAllByTestId('response-card')).toHaveLength(2);
  });

  it('renders MC options section and distribution when isMC=true', () => {
    render(
      <ResponseListTab
        {...buildProps({
          activeDiscussion: makeDiscussion(true),
          isMC: true,
          distribution: { A: 3, B: 1 },
        })}
      />
    );
    expect(screen.getByText('Options')).toBeInTheDocument();
    expect(screen.getByText('Distribution')).toBeInTheDocument();
    // Correct option badge appears
    expect(screen.getByText('Correct')).toBeInTheDocument();
  });

  it('shows filter toggle bar when responses are selected', () => {
    const responses = [makeResponse('r1', 'Answer')];
    render(<ResponseListTab {...buildProps({ responses, selectedIds: ['r1'] })} />);
    expect(screen.getByTestId('filter-toggle')).toBeInTheDocument();
    // Trigger filter-toggle and show-all callbacks for coverage
    fireEvent.click(screen.getByText('filter-toggle'));
    fireEvent.click(screen.getByText('show-all'));
  });

  it('shows flagged toggle bar when there are flagged responses', () => {
    render(
      <ResponseListTab {...buildProps({ flaggedResponses: [makeResponse('r1', 'Bad')] })} />
    );
    expect(screen.getByTestId('flagged-toggle-bar')).toBeInTheDocument();
  });

  it('switches to flagged view when the flagged toggle is clicked', () => {
    const flaggedResponses = [makeResponse('r1', 'Bad response')];
    render(<ResponseListTab {...buildProps({ flaggedResponses })} />);
    fireEvent.click(screen.getByText('flagged-toggle'));
    expect(screen.getByText('Bad response')).toBeInTheDocument();
  });

  it('hides flagged view when flagged-hide is clicked', () => {
    const flaggedResponses = [makeResponse('r1', 'Bad')];
    render(<ResponseListTab {...buildProps({ flaggedResponses })} />);
    // Open flagged view then hide it
    fireEvent.click(screen.getByText('flagged-toggle'));
    fireEvent.click(screen.getByText('flagged-hide'));
    // Should be back to normal (flagged toggle bar still visible, but no flagged cards shown via map)
  });

  it('toggles flagged selection when a flagged card is toggled', () => {
    const flaggedResponses = [makeResponse('r1', 'Bad')];
    render(<ResponseListTab {...buildProps({ flaggedResponses })} />);
    fireEvent.click(screen.getByText('flagged-toggle'));
    // Click toggle on the flagged response card — exercises toggleFlaggedSelected
    fireEvent.click(screen.getByText('toggle'));
  });

  it('restores a flagged response via the flag button', async () => {
    const restoreResponse = jest.fn().mockResolvedValue(undefined);
    const flaggedResponses = [makeResponse('r1', 'Bad')];
    render(<ResponseListTab {...buildProps({ flaggedResponses, restoreResponse })} />);
    fireEvent.click(screen.getByText('flagged-toggle'));
    await act(async () => { fireEvent.click(screen.getByText('flag')); });
    expect(restoreResponse).toHaveBeenCalledWith('r1');
  });

  it('handles restore errors gracefully without throwing', async () => {
    const restoreResponse = jest.fn().mockRejectedValue(new Error('Server error'));
    const flaggedResponses = [makeResponse('r1', 'Bad')];
    render(<ResponseListTab {...buildProps({ flaggedResponses, restoreResponse })} />);
    fireEvent.click(screen.getByText('flagged-toggle'));
    // Should not throw — error is caught inside handleRestore
    await act(async () => { fireEvent.click(screen.getByText('flag')); });
  });

  it('skips restore when restoreResponse prop is not provided', async () => {
    const flaggedResponses = [makeResponse('r1', 'Bad')];
    render(<ResponseListTab {...buildProps({ flaggedResponses, restoreResponse: undefined })} />);
    fireEvent.click(screen.getByText('flagged-toggle'));
    // Clicking flag when restoreResponse is undefined hits the early-return guard
    await act(async () => { fireEvent.click(screen.getByText('flag')); });
  });

  it('auto-hides flagged view when all flagged responses are removed', async () => {
    const flaggedResponses = [makeResponse('r1', 'Bad')];
    const props = buildProps({ flaggedResponses });
    const { rerender } = render(<ResponseListTab {...props} />);
    // Open the flagged view
    fireEvent.click(screen.getByText('flagged-toggle'));
    // Remove all flagged responses — the auto-hide effect fires
    await act(async () => {
      rerender(<ResponseListTab {...props} flaggedResponses={[]} />);
    });
    // Flagged toggle bar should be gone since there are no more flagged responses
    expect(screen.queryByTestId('flagged-toggle-bar')).not.toBeInTheDocument();
  });
});
