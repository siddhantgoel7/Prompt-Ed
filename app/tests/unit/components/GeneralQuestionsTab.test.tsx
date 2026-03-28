/**
 * Tests for GeneralQuestionsTab component.
 * Covers: null-context guard, upload-prompt, warning, generating state,
 * button text states, selecting / deselecting questions, feedback toggle,
 * publish-with-timer flow, cancel timer, and selection-reset on regeneration.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { GeneralQuestionsTab } from '@/components/instructor/session/GeneralQuestionsTab';
import { SessionContext } from '@/components/instructor/session/SessionContext';

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: any) => <div data-testid="scroll-area">{children}</div>,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
}));

// Expose onCancel so we can test the cancel path
jest.mock('@/components/instructor/session/StartDiscussionDialog', () => ({
  StartDiscussionDialog: ({ open, onConfirm, onCancel }: any) =>
    open ? (
      <div data-testid="timer-dialog">
        <button onClick={() => onConfirm(30)}>Confirm Timer</button>
        <button onClick={onCancel}>Cancel Timer</button>
      </div>
    ) : null,
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeQuestion = (id: string, text: string) => ({
  id,
  prompt_text: text,
  correct_option: 'A',
  mc_options: [
    { label: 'A', text: 'Option A', is_correct: true },
    { label: 'B', text: 'Option B', is_correct: false },
  ],
  lesson_id: 'l1',
  display_order: 0,
});

function buildContext(overrides: Record<string, unknown> = {}) {
  return {
    generalQuestions: [] as ReturnType<typeof makeQuestion>[],
    isGeneratingGeneral: false,
    generalWarning: undefined as string | undefined,
    generateGeneralQuestions: jest.fn(),
    handlePublishAiCandidate: jest.fn(),
    isConnected: true,
    files: [] as { id: string; status: string }[],
    ...overrides,
  } as any;
}

function renderTab(overrides: Record<string, unknown> = {}) {
  const ctx = buildContext(overrides);
  const utils = render(
    <SessionContext.Provider value={ctx}>
      <GeneralQuestionsTab />
    </SessionContext.Provider>
  );
  return { ...utils, ctx };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('GeneralQuestionsTab', () => {
  it('returns null when context is absent', () => {
    const { container } = render(<GeneralQuestionsTab />);
    expect(container.firstChild).toBeNull();
  });

  it('shows upload prompt when no ready files and no questions', () => {
    renderTab({ files: [] });
    expect(screen.getByText(/Upload and process course files first/i)).toBeInTheDocument();
  });

  it('hides upload prompt when ready files exist', () => {
    renderTab({ files: [{ id: 'f1', status: 'ready' }] });
    expect(screen.queryByText(/Upload and process course files first/i)).not.toBeInTheDocument();
  });

  it('hides upload prompt when questions already exist (even with no ready files)', () => {
    renderTab({ files: [], generalQuestions: [makeQuestion('q1', 'Q1')] });
    expect(screen.queryByText(/Upload and process course files first/i)).not.toBeInTheDocument();
  });

  it('shows warning text when generalWarning is set', () => {
    renderTab({ generalWarning: 'Mock mode active — AI disabled.' });
    expect(screen.getByText('Mock mode active — AI disabled.')).toBeInTheDocument();
  });

  it('does not show warning when generalWarning is undefined', () => {
    renderTab({ generalWarning: undefined });
    expect(screen.queryByText(/Mock mode/i)).not.toBeInTheDocument();
  });

  it('shows animated generating label and status text while generating', () => {
    renderTab({ isGeneratingGeneral: true });
    expect(screen.getByLabelText('Generating…')).toBeInTheDocument();
    expect(screen.getByText(/Generating questions from course materials/i)).toBeInTheDocument();
  });

  it('shows "Generate General Questions" when no questions exist', () => {
    renderTab();
    expect(screen.getByText('Generate General Questions')).toBeInTheDocument();
  });

  it('shows "Regenerate General Questions" when questions already exist', () => {
    renderTab({ generalQuestions: [makeQuestion('q1', 'Q?')] });
    expect(screen.getByText('Regenerate General Questions')).toBeInTheDocument();
  });

  it('calls generateGeneralQuestions on button click when files are ready', () => {
    const { ctx } = renderTab({ files: [{ id: 'f1', status: 'ready' }] });
    fireEvent.click(screen.getByText('Generate General Questions'));
    expect(ctx.generateGeneralQuestions).toHaveBeenCalled();
  });

  it('renders question list inside ScrollArea when questions are present', () => {
    renderTab({ generalQuestions: [makeQuestion('q1', 'What is pharmacology?')] });
    expect(screen.getByTestId('scroll-area')).toBeInTheDocument();
    expect(screen.getByText('What is pharmacology?')).toBeInTheDocument();
  });

  it('expands a compact card to show Selected badge and Publish button', () => {
    renderTab({ generalQuestions: [makeQuestion('q1', 'What is pharmacology?')] });
    fireEvent.click(screen.getByText('What is pharmacology?'));
    expect(screen.getByText('Selected')).toBeInTheDocument();
    expect(screen.getByText('Publish This Question →')).toBeInTheDocument();
  });

  it('fires mouse enter/leave events on the compact question card', () => {
    renderTab({ generalQuestions: [makeQuestion('q1', 'Hover test Q')] });
    // The compact card is a <button> wrapping the question text
    const btn = screen.getByText('Hover test Q').closest('button')!;
    fireEvent.mouseEnter(btn);
    fireEvent.mouseLeave(btn);
  });

  it('switches selection to a different card', () => {
    const q1 = makeQuestion('q1', 'Question Alpha');
    const q2 = makeQuestion('q2', 'Question Beta');
    renderTab({ generalQuestions: [q1, q2] });

    // Select first card
    fireEvent.click(screen.getByText('Question Alpha'));
    expect(screen.getByText('Selected')).toBeInTheDocument();

    // Click the compact card for Q2 to switch selection
    const q2Btn = screen.getByText('Question Beta').closest('button')!;
    fireEvent.click(q2Btn);
    // Q1 is now compact again, Q2 is selected
    expect(screen.getByText('Selected')).toBeInTheDocument();
  });

  it('toggles the correctness-feedback checkbox in the expanded card', () => {
    renderTab({ generalQuestions: [makeQuestion('q1', 'Q?')] });
    fireEvent.click(screen.getByText('Q?'));
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it('opens the timer dialog when "Publish This Question" is clicked', () => {
    renderTab({ generalQuestions: [makeQuestion('q1', 'Q?')] });
    fireEvent.click(screen.getByText('Q?'));
    fireEvent.click(screen.getByText('Publish This Question →'));
    expect(screen.getByTestId('timer-dialog')).toBeInTheDocument();
  });

  it('calls handlePublishAiCandidate with the question when the timer is confirmed', () => {
    const { ctx } = renderTab({ generalQuestions: [makeQuestion('q1', 'Q?')] });
    fireEvent.click(screen.getByText('Q?'));
    fireEvent.click(screen.getByText('Publish This Question →'));
    fireEvent.click(screen.getByText('Confirm Timer'));
    expect(ctx.handlePublishAiCandidate).toHaveBeenCalled();
    expect(screen.queryByTestId('timer-dialog')).not.toBeInTheDocument();
  });

  it('closes the timer dialog without publishing when cancelled', () => {
    const { ctx } = renderTab({ generalQuestions: [makeQuestion('q1', 'Q?')] });
    fireEvent.click(screen.getByText('Q?'));
    fireEvent.click(screen.getByText('Publish This Question →'));
    fireEvent.click(screen.getByText('Cancel Timer'));
    expect(ctx.handlePublishAiCandidate).not.toHaveBeenCalled();
    expect(screen.queryByTestId('timer-dialog')).not.toBeInTheDocument();
  });

  it('resets selected index when the question list length changes (regeneration)', async () => {
    const q1 = makeQuestion('q1', 'Original Question');
    const ctx = buildContext({ generalQuestions: [q1] });
    const { rerender } = render(
      <SessionContext.Provider value={ctx}>
        <GeneralQuestionsTab />
      </SessionContext.Provider>
    );
    // Select the question
    fireEvent.click(screen.getByText('Original Question'));
    expect(screen.getByText('Selected')).toBeInTheDocument();

    // Simulate regeneration: two new questions (length 1 → 2 triggers the reset ref)
    const newCtx = buildContext({
      generalQuestions: [makeQuestion('q2', 'New Question A'), makeQuestion('q3', 'New Question B')],
    });
    await act(async () => {
      rerender(
        <SessionContext.Provider value={newCtx}>
          <GeneralQuestionsTab />
        </SessionContext.Provider>
      );
    });
    // Selection should be cleared — no "Selected" badge
    expect(screen.queryByText('Selected')).not.toBeInTheDocument();
  });
});
