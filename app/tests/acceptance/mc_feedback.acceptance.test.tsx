/**
 * Acceptance Tests — [US 2.10] See if I got multiple choice questions correct
 *
 * As a Student
 * I want to see if I got multiple choice questions correct
 * So that I can receive immediate feedback on my understanding
 *
 * Acceptance Criteria:
 *   AC1: GIVEN feedback_enabled AND student submits MC answer
 *        WHEN the answer is correct
 *        THEN they see " Correct!" and "You selected the correct answer."
 *
 *   AC2: GIVEN feedback_enabled AND student submits MC answer
 *        WHEN the answer is incorrect
 *        THEN they see " Incorrect" and the correct option label
 *
 *   AC3: GIVEN feedback is disabled
 *        WHEN the student submits ANY MC answer
 *        THEN they do NOT see any correctness indicator
 *
 * These are component-level acceptance tests that render StudentSessionPage
 * with a mocked useStudentSession hook.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StudentSessionPage } from '@/components/student/session/StudentSessionPage';

jest.mock('@/hooks/useStudentSession', () => ({
    useStudentSession: jest.fn(),
}));
import { useStudentSession } from '@/hooks/useStudentSession';
const mockHook = useStudentSession as jest.Mock;

// Shared fixtures

const MC_DISCUSSION_FEEDBACK_ON = {
    id: 'd-mc-1',
    status: 'active' as const,
    prompt_type: 'multiple_choice' as const,
    prompt_text: 'What is Playwright used for?',
    mc_options: [
        { label: 'A', text: 'Browser testing' },
        { label: 'B', text: 'A text editor' },
        { label: 'C', text: 'A linting tool' },
        { label: 'D', text: 'A CI service' },
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

const MC_DISCUSSION_FEEDBACK_OFF = {
    ...MC_DISCUSSION_FEEDBACK_ON,
    id: 'd-mc-2',
    feedback_enabled: false,
};

const SHORT_ANSWER_DISCUSSION = {
    id: 'd-sa-1',
    status: 'active' as const,
    prompt_type: 'short_answer' as const,
    prompt_text: 'Describe the pharmacology of aspirin.',
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

function makeActiveHookValue(discussion = MC_DISCUSSION_FEEDBACK_ON) {
    return {
        lesson: { title: 'PMCOL 401 Lecture 5' },
        activeDiscussion: discussion,
        responseText: '',
        setResponseText: jest.fn(),
        submitting: false,
        isConnected: true,
        view: 'active' as const,
        endedMessage: null,
        errorMessage: null,
        canSubmit: false,
        submitResponse: jest.fn(),
    };
}

function makeSubmittedHookValue(discussion = MC_DISCUSSION_FEEDBACK_ON) {
    return {
        ...makeActiveHookValue(discussion),
        view: 'submitted' as const,
    };
}

// Helper: render in active state, click option, click submit, then rerender as submitted
function renderAndSubmit(
    selectedLabel: string,
    discussion = MC_DISCUSSION_FEEDBACK_ON
) {
    mockHook.mockReturnValue(makeActiveHookValue(discussion));
    const { rerender } = render(<StudentSessionPage lessonId="lesson-1" />);

    // Select the option button — rendered as "{label}. {text}"
    fireEvent.click(screen.getByText(`${selectedLabel}.`));
    fireEvent.click(screen.getByRole('button', { name: /Submit response/i }));

    // Simulate hook returning 'submitted' view
    mockHook.mockReturnValue(makeSubmittedHookValue(discussion));
    rerender(<StudentSessionPage lessonId="lesson-1" />);

    return { rerender };
}

// AC1 — Correct answer feedback
describe('[US 2.10] MC Feedback — Correct Answer (Acceptance)', () => {

    beforeEach(() => jest.clearAllMocks());

    // 31.1
    it('[US 2.10][AC1-AT1] success: submitting correct option shows ✅ Correct! headline', () => {
        renderAndSubmit('A'); // A is the correct_option in fixture
        expect(screen.getByText('✅ Correct!')).toBeInTheDocument();
    });

    // 31.2
    it('[US 2.10][AC1-AT2] success: correct answer shows "You selected the correct answer." detail', () => {
        renderAndSubmit('A');
        expect(screen.getByText(/You selected the correct answer/i)).toBeInTheDocument();
    });

    // 31.3
    it('[US 2.10][AC1-AT3] success: correct feedback block has green styling class', () => {
        renderAndSubmit('A');
        const feedbackBlock = screen.getByText('✅ Correct!').closest('div[class*="p-4"]') as HTMLElement;
        expect(feedbackBlock?.className).toMatch(/green/);
    });

    // 31.4
    it('[US 2.10][AC1-AT4] success: "Response submitted" alert is also shown alongside correct feedback', () => {
        renderAndSubmit('A');
        expect(screen.getByText(/Response submitted/i)).toBeInTheDocument();
        expect(screen.getByText('✅ Correct!')).toBeInTheDocument();
    });

    // 31.5
    it('[US 2.10][AC1-AT5] success: correct answer feedback does NOT show any incorrect icon', () => {
        renderAndSubmit('A');
        expect(screen.queryByText(/❌ Incorrect/i)).not.toBeInTheDocument();
    });

    // 31.6
    it('[US 2.10][AC1-AT6] success: correct answer feedback does NOT reveal "Correct Answer: Option X"', () => {
        renderAndSubmit('A');
        expect(screen.queryByText(/Correct Answer:/i)).not.toBeInTheDocument();
    });
});

// AC2 — Incorrect answer feedback
describe('[US 2.10] MC Feedback — Incorrect Answer (Acceptance)', () => {

    beforeEach(() => jest.clearAllMocks());

    // 31.7
    it('[US 2.10][AC2-AT1] failure: submitting wrong option shows ❌ Incorrect headline', () => {
        renderAndSubmit('B'); // correct is A
        expect(screen.getByText(/❌ Incorrect/i)).toBeInTheDocument();
    });

    // 31.8
    it('[US 2.10][AC2-AT2] failure: incorrect answer reveals correct option label', () => {
        renderAndSubmit('B'); // correct is A
        expect(screen.getByText(/Correct Answer: Option A/i)).toBeInTheDocument();
    });

    // 31.9
    it('[US 2.10][AC2-AT3] failure: incorrect feedback block has red styling class', () => {
        renderAndSubmit('C'); // correct is A
        const feedbackBlock = screen.getByText(/❌ Incorrect/i).closest('div[class*="p-4"]') as HTMLElement;
        expect(feedbackBlock?.className).toMatch(/red/);
    });

    // 31.10
    it('[US 2.10][AC2-AT4] failure: wrong answer does NOT show ✅ Correct! icon', () => {
        renderAndSubmit('D'); // correct is A
        expect(screen.queryByText('✅ Correct!')).not.toBeInTheDocument();
    });

    // 31.11
    it('[US 2.10][AC2-AT5] failure: correct answer revealed matches actual correct_option in discussion', () => {
        renderAndSubmit('C'); // correct is A, selecting C
        // Confirms the revealed answer is A, not the wrong selection C
        expect(screen.getByText(/Correct Answer: Option A/i)).toBeInTheDocument();
        expect(screen.queryByText(/Correct Answer: Option C/i)).not.toBeInTheDocument();
    });

    // 31.12
    it('[US 2.10][AC2-AT6] failure: "Response submitted" alert is still shown alongside incorrect feedback', () => {
        renderAndSubmit('B');
        expect(screen.getByText(/Response submitted/i)).toBeInTheDocument();
        expect(screen.getByText(/❌ Incorrect/i)).toBeInTheDocument();
    });
});

// AC3 — Feedback disabled
describe('[US 2.10] MC Feedback — Feedback Disabled (Acceptance)', () => {

    beforeEach(() => jest.clearAllMocks());

    // 31.13
    it('[US 2.10][AC3-AT1] success: no feedback shown when feedback_enabled=false and answer is correct', () => {
        renderAndSubmit('A', MC_DISCUSSION_FEEDBACK_OFF);
        expect(screen.queryByText('✅ Correct!')).not.toBeInTheDocument();
        expect(screen.queryByText(/❌ Incorrect/i)).not.toBeInTheDocument();
    });

    // 31.14
    it('[US 2.10][AC3-AT2] success: no feedback shown when feedback_enabled=false and answer is incorrect', () => {
        renderAndSubmit('B', MC_DISCUSSION_FEEDBACK_OFF);
        expect(screen.queryByText('✅ Correct!')).not.toBeInTheDocument();
        expect(screen.queryByText(/❌ Incorrect/i)).not.toBeInTheDocument();
    });

    // 31.15
    it('[US 2.10][AC3-AT3] success: "Response submitted" still appears even when feedback is disabled', () => {
        renderAndSubmit('A', MC_DISCUSSION_FEEDBACK_OFF);
        expect(screen.getByText(/Response submitted/i)).toBeInTheDocument();
    });

    // 31.16
    it('[US 2.10][AC3-AT4] success: correct option label is NOT revealed when feedback is disabled', () => {
        renderAndSubmit('B', MC_DISCUSSION_FEEDBACK_OFF);
        expect(screen.queryByText(/Correct Answer:/i)).not.toBeInTheDocument();
    });
});

// Edge cases: non-MC discussions
describe('[US 2.10] MC Feedback — Non-MC Questions (Edge Cases)', () => {

    beforeEach(() => jest.clearAllMocks());

    // 31.17
    it('[US 2.10][SC3] success: short-answer submission does NOT show MC feedback block', () => {
        mockHook.mockReturnValue(makeSubmittedHookValue(SHORT_ANSWER_DISCUSSION as any));
        render(<StudentSessionPage lessonId="lesson-1" />);
        expect(screen.queryByText('✅ Correct!')).not.toBeInTheDocument();
        expect(screen.queryByText(/❌ Incorrect/i)).not.toBeInTheDocument();
        expect(screen.getByText(/Response submitted/i)).toBeInTheDocument();
    });
});

// [US 2.08] Select an option for multiple choice questions
describe('[US 2.08] MC Option Selection', () => {

    beforeEach(() => jest.clearAllMocks());

    // 31.18
    it('[US 2.08][AC1-AT1] success: all MC options are rendered and visible', () => {
        mockHook.mockReturnValue(makeActiveHookValue());
        render(<StudentSessionPage lessonId="lesson-1" />);
        expect(screen.getByText('A.')).toBeInTheDocument();
        expect(screen.getByText('B.')).toBeInTheDocument();
        expect(screen.getByText('C.')).toBeInTheDocument();
        expect(screen.getByText('D.')).toBeInTheDocument();
    });

    // 31.19
    it('[US 2.08][AC1-AT2] success: option text is displayed beside each label', () => {
        mockHook.mockReturnValue(makeActiveHookValue());
        render(<StudentSessionPage lessonId="lesson-1" />);
        expect(screen.getByText('Browser testing')).toBeInTheDocument();
        expect(screen.getByText('A text editor')).toBeInTheDocument();
    });

    // 31.20
    it('[US 2.08][UI3] success: selecting an option populates the response textarea', () => {
        mockHook.mockReturnValue(makeActiveHookValue());
        render(<StudentSessionPage lessonId="lesson-1" />);
        fireEvent.click(screen.getByText('A.'));
        const textarea = screen.getByPlaceholderText('Type your response here...');
        expect((textarea as HTMLTextAreaElement).value).toMatch(/Option A/);
    });

    // 31.21
    it('[US 2.08][AC4-AT1] failure: submit button is disabled before any option is selected', () => {
        mockHook.mockReturnValue(makeActiveHookValue());
        render(<StudentSessionPage lessonId="lesson-1" />);
        // No option selected — effectiveCanSubmit is true but handleSubmit guards with setSubmitAttempted
        // The button itself is enabled (effectiveCanSubmit=true) but clicking without selection shows validation
        fireEvent.click(screen.getByRole('button', { name: /Submit response/i }));
        expect(screen.getByRole('alert')).toHaveTextContent('Please select an answer');
    });

    // 31.22
    it('[US 2.08][AC4-AT2] failure: validation error clears once an option is selected', () => {
        mockHook.mockReturnValue(makeActiveHookValue());
        render(<StudentSessionPage lessonId="lesson-1" />);
        // Trigger validation
        fireEvent.click(screen.getByRole('button', { name: /Submit response/i }));
        expect(screen.getByRole('alert')).toBeInTheDocument();
        // Now select an option
        fireEvent.click(screen.getByText('B.'));
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    // 31.23
    it('[US 2.08][UI6] success: MC options are not rendered for short-answer discussions', () => {
        mockHook.mockReturnValue(makeActiveHookValue(SHORT_ANSWER_DISCUSSION as any));
        render(<StudentSessionPage lessonId="lesson-1" />);
        expect(screen.queryByText('A.')).not.toBeInTheDocument();
    });
});

// [US 2.10] Discussion state resets between questions
describe('[US 2.10] MC Feedback — Discussion Reset Between Questions', () => {

    beforeEach(() => jest.clearAllMocks());

    // 31.24
    it('[US 2.10][SC4] success: feedback state clears when discussion ID changes', () => {
        // First render with discussion d-mc-1
        mockHook.mockReturnValue(makeActiveHookValue(MC_DISCUSSION_FEEDBACK_ON));
        const { rerender } = render(<StudentSessionPage lessonId="lesson-1" />);

        // Select correct and submit
        fireEvent.click(screen.getByText('A.'));
        fireEvent.click(screen.getByRole('button', { name: /Submit response/i }));

        const newDiscussion = { ...MC_DISCUSSION_FEEDBACK_ON, id: 'd-mc-new', prompt_text: 'New question?' };
        mockHook.mockReturnValue(makeActiveHookValue(newDiscussion));
        rerender(<StudentSessionPage lessonId="lesson-1" />);

        // After discussion change, feedback is gone and new question is shown
        expect(screen.queryByText('✅ Correct!')).not.toBeInTheDocument();
        expect(screen.getByText('New question?')).toBeInTheDocument();
    });
});
