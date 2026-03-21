/**
 * Acceptance Tests — Student Submitted View Scenarios
 *
 * Tests the new post-submission UI for MC, short-answer, and long-answer questions.
 *
 *  MC Scenario 1: no timer + feedback enabled
 *    → shows full question with colored highlight + "Good Job!" / "Oops!" for 7 seconds, then regular UI
 *  MC Scenario 2: timed + feedback enabled
 *    → gray highlight while timer running; colored highlight + banner after timer expires
 *  MC Scenario 3: no feedback (timed or not)
 *    → always shows gray highlight
 *
 *  Short/Long answer Scenario 1: no timer
 *    → immediately shows full question + submitted answer text
 *  Short/Long answer Scenario 2: timed
 *    → waiting message while timer runs; full question + answer after timer expires
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StudentSessionPage } from '@/components/student/session/StudentSessionPage';

jest.mock('@/hooks/useStudentSession', () => ({
    useStudentSession: jest.fn(),
}));
import { useStudentSession } from '@/hooks/useStudentSession';
const mockHook = useStudentSession as jest.Mock;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MC_FEEDBACK_ON = {
    id: 'mc-1',
    status: 'active' as const,
    prompt_type: 'multiple_choice' as const,
    prompt_text: 'What is the mechanism of aspirin?',
    mc_options: [
        { label: 'A', text: 'COX inhibition' },
        { label: 'B', text: 'ACE inhibition' },
        { label: 'C', text: 'Beta blockade' },
        { label: 'D', text: 'Calcium channel blockade' },
    ],
    correct_option: 'A',
    feedback_enabled: true,
    published_at: null,
    closed_at: null,
    display_order: 1,
    created_at: new Date().toISOString(),
    lesson_id: 'lesson-1',
    source: null,
    ai_generated_correct_option: null,
};

const MC_FEEDBACK_OFF = { ...MC_FEEDBACK_ON, id: 'mc-2', feedback_enabled: false };

const SHORT_ANSWER = {
    id: 'sa-1',
    status: 'active' as const,
    prompt_type: 'short_answer' as const,
    prompt_text: 'Explain the pharmacokinetics of ibuprofen.',
    mc_options: null,
    correct_option: null,
    feedback_enabled: false,
    published_at: null,
    closed_at: null,
    display_order: 1,
    created_at: new Date().toISOString(),
    lesson_id: 'lesson-1',
    source: null,
    ai_generated_correct_option: null,
};

const LONG_ANSWER = { ...SHORT_ANSWER, id: 'la-1', prompt_type: 'long_answer' as const };

function makeBase(overrides: Record<string, unknown> = {}) {
    return {
        lesson: { title: 'PMCOL 401' },
        responseText: '',
        setResponseText: jest.fn(),
        submitting: false,
        isConnected: true,
        endedMessage: null,
        errorMessage: null,
        canSubmit: true,
        submitResponse: jest.fn(),
        timerEndTime: null,
        timerTotalSeconds: null,
        timerExpired: false,
        ...overrides,
    };
}

 
function makeActive(discussion: any = MC_FEEDBACK_ON, timerOverrides: Record<string, unknown> = {}) {
    return makeBase({ activeDiscussion: discussion, view: 'active', ...timerOverrides });
}

 
function makeSubmitted(discussion: any = MC_FEEDBACK_ON, timerOverrides: Record<string, unknown> = {}) {
    return makeBase({ activeDiscussion: discussion, view: 'submitted', ...timerOverrides });
}

// ── MC: No textarea for MC questions ─────────────────────────────────────────

describe('MC UI — No textarea for multiple choice', () => {
    beforeEach(() => jest.clearAllMocks());

    it('[SV-MC-1] success: no textarea is shown for MC questions in active state', () => {
        mockHook.mockReturnValue(makeActive());
        render(<StudentSessionPage lessonId="lesson-1" />);
        expect(screen.queryByPlaceholderText('Type your response here…')).not.toBeInTheDocument();
    });

    it('[SV-MC-2] success: textarea IS shown for short-answer questions', () => {
        mockHook.mockReturnValue(makeActive(SHORT_ANSWER));
        render(<StudentSessionPage lessonId="lesson-1" />);
        expect(screen.getByPlaceholderText('Type your response here…')).toBeInTheDocument();
    });

    it('[SV-MC-3] success: textarea IS shown for long-answer questions', () => {
        mockHook.mockReturnValue(makeActive(LONG_ANSWER));
        render(<StudentSessionPage lessonId="lesson-1" />);
        expect(screen.getByPlaceholderText('Type your response here…')).toBeInTheDocument();
    });
});

// ── MC Scenario 1: no timer + feedback enabled ────────────────────────────────
// Note: banner text is "Great job!" (correct) / "Not quite!" (incorrect).
// These strings replaced the previous "Good Job! 🎉" / "Oops!" copy — update these tests if the copy ever changes again.

describe('MC Submitted View — Scenario 1: no timer + feedback enabled', () => {
    beforeEach(() => jest.clearAllMocks());

    function submitAndRerender(selectedLabel: string) {
        mockHook.mockReturnValue(makeActive());
        const { rerender } = render(<StudentSessionPage lessonId="lesson-1" />);
        fireEvent.click(screen.getByText(`${selectedLabel}.`));
        fireEvent.click(screen.getByRole('button', { name: /Submit response/i }));
        mockHook.mockReturnValue(makeSubmitted());
        rerender(<StudentSessionPage lessonId="lesson-1" />);
        return { rerender };
    }

    it('[SV-MC1-1] success: correct answer shows Great job! banner', () => {
        submitAndRerender('A');
        expect(screen.getByText(/Great job/i)).toBeInTheDocument();
    });

    it('[SV-MC1-2] success: incorrect answer shows Not quite! banner', () => {
        submitAndRerender('B');
        expect(screen.getByText(/Not quite/i)).toBeInTheDocument();
    });

    it('[SV-MC1-3] success: correct answer banner has green styling', () => {
        submitAndRerender('A');
        const banner = screen.getByTestId('mc-feedback-banner');
        expect(banner).toBeInTheDocument();
        // data-variant="correct" is the semantic signal — avoids brittle color-code regex assertions
        expect(banner).toHaveAttribute('data-variant', 'correct');
    });

    it('[SV-MC1-4] success: incorrect answer banner has red styling', () => {
        submitAndRerender('B');
        const banner = screen.getByTestId('mc-feedback-banner');
        expect(banner).toBeInTheDocument();
        // data-variant="incorrect" is the semantic signal — avoids brittle color-code regex assertions
        expect(banner).toHaveAttribute('data-variant', 'incorrect');
    });

    it('[SV-MC1-5] success: full question is shown during feedback window', () => {
        submitAndRerender('A');
        expect(screen.getByText('What is the mechanism of aspirin?')).toBeInTheDocument();
    });

    it('[SV-MC1-6] success: correct option is highlighted distinctly when wrong answer submitted', () => {
        submitAndRerender('B');
        // data-testid avoids text-content matching; data-state="correct-highlight" is the semantic signal
        const correctBtn = screen.getByTestId('mc-option-A');
        expect(correctBtn).toBeInTheDocument();
        expect(correctBtn).toHaveAttribute('data-state', 'correct-highlight');
    });

    it('[SV-MC1-7] success: submitted wrong option is highlighted red', () => {
        submitAndRerender('B');
        // data-state="wrong-submitted" is the semantic signal — avoids brittle color-code regex assertions
        const wrongBtn = screen.getByTestId('mc-option-B');
        expect(wrongBtn).toBeInTheDocument();
        expect(wrongBtn).toHaveAttribute('data-state', 'wrong-submitted');
    });

    it('[SV-MC1-8] success: submitted correct option is highlighted green', () => {
        submitAndRerender('A');
        // data-state="correct-submitted" is the semantic signal — avoids brittle color-code regex assertions
        const correctBtn = screen.getByTestId('mc-option-A');
        expect(correctBtn).toBeInTheDocument();
        expect(correctBtn).toHaveAttribute('data-state', 'correct-submitted');
    });
});

// ── MC Scenario 2: timed + feedback enabled ───────────────────────────────────

describe('MC Submitted View — Scenario 2: timed + feedback enabled', () => {
    beforeEach(() => jest.clearAllMocks());

    const timerRunning = { timerEndTime: Date.now() + 30_000, timerTotalSeconds: 30, timerExpired: false };
    const timerExpired = { timerEndTime: Date.now() - 1_000, timerTotalSeconds: 30, timerExpired: true };

    it('[SV-MC2-1] success: submitted option shown without correctness feedback while timer is running', () => {
        mockHook.mockReturnValue(makeActive(MC_FEEDBACK_ON, timerRunning));
        const { rerender } = render(<StudentSessionPage lessonId="lesson-1" />);
        fireEvent.click(screen.getByText('A.'));
        fireEvent.click(screen.getByRole('button', { name: /Submit response/i }));
        mockHook.mockReturnValue(makeSubmitted(MC_FEEDBACK_ON, timerRunning));
        rerender(<StudentSessionPage lessonId="lesson-1" />);

        // Timer running: no feedback banner shown yet
        expect(screen.queryByText(/Great job/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Not quite/i)).not.toBeInTheDocument();
        // Option button should exist (submitted state shown)
        const optionButtons = screen.getAllByRole('button');
        const submittedBtn = optionButtons.find(btn => btn.textContent?.includes('A.'));
        expect(submittedBtn).toBeInTheDocument();
    });

    it('[SV-MC2-2] success: "results will be shown when time\'s up" shown while timer running', () => {
        mockHook.mockReturnValue(makeActive(MC_FEEDBACK_ON, timerRunning));
        const { rerender } = render(<StudentSessionPage lessonId="lesson-1" />);
        fireEvent.click(screen.getByText('A.'));
        fireEvent.click(screen.getByRole('button', { name: /Submit response/i }));
        mockHook.mockReturnValue(makeSubmitted(MC_FEEDBACK_ON, timerRunning));
        rerender(<StudentSessionPage lessonId="lesson-1" />);

        expect(screen.getByText(/results will be shown when time/i)).toBeInTheDocument();
    });

    it('[SV-MC2-3] success: Great job! shown after timer expires (correct answer)', () => {
        mockHook.mockReturnValue(makeActive(MC_FEEDBACK_ON, timerRunning));
        const { rerender } = render(<StudentSessionPage lessonId="lesson-1" />);
        fireEvent.click(screen.getByText('A.'));
        fireEvent.click(screen.getByRole('button', { name: /Submit response/i }));

        // Timer expires
        mockHook.mockReturnValue(makeSubmitted(MC_FEEDBACK_ON, timerExpired));
        rerender(<StudentSessionPage lessonId="lesson-1" />);

        expect(screen.getByText(/Great job/i)).toBeInTheDocument();
    });

    it('[SV-MC2-4] success: Not quite! shown after timer expires (incorrect answer)', () => {
        mockHook.mockReturnValue(makeActive(MC_FEEDBACK_ON, timerRunning));
        const { rerender } = render(<StudentSessionPage lessonId="lesson-1" />);
        fireEvent.click(screen.getByText('B.'));
        fireEvent.click(screen.getByRole('button', { name: /Submit response/i }));

        // Timer expires
        mockHook.mockReturnValue(makeSubmitted(MC_FEEDBACK_ON, timerExpired));
        rerender(<StudentSessionPage lessonId="lesson-1" />);

        expect(screen.getByText(/Not quite/i)).toBeInTheDocument();
    });
});

// ── MC Scenario 3: no feedback ────────────────────────────────────────────────

describe('MC Submitted View — Scenario 3: no feedback', () => {
    beforeEach(() => jest.clearAllMocks());

    it('[SV-MC3-1] success: submitted option shown with highlight (no feedback, no timer)', () => {
        mockHook.mockReturnValue(makeActive(MC_FEEDBACK_OFF));
        const { rerender } = render(<StudentSessionPage lessonId="lesson-1" />);
        fireEvent.click(screen.getByText('B.'));
        fireEvent.click(screen.getByRole('button', { name: /Submit response/i }));
        mockHook.mockReturnValue(makeSubmitted(MC_FEEDBACK_OFF));
        rerender(<StudentSessionPage lessonId="lesson-1" />);

        // data-state="submitted" confirms submitted-without-correctness styling — stronger than .toBeTruthy()
        const submittedBtn = screen.getByTestId('mc-option-B');
        expect(submittedBtn).toBeInTheDocument();
        expect(submittedBtn).toHaveAttribute('data-state', 'submitted');
    });

    it('[SV-MC3-2] success: no feedback banner shown when feedback disabled', () => {
        mockHook.mockReturnValue(makeActive(MC_FEEDBACK_OFF));
        const { rerender } = render(<StudentSessionPage lessonId="lesson-1" />);
        fireEvent.click(screen.getByText('A.'));
        fireEvent.click(screen.getByRole('button', { name: /Submit response/i }));
        mockHook.mockReturnValue(makeSubmitted(MC_FEEDBACK_OFF));
        rerender(<StudentSessionPage lessonId="lesson-1" />);

        expect(screen.queryByTestId('mc-feedback-banner')).not.toBeInTheDocument();
        expect(screen.queryByText(/Great job/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Not quite/i)).not.toBeInTheDocument();
    });

    it('[SV-MC3-3] success: full question is shown after submission (no feedback)', () => {
        mockHook.mockReturnValue(makeActive(MC_FEEDBACK_OFF));
        const { rerender } = render(<StudentSessionPage lessonId="lesson-1" />);
        fireEvent.click(screen.getByText('C.'));
        fireEvent.click(screen.getByRole('button', { name: /Submit response/i }));
        mockHook.mockReturnValue(makeSubmitted(MC_FEEDBACK_OFF));
        rerender(<StudentSessionPage lessonId="lesson-1" />);

        expect(screen.getByText('What is the mechanism of aspirin?')).toBeInTheDocument();
    });
});

// ── Short/Long answer Scenario 1: no timer ───────────────────────────────────

describe('Short/Long Answer Submitted View — Scenario 1: no timer', () => {
    beforeEach(() => jest.clearAllMocks());

    it('[SV-SA1-1] success: full question shown after short-answer submission (no timer)', () => {
        mockHook.mockReturnValue(makeActive(SHORT_ANSWER));
        const { rerender } = render(<StudentSessionPage lessonId="lesson-1" />);
        fireEvent.change(screen.getByPlaceholderText('Type your response here…'), {
            target: { value: 'Aspirin inhibits COX enzymes.' },
        });
        fireEvent.click(screen.getByRole('button', { name: /Submit response/i }));
        mockHook.mockReturnValue(makeSubmitted(SHORT_ANSWER));
        rerender(<StudentSessionPage lessonId="lesson-1" />);

        expect(screen.getByText('Explain the pharmacokinetics of ibuprofen.')).toBeInTheDocument();
    });

    it('[SV-SA1-2] success: submitted answer text is displayed after short-answer submission', () => {
        mockHook.mockReturnValue({
            ...makeActive(SHORT_ANSWER),
            responseText: 'Aspirin inhibits COX enzymes.',
        });
        const { rerender } = render(<StudentSessionPage lessonId="lesson-1" />);
        fireEvent.click(screen.getByRole('button', { name: /Submit response/i }));
        mockHook.mockReturnValue(makeSubmitted(SHORT_ANSWER));
        rerender(<StudentSessionPage lessonId="lesson-1" />);

        expect(screen.getByTestId('submitted-answer-display')).toBeInTheDocument();
        expect(screen.getByText('Aspirin inhibits COX enzymes.')).toBeInTheDocument();
    });

    it('[SV-SA1-3] success: full question shown after long-answer submission (no timer)', () => {
        mockHook.mockReturnValue(makeActive(LONG_ANSWER));
        const { rerender } = render(<StudentSessionPage lessonId="lesson-1" />);
        fireEvent.change(screen.getByPlaceholderText('Type your response here…'), {
            target: { value: 'Detailed pharmacokinetics...' },
        });
        fireEvent.click(screen.getByRole('button', { name: /Submit response/i }));
        mockHook.mockReturnValue(makeSubmitted(LONG_ANSWER));
        rerender(<StudentSessionPage lessonId="lesson-1" />);

        expect(screen.getByText('Explain the pharmacokinetics of ibuprofen.')).toBeInTheDocument();
    });

    it('[SV-SA1-4] success: no MC feedback banner shown for short-answer questions', () => {
        mockHook.mockReturnValue(makeSubmitted(SHORT_ANSWER));
        render(<StudentSessionPage lessonId="lesson-1" />);
        expect(screen.queryByTestId('mc-feedback-banner')).not.toBeInTheDocument();
    });
});

// ── Short/Long answer Scenario 2: timed ──────────────────────────────────────

describe('Short/Long Answer Submitted View — Scenario 2: timed', () => {
    beforeEach(() => jest.clearAllMocks());

    const timerRunning = { timerEndTime: Date.now() + 30_000, timerTotalSeconds: 30, timerExpired: false };
    const timerExpiredState = { timerEndTime: Date.now() - 1_000, timerTotalSeconds: 30, timerExpired: true };

    it('[SV-SA2-1] success: waiting message shown while timer still running (short answer)', () => {
        mockHook.mockReturnValue(makeActive(SHORT_ANSWER, timerRunning));
        const { rerender } = render(<StudentSessionPage lessonId="lesson-1" />);
        fireEvent.change(screen.getByPlaceholderText('Type your response here…'), {
            target: { value: 'My answer.' },
        });
        fireEvent.click(screen.getByRole('button', { name: /Submit response/i }));
        mockHook.mockReturnValue(makeSubmitted(SHORT_ANSWER, timerRunning));
        rerender(<StudentSessionPage lessonId="lesson-1" />);

        expect(screen.getByText(/results will be shown when time/i)).toBeInTheDocument();
    });

    it('[SV-SA2-2] success: full question + answer shown after timer expires (short answer)', () => {
        mockHook.mockReturnValue({
            ...makeActive(SHORT_ANSWER, timerRunning),
            responseText: 'My pharmacokinetics answer.',
        });
        const { rerender } = render(<StudentSessionPage lessonId="lesson-1" />);
        fireEvent.click(screen.getByRole('button', { name: /Submit response/i }));

        mockHook.mockReturnValue(makeSubmitted(SHORT_ANSWER, timerExpiredState));
        rerender(<StudentSessionPage lessonId="lesson-1" />);

        expect(screen.getByText('Explain the pharmacokinetics of ibuprofen.')).toBeInTheDocument();
        expect(screen.getByTestId('submitted-answer-display')).toBeInTheDocument();
    });
});
